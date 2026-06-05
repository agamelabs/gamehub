// Registers the GameHub service worker so the app works offline.
// Works from any page depth: it derives the site root from its own URL,
// so the worker is always registered at the root scope (covers all games).
(function () {
  if (!('serviceWorker' in navigator)) return;
  var self = document.currentScript;
  var src = (self && self.src) || '';
  var root = src.replace(/js\/pwa\.js(?:[?#].*)?$/, '');
  if (!root) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(root + 'sw.js').catch(function () { /* offline / unsupported */ });
  });
})();
