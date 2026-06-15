const GlobalSettingsModule = (() => {
  const STORAGE_KEY = 'bozGlobalSettings';
  const WIDTH_KEY = 'bozCompSettingsWidth';
  const MIN_W = 240;
  const MAX_W = 560;
  const DEFAULT_W = 300;

  const DEFAULT_FX = { delay: 0, reverb: 20, distortion: 0, tremolo: 0, environment: 25 };
  const DEFAULT_EQ = { low: 50, mid: 50, high: 50 };

  let state = {
    fx: { ...DEFAULT_FX },
    eq: { ...DEFAULT_EQ },
    instrument: 'piano',
    volume: 85,
    bpm: 100,
    keyOctave: 4
  };

  const INSTRUMENTS = ['piano', 'guitar', 'bass', 'violin', 'clarinet', 'saz', 'baglama'];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.fx) state.fx = { ...DEFAULT_FX, ...saved.fx };
      if (saved.eq) state.eq = { ...DEFAULT_EQ, ...saved.eq };
      if (saved.instrument && INSTRUMENTS.includes(saved.instrument)) state.instrument = saved.instrument;
      if (saved.volume != null) state.volume = saved.volume;
      if (saved.bpm != null) state.bpm = saved.bpm;
      if (saved.keyOctave != null) state.keyOctave = saved.keyOctave;
    } catch (e) { /* ignore corrupt storage */ }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatEqDb(v) {
    const db = Math.round((v - 50) * 0.24);
    return db > 0 ? `+${db}` : `${db}`;
  }

  function applyAudio() {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.enableFxRoute();
    AudioEngine.setFxSettings(state.fx);
    AudioEngine.setGlobalEq(state.eq);
  }

  function syncUi() {
    const fxMap = [
      ['compFxDelay', 'delay'],
      ['compFxReverb', 'reverb'],
      ['compFxDistortion', 'distortion'],
      ['compFxTremolo', 'tremolo'],
      ['compFxEnvironment', 'environment']
    ];
    fxMap.forEach(([id, key]) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(id + 'Val');
      if (el) el.value = state.fx[key];
      if (valEl) valEl.textContent = state.fx[key];
    });

    ['low', 'mid', 'high'].forEach(band => {
      const el = document.getElementById('compEq' + band.charAt(0).toUpperCase() + band.slice(1));
      const valEl = document.getElementById('compEq' + band.charAt(0).toUpperCase() + band.slice(1) + 'Val');
      if (el) el.value = state.eq[band];
      if (valEl) valEl.textContent = formatEqDb(state.eq[band]);
    });

    const instEl = document.getElementById('globalInstrument');
    if (instEl) {
      const cur = instEl.value || state.instrument;
      instEl.innerHTML = '';
      INSTRUMENTS.forEach(inst => {
        const opt = document.createElement('option');
        opt.value = inst;
        opt.textContent = I18n.instName(inst);
        if (inst === cur) opt.selected = true;
        instEl.appendChild(opt);
      });
    }
    const volEl = document.getElementById('globalVolume');
    const volVal = document.getElementById('globalVolumeVal');
    if (volEl) volEl.value = state.volume;
    if (volVal) volVal.textContent = state.volume;

    const tempo = document.getElementById('compTempo');
    const tempoVal = document.getElementById('compTempoVal');
    if (tempo && tempo !== document.activeElement) tempo.value = state.bpm;
    if (tempoVal) tempoVal.textContent = state.bpm;

    const octEl = document.getElementById('compOctave');
    if (octEl && octEl !== document.activeElement) octEl.value = state.keyOctave;
  }

  function bindSettingsPanel() {
    const panel = document.getElementById('compSettingsPanel');
    const toggle = document.getElementById('compSettingsToggle');
    const resizer = document.getElementById('compSettingsResizer');
    if (!panel || !toggle) return;

    function readWidth() {
      const saved = parseInt(localStorage.getItem(WIDTH_KEY), 10);
      if (!Number.isFinite(saved)) return DEFAULT_W;
      return Math.min(MAX_W, Math.max(MIN_W, saved));
    }

    function applyWidth(w) {
      panel.style.setProperty('--composer-settings-width', w + 'px');
    }

    function setOpen(open) {
      panel.classList.toggle('collapsed', !open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) applyWidth(readWidth());
    }

    toggle.addEventListener('click', () => {
      setOpen(panel.classList.contains('collapsed'));
    });

    applyWidth(readWidth());
    setOpen(false);

    if (!resizer) return;
    resizer.title = I18n.t('compose.settingsResize');

    let dragging = false;

    function onMove(e) {
      if (!dragging) return;
      const rect = panel.getBoundingClientRect();
      const w = Math.min(MAX_W, Math.max(MIN_W, rect.right - e.clientX));
      applyWidth(w);
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('resizing');
      document.body.classList.remove('composer-resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const w = parseInt(panel.style.getPropertyValue('--composer-settings-width'), 10);
      if (Number.isFinite(w)) localStorage.setItem(WIDTH_KEY, String(w));
    }

    resizer.addEventListener('mousedown', (e) => {
      if (panel.classList.contains('collapsed')) return;
      e.preventDefault();
      dragging = true;
      panel.classList.add('resizing');
      document.body.classList.add('composer-resizing');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function bindFxControls() {
    const map = [
      ['compFxDelay', 'delay'],
      ['compFxReverb', 'reverb'],
      ['compFxDistortion', 'distortion'],
      ['compFxTremolo', 'tremolo'],
      ['compFxEnvironment', 'environment']
    ];
    map.forEach(([id, key]) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(id + 'Val');
      if (!el) return;
      el.addEventListener('input', (e) => {
        state.fx[key] = parseInt(e.target.value, 10);
        if (valEl) valEl.textContent = state.fx[key];
        applyAudio();
        save();
        window.dispatchEvent(new CustomEvent('globalsettingschange', { detail: { fx: { ...state.fx } } }));
      });
    });
  }

  function bindEqControls() {
    ['low', 'mid', 'high'].forEach(band => {
      const el = document.getElementById('compEq' + band.charAt(0).toUpperCase() + band.slice(1));
      if (!el) return;
      el.addEventListener('input', (e) => {
        state.eq[band] = parseInt(e.target.value, 10);
        const valEl = document.getElementById('compEq' + band.charAt(0).toUpperCase() + band.slice(1) + 'Val');
        if (valEl) valEl.textContent = formatEqDb(state.eq[band]);
        applyAudio();
        save();
        if (typeof ComposerModule !== 'undefined' && ComposerModule.syncTrackEqFromGlobal) {
          ComposerModule.syncTrackEqFromGlobal(state.eq);
        }
      });
    });
  }

  function bindPlayControls() {
    const instEl = document.getElementById('globalInstrument');
    if (instEl) {
      instEl.addEventListener('change', (e) => {
        state.instrument = e.target.value;
        save();
        window.dispatchEvent(new CustomEvent('globalsettingschange', { detail: { instrument: state.instrument } }));
      });
    }

    const volEl = document.getElementById('globalVolume');
    const volVal = document.getElementById('globalVolumeVal');
    if (volEl) {
      volEl.addEventListener('input', (e) => {
        state.volume = parseInt(e.target.value, 10);
        if (volVal) volVal.textContent = state.volume;
        save();
      });
    }

    const tempo = document.getElementById('compTempo');
    const tempoVal = document.getElementById('compTempoVal');
    if (tempo) {
      tempo.addEventListener('input', (e) => {
        state.bpm = parseInt(e.target.value, 10);
        if (tempoVal) tempoVal.textContent = state.bpm;
        save();
        window.dispatchEvent(new CustomEvent('globalsettingschange', { detail: { bpm: state.bpm } }));
        if (typeof ComposerModule !== 'undefined' && ComposerModule.setBpm) ComposerModule.setBpm(state.bpm);
      });
    }

    const octEl = document.getElementById('compOctave');
    if (octEl) {
      octEl.addEventListener('change', (e) => {
        state.keyOctave = parseInt(e.target.value, 10);
        save();
        window.dispatchEvent(new CustomEvent('globalsettingschange', { detail: { keyOctave: state.keyOctave } }));
      });
    }
  }

  function init() {
    load();
    applyAudio();
    bindSettingsPanel();
    bindFxControls();
    bindEqControls();
    bindPlayControls();
    syncUi();
  }

  function getFx() { return { ...state.fx }; }

  function setFx(fx) {
    state.fx = { ...DEFAULT_FX, ...fx };
    applyAudio();
    save();
    syncUi();
  }

  function getEq() { return { ...state.eq }; }

  function setEq(eq) {
    state.eq = { ...DEFAULT_EQ, ...eq };
    applyAudio();
    save();
    syncUi();
  }

  function getInstrument() { return state.instrument; }

  function setInstrument(inst) {
    if (!INSTRUMENTS.includes(inst)) return;
    state.instrument = inst;
    save();
    const el = document.getElementById('globalInstrument');
    if (el) el.value = inst;
  }

  function getVolume() { return (state.volume / 100) * 0.35; }

  function getBpm() { return state.bpm; }

  function setBpm(bpm) {
    state.bpm = bpm;
    save();
    syncUi();
    window.dispatchEvent(new CustomEvent('globalsettingschange', { detail: { bpm: state.bpm } }));
  }

  function getKeyOctave() { return state.keyOctave; }

  function setKeyOctave(o) {
    state.keyOctave = Math.min(6, Math.max(2, o));
    save();
    syncUi();
    window.dispatchEvent(new CustomEvent('globalsettingschange', { detail: { keyOctave: state.keyOctave } }));
  }

  function playNote(note, octave, duration = 0.8, when = null) {
    AudioEngine.playInstrumentNote(
      note, octave, state.instrument, duration, getVolume(), when, state.eq
    );
  }

  return {
    init,
    getFx,
    setFx,
    getEq,
    setEq,
    getInstrument,
    setInstrument,
    getVolume,
    getBpm,
    setBpm,
    getKeyOctave,
    setKeyOctave,
    playNote,
    syncUi,
    formatEqDb
  };
})();
