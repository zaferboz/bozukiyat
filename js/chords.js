const ChordsModule = (() => {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Chord library: intervals (semitones from root) + degree formula.
  const CHORDS = {
    'major':       { name: 'Major',            symbol: '',       intervals: [0, 4, 7],         formula: ['1', '3', '5'],          desc: 'The fundamental bright/happy triad.' },
    'minor':       { name: 'Minor',            symbol: 'm',      intervals: [0, 3, 7],         formula: ['1', '♭3', '5'],         desc: 'The fundamental dark/sad triad.' },
    'diminished':  { name: 'Diminished',       symbol: '°',      intervals: [0, 3, 6],         formula: ['1', '♭3', '♭5'],        desc: 'Tense, unstable; two stacked minor thirds.' },
    'augmented':   { name: 'Augmented',        symbol: '+',      intervals: [0, 4, 8],         formula: ['1', '3', '♯5'],         desc: 'Dreamlike and unsettled; two stacked major thirds.' },
    'sus2':        { name: 'Suspended 2nd',    symbol: 'sus2',   intervals: [0, 2, 7],         formula: ['1', '2', '5'],          desc: 'Open sound, the 3rd replaced by a 2nd.' },
    'sus4':        { name: 'Suspended 4th',    symbol: 'sus4',   intervals: [0, 5, 7],         formula: ['1', '4', '5'],          desc: 'Wants to resolve; the 3rd replaced by a 4th.' },
    'maj7':        { name: 'Major 7th',        symbol: 'maj7',   intervals: [0, 4, 7, 11],     formula: ['1', '3', '5', '7'],     desc: 'Lush, jazzy, mellow.' },
    'dom7':        { name: 'Dominant 7th',     symbol: '7',      intervals: [0, 4, 7, 10],     formula: ['1', '3', '5', '♭7'],    desc: 'Bluesy and tense; wants to resolve to the I.' },
    'min7':        { name: 'Minor 7th',        symbol: 'm7',     intervals: [0, 3, 7, 10],     formula: ['1', '♭3', '5', '♭7'],   desc: 'Smooth, mellow minor sound.' },
    'min7b5':      { name: 'Half-Diminished',  symbol: 'm7♭5',   intervals: [0, 3, 6, 10],     formula: ['1', '♭3', '♭5', '♭7'],  desc: 'Common ii chord in minor keys.' },
    'dim7':        { name: 'Diminished 7th',   symbol: '°7',     intervals: [0, 3, 6, 9],      formula: ['1', '♭3', '♭5', '♭♭7'], desc: 'Symmetrical stack of minor thirds; very tense.' },
    'minMaj7':     { name: 'Minor-Major 7th',  symbol: 'm(maj7)',intervals: [0, 3, 7, 11],     formula: ['1', '♭3', '5', '7'],    desc: 'Haunting; minor triad with a major 7th.' },
    'add9':        { name: 'Add 9',            symbol: 'add9',   intervals: [0, 4, 7, 14],     formula: ['1', '3', '5', '9'],     desc: 'Major triad with a colourful added 9th.' },
    'maj9':        { name: 'Major 9th',        symbol: 'maj9',   intervals: [0, 4, 7, 11, 14], formula: ['1', '3', '5', '7', '9'], desc: 'Rich extended jazz chord.' },
    'dom9':        { name: 'Dominant 9th',     symbol: '9',      intervals: [0, 4, 7, 10, 14], formula: ['1', '3', '5', '♭7', '9'],desc: 'Funky, full dominant sound.' },
    'min9':        { name: 'Minor 9th',        symbol: 'm9',     intervals: [0, 3, 7, 10, 14], formula: ['1', '♭3', '5', '♭7', '9'], desc: 'Smooth extended minor sound.' },
    'six':         { name: 'Major 6th',        symbol: '6',      intervals: [0, 4, 7, 9],      formula: ['1', '3', '5', '6'],     desc: 'Sweet, vintage major sound.' },
    'min6':        { name: 'Minor 6th',        symbol: 'm6',     intervals: [0, 3, 7, 9],      formula: ['1', '♭3', '5', '6'],    desc: 'Jazzy minor with a bright natural 6th.' },
    'power':       { name: 'Power Chord (5)',  symbol: '5',      intervals: [0, 7],            formula: ['1', '5'],               desc: 'Root + 5th only; the backbone of rock.' }
  };

  let currentRoot = 'C';
  let currentType = 'major';

  function playGlobalNote(note, octave, duration = 0.6) {
    if (typeof GlobalSettingsModule !== 'undefined') {
      GlobalSettingsModule.playNote(note, octave, duration);
    } else {
      AudioEngine.playNoteName(note, octave, duration);
    }
  }

  function init() {
    const typeSelect = document.getElementById('chordType');
    Object.keys(CHORDS).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = CHORDS[key].name + (CHORDS[key].symbol ? ` (${CHORDS[key].symbol})` : '');
      typeSelect.appendChild(opt);
    });

    document.getElementById('chordRoot').addEventListener('change', (e) => {
      currentRoot = e.target.value;
      update();
    });
    typeSelect.addEventListener('change', (e) => {
      currentType = e.target.value;
      update();
    });
    document.getElementById('playChordBtn').addEventListener('click', () => playChord(false));
    document.getElementById('arpChordBtn').addEventListener('click', () => playChord(true));

    update();
  }

  function getChordNotes() {
    const rootIndex = NOTES.indexOf(currentRoot);
    const chord = CHORDS[currentType];
    return chord.intervals.map(semis => {
      const pc = (rootIndex + semis) % 12;
      const octave = 4 + Math.floor((rootIndex + semis) / 12);
      return { note: NOTES[pc], octave, semis };
    });
  }

  function buildMiniKeyboard(chordNotes) {
    const container = document.getElementById('chordPianoKeys');
    container.innerHTML = '';
    container.style.position = 'relative';

    const activePcs = chordNotes.map(n => NOTES.indexOf(n.note));
    const rootIndex = NOTES.indexOf(currentRoot);
    const whiteWidth = 56;
    const blackWidth = 36;
    const whiteHeight = 150;
    const blackHeight = 95;
    const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const startOctave = 4, endOctave = 6;

    const whiteFrag = document.createDocumentFragment();
    const blackFrag = document.createDocumentFragment();
    let whiteCount = 0;

    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (let i = 0; i < 12; i++) {
        const note = NOTES[i];
        const isBlack = note.includes('#');
        if (octave === endOctave && note !== 'C') continue;

        const key = document.createElement('div');
        key.className = 'piano-chord-key ' + (isBlack ? 'black' : 'white');
        const inChord = activePcs.includes(i);
        if (!inChord) {
          key.style.opacity = '0.25';
        }
        if (inChord && i === rootIndex) {
          key.classList.add('chord-root');
        } else if (inChord) {
          key.classList.add('chord-member');
        }

        const label = document.createElement('span');
        label.className = 'pck-label';
        label.textContent = note.replace('#', '♯');
        key.appendChild(label);

        key.addEventListener('click', () => {
          playGlobalNote(note, octave, 0.5);
          key.classList.add('pressed');
          setTimeout(() => key.classList.remove('pressed'), 200);
        });

        if (isBlack) {
          const whiteBefore = WHITE.indexOf(NOTES[i - 1]);
          const octaveWhiteOffset = (octave - startOctave) * 7 + whiteBefore;
          key.style.position = 'absolute';
          key.style.left = `${octaveWhiteOffset * whiteWidth + whiteWidth - Math.floor(blackWidth / 2)}px`;
          key.style.width = `${blackWidth}px`;
          key.style.height = `${blackHeight}px`;
          blackFrag.appendChild(key);
        } else {
          key.style.position = 'relative';
          key.style.flex = `0 0 ${whiteWidth}px`;
          key.style.width = `${whiteWidth}px`;
          key.style.height = `${whiteHeight}px`;
          whiteFrag.appendChild(key);
          whiteCount++;
        }
      }
    }

    const whiteWrapper = document.createElement('div');
    whiteWrapper.style.display = 'flex';
    whiteWrapper.appendChild(whiteFrag);
    container.appendChild(whiteWrapper);
    container.appendChild(blackFrag);
    container.style.width = `${whiteCount * whiteWidth}px`;
    container.style.height = `${whiteHeight}px`;
    container.style.margin = '0 auto';
  }

  function update() {
    const chord = CHORDS[currentType];
    const chordNotes = getChordNotes();

    document.getElementById('chordTitle').textContent = `${currentRoot}${chord.symbol} — ${chord.name}`;
    document.getElementById('chordDescription').textContent = chord.desc;

    buildMiniKeyboard(chordNotes);

    const notesContainer = document.getElementById('chordNotesList');
    notesContainer.innerHTML = '';
    chordNotes.forEach((n, index) => {
      const chip = document.createElement('div');
      chip.className = `scale-note-chip${index === 0 ? ' tonic' : ''}`;
      chip.textContent = n.note;
      chip.addEventListener('click', () => {
        playGlobalNote(n.note, n.octave, 0.5);
        chip.classList.add('active');
        setTimeout(() => chip.classList.remove('active'), 300);
      });
      notesContainer.appendChild(chip);
    });

    const formulaContainer = document.getElementById('chordFormula');
    formulaContainer.innerHTML = '';
    chord.formula.forEach(f => {
      const badge = document.createElement('div');
      badge.className = 'degree-badge';
      badge.textContent = f;
      formulaContainer.appendChild(badge);
    });
  }

  function playChord(arpeggiate) {
    const chordNotes = getChordNotes();
    chordNotes.forEach((n, i) => {
      const delay = arpeggiate ? i * 180 : 0;
      setTimeout(() => {
        playGlobalNote(n.note, n.octave, arpeggiate ? 0.5 : 1.1);
      }, delay);
    });

    const chips = document.querySelectorAll('#chordNotesList .scale-note-chip');
    chordNotes.forEach((n, i) => {
      setTimeout(() => {
        const chip = chips[i];
        if (chip) {
          chip.style.transform = 'scale(1.15)';
          chip.style.boxShadow = '0 0 20px var(--primary)';
          setTimeout(() => { chip.style.transform = ''; chip.style.boxShadow = ''; }, 300);
        }
      }, arpeggiate ? i * 180 : 0);
    });
  }

  return { init };
})();
