/* Progressive enhancement: the complete examples remain readable without JS. */
(() => {
  const body = document.body;
  const platformButtons = [...document.querySelectorAll('[data-platform-choice]')];
  const applyPlatform = platform => {
    body.dataset.platform = platform;
    platformButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platformChoice === platform)));
  };
  let saved;
  try { saved = localStorage.getItem('brain-platform'); } catch { /* Storage is optional. */ }
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '') || /Macintosh/.test(navigator.userAgent || '');
  applyPlatform(['mac', 'windows'].includes(saved) ? saved : isMac ? 'mac' : 'windows');
  platformButtons.forEach(button => button.addEventListener('click', () => {
    applyPlatform(button.dataset.platformChoice);
    try { localStorage.setItem('brain-platform', button.dataset.platformChoice); } catch { /* Keep the current selection. */ }
  }));
  // Both platforms remain discoverable when scripts are disabled.
  body.classList.add('enhanced');
  const steps = [...document.querySelectorAll('[data-step]')];
  const scenes = [...document.querySelectorAll('.demo-scene')];
  function selectStep(button) {
    steps.forEach(step => step.setAttribute('aria-pressed', String(step === button)));
    scenes.forEach(scene => { scene.hidden = scene.id !== button.getAttribute('aria-controls'); });
  }
  steps.forEach((button, index) => {
    button.addEventListener('click', () => selectStep(button));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % steps.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + steps.length - 1) % steps.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = steps.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      steps[next].focus();
      selectStep(steps[next]);
    });
  });
  if (steps.length) selectStep(steps[0]);

  const replay = document.getElementById('replay-speak');
  if (replay) {
    replay.hidden = false;
    const draft = document.getElementById('dictation-text');
    const status = document.getElementById('speak-status');
    const announcement = document.getElementById('speak-announcement');
    const visual = document.querySelector('.speak-visual');
    const text = draft.textContent;
    const words = text.split(' ');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let timer;
    const finish = () => {
      clearInterval(timer);
      draft.textContent = text;
      status.textContent = 'Your thought, in words.';
      visual.classList.remove('is-playing');
      replay.disabled = false;
      replay.textContent = '↻ Replay dictation example';
      announcement.textContent = 'Example complete. ' + text;
    };
    replay.addEventListener('click', () => {
      clearInterval(timer);
      announcement.textContent = '';
      if (reducedMotion.matches) { finish(); return; }
      replay.disabled = true;
      visual.classList.add('is-playing');
      status.textContent = 'Turning a thought into text…';
      draft.textContent = '';
      let count = 0;
      timer = setInterval(() => {
        count += 1;
        draft.textContent = words.slice(0, count).join(' ');
        if (count >= words.length) finish();
      }, 160);
    });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches && replay.disabled) finish(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && replay.disabled) finish(); });
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy);
      const status = document.getElementById('copy-status');
      try {
        await navigator.clipboard.writeText(target.textContent);
        button.textContent = 'Copied';
        if (status) status.textContent = 'Command copied.';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = 'Select & copy';
        if (status) status.textContent = 'Command selected. Use your keyboard or context menu to copy it.';
      }
    });
  });
})();
