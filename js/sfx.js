// Shared sound effects for GameHub — synthesized with the Web Audio API.
// No audio files needed: works offline, loads instantly, tiny footprint.
// Sounds are cheerful & gentle, made for kids (Minh An & Quang Minh).
(function () {
  const STORAGE_MUTE = 'gh.muted';

  let ctx = null;
  let master = null;
  let enabled = localStorage.getItem(STORAGE_MUTE) !== '1';

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  // Resume the audio context — browsers require a user gesture first.
  function resume() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  // A single shaped tone. opts: {freq, type, start, dur, vol, glide}
  function tone(opts) {
    if (!enabled || !ensureCtx()) return;
    const t0 = ctx.currentTime + (opts.start || 0);
    const dur = opts.dur || 0.15;
    const vol = opts.vol == null ? 0.3 : opts.vol;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(opts.freq, t0);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(opts.glide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // Play an ascending/descending melody of notes.
  function melody(freqs, opts) {
    opts = opts || {};
    const gap = opts.gap == null ? 0.1 : opts.gap;
    const dur = opts.dur || 0.14;
    freqs.forEach((f, i) => tone({
      freq: f, type: opts.type || 'triangle',
      start: i * gap, dur, vol: opts.vol == null ? 0.28 : opts.vol,
    }));
  }

  // Short noise burst (for whacks, pops).
  function noise(opts) {
    if (!enabled || !ensureCtx()) return;
    opts = opts || {};
    const dur = opts.dur || 0.12;
    const t0 = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter || 'bandpass';
    filter.frequency.value = opts.freq || 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol == null ? 0.3 : opts.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur);
  }

  const SFX = {
    get enabled() { return enabled; },

    init: ensureCtx,
    resume,
    tone,
    melody,

    // --- Named effects -----------------------------------------------------
    click()    { tone({ freq: 660, type: 'square',   dur: 0.07, vol: 0.18 }); },
    flip()     { tone({ freq: 520, type: 'triangle', dur: 0.09, vol: 0.2, glide: 760 }); },
    pop()      { tone({ freq: 880, type: 'sine',     dur: 0.1,  vol: 0.3, glide: 1320 }); },
    move()     { tone({ freq: 300, type: 'sine',     dur: 0.06, vol: 0.12 }); },

    eat()      { tone({ freq: 520, type: 'square', dur: 0.08, vol: 0.22, glide: 880 }); },
    merge()    { melody([523, 784], { gap: 0.07, dur: 0.12, type: 'triangle', vol: 0.26 }); },

    whack()    { noise({ freq: 1200, dur: 0.1, vol: 0.35 }); tone({ freq: 240, type: 'square', dur: 0.08, vol: 0.18, glide: 120 }); },

    correct()  { melody([659, 988], { gap: 0.09, dur: 0.13, type: 'triangle', vol: 0.3 }); },
    match()    { melody([784, 1047, 1319], { gap: 0.08, dur: 0.12, type: 'triangle', vol: 0.26 }); },
    wrong()    { tone({ freq: 320, type: 'sawtooth', dur: 0.28, vol: 0.22, glide: 150 }); },

    start()    { melody([392, 523, 659], { gap: 0.08, dur: 0.12, type: 'triangle', vol: 0.26 }); },
    tick()     { tone({ freq: 700, type: 'square', dur: 0.05, vol: 0.16 }); },

    win()      { melody([523, 659, 784, 1047], { gap: 0.13, dur: 0.18, type: 'triangle', vol: 0.32 }); },
    gameover() { melody([523, 415, 311, 247], { gap: 0.16, dur: 0.22, type: 'sine', vol: 0.26 }); },

    // --- Mute toggle -------------------------------------------------------
    setEnabled(on) {
      enabled = !!on;
      localStorage.setItem(STORAGE_MUTE, enabled ? '0' : '1');
      updateButtons();
      if (enabled) { resume(); this.click(); }
    },
    toggle() { this.setEnabled(!enabled); },
  };

  window.SFX = SFX;

  // --- Floating mute button injected on every page -------------------------
  const buttons = [];
  function updateButtons() {
    buttons.forEach((b) => {
      b.textContent = enabled ? '🔊' : '🔇';
      b.setAttribute('aria-label', enabled ? 'Tắt âm thanh' : 'Bật âm thanh');
      b.classList.toggle('muted', !enabled);
    });
  }

  function injectButton() {
    if (document.querySelector('.sfx-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'sfx-toggle';
    btn.type = 'button';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      SFX.toggle();
    });
    document.body.appendChild(btn);
    buttons.push(btn);
    updateButtons();
  }

  // Unlock audio on the first user interaction (required by browsers).
  function unlockOnce() {
    resume();
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
    window.removeEventListener('touchstart', unlockOnce);
  }
  window.addEventListener('pointerdown', unlockOnce);
  window.addEventListener('keydown', unlockOnce);
  window.addEventListener('touchstart', unlockOnce);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
