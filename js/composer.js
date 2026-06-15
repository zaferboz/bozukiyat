const ComposerModule = (() => {
  let canvas = null;
  let ctx = null;

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // Compact geometry so several staves fit on screen.
  const LS = 16;            // staff line spacing
  const HALF = LS / 2;      // one diatonic step
  const HEAD_PAD = 30;      // room above each staff (ledger lines / labels)
  const MEL_FOOT = 24;      // room below (names / ledger)
  const MEL_STAFF_H = 4 * LS;
  const DRUM_LANE_H = 14;
  const DRUM_LANES = [
    { drum: 'crash', label: 'Crash', sym: '✦' },
    { drum: 'ride', label: 'Ride', sym: '○' },
    { drum: 'hat', label: 'Hat', sym: '×' },
    { drum: 'snare', label: 'Snare', sym: '●' },
    { drum: 'tom', label: 'Tom', sym: '◉' },
    { drum: 'kick', label: 'Kick', sym: '●' }
  ];
  const DRUM_STAFF_H = DRUM_LANES.length * DRUM_LANE_H;
  const SYS_GAP = 10;
  const TOP_Y = 12;
  const START_X = 150;
  const NOTE_SPACING = 40;

  const CLEF_REF = { treble: { letter: 'E', octave: 4 }, bass: { letter: 'G', octave: 2 } };
  const RANGE = {
    treble: { lo: ['A', 3], hi: ['C', 6] },
    bass: { lo: ['C', 1], hi: ['E', 4] }
  };

  // Piano-page style keyboard mapping (relative to the chosen input octave).
  const KEYMAP = {
    a: { l: 'C', acc: 0, o: 0 }, w: { l: 'C', acc: 1, o: 0 }, s: { l: 'D', acc: 0, o: 0 },
    e: { l: 'D', acc: 1, o: 0 }, d: { l: 'E', acc: 0, o: 0 }, f: { l: 'F', acc: 0, o: 0 },
    t: { l: 'F', acc: 1, o: 0 }, g: { l: 'G', acc: 0, o: 0 }, y: { l: 'G', acc: 1, o: 0 },
    h: { l: 'A', acc: 0, o: 0 }, u: { l: 'A', acc: 1, o: 0 }, j: { l: 'B', acc: 0, o: 0 },
    k: { l: 'C', acc: 0, o: 1 }
  };
  const DRUM_KEYS = {
    k: 'kick', s: 'snare', h: 'hat', o: 'hat-open',
    r: 'ride', c: 'crash', t: 'tom', g: 'tom-high'
  };

  const STORAGE_KEY = 'mnComposerSongs';
  const INSTRUMENTS = ['piano', 'guitar', 'bass', 'violin', 'clarinet', 'saz', 'baglama', 'drums'];
  const CHORD_INSTRUMENTS = new Set(['piano', 'guitar', 'saz', 'baglama']);
  const PLUCK_INSTRUMENTS = new Set(['guitar', 'saz', 'baglama']);
  const DEFAULT_STRUM = 'dudu';
  // Strum hits are defined for a 4/4 bar (4 quarter beats) and scaled to the current time signature.
  const STRUM_PATTERNS = {
    single: { hits: [{ b: 0, d: 'down' }] },
    half: { hits: [{ b: 0, d: 'down' }, { b: 2, d: 'down' }] },
    quarter: { hits: [0, 1, 2, 3].map(b => ({ b, d: 'down' })) },
    dudu: { hits: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, i) => ({ b, d: i % 2 ? 'up' : 'down' })) },
    dduu: { hits: [{ b: 0, d: 'down' }, { b: 1, d: 'down' }, { b: 2, d: 'up' }, { b: 3, d: 'up' }] },
    calypso: { hits: [{ b: 0, d: 'down' }, { b: 1, d: 'down' }, { b: 1.5, d: 'up' }, { b: 2, d: 'down' }, { b: 2.5, d: 'up' }, { b: 3, d: 'down' }] },
    reggae: { hits: [{ b: 1, d: 'down' }, { b: 3, d: 'down' }] },
    ska: { hits: [{ b: 0.5, d: 'up' }, { b: 1.5, d: 'up' }, { b: 2.5, d: 'up' }, { b: 3.5, d: 'up' }] }
  };
  const DEFAULT_VOLUME = 85;
  const DEFAULT_EQ = { low: 50, mid: 50, high: 50 };
  const DEFAULT_FX = { delay: 0, reverb: 20, distortion: 0, tremolo: 0, environment: 25 };

  let fx = { ...DEFAULT_FX }; // legacy mirror; use GlobalSettingsModule for live FX

  let clef = 'treble';
  let timeSig = { num: 4, den: 4 };
  let duration = 4;
  let accidental = 0;
  let inputOctave = 4;

  function getInputOctave() {
    if (typeof GlobalSettingsModule !== 'undefined') return GlobalSettingsModule.getKeyOctave();
    return inputOctave;
  }

  function setInputOctave(o) {
    const v = Math.min(6, Math.max(2, o));
    inputOctave = v;
    if (typeof GlobalSettingsModule !== 'undefined') GlobalSettingsModule.setKeyOctave(v);
    else syncOctaveUi();
  }

  function syncOctaveUi() {
    const el = document.getElementById('compOctave');
    if (el) el.value = getInputOctave();
  }
  let chordMode = false;
  let tapMode = true;
  let bpm = 100;
  let tapGaps = [];
  let lastInputUpTime = null;
  let columnHold = { count: 0, downTime: null };
  const heldKeys = new Map();
  const heldMidis = new Map();

  let tracks = [{ instrument: 'piano', notes: [], volume: DEFAULT_VOLUME, eq: { ...DEFAULT_EQ }, strumPattern: DEFAULT_STRUM }];
  let activeTrack = 0;
  let playing = false;
  let playTimers = [];
  let playbackHighlight = {};
  let layoutCache = [];

  function ensureCanvas() {
    if (!canvas) {
      canvas = document.getElementById('composerCanvas');
      if (canvas) ctx = canvas.getContext('2d');
    }
    return !!(canvas && ctx);
  }

  function isColHighlighted(ti, col) {
    return playing && playbackHighlight[ti] === col;
  }

  function isPluck(track) {
    return PLUCK_INSTRUMENTS.has((track || current()).instrument);
  }

  function beatsPerBar() {
    return timeSig.num * (4 / timeSig.den);
  }

  function scaledPatternHits(patternId) {
    const pat = STRUM_PATTERNS[patternId] || STRUM_PATTERNS[DEFAULT_STRUM];
    const scale = beatsPerBar() / 4;
    return pat.hits.map(h => ({ beat: h.b * scale, dir: h.d }));
  }

  function columnBeatStart(notes, colIndex) {
    let beat = 0;
    for (let i = 0; i < colIndex; i++) beat += 4 / notes[i].value;
    return beat;
  }

  function getStrumsForColumn(patternId, colStartBeat, colDurBeats) {
    const hits = scaledPatternHits(patternId);
    const barLen = beatsPerBar();
    const pos = ((colStartBeat % barLen) + barLen) % barLen;
    const end = pos + colDurBeats;
    const out = [];

    hits.forEach(h => {
      if (h.beat >= pos && h.beat < end) {
        out.push({ offsetBeats: h.beat - pos, dir: h.dir });
      }
      if (end > barLen && h.beat < end - barLen) {
        out.push({ offsetBeats: (barLen - pos) + h.beat, dir: h.dir });
      }
    });

    out.sort((a, b) => a.offsetBeats - b.offsetBeats);
    if (!out.length) out.push({ offsetBeats: 0, dir: 'down' });
    return out;
  }

  function strumArrowsForColumn(track, notes, colIndex) {
    if (!isPluck(track) || !notes[colIndex] || notes[colIndex].rest) return '';
    const col = notes[colIndex];
    const colDur = 4 / col.value;
    const start = columnBeatStart(notes, colIndex);
    const patternId = track.strumPattern || DEFAULT_STRUM;
    return getStrumsForColumn(patternId, start, colDur)
      .map(h => (h.dir === 'down' ? '↓' : '↑'))
      .join('');
  }

  function scrollPlayheadToColumn(col) {
    const wrap = document.querySelector('.composer-staff-wrap');
    if (!wrap || col < 0) return;
    const x = noteX(col);
    const viewW = wrap.clientWidth;
    const target = x - viewW * 0.32;
    const maxScroll = Math.max(0, wrap.scrollWidth - viewW);
    wrap.scrollLeft = Math.max(0, Math.min(maxScroll, target));
  }

  function init() {
    populateExamples();
    window.addEventListener('examplesongsloaded', populateExamples);

    if (!ensureCanvas()) return;
    document.getElementById('compClef').addEventListener('change', (e) => { clef = e.target.value; draw(); });
    document.getElementById('compTimeSig').addEventListener('change', (e) => {
      const [n, d] = e.target.value.split('/').map(Number);
      timeSig = { num: n, den: d }; draw(); updateHint();
    });
    document.getElementById('compDuration').addEventListener('change', (e) => { duration = parseInt(e.target.value, 10); });
    document.getElementById('compAccidental').addEventListener('change', (e) => { accidental = parseInt(e.target.value, 10); });
    if (typeof GlobalSettingsModule !== 'undefined') inputOctave = GlobalSettingsModule.getKeyOctave();
    if (typeof GlobalSettingsModule !== 'undefined') {
      bpm = GlobalSettingsModule.getBpm();
    }
    document.getElementById('compChordToggle').addEventListener('click', (e) => {
      chordMode = !chordMode;
      e.target.textContent = I18n.t(chordMode ? 'on' : 'off');
      e.target.classList.toggle('active', chordMode);
    });
    document.getElementById('compTapToggle').addEventListener('click', (e) => {
      tapMode = !tapMode;
      e.target.textContent = I18n.t(tapMode ? 'on' : 'off');
      e.target.classList.toggle('active', tapMode);
      if (!tapMode) finalizeLastTap();
      updateDetectedLabel();
    });

    populateStrumSelect();
    const strumSel = document.getElementById('compStrumPattern');
    if (strumSel) {
      strumSel.addEventListener('change', (e) => {
        current().strumPattern = e.target.value;
        draw();
        updateHint();
      });
    }

    document.getElementById('compAddTrack').addEventListener('click', addTrack);
    document.getElementById('compRemoveTrack').addEventListener('click', () => removeTrack(activeTrack));
    document.getElementById('compAutoNotes').addEventListener('click', () => {
      if (autoCreateNotes(activeTrack, true)) { renderTracks(); draw(); }
    });
    document.getElementById('compAutoChords').addEventListener('click', () => {
      if (autoCreateChords(activeTrack, true)) { renderTracks(); draw(); }
    });
    document.getElementById('compAutoDrums').addEventListener('click', () => {
      if (autoCreateDrums(activeTrack, true)) { renderTracks(); draw(); }
    });

    document.getElementById('compPlay').addEventListener('click', play);
    document.getElementById('compStop').addEventListener('click', stop);
    document.getElementById('compRest').addEventListener('click', () => { current().notes.push({ rest: true, value: duration }); renderTracks(); draw(); });
    document.getElementById('compUndo').addEventListener('click', () => { current().notes.pop(); renderTracks(); draw(); });
    document.getElementById('compClear').addEventListener('click', () => {
      current().notes = [];
      resetTapSession();
      renderTracks(); draw();
    });

    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAllInputHolds);
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab !== 'composer') releaseAllInputHolds();
      });
    });

    document.getElementById('compSave').addEventListener('click', save);
    document.getElementById('compLoad').addEventListener('click', load);
    document.getElementById('compDelete').addEventListener('click', deleteSong);
    document.getElementById('compExport').addEventListener('click', exportSong);
    document.getElementById('compImport').addEventListener('change', importSong);
    document.getElementById('compLoadExample').addEventListener('click', loadExample);
    
    const filterSel = document.getElementById('compExamplesFilter');
    const sortSel = document.getElementById('compExamplesSort');
    if (filterSel) filterSel.addEventListener('change', populateExamples);
    if (sortSel) sortSel.addEventListener('change', populateExamples);

    refreshSavedList();
    syncToggleLabels();
    renderTracks();
    syncStrumUi();
    updateDetectedLabel();
    draw();
  }

  function populateStrumSelect() {
    const sel = document.getElementById('compStrumPattern');
    if (!sel) return;
    const cur = sel.value || current()?.strumPattern || DEFAULT_STRUM;
    sel.innerHTML = '';
    Object.keys(STRUM_PATTERNS).forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = I18n.t(`compose.strum.${id}`);
      sel.appendChild(opt);
    });
    sel.value = STRUM_PATTERNS[cur] ? cur : DEFAULT_STRUM;
  }

  function syncStrumUi() {
    const wrap = document.getElementById('compStrumWrap');
    const hint = document.getElementById('compStrumHint');
    const sel = document.getElementById('compStrumPattern');
    if (!wrap || !sel) return;
    const show = isPluck();
    wrap.hidden = !show;
    if (hint) hint.hidden = !show;
    if (show) {
      const pat = current().strumPattern || DEFAULT_STRUM;
      current().strumPattern = STRUM_PATTERNS[pat] ? pat : DEFAULT_STRUM;
      sel.value = current().strumPattern;
    }
  }

  function setBpm(newBpm) {
    bpm = newBpm;
    updateDetectedLabel();
  }

  function syncTrackEqFromGlobal(eq) {
    const track = current();
    if (!track) return;
    track.eq = { ...eq };
  }

  function trackVolume(track) {
    return (track.volume == null ? DEFAULT_VOLUME : track.volume) / 100;
  }

  function normalizeTrack(t) {
    const pat = t.strumPattern || DEFAULT_STRUM;
    return {
      instrument: t.instrument || 'piano',
      notes: normalizeNotes(t.notes),
      volume: t.volume == null ? DEFAULT_VOLUME : t.volume,
      eq: { ...DEFAULT_EQ, ...(t.eq || {}) },
      strumPattern: STRUM_PATTERNS[pat] ? pat : DEFAULT_STRUM
    };
  }
  function current() { return tracks[activeTrack]; }

  function isDrums(track) { return (track || current()).instrument === 'drums'; }

  // ---------- model helpers ----------
  function normalizeNotes(notes) {
    return (notes || []).map(n => {
      if (n.rest) return { rest: true, value: n.value || 4 };
      if (n.pitches) return { value: n.value || 4, pitches: n.pitches.map(p => ({ letter: p.letter, octave: p.octave, acc: p.acc || 0 })) };
      if (n.drums) return { value: n.value || 4, drums: n.drums.slice() };
      if (n.drum) return { value: n.value || 4, drums: [n.drum] };
      if (n.letter) return { value: n.value || 4, pitches: [{ letter: n.letter, octave: n.octave, acc: n.acc || 0 }] };
      return { rest: true, value: n.value || 4 };
    });
  }

  function diatonic(letter, octave) { return octave * 7 + LETTERS.indexOf(letter); }
  function inRange(letter, octave) {
    const r = RANGE[clef];
    const v = diatonic(letter, octave);
    return v >= diatonic(r.lo[0], r.lo[1]) && v <= diatonic(r.hi[0], r.hi[1]);
  }
  function freqOf(letter, octave, acc) {
    const pc = LETTER_SEMITONE[letter] + (acc || 0);
    const midi = (octave + 1) * 12 + pc;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function toMidi(letter, octave, acc) {
    return (octave + 1) * 12 + LETTER_SEMITONE[letter] + (acc || 0);
  }
  function fromMidi(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    for (const letter of LETTERS) {
      for (const acc of [0, 1, -1]) {
        if (((LETTER_SEMITONE[letter] + acc) % 12 + 12) % 12 === pc) {
          return { letter, octave, acc };
        }
      }
    }
    return { letter: 'C', octave, acc: 0 };
  }
  function accSymbol(acc) { return acc === 1 ? '♯' : acc === -1 ? '♭' : ''; }
  function noteX(i) { return START_X + i * NOTE_SPACING; }
  function maxCols() { return tracks.reduce((m, t) => Math.max(m, t.notes.length), 0); }

  // ---------- auto-create from source track ----------
  function refreshSourceTrackSelect() {
    const sel = document.getElementById('compSourceTrack');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    tracks.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `T${i + 1} · ${I18n.instName(t.instrument)} (${t.notes.length})`;
      sel.appendChild(opt);
    });
    if (prev !== '' && tracks[prev]) sel.value = prev;
    else if (tracks[activeTrack]) sel.value = activeTrack;
  }

  function getSourceTrackIndex(forTrack) {
    const sel = document.getElementById('compSourceTrack');
    let idx = sel ? parseInt(sel.value, 10) : activeTrack;
    if (Number.isNaN(idx) || idx === forTrack || !tracks[idx] || tracks[idx].notes.length === 0) {
      idx = tracks.findIndex((t, i) => i !== forTrack && !isDrums(t) && t.notes.length > 0);
    }
    return idx >= 0 ? idx : -1;
  }

  function suggestInstrument() {
    const have = new Set(tracks.map(t => t.instrument));
    for (const inst of ['bass', 'guitar', 'violin', 'clarinet', 'saz', 'baglama', 'piano', 'drums']) {
      if (!have.has(inst)) return inst;
    }
    return 'piano';
  }

  function rootPitch(col) {
    if (col.rest || !col.pitches || !col.pitches.length) return null;
    const sorted = col.pitches.slice().sort((a, b) => toMidi(a.letter, a.octave, a.acc) - toMidi(b.letter, b.octave, b.acc));
    return sorted[0];
  }

  function triadPitches(root, minor) {
    const rm = toMidi(root.letter, root.octave, root.acc);
    const iv = minor ? [0, 3, 7] : [0, 4, 7];
    return iv.map(s => fromMidi(rm + s));
  }

  function bassPitch(root) {
    let m = toMidi(root.letter, root.octave, root.acc);
    while (m > 48) m -= 12;
    while (m < 36) m += 12;
    return fromMidi(m);
  }

  function generateMelodyLine(sourceNotes) {
    return sourceNotes.map(col => {
      if (col.rest) return { rest: true, value: col.value };
      if (!col.pitches || !col.pitches.length) return { rest: true, value: col.value };
      const sorted = col.pitches.slice().sort((a, b) =>
        toMidi(a.letter, a.octave, a.acc) - toMidi(b.letter, b.octave, b.acc));
      const top = sorted[sorted.length - 1];
      return { value: col.value, pitches: [{ letter: top.letter, octave: top.octave, acc: top.acc || 0 }] };
    });
  }

  function generateMelodyCopy(sourceNotes) {
    return sourceNotes.map(col => {
      if (col.rest) return { rest: true, value: col.value };
      if (col.pitches) return { value: col.value, pitches: col.pitches.map(p => ({ ...p })) };
      return { rest: true, value: col.value };
    });
  }

  function pitchClass(p) {
    return ((LETTER_SEMITONE[p.letter] + (p.acc || 0)) % 12 + 12) % 12;
  }

  function pickBarRoot(pitches) {
    const downbeat = pitches.find(p => p.onset < 0.01);
    if (downbeat) return downbeat;
    const tally = {};
    pitches.forEach(p => {
      const pc = pitchClass(p);
      if (!tally[pc]) tally[pc] = { count: 0, pitch: p };
      tally[pc].count++;
    });
    let best = pitches[0];
    let bestC = 0;
    Object.values(tally).forEach(o => {
      if (o.count > bestC) { bestC = o.count; best = o.pitch; }
    });
    return best;
  }

  function detectMinor(pitches, rootPc) {
    return pitches.some(p => (pitchClass(p) - rootPc + 12) % 12 === 3);
  }

  // Turn a bar length (in quarter beats) into note columns.
  function columnsForBarBeats(beats, fill) {
    if (Math.abs(beats - 4) < 0.01) return [fill(1)];
    if (Math.abs(beats - 3) < 0.01) return [fill(2), fill(4)];
    if (Math.abs(beats - 2) < 0.01) return [fill(2)];
    if (Math.abs(beats - 1) < 0.01) return [fill(4)];
    const cols = [];
    let rem = beats;
    while (rem >= 1 - 0.001) { cols.push(fill(4)); rem -= 1; }
    if (rem >= 0.5 - 0.001) cols.push(fill(8));
    return cols.length ? cols : [fill(4)];
  }

  function groupSourceByBar(sourceNotes) {
    const beatsPerBar = timeSig.num * (4 / timeSig.den);
    const barBuckets = new Map();
    let beat = 0;
    let totalBeats = 0;

    sourceNotes.forEach(col => {
      const step = 4 / col.value;
      if (!col.rest && col.pitches?.length) {
        const barIdx = Math.floor(beat / beatsPerBar + 1e-9);
        if (!barBuckets.has(barIdx)) barBuckets.set(barIdx, []);
        const barStart = barIdx * beatsPerBar;
        col.pitches.forEach(p => {
          barBuckets.get(barIdx).push({
            letter: p.letter, octave: p.octave, acc: p.acc || 0,
            onset: beat - barStart
          });
        });
      }
      beat += step;
      totalBeats = beat;
    });

    const numBars = Math.max(1, Math.ceil(totalBeats / beatsPerBar));
    return { beatsPerBar, numBars, barBuckets };
  }

  function generateBassNotes(sourceNotes) {
    const { beatsPerBar, numBars, barBuckets } = groupSourceByBar(sourceNotes);
    const out = [];
    for (let b = 0; b < numBars; b++) {
      const pitches = barBuckets.get(b) || [];
      if (!pitches.length) {
        out.push(...columnsForBarBeats(beatsPerBar, v => ({ rest: true, value: v })));
        continue;
      }
      pitches.sort((a, b) => a.onset - b.onset);
      const root = pickBarRoot(pitches);
      const bass = bassPitch(root);
      out.push(...columnsForBarBeats(beatsPerBar, v => ({
        value: v, pitches: [{ letter: bass.letter, octave: bass.octave, acc: bass.acc || 0 }]
      })));
    }
    return out;
  }

  function generateChordNotes(sourceNotes) {
    const { beatsPerBar, numBars, barBuckets } = groupSourceByBar(sourceNotes);
    const out = [];

    for (let b = 0; b < numBars; b++) {
      const pitches = barBuckets.get(b) || [];
      if (!pitches.length) {
        out.push(...columnsForBarBeats(beatsPerBar, v => ({ rest: true, value: v })));
        continue;
      }
      pitches.sort((a, b) => a.onset - b.onset);
      const root = pickBarRoot(pitches);
      const rootPc = pitchClass(root);
      const minor = detectMinor(pitches, rootPc);
      const triad = triadPitches(root, minor);
      out.push(...columnsForBarBeats(beatsPerBar, v => ({
        value: v,
        pitches: triad.map(p => ({ letter: p.letter, octave: p.octave, acc: p.acc || 0 }))
      })));
    }
    return out;
  }

  function generateDrumNotes(sourceNotes) {
    let beat = 0;
    const beatsPerBar = timeSig.num * (4 / timeSig.den);

    return sourceNotes.map(col => {
      const step = 4 / col.value;
      if (col.rest) {
        beat += step;
        return { rest: true, value: col.value };
      }

      const drums = [];
      const barNum = Math.floor(beat / beatsPerBar);
      const posInBar = beat - barNum * beatsPerBar;
      const eighth = Math.round(posInBar * 2) / 2;

      if (Math.abs(eighth - 0) < 0.01 || Math.abs(eighth - 2) < 0.01) drums.push('kick');
      if (Math.abs(eighth - 1) < 0.01 || Math.abs(eighth - 3) < 0.01) drums.push('snare');
      drums.push('hat');
      if (Math.abs(eighth - 0.5) < 0.01 || Math.abs(eighth - 2.5) < 0.01) {
        if (col.value >= 8) drums.push('hat-open');
      }
      if (barNum % 2 === 1 && Math.abs(eighth - 1) < 0.01) drums.push('ride');
      if (barNum % 4 === 0 && Math.abs(eighth) < 0.01) drums.push('crash');
      if (barNum % 4 === 3 && posInBar + step >= beatsPerBar - 0.01) {
        drums.push('tom');
        if (col.value <= 4) drums.push('tom-high');
      }

      beat += step;
      return { value: col.value, drums: [...new Set(drums)] };
    });
  }

  function shouldReplace(ti, replace) {
    if (tracks[ti].notes.length === 0 || replace) return true;
    return confirm('Replace notes on this track?');
  }

  function getSourceNotes(forTrack) {
    const srcIdx = getSourceTrackIndex(forTrack);
    if (srcIdx < 0) return null;
    return tracks[srcIdx].notes;
  }

  function autoCreateNotes(ti, replace) {
    const target = tracks[ti];
    if (!target || isDrums(target)) return false;
    const srcNotes = getSourceNotes(ti);
    if (!srcNotes || !shouldReplace(ti, replace)) return false;

    if (target.instrument === 'bass') target.notes = generateBassNotes(srcNotes);
    else target.notes = generateMelodyLine(srcNotes);
    return true;
  }

  function autoCreateChords(ti, replace) {
    const target = tracks[ti];
    if (!target || isDrums(target)) return false;
    if (target.instrument === 'bass') return false;
    const srcNotes = getSourceNotes(ti);
    if (!srcNotes || !shouldReplace(ti, replace)) return false;

    target.notes = generateChordNotes(srcNotes);
    return true;
  }

  function autoCreateDrums(ti, replace) {
    const target = tracks[ti];
    if (!target || !isDrums(target)) return false;
    const srcNotes = getSourceNotes(ti);
    if (!srcNotes || !shouldReplace(ti, replace)) return false;

    target.notes = generateDrumNotes(srcNotes);
    return true;
  }

  function autoFillNewTrack(ti) {
    const t = tracks[ti];
    if (isDrums(t)) autoCreateDrums(ti, true);
    else if (t.instrument === 'bass') autoCreateNotes(ti, true);
    else if (CHORD_INSTRUMENTS.has(t.instrument)) autoCreateChords(ti, true);
    else autoCreateNotes(ti, true);
  }

  function addTrack() {
    const inst = suggestInstrument();
    tracks.push({ instrument: inst, notes: [], volume: DEFAULT_VOLUME, eq: { ...DEFAULT_EQ }, strumPattern: DEFAULT_STRUM });
    activeTrack = tracks.length - 1;
    autoFillNewTrack(activeTrack);
    renderTracks();
    draw();
  }

  function removeTrack(i) {
    if (i < 0 || i >= tracks.length) return;
    if (tracks.length === 1) {
      tracks[0].notes = [];
      resetTapSession();
    } else {
      tracks.splice(i, 1);
      if (activeTrack > i) activeTrack--;
      else if (activeTrack >= tracks.length) activeTrack = tracks.length - 1;
      resetTapSession();
    }
    renderTracks();
    draw();
  }

  // ---------- layout ----------
  function computeLayout() {
    const systems = [];
    let y = TOP_Y;
    tracks.forEach((track, ti) => {
      const drums = isDrums(track);
      const staffTopY = y + HEAD_PAD;
      const staffH = drums ? DRUM_STAFF_H : MEL_STAFF_H;
      const height = HEAD_PAD + staffH + (drums ? 18 : MEL_FOOT);
      systems.push({
        ti, drums, topY: y, height,
        staffTopY, staffBottomY: staffTopY + staffH,
        midY: staffTopY + 2 * LS
      });
      y += height + SYS_GAP;
    });
    return { systems, totalHeight: y };
  }

  function noteToY(letter, octave, sys) {
    const ref = CLEF_REF[clef];
    return sys.staffBottomY - (diatonic(letter, octave) - diatonic(ref.letter, ref.octave)) * HALF;
  }
  function yToNote(yy, sys) {
    const ref = CLEF_REF[clef];
    const steps = Math.round((sys.staffBottomY - yy) / HALF);
    const dv = diatonic(ref.letter, ref.octave) + steps;
    return { letter: LETTERS[((dv % 7) + 7) % 7], octave: Math.floor(dv / 7) };
  }

  // ---------- tap timing (hold length → note value / tempo) ----------
  function resetTapSession() {
    lastInputUpTime = null;
    columnHold = { count: 0, downTime: null };
    releaseAllInputHolds();
  }

  function releaseAllInputHolds() {
    heldKeys.forEach(({ midi }) => { if (midi != null) AudioEngine.stopNoteHold(midi); });
    heldKeys.clear();
    heldMidis.forEach((_, midi) => AudioEngine.stopNoteHold(midi));
    heldMidis.clear();
    columnHold = { count: 0, downTime: null };
  }

  function chordStackWindowMs() {
    return Math.max(120, 60000 / bpm / 3);
  }

  function shouldStackChord(now) {
    if (!chordMode || columnHold.count <= 0 || columnHold.downTime == null) return false;
    return (now - columnHold.downTime) < chordStackWindowMs();
  }

  function finalizeColumnDuration(holdMs) {
    const notes = current().notes;
    if (!notes.length) return;
    const last = notes[notes.length - 1];
    if (last.rest) return;
    last.value = gapToNoteValue(holdMs);
    tapGaps.push(holdMs);
    if (tapGaps.length > 12) tapGaps.shift();
    detectTempoFromGaps();
    detectTimeSignatureFromNotes(notes);
  }

  function previewHoldStart(midi, velocity = 0.3) {
    AudioEngine.startNoteHold(midi, velocity * trackVolume(current()));
  }

  function previewHoldStop(midi) {
    AudioEngine.stopNoteHold(midi);
  }

  function updateDetectedLabel() {
    const el = document.getElementById('compDetectedTime');
    if (!el) return;
    if (!tapMode) { el.textContent = I18n.t('manual'); return; }
    el.textContent = I18n.t('detected.bpm', { bpm, num: timeSig.num, den: timeSig.den });
  }

  function syncTempoUI() {
    document.getElementById('compTempo').value = bpm;
    document.getElementById('compTempoVal').textContent = bpm;
    updateDetectedLabel();
  }

  function detectTempoFromGaps() {
    if (tapGaps.length < 2) return;
    const sorted = [...tapGaps].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    let quarterMs = mid;
    let candidate = 60000 / quarterMs;
    if (candidate > 168) quarterMs = mid * 2;
    if (candidate < 52) quarterMs = mid / 2;
    candidate = 60000 / quarterMs;
    bpm = Math.round(Math.max(40, Math.min(200, candidate)));
    syncTempoUI();
  }

  function gapToNoteValue(gapMs) {
    const quarterMs = 60000 / bpm;
    const beats = gapMs / quarterMs;
    const grid = [
      { beats: 0.5, value: 8 },
      { beats: 1, value: 4 },
      { beats: 1.5, value: 8 }, // two eighths approximated — prefer dotted via 3 eighths? use 4 for simplicity
      { beats: 2, value: 2 },
      { beats: 4, value: 1 }
    ];
    let best = 4;
    let bestDiff = Infinity;
    grid.forEach(g => {
      const diff = Math.abs(beats - g.beats);
      if (diff < bestDiff) { bestDiff = diff; best = g.value; }
    });
    return best;
  }

  function detectTimeSignatureFromNotes(notes) {
    if (!notes.length) return;
    const totalBeats = notes.reduce((s, c) => s + 4 / c.value, 0);
    if (totalBeats < 1) return;

    const candidates = [
      { num: 4, den: 4 }, { num: 3, den: 4 }, { num: 2, den: 4 },
      { num: 5, den: 4 }, { num: 6, den: 8 }
    ];
    let best = timeSig;
    let bestScore = Infinity;

    candidates.forEach(sig => {
      const barLen = sig.num * (4 / sig.den);
      const remainder = totalBeats % barLen;
      const r = Math.min(remainder, barLen - remainder);
      if (r < bestScore) { bestScore = r; best = sig; }
    });

    timeSig = best;
    document.getElementById('compTimeSig').value = `${best.num}/${best.den}`;
    updateDetectedLabel();
  }

  function applyTapGap(gapMs) {
    tapGaps.push(gapMs);
    if (tapGaps.length > 12) tapGaps.shift();
    detectTempoFromGaps();

    const notes = current().notes;
    if (!notes.length) return;

    const last = notes[notes.length - 1];
    if (last.rest || last.drums || last.pitches) {
      last.value = gapToNoteValue(gapMs);
    }
    detectTimeSignatureFromNotes(notes);
  }

  function finalizeLastTap() {
    if (!tapMode) return;
    if (columnHold.count > 0 && columnHold.downTime != null) {
      finalizeColumnDuration(performance.now() - columnHold.downTime);
      columnHold = { count: 0, downTime: null };
      releaseAllInputHolds();
      renderTracks();
      draw();
    }
    lastInputUpTime = performance.now();
  }

  // ---------- input ----------
  function handleClick(e) {
    if (playing || !ensureCanvas()) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;

    const sys = layoutCache.find(s => y >= s.topY && y <= s.topY + s.height);
    if (!sys) return;
    activeTrack = sys.ti;
    const track = tracks[sys.ti];

    // Click on an existing column removes it.
    for (let i = 0; i < track.notes.length; i++) {
      if (Math.abs(x - noteX(i)) < NOTE_SPACING / 2) {
        track.notes.splice(i, 1);
        renderTracks(); draw();
        return;
      }
    }

    if (sys.drums) {
      let nearest = 0, best = Infinity;
      DRUM_LANES.forEach((lane, idx) => {
        const ly = sys.staffTopY + idx * DRUM_LANE_H;
        const d = Math.abs(y - ly);
        if (d < best) { best = d; nearest = idx; }
      });
      addDrum(DRUM_LANES[nearest].drum);
    } else {
      const p = yToNote(y, sys);
      if (!inRange(p.letter, p.octave)) { renderTracks(); draw(); return; }
      addPitch(p.letter, p.octave, accidental);
    }
    renderTracks(); draw();
  }

  function isComposerActive() {
    const panel = document.getElementById('composer');
    return panel && panel.classList.contains('active');
  }

  function isTypingTarget(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'select' || tag === 'textarea';
  }

  function beginMelodyInput(letter, octave, acc, stack) {
    addPitch(letter, octave, acc, stack);
    return toMidi(letter, octave, acc);
  }

  function beginDrumInput(drum, stack) {
    addDrum(drum, stack);
  }

  function onColumnKeyUp(key, midi) {
    if (!heldKeys.has(key)) return;
    heldKeys.delete(key);
    previewHoldStop(midi);
    columnHold.count = Math.max(0, columnHold.count - 1);
    if (columnHold.count === 0 && columnHold.downTime != null) {
      if (tapMode) finalizeColumnDuration(performance.now() - columnHold.downTime);
      lastInputUpTime = performance.now();
      columnHold = { count: 0, downTime: null };
      renderTracks();
      draw();
    }
  }

  function handleKeyDown(e) {
    if (e.repeat) return;
    if (!isComposerActive() || isTypingTarget(e)) return;
    const key = e.key.toLowerCase();

    if (key === 'z') { setInputOctave(getInputOctave() - 1); return; }
    if (key === 'x') { setInputOctave(getInputOctave() + 1); return; }
    if (key === ' ') { e.preventDefault(); playing ? stop() : play(); return; }
    if (key === 'enter') {
      e.preventDefault();
      finalizeLastTap();
      return;
    }
    if (key === 'backspace') { e.preventDefault(); current().notes.pop(); renderTracks(); draw(); return; }

    const now = performance.now();

    if (isDrums()) {
      const drum = DRUM_KEYS[key];
      if (!drum || heldKeys.has(key)) return;
      e.preventDefault();
      const stack = shouldStackChord(now);
      if (!stack) columnHold = { count: 1, downTime: now };
      else columnHold.count++;
      beginDrumInput(drum, stack);
      heldKeys.set(key, { midi: null, downTime: now, drum });
      renderTracks();
      draw();
      return;
    }

    const m = KEYMAP[key];
    if (!m || heldKeys.has(key)) return;
    e.preventDefault();
    const octave = getInputOctave() + m.o;
    const stack = shouldStackChord(now);
    if (!stack) columnHold = { count: 1, downTime: now };
    else columnHold.count++;
    const midi = beginMelodyInput(m.l, octave, m.acc, stack);
    heldKeys.set(key, { midi, downTime: now });
    previewHoldStart(midi);
    renderTracks();
    draw();
  }

  function handleKeyUp(e) {
    const key = e.key.toLowerCase();

    if (!isComposerActive()) {
      const held = heldKeys.get(key);
      if (held) {
        if (held.midi != null) previewHoldStop(held.midi);
        heldKeys.delete(key);
      }
      return;
    }
    if (isTypingTarget(e)) return;

    if (isDrums()) {
      const held = heldKeys.get(key);
      if (!held || !held.drum) return;
      heldKeys.delete(key);
      columnHold.count = Math.max(0, columnHold.count - 1);
      if (columnHold.count === 0 && columnHold.downTime != null) {
        if (tapMode) finalizeColumnDuration(performance.now() - columnHold.downTime);
        lastInputUpTime = performance.now();
        columnHold = { count: 0, downTime: null };
        renderTracks();
        draw();
      }
      return;
    }

    const m = KEYMAP[key];
    if (!m) return;
    const octave = getInputOctave() + m.o;
    onColumnKeyUp(key, toMidi(m.l, octave, m.acc));
  }

  function syncOctave() { syncOctaveUi(); }

  function addPitch(letter, octave, acc, stack) {
    const notes = current().notes;
    const last = notes[notes.length - 1];
    if (stack && last && last.pitches) {
      if (!last.pitches.some(p => p.letter === letter && p.octave === octave && p.acc === acc)) {
        last.pitches.push({ letter, octave, acc });
      }
    } else {
      const val = tapMode ? 4 : duration;
      notes.push({ value: val, pitches: [{ letter, octave, acc }] });
    }
    if (!stack) previewMelodic(current().instrument, letter, octave, acc);
  }

  function addDrum(drum, stack) {
    const notes = current().notes;
    const last = notes[notes.length - 1];
    if (stack && last && last.drums) {
      if (!last.drums.includes(drum)) last.drums.push(drum);
    } else {
      notes.push({ value: tapMode ? 4 : duration, drums: [drum] });
    }
    AudioEngine.playDrum(drum, null, 0.6 * trackVolume(current()), current().eq);
  }

  function previewMelodic(instrument, letter, octave, acc) {
    const freq = freqOf(letter, octave, acc);
    const vol = 0.3 * trackVolume(current());
    AudioEngine.playInstrument(instrument, freq, 1.1, vol, null, current().eq);
  }

  // ---------- drawing ----------
  function setFill(c) { ctx.fillStyle = c; }

  function drawClef(sys) {
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (clef === 'treble') { ctx.font = '60px serif'; ctx.fillText('𝄞', 44, sys.staffBottomY + 12); }
    else { ctx.font = '42px serif'; ctx.fillText('𝄢', 46, sys.staffTopY + 34); }
  }

  function drawTimeSig(sys) {
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px serif';
    ctx.fillText(timeSig.num, 116, sys.staffTopY + LS);
    ctx.fillText(timeSig.den, 116, sys.staffTopY + 3 * LS);
  }

  function drawStaff(sys, lines, spacing) {
    const sp = spacing || LS;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < lines; i++) {
      const y = sys.staffTopY + i * sp;
      ctx.beginPath();
      ctx.moveTo(100, y);
      ctx.lineTo(canvas.width - 16, y);
      ctx.stroke();
    }
  }

  function drawLedgersFor(x, y, sys) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    const line = (ly) => { ctx.beginPath(); ctx.moveTo(x - 11, ly); ctx.lineTo(x + 11, ly); ctx.stroke(); };
    if (y < sys.staffTopY - 1) for (let ly = sys.staffTopY - LS; ly >= y - 2; ly -= LS) line(ly);
    if (y > sys.staffBottomY + 1) for (let ly = sys.staffBottomY + LS; ly <= y + 2; ly += LS) line(ly);
  }

  function drawHead(x, y, open, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 5, -0.35, 0, Math.PI * 2);
    if (open) { ctx.lineWidth = 2; ctx.stroke(); } else ctx.fill();
  }

  function drawMelodicColumn(col, x, sys, hi, track, colIndex) {
    const color = hi ? '#ec4899' : '#1e293b';
    if (col.rest) {
      ctx.fillStyle = color; ctx.font = '22px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('𝄽', x, sys.midY);
      return;
    }
    const ys = col.pitches.map(p => noteToY(p.letter, p.octave, sys));
    col.pitches.forEach((p, k) => {
      const y = ys[k];
      drawLedgersFor(x, y, sys);
      if (p.acc) {
        ctx.fillStyle = color; ctx.font = 'bold 16px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(accSymbol(p.acc), x - 13, y);
      }
      drawHead(x, y, col.value <= 2, color);
    });

    if (col.value !== 1) {
      const top = Math.min(...ys), bot = Math.max(...ys);
      const up = (top + bot) / 2 > sys.midY;
      const sxp = up ? x + 6 : x - 6;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      if (up) { ctx.moveTo(sxp, bot); ctx.lineTo(sxp, top - 28); }
      else { ctx.moveTo(sxp, top); ctx.lineTo(sxp, bot + 28); }
      ctx.stroke();
      if (col.value === 8) {
        const fy = up ? top - 28 : bot + 28;
        ctx.beginPath();
        ctx.moveTo(sxp, fy);
        ctx.quadraticCurveTo(sxp + 10, fy + (up ? 8 : -8), sxp + 8, fy + (up ? 16 : -16));
        ctx.lineWidth = 2.5; ctx.stroke();
      }
    }

    // pitch names below
    ctx.fillStyle = hi ? '#ec4899' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const names = col.pitches.map(p => p.letter + accSymbol(p.acc) + p.octave).join('/');
    ctx.fillText(names, x, sys.staffBottomY + 6);

    if (track && isPluck(track)) {
      const arrows = strumArrowsForColumn(track, track.notes, colIndex);
      if (arrows) {
        ctx.fillStyle = hi ? '#ec4899' : '#6366f1';
        ctx.font = '8px sans-serif';
        ctx.fillText(arrows, x, sys.staffBottomY + 16);
      }
    }
  }

  function drawDrumColumn(col, x, sys, hi) {
    if (col.rest) {
      ctx.fillStyle = hi ? '#ec4899' : '#94a3b8'; ctx.font = '18px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('𝄽', x, sys.staffTopY + LS);
      return;
    }
    col.drums.forEach(drum => {
      const idx = DRUM_LANES.findIndex(l => l.drum === drum || (drum === 'hat-open' && l.drum === 'hat'));
      const lane = DRUM_LANES[Math.max(0, idx)];
      const y = sys.staffTopY + Math.max(0, idx) * DRUM_LANE_H;
      ctx.fillStyle = hi ? '#ec4899' : '#1e293b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lane.sym, x, y);
    });
  }

  function drawSystem(sys) {
    const track = tracks[sys.ti];
    // active highlight band
    if (sys.ti === activeTrack) {
      ctx.fillStyle = 'rgba(99,102,241,0.08)';
      ctx.fillRect(0, sys.topY, canvas.width, sys.height);
    }
    // label
    ctx.fillStyle = sys.ti === activeTrack ? '#6366f1' : '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`T${sys.ti + 1} · ${I18n.instName(track.instrument)}`, 6, sys.topY + 2);

    if (sys.drums) {
      drawStaff(sys, DRUM_LANES.length, DRUM_LANE_H);
      ctx.fillStyle = '#94a3b8'; ctx.font = '9px sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      DRUM_LANES.forEach((lane, idx) => ctx.fillText(lane.label, 78, sys.staffTopY + idx * DRUM_LANE_H));
      track.notes.forEach((col, i) => drawDrumColumn(col, noteX(i), sys, isColHighlighted(sys.ti, i)));
    } else {
      drawStaff(sys, 5);
      drawClef(sys);
      drawTimeSig(sys);
      const measureQ = timeSig.num * (4 / timeSig.den);
      let beats = 0;
      track.notes.forEach((col, i) => {
        if (i > 0 && Math.abs(beats % measureQ) < 0.001) {
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(noteX(i) - NOTE_SPACING / 2, sys.staffTopY);
          ctx.lineTo(noteX(i) - NOTE_SPACING / 2, sys.staffBottomY);
          ctx.stroke();
        }
        drawMelodicColumn(col, noteX(i), sys, isColHighlighted(sys.ti, i), track, i);
        beats += 4 / col.value;
      });
    }
  }

  function draw() {
    if (!ensureCanvas()) return;
    const lay = computeLayout();
    layoutCache = lay.systems;
    canvas.width = Math.max(900, noteX(maxCols()) + 60);
    canvas.height = Math.max(180, lay.totalHeight);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lay.systems.forEach(drawSystem);

    document.querySelectorAll('#compTracks .track-count').forEach((el, i) => {
      if (tracks[i]) el.textContent = `${tracks[i].notes.length}`;
    });
  }

  // ---------- tracks UI ----------
  function renderTracks() {
    const container = document.getElementById('compTracks');
    container.innerHTML = '';
    tracks.forEach((track, i) => {
      const row = document.createElement('div');
      row.className = 'track-row' + (i === activeTrack ? ' active' : '');

      const name = document.createElement('span');
      name.className = 'track-name';
      name.textContent = `T${i + 1}`;
      row.appendChild(name);

      const sel = document.createElement('select');
      INSTRUMENTS.forEach(inst => {
        const opt = document.createElement('option');
        opt.value = inst;
        opt.textContent = I18n.instName(inst);
        if (inst === track.instrument) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        track.instrument = e.target.value;
        if (track.notes.length === 0) autoFillNewTrack(i);
        if (i === activeTrack) syncStrumUi();
        draw();
        updateHint();
        refreshSourceTrackSelect();
      });
      row.appendChild(sel);

      const volWrap = document.createElement('label');
      volWrap.className = 'track-vol-wrap';
      volWrap.title = I18n.t('compose.trackVol');
      const volSlider = document.createElement('input');
      volSlider.type = 'range';
      volSlider.className = 'track-vol';
      volSlider.min = '0';
      volSlider.max = '100';
      volSlider.value = track.volume == null ? DEFAULT_VOLUME : track.volume;
      const volLbl = document.createElement('span');
      volLbl.className = 'track-vol-label';
      volLbl.textContent = volSlider.value;
      volSlider.addEventListener('click', (e) => e.stopPropagation());
      volSlider.addEventListener('input', (e) => {
        track.volume = parseInt(e.target.value, 10);
        volLbl.textContent = track.volume;
        e.stopPropagation();
      });
      volWrap.appendChild(volSlider);
      volWrap.appendChild(volLbl);
      row.appendChild(volWrap);

      const count = document.createElement('span');
      count.className = 'track-count';
      count.textContent = `${track.notes.length}`;
      row.appendChild(count);

      const del = document.createElement('button');
      del.className = 'track-del';
      del.type = 'button';
      del.textContent = '✕';
      del.title = I18n.t('compose.removeTrack');
      del.setAttribute('aria-label', I18n.t('compose.removeTrack'));
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTrack(i);
      });
      row.appendChild(del);

      row.addEventListener('click', () => {
        activeTrack = i;
        resetTapSession();
        if (track.notes.length > 0) {
          const srcSel = document.getElementById('compSourceTrack');
          if (srcSel) srcSel.value = i;
        }
        renderTracks(); syncStrumUi(); draw(); updateHint();
      });
      container.appendChild(row);
    });
    refreshSourceTrackSelect();
    syncStrumUi();
    updateHint();
    const removeBtn = document.getElementById('compRemoveTrack');
    if (removeBtn) {
      removeBtn.title = I18n.t('compose.removeTrackHint');
      removeBtn.disabled = tracks.length === 1 && tracks[0].notes.length === 0;
    }
  }

  function updateHint() {
    const hint = document.getElementById('compHint');
    if (!hint) return;
    if (isDrums()) {
      hint.innerHTML = I18n.t('compose.hintDrums');
    } else if (isPluck()) {
      const pat = current().strumPattern || DEFAULT_STRUM;
      hint.innerHTML = I18n.t('compose.hintStrum', {
        instrument: I18n.instName(current().instrument),
        pattern: I18n.t(`compose.strum.${pat}`),
        num: timeSig.num,
        den: timeSig.den
      });
    } else if (tapMode) {
      hint.innerHTML = I18n.t('compose.hintTapOn', { bpm });
    } else {
      hint.innerHTML = I18n.t('compose.hintFixed', { instrument: I18n.instName(current().instrument) });
    }
    updateDetectedLabel();
  }

  // ---------- playback ----------
  function play() {
    if (playing) return;
    if (!tracks.some(t => t.notes.length > 0)) return;
    AudioEngine.getContext();
    playing = true;
    playbackHighlight = {};
    const secPerQuarter = 60 / bpm;
    let maxEnd = 0;

    tracks.forEach((track, ti) => {
      let t = 0;
      let beat = 0;
      track.notes.forEach((col, i) => {
        const beats = 4 / col.value;
        const colStartBeat = beat;
        playTimers.push(setTimeout(() => {
          playbackHighlight[ti] = i;
          draw();
          scrollPlayheadToColumn(i);
          triggerColumn(track, col, beats * secPerQuarter, colStartBeat);
        }, t * 1000));
        t += beats * secPerQuarter;
        beat += beats;
      });
      if (t > maxEnd) maxEnd = t;
    });
    playTimers.push(setTimeout(stop, maxEnd * 1000 + 300));
  }

  function strumColumn(track, col, durSec, colStartBeat, vol) {
    const patternId = track.strumPattern || DEFAULT_STRUM;
    const colDurBeats = 4 / col.value;
    const hits = getStrumsForColumn(patternId, colStartBeat, colDurBeats);
    const ctx = AudioEngine.getContext();
    const t0 = ctx.currentTime;
    const secPerBeat = durSec / colDurBeats;
    const instrument = track.instrument;

    hits.forEach(hit => {
      const when = t0 + hit.offsetBeats * secPerBeat;
      const sorted = col.pitches.slice().sort((a, b) =>
        toMidi(a.letter, a.octave, a.acc) - toMidi(b.letter, b.octave, b.acc));
      const order = hit.dir === 'down' ? sorted : sorted.reverse();
      const spread = Math.min(0.045, secPerBeat * 0.12);
      const noteDur = Math.max(0.35, durSec - hit.offsetBeats * secPerBeat);
      order.forEach((p, i) => {
        const freq = freqOf(p.letter, p.octave, p.acc);
        AudioEngine.playInstrument(instrument, freq, noteDur, vol, when + i * spread, track.eq);
      });
    });
  }

  function triggerColumn(track, col, durSec, colStartBeat = 0) {
    if (col.rest) return;
    const instrument = track.instrument;
    const vol = 0.28 * trackVolume(track);
    const d = Math.max(0.35, durSec);
    if (col.drums) {
      const ctx = AudioEngine.getContext();
      const t0 = ctx.currentTime;
      const drumVol = 0.55 * trackVolume(track);
      col.drums.forEach((dr, i) => AudioEngine.playDrum(dr, t0 + i * 0.012, drumVol, track.eq));
      return;
    }
    if (col.pitches && isPluck(track)) {
      strumColumn(track, col, durSec, colStartBeat, vol);
      return;
    }
    col.pitches.forEach(p => {
      const freq = freqOf(p.letter, p.octave, p.acc);
      AudioEngine.playInstrument(instrument, freq, d, vol, null, track.eq);
    });
  }

  function stop() {
    playTimers.forEach(clearTimeout);
    playTimers = [];
    playing = false;
    playbackHighlight = {};
    draw();
  }

  // ---------- song (de)serialization ----------
  function currentSong() {
    return {
      title: document.getElementById('compName').value || 'Untitled',
      bpm, clef, timeSig, fx: typeof GlobalSettingsModule !== 'undefined' ? GlobalSettingsModule.getFx() : { ...fx },
      tracks: tracks.map(t => ({
        instrument: t.instrument,
        notes: t.notes,
        volume: t.volume ?? DEFAULT_VOLUME,
        eq: { ...DEFAULT_EQ, ...(t.eq || {}) },
        strumPattern: t.strumPattern || DEFAULT_STRUM
      }))
    };
  }

  function applySong(song) {
    if (!song) return;
    clef = song.clef || 'treble';
    bpm = song.bpm || 100;
    timeSig = song.timeSig || { num: 4, den: 4 };
    if (typeof GlobalSettingsModule !== 'undefined') {
      GlobalSettingsModule.setFx(song.fx || DEFAULT_FX);
      GlobalSettingsModule.setBpm(bpm);
    } else {
      fx = { ...DEFAULT_FX, ...(song.fx || {}) };
      AudioEngine.setFxSettings(fx);
    }
    const src = Array.isArray(song.tracks) ? song.tracks
      : (Array.isArray(song.notes) ? [{ instrument: song.instrument || 'piano', notes: song.notes }] : []);
    tracks = src.map(t => normalizeTrack(t));
    if (tracks.length === 0) tracks = [{ instrument: 'piano', notes: [], volume: DEFAULT_VOLUME, eq: { ...DEFAULT_EQ }, strumPattern: DEFAULT_STRUM }];
    activeTrack = 0;

    document.getElementById('compClef').value = clef;
    document.getElementById('compTempo').value = bpm;
    document.getElementById('compTempoVal').textContent = bpm;
    document.getElementById('compTimeSig').value = `${timeSig.num}/${timeSig.den}`;
    renderTracks();
    syncStrumUi();
    draw();
  }

  // ---------- examples ----------
  function populateExamples() {
    const sel = document.getElementById('compExamples');
    const filterSel = document.getElementById('compExamplesFilter');
    const sortSel = document.getElementById('compExamplesSort');
    if (!sel) return;
    sel.innerHTML = '';
    const songs = typeof EXAMPLE_SONGS !== 'undefined' ? EXAMPLE_SONGS : [];
    if (!songs.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = I18n.t('compose.noExamples');
      sel.appendChild(opt);
      return;
    }

    const filterValue = filterSel ? filterSel.value : 'all';
    const sortValue = sortSel ? sortSel.value : 'group-title';

    let filtered = songs;
    if (filterValue !== 'all') {
      filtered = songs.filter(s => s.group === filterValue);
    }

    let sorted = [...filtered];
    if (sortValue === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'en'));
    } else {
      sorted.sort((a, b) => {
        const groupCmp = (a.group || '').localeCompare(b.group || '', 'en');
        if (groupCmp !== 0) return groupCmp;
        return a.title.localeCompare(b.title, 'en');
      });
    }

    if (sorted.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = I18n.t('compose.noExamplesInCategory') || 'No songs in this category';
      sel.appendChild(opt);
      return;
    }

    let lastGroup = null;
    let currentGroupEl = null;

    sorted.forEach((song) => {
      const originalIndex = songs.indexOf(song);
      const opt = document.createElement('option');
      opt.value = originalIndex;
      opt.textContent = song.title;

      if (sortValue === 'group-title') {
        if (song.group !== lastGroup) {
          currentGroupEl = document.createElement('optgroup');
          currentGroupEl.label = song.group;
          sel.appendChild(currentGroupEl);
          lastGroup = song.group;
        }
        currentGroupEl.appendChild(opt);
      } else {
        sel.appendChild(opt);
      }
    });
  }

  function loadSong(song) {
    applySong(song);
    if (song.title) {
      const nameEl = document.getElementById('compName');
      if (nameEl) nameEl.value = song.title;
    }
  }

  function loadExample() {
    const sel = document.getElementById('compExamples');
    if (!sel || sel.value === '') return;
    const i = parseInt(sel.value, 10);
    if (typeof EXAMPLE_SONGS === 'undefined' || !EXAMPLE_SONGS[i]) return;
    loadSong(JSON.parse(JSON.stringify(EXAMPLE_SONGS[i])));
  }

  // ---------- save / load ----------
  function getStore() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; } }
  function setStore(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

  function refreshSavedList() {
    const list = document.getElementById('compLoadList');
    const store = getStore();
    list.innerHTML = '';
    const names = Object.keys(store);
    if (names.length === 0) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = I18n.t('compose.noSaved');
      list.appendChild(opt);
      return;
    }
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      list.appendChild(opt);
    });
  }

  function save() {
    const nameInput = document.getElementById('compName');
    const name = (nameInput.value || '').trim();
    if (!name) { nameInput.focus(); nameInput.placeholder = I18n.t('compose.enterName'); return; }
    const store = getStore();
    store[name] = currentSong();
    setStore(store);
    refreshSavedList();
    document.getElementById('compLoadList').value = name;
  }

  function load() {
    const name = document.getElementById('compLoadList').value;
    if (!name) return;
    const store = getStore();
    if (store[name]) { applySong(store[name]); document.getElementById('compName').value = name; }
  }

  function deleteSong() {
    const name = document.getElementById('compLoadList').value;
    if (!name) return;
    const store = getStore();
    delete store[name];
    setStore(store);
    refreshSavedList();
  }

  function exportSong() {
    const name = (document.getElementById('compName').value || 'song').trim() || 'song';
    const blob = new Blob([JSON.stringify(currentSong(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace(/[^\w\-]+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importSong(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const song = parsed.song || parsed;
        applySong(song);
        if (song.title) document.getElementById('compName').value = song.title;
      } catch (err) { console.warn('Import failed:', err); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleMidi(midi, velocity, isOn = true) {
    const panel = document.getElementById('composer');
    if (!panel || !panel.classList.contains('active')) return;
    if (isDrums()) return;

    const pitch = fromMidi(midi);
    const now = performance.now();
    const vol = Math.min(1, (velocity || 64) / 127) * 0.28 + 0.12;

    if (isOn) {
      if (heldMidis.has(midi)) return;
      const stack = shouldStackChord(now);
      if (!stack) columnHold = { count: 1, downTime: now };
      else columnHold.count++;
      addPitch(pitch.letter, pitch.octave, pitch.acc || 0, stack);
      heldMidis.set(midi, { downTime: now });
      previewHoldStart(midi, vol);
    } else {
      if (!heldMidis.has(midi)) return;
      heldMidis.delete(midi);
      previewHoldStop(midi);
      columnHold.count = Math.max(0, columnHold.count - 1);
      if (columnHold.count === 0 && columnHold.downTime != null) {
        if (tapMode) finalizeColumnDuration(now - columnHold.downTime);
        lastInputUpTime = now;
        columnHold = { count: 0, downTime: null };
      }
    }
    renderTracks();
    draw();
  }

  function syncToggleLabels() {
    const tap = document.getElementById('compTapToggle');
    const chord = document.getElementById('compChordToggle');
    if (tap) tap.textContent = I18n.t(tapMode ? 'on' : 'off');
    if (chord) chord.textContent = I18n.t(chordMode ? 'on' : 'off');
  }

  function onLangChange() {
    syncToggleLabels();
    populateStrumSelect();
    populateExamples();
    refreshSavedList();
    refreshSourceTrackSelect();
    renderTracks();
    updateHint();
  }

  return { init, onLangChange, handleMidi, setBpm, syncTrackEqFromGlobal, loadSong };
})();
