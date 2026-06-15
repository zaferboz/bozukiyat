const MetronomeModule = (() => {
  const TEMPO_MARKINGS = [
    { max: 40, name: 'Grave' },
    { max: 60, name: 'Largo' },
    { max: 66, name: 'Larghetto' },
    { max: 76, name: 'Adagio' },
    { max: 108, name: 'Andante' },
    { max: 120, name: 'Moderato' },
    { max: 156, name: 'Allegro' },
    { max: 176, name: 'Vivace' },
    { max: 200, name: 'Presto' },
    { max: Infinity, name: 'Prestissimo' }
  ];

  let bpm = 120;
  let beatsPerMeasure = 4;
  let subdivision = 1;
  let volume = 0.6;
  let isRunning = false;

  // Scheduler state.
  let nextNoteTime = 0;
  let currentTick = 0; // counts subdivisions
  let timerId = null;
  const lookahead = 25;       // ms between scheduler runs
  const scheduleAhead = 0.1;  // seconds to schedule audio ahead

  // Tap tempo state.
  let tapTimes = [];

  function init() {
    if (typeof GlobalSettingsModule !== 'undefined') {
      setBpm(GlobalSettingsModule.getBpm());
    }
    buildBeatIndicators();
    updateDisplay();

    window.addEventListener('globalsettingschange', (e) => {
      if (e.detail && e.detail.bpm != null && !isRunning) setBpm(e.detail.bpm);
    });

    document.getElementById('bpmSlider').addEventListener('input', (e) => setBpm(parseInt(e.target.value, 10)));
    document.getElementById('bpmDown').addEventListener('click', () => setBpm(bpm - 1));
    document.getElementById('bpmUp').addEventListener('click', () => setBpm(bpm + 1));
    document.getElementById('bpmDown10').addEventListener('click', () => setBpm(bpm - 10));
    document.getElementById('bpmUp10').addEventListener('click', () => setBpm(bpm + 10));

    document.getElementById('timeSignature').addEventListener('change', (e) => {
      beatsPerMeasure = parseInt(e.target.value, 10);
      currentTick = 0;
      buildBeatIndicators();
    });

    document.getElementById('subdivision').addEventListener('change', (e) => {
      subdivision = parseInt(e.target.value, 10);
      currentTick = 0;
    });

    document.getElementById('metroVolume').addEventListener('input', (e) => {
      volume = parseInt(e.target.value, 10) / 100;
    });

    document.getElementById('metroToggle').addEventListener('click', toggle);
    document.getElementById('tapTempo').addEventListener('click', tapTempo);
  }

  function setBpm(value) {
    bpm = Math.max(30, Math.min(240, value));
    document.getElementById('bpmSlider').value = bpm;
    updateDisplay();
  }

  function updateDisplay() {
    document.getElementById('bpmValue').textContent = bpm;
    const marking = TEMPO_MARKINGS.find(m => bpm <= m.max);
    document.getElementById('tempoName').textContent = marking ? marking.name : '';
  }

  function buildBeatIndicators() {
    const container = document.getElementById('beatIndicators');
    container.innerHTML = '';
    for (let i = 0; i < beatsPerMeasure; i++) {
      const dot = document.createElement('div');
      dot.className = 'beat-dot' + (i === 0 ? ' accent' : '');
      dot.dataset.beat = i;
      container.appendChild(dot);
    }
  }

  function toggle() {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }

  function start() {
    const ctx = AudioEngine.getContext();
    isRunning = true;
    currentTick = 0;
    nextNoteTime = ctx.currentTime + 0.05;

    const btn = document.getElementById('metroToggle');
    btn.textContent = I18n.t('metro.stop');
    btn.classList.add('running');

    scheduler();
  }

  function stop() {
    isRunning = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    const btn = document.getElementById('metroToggle');
    btn.textContent = I18n.t('metro.start');
    btn.classList.remove('running');
    document.querySelectorAll('.beat-dot').forEach(d => d.classList.remove('lit'));
  }

  function scheduler() {
    const ctx = AudioEngine.getContext();
    while (nextNoteTime < ctx.currentTime + scheduleAhead) {
      scheduleTick(currentTick, nextNoteTime);
      advanceTick();
    }
    if (isRunning) {
      timerId = setTimeout(scheduler, lookahead);
    }
  }

  function advanceTick() {
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTime += secondsPerBeat / subdivision;
    currentTick++;
  }

  function scheduleTick(tick, time) {
    const ticksPerMeasure = beatsPerMeasure * subdivision;
    const positionInMeasure = tick % ticksPerMeasure;
    const isDownbeat = positionInMeasure === 0;
    const isMainBeat = positionInMeasure % subdivision === 0;

    // Frequency: strong accent on beat 1, mid on main beats, soft on subdivisions.
    let freq, vol;
    if (isDownbeat) {
      freq = 1500; vol = volume;
    } else if (isMainBeat) {
      freq = 1000; vol = volume * 0.7;
    } else {
      freq = 800; vol = volume * 0.4;
    }

    playClick(time, freq, vol);

    if (isMainBeat) {
      const beatNumber = Math.floor(positionInMeasure / subdivision);
      const ctx = AudioEngine.getContext();
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      setTimeout(() => lightBeat(beatNumber), delayMs);
    }
  }

  function playClick(time, frequency, vol) {
    const ctx = AudioEngine.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(AudioEngine.getOutputNode());

    osc.start(time);
    osc.stop(time + 0.06);
  }

  function lightBeat(beatNumber) {
    const dots = document.querySelectorAll('.beat-dot');
    dots.forEach(d => d.classList.remove('lit'));
    const dot = dots[beatNumber];
    if (dot) {
      dot.classList.add('lit');
      setTimeout(() => dot.classList.remove('lit'), 100);
    }
  }

  function tapTempo() {
    const now = performance.now();
    tapTimes.push(now);
    // Reset if the gap is too long (more than 2 seconds).
    if (tapTimes.length > 1 && now - tapTimes[tapTimes.length - 2] > 2000) {
      tapTimes = [now];
      return;
    }
    if (tapTimes.length > 4) tapTimes.shift();

    if (tapTimes.length >= 2) {
      let total = 0;
      for (let i = 1; i < tapTimes.length; i++) {
        total += tapTimes[i] - tapTimes[i - 1];
      }
      const avgMs = total / (tapTimes.length - 1);
      setBpm(Math.round(60000 / avgMs));
    }
  }

  function onLangChange() {
    const btn = document.getElementById('metroToggle');
    if (btn && !isRunning) btn.textContent = I18n.t('metro.start');
    else if (btn && isRunning) btn.textContent = I18n.t('metro.stop');
  }

  return { init, onLangChange };
})();
