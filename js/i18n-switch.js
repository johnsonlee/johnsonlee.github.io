(function() {
  var LANG_KEY = 'lang-preference';

  function getLang() {
    var params = new URLSearchParams(window.location.search);
    var paramLang = params.get('lang');
    if (paramLang) return paramLang;
    return localStorage.getItem(LANG_KEY) || null;
  }

  function setLang(lang) {
    if (lang && lang !== 'zh-CN') {
      localStorage.setItem(LANG_KEY, lang);
    } else {
      localStorage.removeItem(LANG_KEY);
    }
  }

  function updateURL(lang) {
    var url = new URL(window.location.href);
    if (lang && lang !== 'zh-CN') {
      url.searchParams.set('lang', lang);
    } else {
      url.searchParams.delete('lang');
    }
    history.replaceState(null, '', url.toString());
  }

  var translations = {
    'en': {
      '分类': 'Categories', '标签': 'Tags', '最近文章': 'Recent',
      '友情链接': 'Links', '首页': 'Home', '归档': 'Archive',
      '关于': 'About', '订阅': 'RSS', '阅读全文': 'Read More',
      '分享': 'Share', '上一篇': 'Previous', '下一篇': 'Next',
      '下一页': 'Next', '上一页': 'Previous'
    },
    'zh-CN': {
      'Categories': '分类', 'Tags': '标签', 'Recent': '最近文章',
      'Links': '友情链接', 'Home': '首页', 'Archive': '归档',
      'About': '关于', 'RSS': '订阅', 'Read More': '阅读全文',
      'Share': '分享', 'Previous': '上一篇', 'Next': '下一篇'
    }
  };

  function translateUI(lang) {
    var dict = translations[lang];
    if (!dict) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var node = walker.currentNode;
      var text = node.textContent.trim();
      if (text && dict[text]) {
        node.textContent = node.textContent.replace(text, dict[text]);
      }
    }
  }

  // Try to swap post content from /en/ version (only for post pages with translations)
  function trySwapPostContent() {
    var enPath = '/en' + window.location.pathname;
    return fetch(enPath).then(function(res) {
      if (!res.ok) return null;
      return res.text();
    }).then(function(html) {
      if (!html) return;
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      // Only swap if it's actually an English post (not a 404 page)
      var enTitle = doc.querySelector('.post-title');
      if (!enTitle) return;

      var swaps = ['.post-title', '.post-content', '.post-meta', '.content_container .post-copyright'];
      swaps.forEach(function(sel) {
        var src = doc.querySelector(sel);
        var dst = document.querySelector(sel);
        if (src && dst) dst.innerHTML = src.innerHTML;
      });

      // Update page title
      document.title = doc.title;
    }).catch(function() {
      // No English version — that's fine, just translate UI
    });
  }

  function switchToEnglish() {
    // 1. Translate all UI text
    translateUI('en');
    document.documentElement.setAttribute('lang', 'en');

    // 2. Try to swap post content if English version exists
    trySwapPostContent();

    // 3. Update state
    setLang('en');
    updateURL('en');
    updateSwitchButton('en');
  }

  function switchToChinese() {
    setLang(null);
    var url = new URL(window.location.href);
    url.searchParams.delete('lang');
    window.location.href = url.toString();
  }

  function updateSwitchButton(currentLang) {
    var btn = document.querySelector('.lang-switch');
    if (!btn) return;
    if (currentLang === 'en') {
      btn.textContent = '\u4E2D\u6587';
      btn.setAttribute('data-target-lang', 'zh-CN');
    } else {
      btn.textContent = 'EN';
      btn.setAttribute('data-target-lang', 'en');
    }
  }

  function init() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.lang-switch');
      if (!btn) return;
      e.preventDefault();
      var targetLang = btn.getAttribute('data-target-lang') || 'en';
      if (targetLang === 'en') {
        switchToEnglish();
      } else {
        switchToChinese();
      }
    });

    // Auto-switch if preference is English
    if (getLang() === 'en') {
      switchToEnglish();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
