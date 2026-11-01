(function() {
  var canvas, ctx, particles = [], animId = null, currentEffect = null;

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'weather-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function isDark() {
    var weather = document.documentElement.getAttribute('data-weather');
    return weather === 'night' || document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // Rain — ripple rings expanding outward like raindrops hitting a puddle
  function createRipple() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 0,
      maxRadius: 20 + Math.random() * 40,
      speed: 0.3 + Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.1,
      born: Date.now(),
      delay: Math.random() * 6000 // stagger start times
    };
  }

  function drawRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var dark = isDark();
    var now = Date.now();

    particles.forEach(function(p) {
      if (now - p.born < p.delay) return; // not started yet

      var life = p.radius / p.maxRadius; // 0 → 1
      var alpha = p.opacity * (1 - life); // fade out as it expands

      if (alpha < 0.01) {
        // Reset ripple
        p.x = Math.random() * canvas.width;
        p.y = Math.random() * canvas.height;
        p.radius = 0;
        p.maxRadius = 20 + Math.random() * 40;
        p.born = now;
        p.delay = Math.random() * 2000;
        return;
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = dark
        ? 'rgba(140, 180, 230, ' + alpha + ')'
        : 'rgba(80, 130, 190, ' + alpha + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner ring (slightly behind)
      if (p.radius > 5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = dark
          ? 'rgba(140, 180, 230, ' + (alpha * 0.4) + ')'
          : 'rgba(80, 130, 190, ' + (alpha * 0.4) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      p.radius += p.speed;
    });
  }

  // Sunny — dappled light from upper-right light source
  var sunCenterX, sunCenterY, sunRadius;

  function initSunRegion() {
    // Light source: upper-right quadrant
    sunCenterX = canvas.width * 0.75;
    sunCenterY = canvas.height * 0.15;
    sunRadius = Math.max(canvas.width, canvas.height) * 0.5;
  }

  function createLightPatch() {
    // Gaussian-like distribution around the sun center
    var angle = Math.random() * Math.PI * 2;
    var dist = Math.random() * sunRadius * (0.3 + Math.random() * 0.7);
    return {
      x: sunCenterX + Math.cos(angle) * dist,
      y: sunCenterY + Math.sin(angle) * dist,
      rx: 25 + Math.random() * 60,
      ry: 15 + Math.random() * 40,
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.0008,
      driftX: (Math.random() - 0.5) * 0.1,
      driftY: (Math.random() - 0.5) * 0.08,
      opacity: 0.02 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.002 + Math.random() * 0.004,
      distFromSun: dist // for falloff
    };
  }

  function drawSunny() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function(p) {
      // Opacity falls off with distance from sun center
      var falloff = 1 - Math.min(p.distFromSun / sunRadius, 1);
      falloff = falloff * falloff; // quadratic falloff
      var pulse = p.opacity * falloff + Math.sin(p.phase) * 0.015 * falloff;
      if (pulse < 0.005) return;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(p.rx, p.ry));
      gradient.addColorStop(0, 'rgba(255, 235, 140, ' + pulse * 1.2 + ')');
      gradient.addColorStop(0.5, 'rgba(255, 220, 100, ' + pulse * 0.6 + ')');
      gradient.addColorStop(1, 'rgba(255, 210, 80, 0)');

      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      p.x += p.driftX;
      p.y += p.driftY;
      p.rotation += p.rotSpeed;
      p.phase += p.pulseSpeed;

      // Gently drift back toward sun region (don't wander too far)
      var dx = p.x - sunCenterX;
      var dy = p.y - sunCenterY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > sunRadius) {
        p.x -= dx * 0.002;
        p.y -= dy * 0.002;
      }
      p.distFromSun = d;
    });
  }

  // Snow particle — six-armed snowflake
  function createSnowFlake() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      size: 3 + Math.random() * 6,
      speed: 0.2 + Math.random() * 0.6,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.005 + Math.random() * 0.01,
      swayAmount: 20 + Math.random() * 30,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.01,
      opacity: 0.12 + Math.random() * 0.18
    };
  }

  function drawFlake(x, y, size, rotation, opacity, dark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = dark
      ? 'rgba(255, 255, 255, ' + opacity + ')'
      : 'rgba(100, 140, 200, ' + opacity + ')';
    ctx.lineWidth = size > 5 ? 1.2 : 0.8;
    ctx.lineCap = 'round';

    // 6 arms
    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI * 2 / 6) * i;
      var ax = Math.cos(angle) * size;
      var ay = Math.sin(angle) * size;

      // Main arm
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // Two small branches per arm (only on bigger flakes)
      if (size > 4) {
        var bLen = size * 0.35;
        var bx = Math.cos(angle) * size * 0.55;
        var by = Math.sin(angle) * size * 0.55;
        var leftAngle = angle + Math.PI / 4;
        var rightAngle = angle - Math.PI / 4;

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(leftAngle) * bLen, by + Math.sin(leftAngle) * bLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(rightAngle) * bLen, by + Math.sin(rightAngle) * bLen);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var dark = isDark();
    particles.forEach(function(p) {
      var sx = p.x + Math.sin(p.sway) * p.swayAmount;
      drawFlake(sx, p.y, p.size, p.rotation, p.opacity, dark);

      p.y += p.speed;
      p.sway += p.swaySpeed;
      p.rotation += p.rotSpeed;

      if (p.y > canvas.height + p.size * 2) {
        p.y = -p.size * 2;
        p.x = Math.random() * canvas.width;
      }
    });
  }

  // Star particle
  function createStar() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.02,
      baseOpacity: 0.3 + Math.random() * 0.5
    };
  }

  function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function(p) {
      var opacity = p.baseOpacity + Math.sin(p.phase) * 0.3;
      if (opacity < 0) opacity = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 220, 255, ' + opacity + ')';
      ctx.fill();
      p.phase += p.speed;
    });
  }

  var drawFn = null;

  function startEffect(weather) {
    stopEffect();
    currentEffect = weather;
    particles = [];

    if (weather === 'sunny') {
      initSunRegion();
      for (var i = 0; i < 20; i++) particles.push(createLightPatch());
      drawFn = drawSunny;
    } else if (weather === 'rainy') {
      for (var i = 0; i < 25; i++) particles.push(createRipple());
      drawFn = drawRain;
    } else if (weather === 'snowy') {
      for (var i = 0; i < 60; i++) particles.push(createSnowFlake());
      drawFn = drawSnow;
    } else if (weather === 'night') {
      for (var i = 0; i < 80; i++) particles.push(createStar());
      drawFn = drawStars;
    } else {
      // sunny, cloudy, foggy - no canvas particles
      return;
    }

    function loop() {
      drawFn();
      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stopEffect() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];
    drawFn = null;
    currentEffect = null;
  }

  // Initialize
  function init() {
    createCanvas();
    // Watch for data-weather changes
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.attributeName === 'data-weather') {
          var weather = document.documentElement.getAttribute('data-weather');
          if (weather !== currentEffect) {
            if (weather) startEffect(weather);
            else stopEffect();
          }
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    // Check if already set
    var weather = document.documentElement.getAttribute('data-weather');
    if (weather) startEffect(weather);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
