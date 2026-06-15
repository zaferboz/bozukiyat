const EarTrainingModule = (() => {
  let exerciseType = 'interval';
  let currentAnswer = null;
  let currentNotes = [];
  let isAnswered = false;

  const INTERVALS = [
    { name: 'Minor 2nd', semitones: 1 },
    { name: 'Major 2nd', semitones: 2 },
    { name: 'Minor 3rd', semitones: 3 },
    { name: 'Major 3rd', semitones: 4 },
    { name: 'Perfect 4th', semitones: 5 },
    { name: 'Tritone', semitones: 6 },
    { name: 'Perfect 5th', semitones: 7 },
    { name: 'Minor 6th', semitones: 8 },
    { name: 'Major 6th', semitones: 9 },
    { name: 'Minor 7th', semitones: 10 },
    { name: 'Major 7th', semitones: 11 },
    { name: 'Octave', semitones: 12 }
  ];

  const CHORDS = [
    { name: 'Major', pattern: [0, 4, 7], symbol: '△' },
    { name: 'Minor', pattern: [0, 3, 7], symbol: '–' },
    { name: 'Diminished', pattern: [0, 3, 6], symbol: '°' },
    { name: 'Augmented', pattern: [0, 4, 8], symbol: '+' }
  ];

  const NOTES_ARRAY = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function init() {
    document.getElementById('listenBtn').addEventListener('click', playExercise);
    document.getElementById('replayBtn').addEventListener('click', playExercise);
    resetExercise();
  }

  function isEarActive() {
    const panel = document.getElementById('sheetmusic');
    if (!panel || !panel.classList.contains('active')) return false;
    const earPanel = document.getElementById('trainingEarPanel');
    return earPanel && !earPanel.hidden;
  }

  function setExercise(type) {
    exerciseType = type;
    resetExercise();
  }

  function resetExercise() {
    isAnswered = false;
    document.getElementById('earFeedback').textContent = '';
    document.getElementById('earAnswerButtons').innerHTML = '';

    if (exerciseType === 'interval') {
      currentAnswer = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];

      const rootIndex = Math.floor(Math.random() * 12);
      const rootNote = NOTES_ARRAY[rootIndex];
      const octave = 4;

      const secondIndex = (rootIndex + currentAnswer.semitones) % 12;
      const secondNote = NOTES_ARRAY[secondIndex];

      currentNotes = [
        { note: rootNote, octave },
        { note: secondNote, octave }
      ];

      buildIntervalButtons();
    } else if (exerciseType === 'chord') {
      currentAnswer = CHORDS[Math.floor(Math.random() * CHORDS.length)];

      const rootIndex = Math.floor(Math.random() * 12);
      const rootNote = NOTES_ARRAY[rootIndex];
      const octave = 4;

      const notes = currentAnswer.pattern.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        return { note: NOTES_ARRAY[noteIndex], octave };
      });

      currentNotes = notes;
      buildChordButtons();
    } else if (exerciseType === 'note-name') {
      const randomMIDI = 48 + Math.floor(Math.random() * 24);
      const noteName = NOTES_ARRAY[randomMIDI % 12];
      const octave = Math.floor(randomMIDI / 12) - 1;

      currentNotes = [{ note: noteName, octave }];
      currentAnswer = { name: noteName, midi: randomMIDI };

      buildNoteButtons();
    }
  }

  function buildIntervalButtons() {
    const container = document.getElementById('earAnswerButtons');
    container.innerHTML = '';

    const shuffled = [...INTERVALS].sort(() => Math.random() - 0.5);

    shuffled.forEach(interval => {
      const btn = document.createElement('button');
      btn.className = 'ear-btn';
      btn.textContent = interval.name;
      btn.addEventListener('click', () => checkIntervalAnswer(interval, btn));
      container.appendChild(btn);
    });
  }

  function buildChordButtons() {
    const container = document.getElementById('earAnswerButtons');
    container.innerHTML = '';

    const shuffled = [...CHORDS].sort(() => Math.random() - 0.5);

    shuffled.forEach(chord => {
      const btn = document.createElement('button');
      btn.className = 'ear-btn';
      btn.textContent = chord.symbol + ' ' + chord.name;
      btn.addEventListener('click', () => checkChordAnswer(chord, btn));
      container.appendChild(btn);
    });
  }

  function buildNoteButtons() {
    const container = document.getElementById('earAnswerButtons');
    container.innerHTML = '';

    const shuffled = [...NOTES_ARRAY].sort(() => Math.random() - 0.5);

    shuffled.forEach(note => {
      const btn = document.createElement('button');
      btn.className = 'ear-btn';
      btn.textContent = note;
      btn.addEventListener('click', () => checkNoteAnswer(note, btn));
      container.appendChild(btn);
    });
  }

  function checkIntervalAnswer(selected, btn) {
    if (isAnswered) return;
    isAnswered = true;

    const correct = selected.semitones === currentAnswer.semitones;
    btn.classList.add(correct ? 'correct' : 'wrong');

    if (!correct) {
      const allButtons = document.querySelectorAll('.ear-btn');
      allButtons.forEach(b => {
        if (b.textContent === currentAnswer.name) {
          b.classList.add('correct');
        }
      });
    }

    showFeedback(correct, currentAnswer.name);
  }

  function checkChordAnswer(selected, btn) {
    if (isAnswered) return;
    isAnswered = true;

    const correct = selected.name === currentAnswer.name;
    btn.classList.add(correct ? 'correct' : 'wrong');

    if (!correct) {
      const allButtons = document.querySelectorAll('.ear-btn');
      allButtons.forEach(b => {
        if (b.textContent === currentAnswer.symbol + ' ' + currentAnswer.name) {
          b.classList.add('correct');
        }
      });
    }

    showFeedback(correct, currentAnswer.name + ' chord');
  }

  function checkNoteAnswer(selected, btn) {
    if (isAnswered) return;
    isAnswered = true;

    const correct = selected === currentAnswer.name;
    btn.classList.add(correct ? 'correct' : 'wrong');

    if (!correct) {
      const allButtons = document.querySelectorAll('.ear-btn');
      allButtons.forEach(b => {
        if (b.textContent === currentAnswer.name) {
          b.classList.add('correct');
        }
      });
    }

    showFeedback(correct, `Note ${currentAnswer.name}`);
  }

  function showFeedback(correct, answer) {
    const feedback = document.getElementById('earFeedback');
    if (correct) {
      feedback.textContent = I18n.t('ear.correct');
      feedback.style.color = 'var(--success)';
      setTimeout(() => {
        feedback.textContent = '';
        resetExercise();
      }, 1500);
    } else {
      feedback.textContent = I18n.t('ear.wrong', { answer });
      feedback.style.color = 'var(--danger)';
      setTimeout(() => {
        feedback.textContent = '';
        resetExercise();
      }, 2000);
    }
  }

  function playExercise() {
    if (currentNotes.length === 0) return;

    if (exerciseType === 'chord') {
      // Play harmonically (all notes together) then a short arpeggio.
      currentNotes.forEach((noteObj) => {
        AudioEngine.playNoteName(noteObj.note, noteObj.octave, 1.4);
      });
      currentNotes.forEach((noteObj, index) => {
        setTimeout(() => {
          AudioEngine.playNoteName(noteObj.note, noteObj.octave, 0.4);
        }, 1500 + index * 300);
      });
      return;
    }

    currentNotes.forEach((noteObj, index) => {
      setTimeout(() => {
        AudioEngine.playNoteName(noteObj.note, noteObj.octave, 0.5);
      }, index * 500);
    });
  }

  function handleMidi(midi) {
    if (!isEarActive() || isAnswered || exerciseType !== 'note-name') return;
    const note = NOTES_ARRAY[((midi % 12) + 12) % 12];
    const btn = [...document.querySelectorAll('#earAnswerButtons .ear-btn')]
      .find(b => b.textContent === note);
    if (btn) btn.click();
  }

  return { init, setExercise, isEarActive, handleMidi };
})();
