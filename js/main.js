// Shared utilities for the GameHub
(function () {
  const CODE = '040210';
  const STORAGE_UNLOCK = 'gh.unlock';
  const STORAGE_BEST_PREFIX = 'gh.best.family.';

  const Hub = {
    isUnlocked() {
      return localStorage.getItem(STORAGE_UNLOCK) === CODE;
    },
    unlock() {
      localStorage.setItem(STORAGE_UNLOCK, CODE);
    },
    lock() {
      localStorage.removeItem(STORAGE_UNLOCK);
    },
    getPlayer() {
      return null;
    },
    bestKey(game) {
      return STORAGE_BEST_PREFIX + game;
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

  const gate = document.getElementById('codeGate');
  const hub = document.getElementById('hub');
  if (!gate || !hub) return;

  const inputs = Array.from(document.querySelectorAll('#codeInputs .code-input'));
  const errorEl = document.getElementById('codeError');

  const renderBests = () => {
    document.querySelectorAll('.best[data-game]').forEach((el) => {
      const v = Hub.getBest(el.dataset.game);
      el.textContent = v == null ? '—' : v;
    });
  };

  const showHub = () => {
    Hub.unlock();
    gate.hidden = true;
    hub.hidden = false;
    renderBests();
  };

  const showGate = () => {
    Hub.lock();
    hub.hidden = true;
    gate.hidden = false;
    inputs.forEach((i) => { i.value = ''; });
    errorEl.hidden = true;
    setTimeout(() => inputs[0]?.focus(), 50);
  };

  const readCode = () => inputs.map((i) => i.value).join('');

  const flashError = () => {
    errorEl.hidden = false;
    gate.classList.add('shake');
    setTimeout(() => gate.classList.remove('shake'), 400);
  };

  const tryCode = () => {
    const code = readCode();
    if (code.length < 6) return;
    if (code === CODE) {
      showHub();
    } else {
      flashError();
      inputs.forEach((i) => { i.value = ''; });
      inputs[0].focus();
    }
  };

  inputs.forEach((inp, idx) => {
    inp.addEventListener('input', (e) => {
      const digit = e.target.value.replace(/\D/g, '').slice(-1);
      e.target.value = digit;
      errorEl.hidden = true;
      if (digit && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
      if (idx === inputs.length - 1 && readCode().length === 6) {
        tryCode();
      }
    });

    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && idx > 0) {
        inputs[idx - 1].focus();
        inputs[idx - 1].value = '';
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        inputs[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        tryCode();
      }
    });

    inp.addEventListener('paste', (e) => {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const digits = text.replace(/\D/g, '').slice(0, inputs.length).split('');
      if (!digits.length) return;
      e.preventDefault();
      digits.forEach((d, i) => { if (inputs[i]) inputs[i].value = d; });
      const next = Math.min(digits.length, inputs.length - 1);
      inputs[next].focus();
      if (readCode().length === 6) tryCode();
    });
  });

  document.getElementById('switchBtn').addEventListener('click', showGate);

  if (Hub.isUnlocked()) {
    showHub();
  } else {
    setTimeout(() => inputs[0]?.focus(), 100);
  }
})();
