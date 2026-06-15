const SheetMusicModule = (() => {
  let canvas = null;
  let ctx = null;

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const PAUSE_MS = 1500;

  const LINE_SPACING = 24;
  const HALF = LINE_SPACING / 2;
  const TOP_LINE_Y = 40;
  const BOTTOM_LINE_Y = TOP_LINE_Y + 4 * LINE_SPACING;
  const NOTE_X = 420;

  const CLEF_REF = {
    treble: { letter: 'E', octave: 4 },
    bass: { letter: 'G', octave: 2 }
  };

  const BASE_POOL = {
    treble: [
      ['A', 3], ['B', 3], ['C', 4], ['D', 4], ['E', 4], ['F', 4], ['G', 4],
      ['A', 4], ['B', 4], ['C', 5], ['D', 5], ['E', 5], ['F', 5], ['G', 5], ['A', 5]
    ],
    bass: [
      ['C', 2], ['D', 2], ['E', 2], ['F', 2], ['G', 2], ['A', 2], ['B', 2],
      ['C', 3], ['D', 3], ['E', 3], ['F', 3], ['G', 3], ['A', 3], ['B', 3], ['C', 4]
    ]
  };

  function getKeyOctave() {
    if (typeof GlobalSettingsModule !== 'undefined') return GlobalSettingsModule.getKeyOctave();
    return 4;
  }

  function getPool(clefName) {
    const shift = clefName === 'treble' ? getKeyOctave() - 4 : getKeyOctave() - 3;
    return BASE_POOL[clefName].map(([letter, octave]) => [letter, octave + shift]);
  }

  let mode = 'learn';
  let clef = 'treble';
  let current = null;
  let answered = false;
  let playerGuess = null;
  let quizScore = { correct: 0, total: 0 };
  let pauseTimer = null;

  function ensureCanvas() {
    if (!canvas) {
      canvas = document.getElementById('staffCanvas');
      if (canvas) ctx = canvas.getContext('2d');
    }
    return !!(canvas && ctx);
  }

  function init() {
    if (!ensureCanvas()) return;
    const programEl = document.getElementById('trainingProgram');
    if (programEl) {
      programEl.addEventListener('change', applyTrainingProgram);
    }
    document.getElementById('clefSelect').addEventListener('change', (e) => {
      clef = e.target.value;
      clearPause();
      nextNote();
    });
    document.getElementById('newNoteBtn').addEventListener('click', () => {
      clearPause();
      nextNote();
    });
    document.getElementById('sheetPlayNote').addEventListener('click', playCurrentNote);
    document.getElementById('resetScoreBtn').addEventListener('click', () => {
      quizScore = { correct: 0, total: 0 };
      updateUI();
    });

    document.querySelectorAll('#sheetLetterPad .sheet-letter-btn').forEach(btn => {
      btn.addEventListener('click', () => handleLetterClick(btn.dataset.letter));
    });

    nextNote();

    window.addEventListener('globalsettingschange', (e) => {
      if (e.detail && e.detail.keyOctave != null && isNotesActive()) {
        clearPause();
        nextNote();
      }
    });

    applyTrainingProgram();
  }

  function isNotesActive() {
    const panel = document.getElementById('sheetmusic');
    if (!panel || !panel.classList.contains('active')) return false;
    const prog = document.getElementById('trainingProgram')?.value || 'notes-learn';
    return prog.startsWith('notes-');
  }

  function applyTrainingProgram() {
    const prog = document.getElementById('trainingProgram')?.value || 'notes-learn';
    const notesPanel = document.getElementById('trainingNotesPanel');
    const earPanel = document.getElementById('trainingEarPanel');
    if (prog.startsWith('notes-')) {
      if (notesPanel) notesPanel.hidden = false;
      if (earPanel) earPanel.hidden = true;
      mode = prog === 'notes-learn' ? 'learn' : 'quiz';
      clearPause();
      nextNote();
    } else {
      if (notesPanel) notesPanel.hidden = true;
      if (earPanel) earPanel.hidden = false;
      const earType = prog.replace('ear-', '');
      if (typeof EarTrainingModule !== 'undefined' && EarTrainingModule.setExercise) {
        EarTrainingModule.setExercise(earType);
      }
    }
  }

  function clearPause() {
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  }

  function diatonicValue(letter, octave) {
    return octave * 7 + LETTERS.indexOf(letter);
  }

  function noteToY(letter, octave) {
    const ref = CLEF_REF[clef];
    const steps = diatonicValue(letter, octave) - diatonicValue(ref.letter, ref.octave);
    return BOTTOM_LINE_Y - steps * HALF;
  }

  function playCurrentNote() {
    if (!current) return;
    AudioEngine.playNoteName(current.letter, current.octave, 0.6);
  }

  function playLetterPreview(letter) {
    let octave;
    if (mode === 'quiz' && current) {
      octave = current.octave;
    } else {
      octave = getKeyOctave();
    }
    AudioEngine.playNoteName(letter, octave, 0.45);
  }

  function nextNote() {
    clearPause();
    const pool = getPool(clef);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    current = { letter: pick[0], octave: pick[1] };
    answered = false;
    playerGuess = null;
    resetLetterButtons();
    render();
    if (mode === 'learn') {
      playCurrentNote();
    }
  }

  function resetLetterButtons() {
    document.querySelectorAll('#sheetLetterPad .sheet-letter-btn').forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('correct', 'wrong', 'highlight');
    });
    if (mode === 'learn' && current) {
      const correctBtn = document.querySelector(`#sheetLetterPad .sheet-letter-btn[data-letter="${current.letter}"]`);
      if (correctBtn) correctBtn.classList.add('highlight');
    }
  }

  function setLetterPadLocked(locked) {
    document.querySelectorAll('#sheetLetterPad .sheet-letter-btn').forEach(btn => {
      btn.disabled = locked;
    });
  }

  function handleLetterClick(letter) {
    if (!current) return;

    if (mode === 'learn') {
      playLetterPreview(letter);
      return;
    }

    if (answered) return;

    playerGuess = letter;
    answered = true;
    setLetterPadLocked(true);

    const correct = letter === current.letter;
    if (correct) quizScore.correct++;
    quizScore.total++;

    document.querySelectorAll('#sheetLetterPad .sheet-letter-btn').forEach(btn => {
      const l = btn.dataset.letter;
      btn.classList.remove('highlight');
      if (l === current.letter) btn.classList.add('correct');
      else if (l === letter && !correct) btn.classList.add('wrong');
    });

    playLetterPreview(letter);
    updateUI();

    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      nextNote();
    }, PAUSE_MS);
  }

  function drawClef() {
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (clef === 'treble') {
      ctx.font = '90px serif';
      ctx.fillText('𝄞', 38, BOTTOM_LINE_Y + 20);
    } else {
      ctx.font = '64px serif';
      ctx.fillText('𝄢', 40, TOP_LINE_Y + 50);
    }
  }

  function drawStaffLines() {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const y = TOP_LINE_Y + i * LINE_SPACING;
      ctx.beginPath();
      ctx.moveTo(110, y);
      ctx.lineTo(760, y);
      ctx.stroke();
    }
  }

  function drawLedgerLines(y) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    const draw = (ly) => {
      ctx.beginPath();
      ctx.moveTo(NOTE_X - 16, ly);
      ctx.lineTo(NOTE_X + 16, ly);
      ctx.stroke();
    };
    if (y < TOP_LINE_Y - 1) {
      for (let ly = TOP_LINE_Y - LINE_SPACING; ly >= y - 2; ly -= LINE_SPACING) draw(ly);
    }
    if (y > BOTTOM_LINE_Y + 1) {
      for (let ly = BOTTOM_LINE_Y + LINE_SPACING; ly <= y + 2; ly += LINE_SPACING) draw(ly);
    }
  }

  function drawNoteHead(y) {
    drawLedgerLines(y);

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(NOTE_X, y, 9, 7, -0.35, 0, Math.PI * 2);
    ctx.fill();

    const middleY = TOP_LINE_Y + 2 * LINE_SPACING;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (y <= middleY) {
      ctx.moveTo(NOTE_X - 8, y + 1);
      ctx.lineTo(NOTE_X - 8, y + 42);
    } else {
      ctx.moveTo(NOTE_X + 8, y - 1);
      ctx.lineTo(NOTE_X + 8, y - 42);
    }
    ctx.stroke();
  }

  function render() {
    if (!ensureCanvas()) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStaffLines();
    drawClef();

    if (current) {
      drawNoteHead(noteToY(current.letter, current.octave));
    }

    updateUI();
  }

  function updateUI() {
    const answerDiv = document.getElementById('quizAnswer');
    const scoreDiv = document.getElementById('quizScore');

    if (mode === 'learn') {
      scoreDiv.style.display = 'none';
      if (current) {
        answerDiv.textContent = I18n.t('sheet.noteLabel', { note: current.letter });
        answerDiv.className = 'quiz-answer revealed';
      }
      return;
    }

    scoreDiv.style.display = 'block';
    document.getElementById('scoreValue').textContent = quizScore.correct;
    document.getElementById('totalQuestions').textContent = quizScore.total;

    if (!answered) {
      answerDiv.textContent = I18n.t('sheet.pickLetter');
      answerDiv.className = 'quiz-answer';
    } else if (playerGuess === current.letter) {
      answerDiv.textContent = I18n.t('sheet.correctLetter', { letter: current.letter });
      answerDiv.className = 'quiz-answer correct';
    } else {
      answerDiv.textContent = I18n.t('sheet.wrongLetter', {
        letter: current.letter,
        guess: playerGuess
      });
      answerDiv.className = 'quiz-answer wrong';
    }
  }

  const NATURAL_PC = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };

  function handleMidi(midi, velocity) {
    if (!isNotesActive()) return;
    const pc = ((midi % 12) + 12) % 12;
    const letter = NATURAL_PC[pc];
    const vol = Math.min(1, (velocity || 64) / 127) * 0.28 + 0.12;
    if (!letter) {
      AudioEngine.startNoteHold(midi, vol);
      setTimeout(() => AudioEngine.stopNoteHold(midi), 280);
      return;
    }
    handleLetterClick(letter);
  }

  function onLangChange() {
    updateUI();
  }

  return { init, onLangChange, handleMidi, isNotesActive, applyTrainingProgram };
})();
