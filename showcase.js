/* Image inspection, not simulated app operation. Every app image is a native capture. */
(() => {
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  function move(element, frames, duration = 350) {
    if (!element || reduced.matches || typeof element.animate !== 'function') return;
    element.getAnimations().forEach(animation => animation.cancel());
    const animation = element.animate(frames, { duration, easing:'cubic-bezier(.16,1,.3,1)' });
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  const stopMotion = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
  reduced.addEventListener('change', () => { if (reduced.matches) stopMotion(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });
  const platformButtons = [...document.querySelectorAll('[data-platform-choice]')];
  function applyPlatform(platform) {
    body.dataset.platform = platform;
    platformButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platformChoice === platform)));
  }
  let saved;
  try { saved = localStorage.getItem('brain-platform'); } catch { /* Optional storage. */ }
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '') || /Macintosh/.test(navigator.userAgent || '');
  applyPlatform(['mac','windows'].includes(saved) ? saved : isMac ? 'mac' : 'windows');
  platformButtons.forEach(button => button.addEventListener('click', () => {
    applyPlatform(button.dataset.platformChoice);
    try { localStorage.setItem('brain-platform', button.dataset.platformChoice); } catch { /* Keep this view. */ }
  }));
  body.classList.add('enhanced');
  function keyboardGroup(buttons, select) {
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(button));
      button.addEventListener('keydown', event => {
        let next;
        if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % buttons.length;
        if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index + buttons.length - 1) % buttons.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = buttons.length - 1;
        if (next === undefined) return;
        event.preventDefault(); buttons[next].focus(); select(buttons[next]);
      });
    });
  }
  const scenes = [...document.querySelectorAll('.demo-scene')];
  const steps = [...document.querySelectorAll('[data-step]')];
  function selectStep(button, animate = true) {
    steps.forEach(step => step.setAttribute('aria-pressed', String(step === button)));
    scenes.forEach(scene => {
      scene.hidden = scene.id !== button.getAttribute('aria-controls');
      if (!scene.hidden && animate) move(scene.querySelector('.native-figure img'), [{ clipPath:'inset(0 0 8% 0)', opacity:.55 }, { clipPath:'inset(0 0 0% 0)', opacity:1 }]);
    });
  }
  keyboardGroup(steps, selectStep);
  if (steps.length) selectStep(steps[0], false);
  const workspaceImage = document.getElementById('workspace-image');
  if (workspaceImage) {
    const stage = document.querySelector('.workspace-stage');
    const main = document.querySelector('.workspace-main');
    const detail = document.querySelector('.workspace-detail');
    const buttons = [...document.querySelectorAll('[data-focus]')];
    const views = {
      workspace:{ file:'windows-live', alt:'The actual Brain Windows workspace with live transcript and assistant. Sample meeting content.', caption:'Actual Windows interface. Sample meeting content.' },
      transcript:{ file:'windows-transcript-detail', alt:'A readable crop of the actual Windows live transcript.', caption:'Live transcript. Enlarged from the same native capture.' },
      assistant:{ file:'windows-assistant-detail', alt:'A readable crop of the actual Windows meeting assistant.', caption:'Meeting assistant. Enlarged from the same native capture.' }
    };
    let selection = 0;
    async function selectFocus(button) {
      const current = ++selection;
      const view = views[button.dataset.focus];
      const preload = new Image(); preload.src = `assets/${view.file}.png`;
      try { await preload.decode(); } catch { return; }
      if (current !== selection) return;
      stage.dataset.view = button.dataset.focus;
      workspaceImage.src = preload.src; workspaceImage.alt = view.alt; workspaceImage.dataset.native = view.file;
      main.href = preload.src; document.getElementById('workspace-full-link').href = preload.src;
      document.getElementById('workspace-caption').textContent = view.caption;
      document.getElementById('workspace-status').textContent = view.caption;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      move(main, [{ transform:'translateY(12px) scale(.985)', opacity:.6 }, { transform:'translateY(0) scale(1)', opacity:1 }]);
    }
    keyboardGroup(buttons, selectFocus);
    function entrance() {
      if (stage.dataset.view !== 'workspace') { selectFocus(buttons[0]); return; }
      move(main, [{ transform:'rotateX(5deg) translateY(20px)', opacity:.82 }, { transform:'rotateX(0deg) translateY(0)', opacity:1 }], 700);
      move(detail, [{ transform:'translate(-40px,24px) scale(.96)', opacity:.5 }, { transform:'translate(0,0) scale(1)', opacity:1 }], 800);
    }
    const replay = document.getElementById('replay-workspace'); replay.hidden = false; replay.addEventListener('click', entrance);
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { entrance(); observer.disconnect(); }
    }, { threshold:.2 });
    observer.observe(stage);
  }
  const speakButton = document.getElementById('inspect-speak');
  if (speakButton) {
    speakButton.hidden = false;
    const composition = document.querySelector('.speak-composition');
    const image = composition.querySelector('.speak-main img');
    let request = 0;
    speakButton.addEventListener('click', async () => {
      const token = ++request;
      const focused = !composition.classList.contains('is-focused');
      const file = focused ? 'windows-speak-detail' : 'windows-speak';
      const preload = new Image(); preload.src = `assets/${file}.png`;
      try { await preload.decode(); } catch { return; }
      if (token !== request) return;
      composition.classList.toggle('is-focused', focused);
      image.src = preload.src; image.dataset.native = file;
      image.alt = focused ? 'Enlarged actual Windows Speak dictation history.' : 'The actual Windows Brain Speak screen.';
      image.parentElement.href = preload.src; speakButton.setAttribute('aria-pressed', String(focused));
      speakButton.lastChild.textContent = focused ? ' Show the complete Speak window' : ' Focus on dictation history';
      document.getElementById('speak-announcement').textContent = focused ? 'Showing the captured dictation history detail.' : 'Showing the complete captured Speak screen.';
      move(composition.querySelector('.speak-main'), [{ transform:'translateY(14px) scale(.98)', opacity:.7 }, { transform:'translateY(0) scale(1)', opacity:1 }]);
    });
  }
  const outcomeButtons = [...document.querySelectorAll('[data-outcome]')];
  if (outcomeButtons.length) {
    document.querySelector('.outcome-controls').hidden = false;
    const frame = document.querySelector('.outcome-frame');
    const image = frame.querySelector('img');
    const views = {
      chat: { file:'meeting-chat-1568.webp', alt:'Windows meeting review with a generated sample meeting and an actual local-model answer.' },
      summary: { file:'meeting-summary-1568.webp', alt:'Windows meeting review showing the generated sample summary and its supporting passages.' },
      actions: { file:'meeting-actions-1568.webp', alt:'Windows meeting review showing decisions and actions from the generated sample meeting.' }
    };
    let request = 0;
    keyboardGroup(outcomeButtons, async button => {
      const token = ++request;
      const view = views[button.dataset.outcome];
      const preload = new Image(); preload.src = `assets/${view.file}`;
      try { await preload.decode(); } catch { return; }
      if (token !== request) return;
      image.src = preload.src; image.alt = view.alt;
      frame.querySelector('figcaption').firstChild.textContent = button.dataset.outcome === 'chat'
        ? 'Actual Windows app · generated sample meeting and local-model answer '
        : 'Actual Windows app · generated sample meeting ';
      frame.querySelector('.screenshot-link').href = preload.src;
      frame.querySelector('figcaption a').href = preload.src;
      frame.dataset.view = button.dataset.outcome;
      outcomeButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      document.getElementById('outcome-status').textContent = view.alt;
      move(image, [{clipPath:'inset(0 0 5% 0)',opacity:.7},{clipPath:'inset(0)',opacity:1}]);
    });
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy);
      const status = document.getElementById('copy-status');
      try { await navigator.clipboard.writeText(target.textContent); button.textContent = 'Copied'; if (status) status.textContent = 'Command copied.'; }
      catch {
        const range = document.createRange(); range.selectNodeContents(target);
        const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        button.textContent = 'Select & copy';
        if (status) status.textContent = 'Command selected. Use your keyboard or context menu to copy it.';
      }
    });
  });
})();
