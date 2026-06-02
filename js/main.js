// Shared utilities for the GameHub
(function () {
  const PLAYERS = {
    minhan:    { name: 'Minh An',     avatar: '🦊', age: 6 },
    quangminh: { name: 'Quang Minh',  avatar: '🐯', age: 13 },
  };

  const STORAGE_PLAYER = 'gh.player';
  const STORAGE_BEST_PREFIX = 'gh.best.';

  const Hub = {
    getPlayer() {
      const id = localStorage.getItem(STORAGE_PLAYER);
      return id && PLAYERS[id] ? { id, ...PLAYERS[id] } : null;
    },
    setPlayer(id) {
      if (!PLAYERS[id]) return;
      localStorage.setItem(STORAGE_PLAYER, id);
    },
    clearPlayer() {
      localStorage.removeItem(STORAGE_PLAYER);
    },
    bestKey(game) {
      const id = localStorage.getItem(STORAGE_PLAYER) || 'guest';
      return STORAGE_BEST_PREFIX + id + '.' + game;
    },
    getBest(game) {
      const v = localStorage.getItem(this.bestKey(game));
      return v ? Number(v) : null;
    },
    saveBest(game, score, mode = 'high') {
      const cur = this.getBest(game);
      if (cur == null) { localStorage.setItem(this.bestKey(game), String(score)); return true; }
      if (mode === 'high' && score > cur) { localStorage.setItem(this.bestKey(game), String(score)); return true; }
      if (mode === 'low'  && score < cur) { localStorage.setItem(this.bestKey(game), String(score)); return true; }
      return false;
    },
  };

  window.Hub = Hub;

  // Home-page wiring
  const picker = document.getElementById('playerPicker');
  const hub = document.getElementById('hub');
  if (picker && hub) {
    const wName = document.getElementById('welcomeName');
    const wAv = document.getElementById('welcomeAvatar');

    const renderBests = () => {
      document.querySelectorAll('.best[data-game]').forEach((el) => {
        const v = Hub.getBest(el.dataset.game);
        el.textContent = v == null ? '—' : v;
      });
    };

    const showHub = (id) => {
      const p = PLAYERS[id];
      Hub.setPlayer(id);
      wName.textContent = p.name;
      wAv.textContent = p.avatar;
      picker.hidden = true;
      hub.hidden = false;
      renderBests();
    };

    picker.querySelectorAll('.player-card').forEach((b) => {
      b.addEventListener('click', () => showHub(b.dataset.player));
    });

    document.getElementById('switchBtn').addEventListener('click', () => {
      Hub.clearPlayer();
      picker.hidden = false;
      hub.hidden = true;
    });

    const existing = Hub.getPlayer();
    if (existing) showHub(existing.id);
  }
})();
