const ScalesModule = (() => {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Letter sequence used to spell scales so each degree uses a distinct letter.
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const SCALES = {
    'major': {
      name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11],
      degrees: ['1', '2', '3', '4', '5', '6', '7'],
      description: 'The bright, happy "do-re-mi" scale. Pattern: W-W-H-W-W-W-H.'
    },
    'natural-minor': {
      name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10],
      degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
      description: 'The standard sad/dark minor scale. Pattern: W-H-W-W-H-W-W.'
    },
    'harmonic-minor': {
      name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11],
      degrees: ['1', '2', '♭3', '4', '5', '♭6', '7'],
      description: 'Natural minor with a raised 7th, creating a strong leading tone and an exotic augmented 2nd.'
    },
    'melodic-minor': {
      name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11],
      degrees: ['1', '2', '♭3', '4', '5', '6', '7'],
      description: 'Minor with raised 6th and 7th (ascending), smoothing the leap of harmonic minor.'
    },
    'dorian': {
      name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10],
      degrees: ['1', '2', '♭3', '4', '5', '6', '♭7'],
      description: 'A minor mode with a bright natural 6th. Common in jazz, folk and rock.'
    },
    'phrygian': {
      name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10],
      degrees: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
      description: 'A dark minor mode with a ♭2, giving a Spanish/flamenco flavour.'
    },
    'lydian': {
      name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11],
      degrees: ['1', '2', '3', '♯4', '5', '6', '7'],
      description: 'A major mode with a raised 4th — dreamy and floating.'
    },
    'mixolydian': {
      name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10],
      degrees: ['1', '2', '3', '4', '5', '6', '♭7'],
      description: 'A major mode with a ♭7 — the dominant/bluesy sound.'
    },
    'locrian': {
      name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10],
      degrees: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'],
      description: 'The darkest mode with both ♭2 and ♭5; unstable diminished tonic.'
    },
    'major-pentatonic': {
      name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9],
      degrees: ['1', '2', '3', '5', '6'],
      description: 'A 5-note major scale with no half steps — easy and consonant.'
    },
    'minor-pentatonic': {
      name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10],
      degrees: ['1', '♭3', '4', '5', '♭7'],
      description: 'The go-to scale for rock and blues soloing.'
    },
    'blues': {
      name: 'Blues', intervals: [0, 3, 5, 6, 7, 10],
      degrees: ['1', '♭3', '4', '♭5', '5', '♭7'],
      description: 'Minor pentatonic plus the "blue note" (♭5) for extra grit.'
    },
    'whole-tone': {
      name: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10],
      degrees: ['1', '2', '3', '♯4', '♯5', '♯6'],
      description: 'Six notes a whole step apart — dreamlike and ambiguous (no tonal center).'
    },
    'chromatic': {
      name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      degrees: ['1', '♯1', '2', '♯2', '3', '4', '♯4', '5', '♯5', '6', '♯6', '7'],
      description: 'All twelve notes — every half step in the octave.'
    },
    // Turkish makams (12-TET approximation; microtonal kommas omitted).
    'rast': {
      name: 'Rast', intervals: [0, 2, 4, 5, 7, 9, 11],
      degrees: ['1', '2', '3', '4', '5', '6', '7'],
      description: 'Classic Ottoman/Turkish makam — bright tonic. Same steps as major: W-W-H-W-W-W-H.',
      i18n: true
    },
    'nihavent': {
      name: 'Nihavent', intervals: [0, 2, 3, 5, 7, 9, 10],
      degrees: ['1', '2', '♭3', '4', '5', '6', '♭7'],
      description: 'Popular makam for taksim and songs. Minor feel with a raised 6th: W-H-W-W-W-H-W.',
      i18n: true
    },
    'kurdi': {
      name: 'Kürdi', intervals: [0, 1, 3, 5, 7, 8, 10],
      degrees: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
      description: 'Dark, Phrygian-like makam with ♭2: H-W-W-H-W-W-W.',
      i18n: true
    },
    'hicaz': {
      name: 'Hicaz', intervals: [0, 1, 4, 5, 7, 8, 11],
      degrees: ['1', '♭2', '3', '4', '5', '♭6', '7'],
      description: 'Exotic makam with the characteristic Hicaz augmented 2nd (♭2 to 3): H-A2-H-W-H-A2-H.',
      i18n: true
    },
    'ussak': {
      name: 'Uşşak', intervals: [0, 2, 3, 5, 7, 8, 10],
      degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
      description: 'Fundamental minor makam — same step pattern as natural minor: W-H-W-W-H-W-W.',
      i18n: true
    },
    'huseyni': {
      name: 'Hüseyni', intervals: [0, 2, 3, 5, 7, 8, 11],
      degrees: ['1', '2', '♭3', '4', '5', '♭6', '7'],
      description: 'Minor makam with raised 7th — like harmonic minor: W-H-W-W-H-A2-H.',
      i18n: true
    },
    'segah': {
      name: 'Segah', intervals: [0, 2, 4, 6, 7, 9, 11],
      degrees: ['1', '2', '3', '♯4', '5', '6', '7'],
      description: 'Makam with a raised 4th degree: W-W-W-H-W-W-H.',
      i18n: true
    },
    'saba': {
      name: 'Saba', intervals: [0, 1, 4, 5, 8, 9, 11],
      degrees: ['1', '♭2', '3', '4', '♯5', '6', '7'],
      description: 'Highly expressive makam with wide leaps: H-A2-H-A2-H-W-H.',
      i18n: true
    },
    'huzzam': {
      name: 'Hüzzam', intervals: [0, 1, 4, 5, 7, 8, 10],
      degrees: ['1', '♭2', '3', '4', '5', '♭6', '♭7'],
      description: 'Melancholic makam related to Hicaz, with ♭7: H-A2-H-W-H-W-W.',
      i18n: true
    },
    'mahur': {
      name: 'Mahur', intervals: [0, 2, 4, 5, 7, 9, 11],
      degrees: ['1', '2', '3', '4', '5', '6', '7'],
      description: 'Majestic major-family makam (same steps as Rast/Major): W-W-H-W-W-W-H.',
      i18n: true
    },
    'buselik': {
      name: 'Buselik', intervals: [0, 2, 4, 6, 7, 9, 11],
      degrees: ['1', '2', '3', '♯4', '5', '6', '7'],
      description: 'Makam with three whole steps to the 4th: W-W-W-H-W-W-H.',
      i18n: true
    },
    'acemasiran': {
      name: 'Acemasiran', intervals: [0, 1, 3, 5, 6, 8, 10],
      degrees: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'],
      description: 'Diminished-flavoured makam with ♭2 and ♭5: H-W-W-H-W-W-W.',
      i18n: true
    },
    'karcigar': {
      name: 'Karcıgar', intervals: [0, 2, 3, 5, 7, 9, 11],
      degrees: ['1', '2', '♭3', '4', '5', '6', '7'],
      description: 'Minor makam with raised 6th and 7th (melodic-minor ascending): W-H-W-W-W-W-H.',
      i18n: true
    }
  };

  function scaleLabel(scaleKey, field) {
    const scale = SCALES[scaleKey];
    if (!scale) return '';
    if (scale.i18n) {
      const key = `scale.${scaleKey}.${field}`;
      const t = I18n.t(key);
      if (t !== key) return t;
    }
    return scale[field] || '';
  }

  // Triad qualities by stacking scale degrees (1-3-5) for 7-note scales.
  const TRIAD_QUALITY = {
    '0-4-7': { suffix: '', label: 'maj' },
    '0-3-7': { suffix: 'm', label: 'min' },
    '0-3-6': { suffix: '°', label: 'dim' },
    '0-4-8': { suffix: '+', label: 'aug' }
  };

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  let currentRoot = 'C';
  let currentScale = 'major';

  function playGlobalNote(note, octave, duration = 0.5) {
    if (typeof GlobalSettingsModule !== 'undefined') {
      GlobalSettingsModule.playNote(note, octave, duration);
    } else {
      AudioEngine.playNoteName(note, octave, duration);
    }
  }

  function playPitch(p, duration = 0.5) {
    const semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const pc = ((semi[p.letter.charAt(0)] + (p.acc || 0)) % 12 + 12) % 12;
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    playGlobalNote(names[pc], p.octave, duration);
  }

  function init() {
    document.getElementById('rootNote').addEventListener('change', (e) => {
      currentRoot = e.target.value;
      updateScaleDisplay();
    });

    document.getElementById('scaleType').addEventListener('change', (e) => {
      currentScale = e.target.value;
      updateScaleDisplay();
    });

    document.getElementById('playScaleBtn').addEventListener('click', () => playCurrentScale(false));
    const downBtn = document.getElementById('playScaleDownBtn');
    if (downBtn) downBtn.addEventListener('click', () => playCurrentScale(true));

    updateScaleDisplay();
    window.addEventListener('examplesongsloaded', () => updateScaleDisplay());
  }

  function getScaleNotes(root, scaleKey) {
    const rootIndex = NOTES.indexOf(root);
    const scale = SCALES[scaleKey];

    return scale.intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return NOTES[noteIndex];
    });
  }

  function buildMiniKeyboard(root, scaleKey) {
    const container = document.getElementById('scalePianoKeys');
    if (!container) return;
    container.innerHTML = '';
    container.style.position = 'relative';

    const scaleNotes = getScaleNotes(root, scaleKey);
    const rootIndex = NOTES.indexOf(root);

    const startOctave = 4;
    const endOctave = 5;
    const whiteWidth = 42;
    const blackWidth = 28;
    const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    const whiteFrag = document.createDocumentFragment();
    const blackFrag = document.createDocumentFragment();
    let whiteCount = 0;

    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (let i = 0; i < 12; i++) {
        const note = NOTES[i];
        const isBlack = note.includes('#');
        if (octave === endOctave && note !== 'C') continue;

        const key = document.createElement('div');
        key.className = 'solar-key ' + (isBlack ? 'black' : 'white');
        key.dataset.note = note;
        key.dataset.octave = octave;

        const isInScale = scaleNotes.includes(note);
        if (!isInScale) {
          key.style.opacity = '0.2';
          key.style.filter = 'grayscale(1)';
        }
        if (note === root) {
          key.style.borderColor = 'var(--secondary)';
          key.style.borderWidth = '3px';
        }

        key.addEventListener('click', () => {
          playGlobalNote(note, octave, 0.4);
          key.classList.add('active');
          setTimeout(() => key.classList.remove('active'), 200);
        });

        if (isBlack) {
          const whiteBefore = WHITE.indexOf(NOTES[i - 1]);
          const octaveWhiteOffset = (octave - startOctave) * 7 + whiteBefore;
          key.style.position = 'absolute';
          key.style.left = `${octaveWhiteOffset * whiteWidth + whiteWidth - Math.floor(blackWidth / 2)}px`;
          key.style.width = `${blackWidth}px`;
          blackFrag.appendChild(key);
        } else {
          key.style.position = 'relative';
          key.style.flex = `0 0 ${whiteWidth}px`;
          key.style.width = `${whiteWidth}px`;
          whiteFrag.appendChild(key);
          whiteCount++;
        }
      }
    }

    const whiteWrapper = document.createElement('div');
    whiteWrapper.style.display = 'flex';
    whiteWrapper.style.gap = '0';
    whiteWrapper.appendChild(whiteFrag);
    container.appendChild(whiteWrapper);
    container.appendChild(blackFrag);
    container.style.width = `${whiteCount * whiteWidth}px`;
    container.style.margin = '0 auto';
  }

  // Spell the scale using distinct letters when possible (proper enharmonics).
  function spellScale(root, scaleKey) {
    const scale = SCALES[scaleKey];
    const scaleNotes = getScaleNotes(root, scaleKey);
    // Only diatonic-style 7-note scales get letter spelling.
    if (scale.intervals.length !== 7) return scaleNotes;

    const rootLetter = root.charAt(0);
    let letterStart = LETTERS.indexOf(rootLetter);
    const rootIndex = NOTES.indexOf(root);

    return scale.intervals.map((interval, deg) => {
      const targetPc = (rootIndex + interval) % 12;
      const letter = LETTERS[(letterStart + deg) % 7];
      const naturalPc = NOTES.indexOf(letter);
      let diff = (targetPc - naturalPc + 12) % 12;
      if (diff > 6) diff -= 12;
      if (diff === 0) return letter;
      if (diff === 1) return letter + '♯';
      if (diff === 2) return letter + '𝄪';
      if (diff === -1) return letter + '♭';
      if (diff === -2) return letter + '𝄫';
      return NOTES[targetPc];
    });
  }

  function buildHarmonizedChords(root, scaleKey) {
    const container = document.getElementById('harmonizedChords');
    container.innerHTML = '';
    const scale = SCALES[scaleKey];
    if (scale.intervals.length !== 7) return;

    const heading = document.createElement('h3');
    heading.className = 'sub-heading';
    heading.textContent = I18n.t('scales.diatonicChords');
    container.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'chord-grid';

    const spelled = spellScale(root, scaleKey);
    const rootIndex = NOTES.indexOf(root);

    for (let deg = 0; deg < 7; deg++) {
      const third = scale.intervals[(deg + 2) % 7];
      const fifth = scale.intervals[(deg + 4) % 7];
      const r = scale.intervals[deg];
      const t3 = (third - r + 12) % 12;
      const t5 = (fifth - r + 12) % 12;
      const key = `0-${t3}-${t5}`;
      const quality = TRIAD_QUALITY[key] || { suffix: '?', label: '' };

      let roman = ROMAN[deg];
      if (quality.label === 'min' || quality.label === 'dim') roman = roman.toLowerCase();
      if (quality.label === 'dim') roman += '°';
      if (quality.label === 'aug') roman += '+';

      const card = document.createElement('div');
      card.className = 'chord-card';
      card.innerHTML = `<span class="chord-roman">${roman}</span>` +
        `<span class="chord-name">${spelled[deg]}${quality.suffix}</span>`;

      const chordPcs = [r, t3 + r, t5 + r].map(x => (rootIndex + x) % 12);
      card.addEventListener('click', () => {
        chordPcs.forEach((pc, i) => {
          setTimeout(() => playGlobalNote(NOTES[pc], 4, 0.9), i * 0);
        });
        card.classList.add('active');
        setTimeout(() => card.classList.remove('active'), 300);
      });

      grid.appendChild(card);
    }
    container.appendChild(grid);
  }

  // Long horizontal "ruler" mapping each step (Full/Half) from the tonic up to the octave.
  function buildStepRuler(spelled, steps, stepLabel) {
    const ruler = document.getElementById('scaleRuler');
    if (!ruler) return;
    ruler.innerHTML = '';

    // Nodes are each scale note plus the octave (tonic again at the top).
    const nodes = [...spelled, spelled[0]];

    nodes.forEach((noteName, i) => {
      const node = document.createElement('div');
      node.className = 'ruler-note';
      if (i === 0 || i === nodes.length - 1) node.classList.add('tonic');

      const dot = document.createElement('div');
      dot.className = 'ruler-dot';
      dot.textContent = noteName;

      const idx = i === nodes.length - 1 ? 0 : i;
      node.addEventListener('click', () => {
        const pc = getScaleNotes(currentRoot, currentScale)[idx % spelled.length];
        const octave = i === nodes.length - 1 ? 5 : 4;
        AudioEngine.playNoteName(pc, octave, 0.4);
        dot.classList.add('lit');
        setTimeout(() => dot.classList.remove('lit'), 250);
      });

      node.appendChild(dot);
      ruler.appendChild(node);

      // Add the connecting step segment after every node except the last.
      if (i < steps.length) {
        const step = steps[i];
        const seg = document.createElement('div');
        const cls = step === 1 ? 'half' : step === 2 ? 'full' : 'aug';
        seg.className = `ruler-step ${cls}`;
        seg.innerHTML = `<span class="ruler-step-label">${stepLabel(step)}</span>`;
        ruler.appendChild(seg);
      }
    });
  }

  function updateScaleDisplay() {
    const root = currentRoot;
    const scaleKey = currentScale;
    const scale = SCALES[scaleKey];
    const scaleNotes = getScaleNotes(root, scaleKey);
    const spelled = spellScale(root, scaleKey);

    document.getElementById('scaleTitle').textContent = `${root} ${scaleLabel(scaleKey, 'name')}`;
    document.getElementById('scaleDescription').textContent = scaleLabel(scaleKey, 'description');

    buildMiniKeyboard(root, scaleKey);

    const notesContainer = document.getElementById('scaleNotesList');
    notesContainer.innerHTML = '';
    spelled.forEach((note, index) => {
      const chip = document.createElement('div');
      chip.className = `scale-note-chip${index === 0 ? ' tonic' : ''}`;
      chip.textContent = note;
      chip.addEventListener('click', () => {
        playGlobalNote(scaleNotes[index], 4, 0.5);
        chip.classList.add('active');
        setTimeout(() => chip.classList.remove('active'), 300);
      });
      notesContainer.appendChild(chip);
    });

    const degreesContainer = document.getElementById('scaleDegrees');
    degreesContainer.innerHTML = '';
    scale.degrees.forEach(deg => {
      const badge = document.createElement('div');
      badge.className = 'degree-badge';
      badge.textContent = deg;
      degreesContainer.appendChild(badge);
    });

    const steps = [];
    for (let i = 1; i < scale.intervals.length; i++) {
      steps.push(scale.intervals[i] - scale.intervals[i - 1]);
    }
    steps.push(12 - scale.intervals[scale.intervals.length - 1]);

    const stepLabel = (s) => s === 1 ? 'H' : s === 2 ? 'F' : `+${s}`;

    document.getElementById('scalePattern').textContent =
      steps.map(stepLabel).join(' – ');

    buildStepRuler(spelled, steps, stepLabel);

    const intervalsContainer = document.getElementById('scaleIntervals');
    intervalsContainer.innerHTML = '';
    steps.forEach(step => {
      const badge = document.createElement('div');
      const cls = step === 1 ? 'half' : step === 2 ? 'whole' : 'aug';
      badge.className = `interval-badge ${cls}`;
      badge.textContent = step === 1 ? I18n.t('scales.half') : step === 2 ? I18n.t('scales.full') : `+${step}`;
      badge.title = step === 1 ? 'Half step (1 semitone)' : step === 2 ? 'Full / whole step (2 semitones)' : `${step} semitones`;
      intervalsContainer.appendChild(badge);
    });

    buildHarmonizedChords(root, scaleKey);
    buildScaleExamples(scaleKey);
  }

  function previewExampleSong(song) {
    const track = song.tracks.find(t => t.notes && t.notes.length) || song.tracks[0];
    if (!track || !track.notes.length) return;
    const bpm = song.bpm || 100;
    const secPerQuarter = 60 / bpm;
    let t = 0;
    track.notes.forEach((col) => {
      const beats = 4 / (col.value || 4);
      const delay = t;
      t += beats * secPerQuarter;
      if (col.rest) return;
      const pitch = col.pitches?.[0] || (col.letter ? col : null);
      if (!pitch) return;
      setTimeout(() => {
        playPitch(pitch, Math.min(0.8, beats * secPerQuarter * 0.85));
      }, delay * 1000);
    });
  }

  function loadExampleInComposer(song) {
    const copy = JSON.parse(JSON.stringify(song));
    const tab = document.querySelector('.tab-btn[data-tab="composer"]');
    if (tab) tab.click();
    if (typeof ComposerModule !== 'undefined' && ComposerModule.loadSong) {
      ComposerModule.loadSong(copy);
    }
  }

  function buildScaleExamples(scaleKey) {
    const list = document.getElementById('scaleExamplesList');
    const empty = document.getElementById('scaleExamplesEmpty');
    if (!list) return;
    list.innerHTML = '';
    const matches = typeof songsForScale === 'function' ? songsForScale(scaleKey) : [];
    if (!matches.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    matches.forEach((song) => {
      const card = document.createElement('div');
      card.className = 'scale-example-card';

      const info = document.createElement('div');
      info.className = 'scale-example-info';
      const title = document.createElement('strong');
      title.textContent = song.title;
      const meta = document.createElement('span');
      meta.className = 'scale-example-meta';
      const rootHint = song.root ? `${song.root} · ` : '';
      meta.textContent = `${rootHint}${song.bpm} BPM`;
      info.appendChild(title);
      info.appendChild(meta);

      const btns = document.createElement('div');
      btns.className = 'scale-example-btns';

      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'play-btn';
      previewBtn.textContent = I18n.t('scales.previewSong');
      previewBtn.addEventListener('click', () => previewExampleSong(song));

      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'play-btn';
      loadBtn.textContent = I18n.t('scales.loadInComposer');
      loadBtn.addEventListener('click', () => loadExampleInComposer(song));

      btns.appendChild(previewBtn);
      btns.appendChild(loadBtn);
      card.appendChild(info);
      card.appendChild(btns);
      list.appendChild(card);
    });
  }

  function playCurrentScale(descending) {
    const root = currentRoot;
    const scaleKey = currentScale;
    const rootIndex = NOTES.indexOf(root);
    const scale = SCALES[scaleKey];

    const sequence = scale.intervals.map((interval, index) => ({
      noteIndex: (rootIndex + interval) % 12,
      octave: index < (scaleKey === 'chromatic' ? 7 : 4) ? 4 : 5,
      chipIndex: index
    }));
    sequence.push({ noteIndex: rootIndex, octave: 5, chipIndex: 0 });

    const ordered = descending ? [...sequence].reverse() : sequence;

    let delay = 0;
    ordered.forEach((step) => {
      setTimeout(() => {
        AudioEngine.playNoteName(NOTES[step.noteIndex], step.octave, 0.4);
        const chip = document.querySelectorAll('.scale-note-chip')[step.chipIndex];
        if (chip) {
          chip.style.transform = 'scale(1.15)';
          chip.style.boxShadow = '0 0 20px var(--primary)';
          setTimeout(() => {
            chip.style.transform = '';
            chip.style.boxShadow = '';
          }, 300);
        }
      }, delay);
      delay += 380;
    });
  }

  function onLangChange() {
    updateScaleDisplay();
  }

  return { init, onLangChange };
})();
