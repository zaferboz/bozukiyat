const MainModule = (() => {
  function init() {
    document.body.dataset.activeTab = document.querySelector('.tab-panel.active')?.id || 'piano';
    initTabs();
    if (typeof GlobalSettingsModule !== 'undefined') GlobalSettingsModule.init();
    initPiano();
    initGuitar();
    initGuitarChords();
    initScales();
    initChords();
    initEarTraining();
    initSheetMusic();
    initComposer();
    initMetronome();
    initTuner();
    initMidi();
  }

  function initTuner() {
    TunerModule.init();
  }

  function initMidi() {
    if (typeof MidiModule !== 'undefined') MidiModule.init();
  }

  function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const panel = document.getElementById(tabName);
        if (panel) {
          panel.classList.add('active');
        }
        if (typeof AudioEngine !== 'undefined' && AudioEngine.stopAllHeld) {
          AudioEngine.stopAllHeld();
        }
        if (typeof TunerModule !== 'undefined' && TunerModule.stopMic) {
          TunerModule.stopMic();
        }
        document.body.dataset.activeTab = tabName;
      });
    });
  }

  function initPiano() {
    PianoModule.init();
  }

  function initGuitar() {
    GuitarModule.init();
  }

  function initGuitarChords() {
    GuitarChordsModule.init();
  }

  function initScales() {
    ScalesModule.init();
  }

  function initChords() {
    ChordsModule.init();
  }

  function initSheetMusic() {
    SheetMusicModule.init();
  }

  function initComposer() {
    ComposerModule.init();
  }

  function initEarTraining() {
    EarTrainingModule.init();
  }

  function initMetronome() {
    MetronomeModule.init();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  I18n.init();
  const boot = () => MainModule.init();
  if (typeof loadExampleSongs === 'function') {
    loadExampleSongs().then(boot);
  } else {
    boot();
  }
  window.addEventListener('langchange', () => {
    if (typeof GlobalSettingsModule !== 'undefined' && GlobalSettingsModule.syncUi) GlobalSettingsModule.syncUi();
    if (ComposerModule.onLangChange) ComposerModule.onLangChange();
    if (SheetMusicModule.onLangChange) SheetMusicModule.onLangChange();
    if (ScalesModule.onLangChange) ScalesModule.onLangChange();
    if (GuitarChordsModule.onLangChange) GuitarChordsModule.onLangChange();
    if (MetronomeModule.onLangChange) MetronomeModule.onLangChange();
    if (TunerModule.onLangChange) TunerModule.onLangChange();
    if (MidiModule.onLangChange) MidiModule.onLangChange();
  });
});
