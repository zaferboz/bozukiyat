const TunerModule = (() => {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const TUNINGS = {
    guitar: {
      strings: [
        { note: 'E', octave: 2, labelKey: 'tuner.str.guitar.6' },
        { note: 'A', octave: 2, labelKey: 'tuner.str.guitar.5' },
        { note: 'D', octave: 3, labelKey: 'tuner.str.guitar.4' },
        { note: 'G', octave: 3, labelKey: 'tuner.str.guitar.3' },
        { note: 'B', octave: 3, labelKey: 'tuner.str.guitar.2' },
        { note: 'E', octave: 4, labelKey: 'tuner.str.guitar.1' }
      ]
    },
    bass: {
      strings: [
        { note: 'E', octave: 1, labelKey: 'tuner.str.bass.4' },
        { note: 'A', octave: 1, labelKey: 'tuner.str.bass.3' },
        { note: 'D', octave: 2, labelKey: 'tuner.str.bass.2' },
        { note: 'G', octave: 2, labelKey: 'tuner.str.bass.1' }
      ]
    },
    violin: {
      strings: [
        { note: 'G', octave: 3, labelKey: 'tuner.str.violin.4' },
        { note: 'D', octave: 4, labelKey: 'tuner.str.violin.3' },
        { note: 'A', octave: 4, labelKey: 'tuner.str.violin.2' },
        { note: 'E', octave: 5, labelKey: 'tuner.str.violin.1' }
      ]
    },
    baglama: {
      strings: [
        { note: 'A', octave: 2, labelKey: 'tuner.str.baglama.4' },
        { note: 'D', octave: 3, labelKey: 'tuner.str.baglama.3' },
        { note: 'A', octave: 3, labelKey: 'tuner.str.baglama.2' },
        { note: 'D', octave: 4, labelKey: 'tuner.str.baglama.1' }
      ]
    },
    saz: {
      strings: [
        { note: 'G', octave: 2, labelKey: 'tuner.str.saz.3' },
        { note: 'D', octave: 3, labelKey: 'tuner.str.saz.2' },
        { note: 'G', octave: 3, labelKey: 'tuner.str.saz.1' }
      ]
    }
  };

  let instrument = 'guitar';
  let selectedString = 0;
  let autoString = true;
  let listening = false;
  let stream = null;
  let micSource = null;
  let analyser = null;
  let timeBuf = null;
  let rafId = null;
  let smoothFreq = 0;
  let refTimer = null;

  function tuning() {
    return TUNINGS[instrument];
  }

  function stringFreq(str) {
    return AudioEngine.getFrequency(str.note, str.octave);
  }

  function stringLabel(str) {
    if (str.labelKey) {
      const t = I18n.t(str.labelKey);
      if (t !== str.labelKey) return t;
    }
    return `${str.note}${str.octave}`;
  }

  function detectPitch(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.008) return -1;

    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.15;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const slice = buf.slice(r1, r2);
    const len = slice.length;
    if (len < 64) return -1;

    const c = new Float32Array(len);
    for (let lag = 0; lag < len; lag++) {
      let sum = 0;
      for (let i = 0; i < len - lag; i++) sum += slice[i] * slice[i + lag];
      c[lag] = sum;
    }

    let d = 0;
    while (d < len - 1 && c[d] > c[d + 1]) d++;

    let maxVal = -1;
    let maxPos = -1;
    for (let i = d; i < len; i++) {
      if (c[i] > maxVal) {
        maxVal = c[i];
        maxPos = i;
      }
    }
    if (maxPos <= 0) return -1;

    let T0 = maxPos;
    if (T0 > 0 && T0 < len - 1) {
      const yl = c[T0 - 1];
      const y = c[T0];
      const yr = c[T0 + 1];
      const a = (yl + yr - 2 * y) / 2;
      const b = (yr - yl) / 2;
      if (a) T0 = T0 - b / (2 * a);
    }

    const freq = sampleRate / T0;
    if (freq < 30 || freq > 2000) return -1;
    return freq;
  }

  function freqToNote(freq) {
    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return { note: NOTE_NAMES[pc], octave, midi };
  }

  function centsOff(freq, targetFreq) {
    return 1200 * Math.log2(freq / targetFreq);
  }

  function nearestStringIndex(freq) {
    const strings = tuning().strings;
    let best = 0;
    let bestAbs = Infinity;
    strings.forEach((s, i) => {
      const c = Math.abs(centsOff(freq, stringFreq(s)));
      if (c < bestAbs) {
        bestAbs = c;
        best = i;
      }
    });
    return best;
  }

  function renderStrings() {
    const wrap = document.getElementById('tunerStrings');
    if (!wrap) return;
    wrap.innerHTML = '';
    tuning().strings.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tuner-string-btn' + (i === selectedString ? ' active' : '');
      btn.innerHTML = `<span class="tuner-string-name">${stringLabel(s)}</span>` +
        `<span class="tuner-string-freq">${Math.round(stringFreq(s))} Hz</span>`;
      btn.addEventListener('click', () => {
        autoString = false;
        selectedString = i;
        renderStrings();
        updateDisplay(smoothFreq || 0);
      });
      wrap.appendChild(btn);
    });
  }

  function updateDisplay(freq) {
    const noteEl = document.getElementById('tunerNote');
    const freqEl = document.getElementById('tunerFreq');
    const centsEl = document.getElementById('tunerCents');
    const needle = document.getElementById('tunerNeedle');
    const gauge = document.getElementById('tunerGauge');
    const targetEl = document.getElementById('tunerTarget');
    const statusEl = document.getElementById('tunerStatus');

    if (!noteEl) return;

    const strings = tuning().strings;
    const target = strings[selectedString];
    const targetFreq = stringFreq(target);

    if (targetEl) {
      targetEl.textContent = I18n.t('tuner.target', {
        string: stringLabel(target),
        freq: Math.round(targetFreq)
      });
    }

    if (freq <= 0 || !Number.isFinite(freq)) {
      noteEl.textContent = '—';
      if (freqEl) freqEl.textContent = '— Hz';
      if (centsEl) centsEl.textContent = '—';
      if (needle) needle.style.transform = 'rotate(0deg)';
      if (gauge) gauge.classList.remove('in-tune', 'sharp', 'flat');
      if (statusEl) statusEl.textContent = listening ? I18n.t('tuner.listening') : I18n.t('tuner.silent');
      document.querySelectorAll('.tuner-string-btn').forEach((b, i) => {
        b.classList.toggle('near', false);
        b.classList.toggle('active', i === selectedString);
      });
      return;
    }

    const note = freqToNote(freq);
    noteEl.textContent = `${note.note}${note.octave}`;
    if (freqEl) freqEl.textContent = `${freq.toFixed(1)} Hz`;

    const cents = centsOff(freq, targetFreq);
    const clamped = Math.max(-50, Math.min(50, cents));
    if (centsEl) {
      const sign = cents >= 0 ? '+' : '';
      centsEl.textContent = `${sign}${cents.toFixed(0)}¢`;
    }
    if (needle) needle.style.transform = `rotate(${clamped * 1.8}deg)`;

    if (gauge) {
      gauge.classList.remove('in-tune', 'sharp', 'flat');
      if (Math.abs(cents) <= 5) gauge.classList.add('in-tune');
      else if (cents > 0) gauge.classList.add('sharp');
      else gauge.classList.add('flat');
    }

    if (statusEl) {
      if (Math.abs(cents) <= 5) statusEl.textContent = I18n.t('tuner.inTune');
      else if (cents > 0) statusEl.textContent = I18n.t('tuner.sharp');
      else statusEl.textContent = I18n.t('tuner.flat');
    }

    document.querySelectorAll('.tuner-string-btn').forEach((b, i) => {
      const s = strings[i];
      const diff = Math.abs(centsOff(freq, stringFreq(s)));
      b.classList.toggle('near', diff <= 8 && i !== selectedString);
      b.classList.toggle('active', i === selectedString);
    });
  }

  function tick() {
    if (!analyser || !timeBuf) return;
    analyser.getFloatTimeDomainData(timeBuf);
    const ctx = AudioEngine.getContext();
    const raw = detectPitch(timeBuf, ctx.sampleRate);
    if (raw > 0) {
      smoothFreq = smoothFreq ? smoothFreq * 0.65 + raw * 0.35 : raw;
      if (autoString) selectedString = nearestStringIndex(smoothFreq);
    } else {
      smoothFreq *= 0.85;
      if (smoothFreq < 40) smoothFreq = 0;
    }
    updateDisplay(smoothFreq);
    rafId = requestAnimationFrame(tick);
  }

  async function startMic() {
    if (listening) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus(I18n.t('tuner.noMic'), false);
      return;
    }
    try {
      const btn = document.getElementById('tunerToggle');
      if (btn) btn.disabled = true;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false }
      });
      const ctx = AudioEngine.getContext();
      micSource = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.82;
      timeBuf = new Float32Array(analyser.fftSize);
      micSource.connect(analyser);
      listening = true;
      smoothFreq = 0;
      setMicStatus(I18n.t('tuner.micOn'), true);
      syncToggleBtn();
      tick();
    } catch (err) {
      console.warn('Microphone access failed:', err);
      setMicStatus(I18n.t('tuner.micDenied'), false);
      stopMic();
    } finally {
      const btn = document.getElementById('tunerToggle');
      if (btn) btn.disabled = false;
    }
  }

  function stopMic() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (micSource) {
      try { micSource.disconnect(); } catch (e) { /* already disconnected */ }
      micSource = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    analyser = null;
    timeBuf = null;
    listening = false;
    smoothFreq = 0;
    setMicStatus(I18n.t('tuner.micOff'), null);
    syncToggleBtn();
    updateDisplay(0);
  }

  function setMicStatus(text, ok) {
    const el = document.getElementById('tunerMicStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('tuner-ok', ok === true);
    el.classList.toggle('tuner-err', ok === false);
  }

  function syncToggleBtn() {
    const btn = document.getElementById('tunerToggle');
    if (!btn) return;
    btn.textContent = listening ? I18n.t('tuner.stopMic') : I18n.t('tuner.startMic');
    btn.classList.toggle('active', listening);
  }

  function playReference() {
    const s = tuning().strings[selectedString];
    const instMap = {
      guitar: 'guitar',
      bass: 'bass',
      violin: 'violin',
      baglama: 'baglama',
      saz: 'saz'
    };
    const inst = instMap[instrument] || 'guitar';
    const vol = typeof GlobalSettingsModule !== 'undefined' ? GlobalSettingsModule.getVolume() : 0.3;
    AudioEngine.playInstrumentNote(s.note, s.octave, inst, 1.4, vol, null, null);
    if (refTimer) clearTimeout(refTimer);
    const btn = document.getElementById('tunerPlayRef');
    if (btn) btn.classList.add('active');
    refTimer = setTimeout(() => {
      if (btn) btn.classList.remove('active');
      refTimer = null;
    }, 900);
  }

  function isActive() {
    const panel = document.getElementById('tuner');
    return panel && panel.classList.contains('active');
  }

  function init() {
    const instSel = document.getElementById('tunerInstrument');
    if (instSel) {
      instSel.innerHTML = '';
      Object.keys(TUNINGS).forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = I18n.t(`tuner.inst.${key}`);
        instSel.appendChild(opt);
      });
      instSel.value = instrument;
      instSel.addEventListener('change', (e) => {
        instrument = e.target.value;
        selectedString = 0;
        renderStrings();
        updateDisplay(smoothFreq || 0);
      });
    }

    const autoEl = document.getElementById('tunerAutoString');
    if (autoEl) {
      autoEl.checked = autoString;
      autoEl.addEventListener('change', (e) => {
        autoString = e.target.checked;
        if (autoString && smoothFreq > 0) selectedString = nearestStringIndex(smoothFreq);
        renderStrings();
        updateDisplay(smoothFreq || 0);
      });
    }

    document.getElementById('tunerToggle')?.addEventListener('click', () => {
      if (listening) stopMic();
      else startMic();
    });
    document.getElementById('tunerPlayRef')?.addEventListener('click', playReference);

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab !== 'tuner') stopMic();
      });
    });

    renderStrings();
    syncToggleBtn();
    setMicStatus(I18n.t('tuner.micOff'), null);
    updateDisplay(0);
  }

  function onLangChange() {
    const instSel = document.getElementById('tunerInstrument');
    if (instSel) {
      const cur = instSel.value;
      instSel.innerHTML = '';
      Object.keys(TUNINGS).forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = I18n.t(`tuner.inst.${key}`);
        if (key === cur) opt.selected = true;
        instSel.appendChild(opt);
      });
    }
    renderStrings();
    syncToggleBtn();
    if (!listening) setMicStatus(I18n.t('tuner.micOff'), null);
    updateDisplay(smoothFreq || 0);
  }

  return { init, onLangChange, stopMic, isActive };
})();
