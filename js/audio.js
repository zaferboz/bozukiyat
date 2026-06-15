const AudioEngine = (() => {
  let context = null;
  let masterGain = null;

  function getContext() {
    if (!context) {
      context = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = context.createGain();
      masterGain.gain.value = 0.9;
      // Gentle compression keeps chords from clipping.
      const comp = context.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      masterGain.connect(comp);
      comp.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  let fxRouteActive = false;
  let compEntry = null;
  let fxDryGain, fxSendGain, fxWetMaster, fxDistNode, fxDelay, fxDelayFb, fxDelayReturn, fxReverb, fxTremGain;
  const fxSettings = { delay: 0, reverb: 20, distortion: 0, tremolo: 0, environment: 25 };

  function makeReverbImpulse(seconds, decay) {
    const ctx = getContext();
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function makeDistCurve(amount) {
    const curve = new Float32Array(256);
    const k = Math.max(0, amount) * 120;
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function ensureComposerChain() {
    if (compEntry) return;
    const ctx = getContext();
    compEntry = ctx.createGain();
    compEntry.gain.value = 1;

    fxDryGain = ctx.createGain();
    fxDryGain.gain.value = 1;
    compEntry.connect(fxDryGain);
    fxDryGain.connect(masterGain);

    fxSendGain = ctx.createGain();
    fxSendGain.gain.value = 0;
    compEntry.connect(fxSendGain);

    fxDistNode = ctx.createWaveShaper();
    fxDistNode.oversample = '2x';
    fxDistNode.curve = makeDistCurve(0);

    fxDelay = ctx.createDelay(1.5);
    fxDelay.delayTime.value = 0.32;
    fxDelayReturn = ctx.createGain();
    fxDelayReturn.gain.value = 0;
    fxDelayFb = ctx.createGain();
    fxDelayFb.gain.value = 0;

    fxReverb = ctx.createConvolver();
    fxReverb.buffer = makeReverbImpulse(1.4, 2);

    fxTremGain = ctx.createGain();
    fxTremGain.gain.value = 1;

    fxWetMaster = ctx.createGain();
    fxWetMaster.gain.value = 0;

    fxSendGain.connect(fxDistNode);
    fxDistNode.connect(fxDelay);
    fxDelay.connect(fxDelayReturn);
    fxDelay.connect(fxDelayFb);
    fxDelayFb.connect(fxDelay);
    fxDelayReturn.connect(fxReverb);
    fxReverb.connect(fxTremGain);
    fxTremGain.connect(fxWetMaster);
    fxWetMaster.connect(masterGain);

    applyFxSettings();
  }

  function applyFxSettings(s) {
    if (s) Object.assign(fxSettings, s);
    if (!fxDryGain) return;
    const env = (fxSettings.environment ?? 0) / 100;
    const dly = fxSettings.delay / 100;
    const dist = fxSettings.distortion / 100;
    const trem = fxSettings.tremolo / 100;
    const rev = fxSettings.reverb / 100;

    const wetMix = Math.min(0.7, dly * 0.55 + rev * 0.45 + env * 0.35 + dist * 0.3 + trem * 0.15);
    fxDryGain.gain.value = Math.max(0.35, 1 - wetMix * 0.55);
    fxSendGain.gain.value = wetMix;
    fxWetMaster.gain.value = 0.75 + env * 0.35;
    fxDistNode.curve = makeDistCurve(dist);
    fxDelayReturn.gain.value = dly > 0.01 ? 0.45 + dly * 0.45 : 0;
    fxDelayFb.gain.value = dly > 0.01 ? 0.15 + dly * 0.3 : 0;
    fxTremGain.gain.value = 1 - trem * 0.35;
  }

  function enableFxRoute() {
    fxRouteActive = true;
    ensureComposerChain();
  }

  function setComposerRoute(on) {
    enableFxRoute();
  }

  function setFxSettings(s) {
    applyFxSettings(s);
  }

  function getFxSettings() {
    return { ...fxSettings };
  }

  function out() {
    getContext();
    if (fxRouteActive) {
      ensureComposerChain();
      return compEntry;
    }
    return masterGain;
  }

  let _playEq = null;
  let globalEq = { low: 50, mid: 50, high: 50 };

  function setGlobalEq(eq) {
    if (eq) globalEq = { low: eq.low ?? 50, mid: eq.mid ?? 50, high: eq.high ?? 50 };
  }

  function getGlobalEq() {
    return { ...globalEq };
  }

  function eqDb(v) {
    return ((v == null ? 50 : v) - 50) * 0.24;
  }

  function eqIsFlat(eq) {
    if (!eq) return true;
    return eq.low === 50 && eq.mid === 50 && eq.high === 50;
  }

  function connectEqChain(fromNode, eq) {
    if (eqIsFlat(eq)) return fromNode;
    const ctx = getContext();
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 280;
    low.gain.value = eqDb(eq.low);
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1100;
    mid.Q.value = 1;
    mid.gain.value = eqDb(eq.mid);
    const high = ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 3800;
    high.gain.value = eqDb(eq.high);
    fromNode.connect(low);
    low.connect(mid);
    mid.connect(high);
    return high;
  }

  function connectToOut(fromNode, eq) {
    const dest = out();
    let node = connectEqChain(fromNode, eq);
    node = connectEqChain(node, globalEq);
    node.connect(dest);
  }

  function connectOut(fromNode) {
    connectToOut(fromNode, _playEq);
  }

  const noteFrequencies = {};
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  for (let octave = 0; octave <= 8; octave++) {
    for (let i = 0; i < 12; i++) {
      const semitone = octave * 12 + i;
      noteFrequencies[noteNames[i] + octave] = 440 * Math.pow(2, (semitone - 57) / 12);
    }
  }

  function getFrequency(note, octave = null) {
    if (octave !== null) return noteFrequencies[note + octave] || 440;
    if (note in noteFrequencies) return noteFrequencies[note];
    const match = note.match(/([A-G]#?)(\d)$/);
    if (match) return noteFrequencies[match[1] + parseInt(match[2])] || 440;
    return 440;
  }

  // ---------- Realistic piano: additive synthesis with inharmonic partials ----------
  // Relative amplitude of each harmonic; gives a bright, struck-string timbre.
  const PIANO_PARTIALS = [
    { h: 1, a: 1.00, d: 1.00 },
    { h: 2, a: 0.55, d: 0.90 },
    { h: 3, a: 0.33, d: 0.72 },
    { h: 4, a: 0.20, d: 0.60 },
    { h: 5, a: 0.11, d: 0.50 },
    { h: 6, a: 0.07, d: 0.42 },
    { h: 7, a: 0.045, d: 0.35 },
    { h: 8, a: 0.03, d: 0.30 }
  ];
  const INHARMONICITY = 0.0006;

  function playPiano(freq, duration = 1.6, volume = 0.3, when = null) {
    const ctx = getContext();
    const now = when == null ? ctx.currentTime : when;

    const bus = ctx.createGain();
    bus.gain.value = 1;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    // Brighter in the attack, mellowing as it decays.
    tone.frequency.setValueAtTime(Math.min(12000, freq * 14 + 1500), now);
    tone.frequency.exponentialRampToValueAtTime(Math.max(800, freq * 4), now + duration * 0.7);
    bus.connect(tone);
    connectOut(tone);

    PIANO_PARTIALS.forEach(p => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f = freq * p.h * Math.sqrt(1 + INHARMONICITY * p.h * p.h);
      osc.frequency.setValueAtTime(f, now);

      const g = ctx.createGain();
      const peak = volume * p.a;
      const dur = duration * p.d;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.005);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.0006), now + dur);

      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });

    // Hammer thump for a percussive onset.
    const noise = makeNoise(0.03);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(volume * 0.25, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = Math.min(6000, freq * 4);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(bus);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  function makeNoise(duration) {
    const ctx = getContext();
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // ---------- Realistic guitar: Karplus-Strong plucked string ----------
  function makePluckBuffer(freq, duration, brightness, decay) {
    const ctx = getContext();
    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const total = Math.max(1, Math.floor(sr * duration));
    const buffer = ctx.createBuffer(1, total, sr);
    const data = buffer.getChannelData(0);

    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * 0.5;
    // Pre-smooth the excitation a little (simulates pick softness).
    for (let i = 1; i < N; i++) ring[i] = 0.6 * ring[i] + 0.4 * ring[i - 1];

    const damp = brightness == null ? 0.5 : brightness; // higher = brighter
    const dec = decay == null ? 0.996 : decay;
    let idx = 0;
    for (let i = 0; i < total; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % N];
      data[i] = cur;
      ring[idx] = (damp * cur + (1 - damp) * nxt) * dec;
      idx = (idx + 1) % N;
    }
    return buffer;
  }

  function playPluck(freq, duration = 1.8, volume = 0.3, opts = {}, when = null) {
    const ctx = getContext();
    const start = when == null ? ctx.currentTime : when;
    const buffer = makePluckBuffer(freq, duration, opts.brightness, opts.decay);

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.cutoff || 4500;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(volume, start + 0.005);
    g.gain.setValueAtTime(volume, start + duration * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0008, start + duration);

    src.connect(filter);
    filter.connect(g);
    connectOut(g);
    src.start(start);
    src.stop(start + duration + 0.05);
  }

  // ---------- Bass: round, punchy low synth ----------
  function playBass(freq, duration = 0.6, volume = 0.34, when = null) {
    const ctx = getContext();
    const now = when == null ? ctx.currentTime : when;
    const dur = Math.max(0.25, duration);

    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(1200, freq * 6 + 200), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 2), now + dur * 0.6);
    filter.Q.value = 6;

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.012);
    g.gain.setValueAtTime(volume, now + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    filter.connect(g);
    connectOut(g);

    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(freq, now);
    saw.connect(filter);
    saw.start(now); saw.stop(now + dur + 0.05);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq / 2, now);
    const subG = ctx.createGain();
    subG.gain.value = 0.6;
    sub.connect(subG); subG.connect(filter);
    sub.start(now); sub.stop(now + dur + 0.05);
  }

  // ---------- Drums: multi-layer acoustic-style kit ----------
  function playKick(now, vol) {
    const ctx = getContext();
    const g = ctx.createGain();
    connectOut(g);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    const subG = ctx.createGain();
    subG.gain.setValueAtTime(vol * 0.95, now);
    subG.gain.exponentialRampToValueAtTime(0.0008, now + 0.38);
    sub.connect(subG); subG.connect(g);
    sub.start(now); sub.stop(now + 0.4);

    const click = makeNoise(0.012);
    const cf = ctx.createBiquadFilter();
    cf.type = 'highpass'; cf.frequency.value = 2800;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(vol * 0.55, now);
    cg.gain.exponentialRampToValueAtTime(0.0008, now + 0.018);
    click.connect(cf); cf.connect(cg); cg.connect(g);
    click.start(now); click.stop(now + 0.02);
  }

  function playSnare(now, vol) {
    const ctx = getContext();
    const g = ctx.createGain();
    connectOut(g);

    const noise = makeNoise(0.22);
    const nf1 = ctx.createBiquadFilter();
    nf1.type = 'bandpass'; nf1.frequency.value = 2200; nf1.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.75, now);
    ng.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);
    noise.connect(nf1); nf1.connect(ng); ng.connect(g);
    noise.start(now); noise.stop(now + 0.18);

    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(210, now);
    body.frequency.exponentialRampToValueAtTime(145, now + 0.06);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(vol * 0.45, now);
    bg.gain.exponentialRampToValueAtTime(0.0008, now + 0.1);
    body.connect(bg); bg.connect(g);
    body.start(now); body.stop(now + 0.12);

    const rattle = makeNoise(0.08);
    const rf = ctx.createBiquadFilter();
    rf.type = 'highpass'; rf.frequency.value = 5000;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(vol * 0.22, now);
    rg.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);
    rattle.connect(rf); rf.connect(rg); rg.connect(g);
    rattle.start(now); rattle.stop(now + 0.06);
  }

  function playHatClosed(now, vol) {
    const ctx = getContext();
    const g = ctx.createGain();
    connectOut(g);

    const noise = makeNoise(0.06);
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass'; nf.frequency.value = 6200;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.42, now);
    ng.gain.exponentialRampToValueAtTime(0.0006, now + 0.045);
    noise.connect(nf); nf.connect(ng); ng.connect(g);
    noise.start(now); noise.stop(now + 0.05);

    [5233, 6891, 8120].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.setValueAtTime(vol * (0.06 - i * 0.012), now);
      og.gain.exponentialRampToValueAtTime(0.0005, now + 0.035);
      o.connect(og); og.connect(g);
      o.start(now); o.stop(now + 0.04);
    });
  }

  function playHatOpen(now, vol) {
    const ctx = getContext();
    const noise = makeNoise(0.35);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 7500; nf.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.5, now);
    ng.gain.exponentialRampToValueAtTime(0.0006, now + 0.32);
    noise.connect(nf); nf.connect(ng); connectOut(ng);
    noise.start(now); noise.stop(now + 0.34);
  }

  function playRide(now, vol) {
    const ctx = getContext();
    const g = ctx.createGain();
    connectOut(g);

    const ping = ctx.createOscillator();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(3200, now);
    ping.frequency.exponentialRampToValueAtTime(2800, now + 0.08);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(vol * 0.35, now);
    pg.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
    ping.connect(pg); pg.connect(g);
    ping.start(now); ping.stop(now + 0.58);

    const wash = makeNoise(0.4);
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass'; wf.frequency.value = 4800; wf.Q.value = 0.4;
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(vol * 0.18, now);
    wg.gain.exponentialRampToValueAtTime(0.0006, now + 0.5);
    wash.connect(wf); wf.connect(wg); wg.connect(g);
    wash.start(now); wash.stop(now + 0.52);
  }

  function playCrash(now, vol) {
    const ctx = getContext();
    const noise = makeNoise(0.9);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.setValueAtTime(5200, now);
    nf.frequency.exponentialRampToValueAtTime(2800, now + 0.6);
    nf.Q.value = 0.35;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.65, now);
    ng.gain.exponentialRampToValueAtTime(0.0005, now + 1.1);
    noise.connect(nf); nf.connect(ng); connectOut(ng);
    noise.start(now); noise.stop(now + 1.15);
  }

  function playTom(now, vol, pitch) {
    const ctx = getContext();
    const g = ctx.createGain();
    connectOut(g);
    const f0 = pitch || 140;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0 * 1.8, now);
    osc.frequency.exponentialRampToValueAtTime(f0, now + 0.07);
    const og = ctx.createGain();
    og.gain.setValueAtTime(vol * 0.85, now);
    og.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);
    osc.connect(og); og.connect(g);
    osc.start(now); osc.stop(now + 0.3);

    const thump = makeNoise(0.04);
    const tf = ctx.createBiquadFilter();
    tf.type = 'bandpass'; tf.frequency.value = f0 * 2.5; tf.Q.value = 2;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(vol * 0.25, now);
    tg.gain.exponentialRampToValueAtTime(0.0008, now + 0.04);
    thump.connect(tf); tf.connect(tg); tg.connect(g);
    thump.start(now); thump.stop(now + 0.05);
  }

  function playDrum(type, when = null, volume = 0.6, eq = null) {
    const ctx = getContext();
    const now = when == null ? ctx.currentTime : when;
    const vol = volume;
    _playEq = eq;
    try {
      switch (type) {
        case 'kick': playKick(now, vol); break;
        case 'snare': playSnare(now, vol); break;
        case 'hat-open': playHatOpen(now, vol); break;
        case 'ride': playRide(now, vol * 0.85); break;
        case 'crash': playCrash(now, vol * 0.9); break;
        case 'tom': playTom(now, vol * 0.8, 140); break;
        case 'tom-high': playTom(now, vol * 0.75, 220); break;
        case 'hat':
        default: playHatClosed(now, vol * 0.7); break;
      }
    } finally {
      _playEq = null;
    }
  }

  // ---------- Violin: bowed string with vibrato ----------
  function playViolin(freq, duration = 1.4, volume = 0.28, when = null) {
    const ctx = getContext();
    const now = when == null ? ctx.currentTime : when;
    const dur = Math.max(0.4, duration);

    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4500, freq * 8 + 800), now + 0.05);
    filter.frequency.exponentialRampToValueAtTime(Math.max(900, freq * 3), now + dur * 0.5);
    filter.Q.value = 1.2;

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.07);
    g.gain.setValueAtTime(volume * 0.92, now + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    filter.connect(g);
    connectOut(g);

    const vib = ctx.createOscillator();
    vib.type = 'sine';
    vib.frequency.value = 5.2;
    const vibDepth = ctx.createGain();
    vibDepth.gain.value = freq * 0.012;
    vib.connect(vibDepth);

    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(freq, now);
    vibDepth.connect(saw.frequency);
    saw.connect(filter);
    saw.start(now);
    saw.stop(now + dur + 0.05);
    vib.start(now);
    vib.stop(now + dur + 0.05);

    const sine = ctx.createOscillator();
    sine.type = 'sine';
    sine.frequency.setValueAtTime(freq, now);
    vibDepth.connect(sine.frequency);
    const sG = ctx.createGain();
    sG.gain.value = 0.35;
    sine.connect(sG);
    sG.connect(filter);
    sine.start(now);
    sine.stop(now + dur + 0.05);
  }

  // ---------- Clarinet: odd-harmonic reed tone ----------
  function playClarinet(freq, duration = 1.2, volume = 0.26, when = null) {
    const ctx = getContext();
    const now = when == null ? ctx.currentTime : when;
    const dur = Math.max(0.35, duration);

    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = Math.min(2800, freq * 2.5 + 400);
    filter.Q.value = 2.5;

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.04);
    g.gain.setValueAtTime(volume * 0.88, now + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    filter.connect(g);
    connectOut(g);

    [1, 3, 5, 7].forEach((h, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq * h;
      const og = ctx.createGain();
      og.gain.value = volume * (0.55 / h) * (i === 0 ? 1.4 : 1);
      osc.connect(og);
      og.connect(filter);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });

    const breath = makeNoise(Math.min(dur, 0.5));
    const bf = ctx.createBiquadFilter();
    bf.type = 'highpass';
    bf.frequency.value = 1800;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(volume * 0.08, now);
    bg.gain.exponentialRampToValueAtTime(0.0008, now + dur * 0.4);
    breath.connect(bf);
    bf.connect(bg);
    bg.connect(filter);
    breath.start(now);
    breath.stop(now + dur + 0.05);
  }

  // ---------- Turkish saz & baglama: long-neck plucked strings ----------
  function playSaz(freq, duration = 1.6, volume = 0.3, when = null) {
    playPluck(freq, duration, volume, { brightness: 0.58, decay: 0.9972, cutoff: 4000, volume }, when);
  }

  function playBaglama(freq, duration = 1.7, volume = 0.3, when = null) {
    playPluck(freq, duration, volume, { brightness: 0.5, decay: 0.998, cutoff: 3400, volume }, when);
  }

  const INSTRUMENT_PLUCK = {
    guitar: { brightness: 0.5, decay: 0.996, cutoff: 4300 },
    saz: { brightness: 0.58, decay: 0.9972, cutoff: 4000 },
    baglama: { brightness: 0.5, decay: 0.998, cutoff: 3400 }
  };

  function playInstrument(instrument, freq, duration = 1, volume = 0.3, when = null, eq = null) {
    const d = Math.max(0.3, duration);
    _playEq = eq;
    try {
      switch (instrument) {
        case 'guitar':
        case 'saz':
        case 'baglama': {
          const p = INSTRUMENT_PLUCK[instrument];
          playPluck(freq, d + 0.4, volume, p, when);
          break;
        }
        case 'bass':
          playBass(freq, d + 0.1, volume, when);
          break;
        case 'violin':
          playViolin(freq, d + 0.5, volume, when);
          break;
        case 'clarinet':
          playClarinet(freq, d + 0.35, volume, when);
          break;
        case 'drums':
          break;
        case 'piano':
        default:
          playPiano(freq, d + 0.5, volume, when);
          break;
      }
    } finally {
      _playEq = null;
    }
  }

  function playInstrumentNote(note, octave, instrument, duration = 0.8, volume = 0.3, when = null, eq = null) {
    playInstrument(instrument, getFrequency(note, octave), duration, volume, when, eq);
  }

  // ---------- Public note helpers ----------
  function playNote(frequency, duration = 0.6, type = 'piano', volume = 0.3, when = null) {
    // `type` retained for backward compatibility; piano family routes here.
    playPiano(frequency, Math.max(duration, 0.5), volume, when);
  }

  function playNoteName(note, octave, duration = 0.8, when = null) {
    if (typeof GlobalSettingsModule !== 'undefined') {
      GlobalSettingsModule.playNote(note, octave, duration, when);
      return;
    }
    playPiano(getFrequency(note, octave), Math.max(duration, 0.6), 0.3, when);
  }

  const heldVoices = new Map();

  function midiToNoteOctave(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return { note: noteNames[pc], octave, midi };
  }

  function startNoteHold(midi, volume = 0.3) {
    stopNoteHold(midi);
    const inst = typeof GlobalSettingsModule !== 'undefined' ? GlobalSettingsModule.getInstrument() : 'piano';
    const baseVol = typeof GlobalSettingsModule !== 'undefined' ? GlobalSettingsModule.getVolume() : 0.3;
    const vol = baseVol * (volume / 0.3);

    if (inst !== 'piano') {
      const { note, octave } = midiToNoteOctave(midi);
      playInstrument(inst, getFrequency(note, octave), 2.5, vol, null, getGlobalEq());
      heldVoices.set(midi, { type: 'oneShot' });
      return;
    }

    const ctx = getContext();
    const now = ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + 0.006);

    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(Math.min(12000, freq * 14 + 1500), now);
    bus.connect(tone);
    _playEq = getGlobalEq();
    try {
      connectOut(tone);
    } finally {
      _playEq = null;
    }

    const oscs = [];
    PIANO_PARTIALS.forEach(p => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f = freq * p.h * Math.sqrt(1 + INHARMONICITY * p.h * p.h);
      osc.frequency.setValueAtTime(f, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(volume * p.a, now);
      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      oscs.push(osc);
    });

    const noise = makeNoise(0.03);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(volume * 0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = Math.min(6000, freq * 4);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(bus);
    noise.start(now);
    noise.stop(now + 0.05);

    heldVoices.set(midi, { bus, oscs, noise, tone, nGain });
  }

  function stopNoteHold(midi) {
    const voice = heldVoices.get(midi);
    if (!voice) return;
    if (voice.type === 'oneShot') {
      heldVoices.delete(midi);
      return;
    }
    const ctx = getContext();
    const now = ctx.currentTime;
    voice.bus.gain.cancelScheduledValues(now);
    voice.bus.gain.setValueAtTime(voice.bus.gain.value, now);
    voice.bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    voice.oscs.forEach(o => { try { o.stop(now + 0.12); } catch (e) { /* already stopped */ } });
    heldVoices.delete(midi);
  }

  function stopAllHeld() {
    [...heldVoices.keys()].forEach(midi => stopNoteHold(midi));
  }

  function playGuitarNote(note, octave, duration = 1.8, opts = {}, when = null) {
    playPluck(getFrequency(note, octave), duration, opts.volume || 0.3, opts, when);
  }

  function getOutputNode() {
    enableFxRoute();
    return out();
  }

  return {
    getContext,
    getOutputNode,
    getFrequency,
    playNote,
    playNoteName,
    playPiano,
    playPluck,
    playGuitarNote,
    playBass,
    playDrum,
    playViolin,
    playClarinet,
    playSaz,
    playBaglama,
    playInstrument,
    playInstrumentNote,
    startNoteHold,
    stopNoteHold,
    stopAllHeld,
    midiToNoteOctave,
    setComposerRoute,
    enableFxRoute,
    setFxSettings,
    getFxSettings,
    setGlobalEq,
    getGlobalEq,
    noteFrequencies,
    noteNames
  };
})();
