/* Image inspection, not simulated app operation. Every app image is a real screenshot.
   Both platforms' captures ship in the HTML; the chosen platform's panel ([data-for]) is the one
   shown, and the shared controls below write their state to every panel but pixels only to the
   visible one. */
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

  /* Native capture files per platform. Windows files keep the names the Windows import wrote;
     Mac files come from tools/import-mac-captures.mjs. Alt text names the platform so a screen
     reader never hears the other one. */
  const ASSETS = {
    mac: {
      focus: {
        workspace:{ file:'mac-live.png', alt:'The actual Brain Mac workspace with the live transcript and meeting helper. Sample meeting content.', caption:'Actual Mac interface. Sample meeting content.' },
        transcript:{ file:'mac-transcript-detail.png', alt:'A readable crop of the actual Mac live transcript.', caption:'Live transcript. Enlarged from the same screenshot.' },
        assistant:{ file:'mac-assistant-detail.png', alt:'A readable crop of the actual Mac meeting helper.', caption:'Meeting helper. Enlarged from the same screenshot.' }
      },
      speak: {
        full:{ file:'mac-speak.png', alt:'The actual Mac Settings › Speak screen, with the Enable Speak switch, the confirmation option, the Hold to speak shortcut, and its permissions.', label:' Focus on dictation history', status:'Showing the whole Speak settings screen.', caption:'Brain Speak for Mac · Settings › Speak' },
        detail:{ file:'mac-speak-detail.png', alt:'The actual Mac Speak History panel with sample dictations.', label:' Show the whole Speak screen', status:'Showing the Speak History panel.', caption:'Brain Speak for Mac · Speak History' }
      },
      outcome: {
        chat:{ file:'mac-actions.png', alt:'The actual Mac Actions list: the to-dos filed from a sample meeting, with a due date and an overdue item.', caption:'Actual Mac app · sample meeting ' },
        summary:{ file:'mac-review-summary.png', alt:'The actual Mac Review screen with a sample meeting: attendees, an editable summary, decisions, and open questions.', caption:'Actual Mac app · sample meeting ' },
        actions:{ file:'mac-review-actions.png', alt:'The actual Mac approved meeting record with its summary, decisions, and commitments marked To do or Waiting.', caption:'Actual Mac app · sample meeting ' }
      }
    },
    windows: {
      focus: {
        workspace:{ file:'windows-live.png', alt:'The actual Brain Windows workspace with live transcript and assistant. Sample meeting content.', caption:'Actual Windows interface. Sample meeting content.' },
        transcript:{ file:'windows-transcript-detail.png', alt:'A readable crop of the actual Windows live transcript.', caption:'Live transcript. Enlarged from the same screenshot.' },
        assistant:{ file:'windows-assistant-detail.png', alt:'A readable crop of the actual Windows meeting assistant.', caption:'Meeting assistant. Enlarged from the same screenshot.' }
      },
      speak: {
        full:{ file:'windows-speak.png', alt:'The actual Windows Brain Speak screen.', label:' Focus on dictation history', status:'Showing the whole Speak screen.', caption:'Brain Speak for Windows · shortcut, history, and preferences' },
        detail:{ file:'windows-speak-detail.png', alt:'Enlarged actual Windows Speak dictation history.', label:' Show the whole Speak screen', status:'Showing the dictation history, enlarged.', caption:'Brain Speak for Windows · dictation history, enlarged' }
      },
      outcome: {
        chat:{ file:'meeting-chat-1568.webp', alt:'Windows meeting review with a sample meeting and a real answer from the model on that PC.', caption:'Actual Windows app · sample meeting, answered on the PC ' },
        summary:{ file:'meeting-summary-1568.webp', alt:'Windows meeting review showing the generated sample summary and its supporting passages.', caption:'Actual Windows app · generated sample meeting ' },
        actions:{ file:'meeting-actions-1568.webp', alt:'Windows meeting review showing decisions and actions from the generated sample meeting.', caption:'Actual Windows app · generated sample meeting ' }
      }
    }
  };
  /* index.html resolves the platform inline before first paint; other pages resolve it here. */
  if (!body.classList.contains('js')) {
    let saved;
    try { saved = localStorage.getItem('brain-platform'); } catch { /* Optional storage. */ }
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '') || /Macintosh/.test(navigator.userAgent || '');
    body.dataset.platform = ['mac','windows'].includes(saved) ? saved : isMac ? 'mac' : 'windows';
  }
  let platform = ['mac','windows'].includes(body.dataset.platform) ? body.dataset.platform : 'windows';
  const platformButtons = [...document.querySelectorAll('[data-platform-choice]')];
  const panel = (root, name = platform) => root && root.querySelector(`:scope > [data-for="${name}"]`);
  /* Decode first, then write pixels only if this request is still the latest one: a slower
     download must never leave one capture under another view's caption. */
  async function swap(img, asset, anchors = [], current = () => true) {
    const preload = new Image(); preload.src = `assets/${asset.file}`;
    try { await preload.decode(); } catch { return false; }
    if (!current()) return false;
    img.src = preload.src; img.alt = asset.alt; img.dataset.native = asset.file.replace(/\.\w+$/, '');
    anchors.forEach(anchor => { if (anchor) anchor.href = preload.src; });
    return true;
  }
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

  /* Walkthrough scenes: one visible scene, animated on the visible platform's figure. */
  const scenes = [...document.querySelectorAll('.demo-scene')];
  const steps = [...document.querySelectorAll('[data-step]')];
  function selectStep(button, animate = true) {
    steps.forEach(step => step.setAttribute('aria-pressed', String(step === button)));
    scenes.forEach(scene => {
      scene.hidden = scene.id !== button.getAttribute('aria-controls');
      if (!scene.hidden && animate) move(panel(scene)?.querySelector('.native-figure img'), [{ clipPath:'inset(0 0 8% 0)', opacity:.55 }, { clipPath:'inset(0 0 0% 0)', opacity:1 }]);
    });
  }

  /* Hero workspace: Workspace / Transcript / Assistant crops of the same capture. */
  const workspace = document.getElementById('workspace');
  const focusButtons = [...document.querySelectorAll('[data-focus]')];
  let focus = 'workspace', focusRequest = 0;
  async function renderFocus(name, animate = true) {
    const current = ++focusRequest, started = platform;
    const target = panel(workspace);
    if (!target) return;
    const asset = ASSETS[platform].focus[name];
    const image = target.querySelector('.workspace-image');
    const live = () => current === focusRequest && platform === started;
    if (!await swap(image, asset, [target.querySelector('.workspace-main'), target.querySelector('.workspace-full-link')], live)) return;
    focus = name;
    workspace.querySelectorAll('.workspace-stage').forEach(stage => { stage.dataset.view = name; });
    target.querySelector('.workspace-caption').textContent = asset.caption;
    document.getElementById('workspace-status').textContent = asset.caption;
    focusButtons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.focus === name)));
    if (animate) move(target.querySelector('.workspace-main'), [{ transform:'translateY(12px) scale(.985)', opacity:.6 }, { transform:'translateY(0) scale(1)', opacity:1 }]);
  }
  function entrance() {
    const target = panel(workspace);
    if (!target) return;
    move(target.querySelector('.workspace-main'), [{ transform:'rotateX(5deg) translateY(20px)', opacity:.82 }, { transform:'rotateX(0deg) translateY(0)', opacity:1 }], 700);
    move(target.querySelector('.workspace-detail'), [{ transform:'translate(-40px,24px) scale(.96)', opacity:.5 }, { transform:'translate(0,0) scale(1)', opacity:1 }], 800);
  }

  /* Speak: the complete screen, or its history detail. */
  const speakButtons = [...document.querySelectorAll('.inspect-speak')];
  let speakFocused = false, speakRequest = 0;
  async function renderSpeak(focused, animate = true) {
    const token = ++speakRequest, started = platform;
    const composition = document.querySelector(`#speak > [data-for="${platform}"] .speak-composition`);
    if (!composition) return;
    const asset = ASSETS[platform].speak[focused ? 'detail' : 'full'];
    const image = composition.querySelector('.speak-main img');
    if (!await swap(image, asset, [image.parentElement], () => token === speakRequest && platform === started)) return;
    speakFocused = focused;
    document.querySelectorAll('.speak-composition').forEach(item => item.classList.toggle('is-focused', focused));
    speakButtons.forEach(button => { button.setAttribute('aria-pressed', String(focused)); button.lastChild.textContent = asset.label; });
    document.getElementById('speak-announcement').textContent = asset.status;
    document.querySelectorAll('.speak-main figcaption').forEach(caption => { const own = ASSETS[caption.closest('[data-for]').dataset.for].speak[focused ? 'detail' : 'full']; caption.textContent = own.caption; });
    if (animate) move(composition.querySelector('.speak-main'), [{ transform:'translateY(14px) scale(.98)', opacity:.7 }, { transform:'translateY(0) scale(1)', opacity:1 }]);
  }

  /* Saved meeting: three screenshots of the sample meetings, chosen by the shared buttons. */
  const outcomes = document.getElementById('outcomes');
  const outcomeButtons = [...document.querySelectorAll('[data-outcome]')];
  let outcome = 'chat', outcomeRequest = 0;
  async function renderOutcome(name, animate = true) {
    const token = ++outcomeRequest, started = platform;
    const frame = outcomes && panel(outcomes.querySelector('.wrap'))?.querySelector('.outcome-frame');
    if (!frame) return;
    const asset = ASSETS[platform].outcome[name];
    const image = frame.querySelector('img');
    if (!await swap(image, asset, [frame.querySelector('.screenshot-link'), frame.querySelector('figcaption a')], () => token === outcomeRequest && platform === started)) return;
    outcome = name;
    frame.querySelector('figcaption').firstChild.textContent = asset.caption;
    outcomes.querySelectorAll('.outcome-frame').forEach(item => { item.dataset.view = name; });
    outcomeButtons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.outcome === name)));
    document.getElementById('outcome-status').textContent = asset.alt;
    if (animate) move(image, [{clipPath:'inset(0 0 5% 0)',opacity:.7},{clipPath:'inset(0)',opacity:1}]);
  }

  function applyPlatform(next, save = false) {
    platform = next;
    body.dataset.platform = next;
    platformButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platformChoice === next)));
    document.querySelectorAll('.workspace-image').forEach(image => {
      const selected = panel(workspace, next)?.contains(image);
      if (selected) { image.setAttribute('fetchpriority', 'high'); image.removeAttribute('loading'); } else image.removeAttribute('fetchpriority');
    });
    if (save) { try { localStorage.setItem('brain-platform', next); } catch { /* Keep this view. */ } }
    if (!body.classList.contains('enhanced')) return;
    renderFocus(focus, false); renderSpeak(speakFocused, false); renderOutcome(outcome, false);
  }
  platformButtons.forEach(button => button.addEventListener('click', () => applyPlatform(button.dataset.platformChoice, true)));
  keyboardGroup(platformButtons, button => applyPlatform(button.dataset.platformChoice, true));
  applyPlatform(platform); // sync the toggle's aria-pressed with the pre-paint choice; no re-render yet
  body.classList.add('js', 'enhanced');
  keyboardGroup(steps, selectStep);
  if (steps.length) selectStep(steps[0], false);
  if (workspace) {
    keyboardGroup(focusButtons, button => renderFocus(button.dataset.focus));
    document.querySelectorAll('.replay-workspace').forEach(button => { button.hidden = false; button.addEventListener('click', entrance); });
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { entrance(); observer.disconnect(); }
    }, { threshold:.2 });
    observer.observe(workspace);
  }
  speakButtons.forEach(button => { button.hidden = false; button.addEventListener('click', () => renderSpeak(!speakFocused)); });
  if (outcomeButtons.length) {
    document.querySelector('.outcome-controls').hidden = false;
    keyboardGroup(outcomeButtons, button => renderOutcome(button.dataset.outcome));
    outcomes.querySelectorAll('.outcome-frame').forEach(item => { item.dataset.view = outcome; }); // the markup already shows the `chat` view
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy);
      const status = document.getElementById('copy-status');
      const label = button.dataset.label || (button.dataset.label = button.textContent);
      clearTimeout(button.revert);
      try { await navigator.clipboard.writeText(target.textContent); button.textContent = 'Copied'; if (status) status.textContent = 'Command copied.'; button.revert = setTimeout(() => { button.textContent = label; }, 2500); }
      catch {
        const range = document.createRange(); range.selectNodeContents(target);
        const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        button.textContent = 'Select & copy';
        if (status) status.textContent = 'Command selected. Use your keyboard or context menu to copy it.';
      }
    });
  });
})();
