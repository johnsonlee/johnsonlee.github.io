(function() {
  var WEATHER_CACHE_KEY = 'weather-data';
  var CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  var CHECK_INTERVAL = 60 * 1000; // check every minute

  function getCache() {
    try {
      var cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY));
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached;
      }
    } catch(e) {}
    return null;
  }

  function setCache(data) {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        weather: data.weather,
        sunrise: data.sunrise,
        sunset: data.sunset,
        timestamp: Date.now()
      }));
    } catch(e) {}
  }

  function parseTime(str) {
    // Parse "06:13 AM" or "06:59 PM" to minutes since midnight
    if (!str) return null;
    var match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    var h = parseInt(match[1]);
    var m = parseInt(match[2]);
    var ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  function nowMinutes() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function isNight(sunrise, sunset) {
    if (sunrise != null && sunset != null) {
      var now = nowMinutes();
      return now < sunrise || now >= sunset;
    }
    // Fallback: hardcoded
    var hour = new Date().getHours();
    return hour < 6 || hour >= 19;
  }

  function mapWeatherCode(code) {
    code = parseInt(code);
    if ([113].includes(code)) return 'sunny';
    if ([116, 119, 122].includes(code)) return 'cloudy';
    if ([143, 248, 260].includes(code)) return 'foggy';
    if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 353, 356, 359, 362, 365, 386, 389].includes(code)) return 'rainy';
    if ([179, 182, 185, 200, 227, 230, 320, 323, 326, 329, 332, 335, 338, 350, 368, 371, 374, 377, 392, 395].includes(code)) return 'snowy';
    return 'cloudy';
  }

  var themeColors = {
    sunny: '#FFFBEB', cloudy: '#F8F8F8', foggy: '#F0F0F0',
    rainy: '#EEF2F7', snowy: '#F5F7FA', night: '#020617'
  };

  function applyTheme(weather, sunrise, sunset) {
    var night = isNight(sunrise, sunset);
    var effectiveWeather = night ? 'night' : weather;
    document.documentElement.setAttribute('data-weather', effectiveWeather);

    // Set data-theme for dark mode CSS (non-weather rules like headings, gitalk, etc.)
    if (night) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Update Safari status bar color
    var meta = document.getElementById('theme-color');
    if (meta) meta.setAttribute('content', themeColors[effectiveWeather] || '#FFF');
  }

  // State
  var currentWeather = null;
  var sunriseMin = null;
  var sunsetMin = null;

  function tick() {
    if (currentWeather) {
      applyTheme(currentWeather, sunriseMin, sunsetMin);
    }
  }

  function onData(weather, sunrise, sunset) {
    currentWeather = weather;
    sunriseMin = parseTime(sunrise);
    sunsetMin = parseTime(sunset);
    setCache({ weather: weather, sunrise: sunrise, sunset: sunset });
    applyTheme(weather, sunriseMin, sunsetMin);
  }

  function fetchWeather() {
    var cached = getCache();
    if (cached) {
      onData(cached.weather, cached.sunrise, cached.sunset);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://wttr.in/?format=j1', true);
    xhr.timeout = 5000;
    xhr.onload = function() {
      try {
        var data = JSON.parse(xhr.responseText);
        var code = data.current_condition[0].weatherCode;
        var weather = mapWeatherCode(code);
        var astro = data.weather[0].astronomy[0];
        onData(weather, astro.sunrise, astro.sunset);
      } catch(e) {}
    };
    xhr.onerror = function() {};
    xhr.send();
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchWeather);
  } else {
    fetchWeather();
  }

  // Check every minute for sunrise/sunset crossing
  setInterval(tick, CHECK_INTERVAL);
})();
