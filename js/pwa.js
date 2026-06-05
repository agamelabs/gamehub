// Registers the GameHub service worker so the app works offline, and keeps
// it up to date automatically. Works from any page depth: it derives the
// site root from its own URL, so the worker is registered at the root scope.
(function () {
  if (!('serviceWorker' in navigator)) return;
  var self = document.currentScript;
  var src = (self && self.src) || '';
  var root = src.replace(/js\/pwa\.js(?:[?#].*)?$/, '');
  if (!root) return;

  // Reload once when a brand-new worker takes over — but only if the page is
  // hidden, so an update never interrupts a game in progress.
  var hadController = !!navigator.serviceWorker.controller;
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing || !hadController) return;
    if (document.visibilityState === 'hidden') { refreshing = true; location.reload(); }
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(root + 'sw.js').then(function (reg) {
      // Check for a new version now and whenever the app is reopened/focused.
      reg.update();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update();
      });
    }).catch(function () { /* offline or unsupported — ignore */ });
  });
})();
