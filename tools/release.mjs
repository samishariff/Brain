import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(path.join(root, 'tools/release-baseline.json')));
const args = process.argv.slice(2);
const option = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
const git = (cwd, ...argv) => execFileSync('git', argv, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gh = (...argv) => JSON.parse(execFileSync('gh', ['api', ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const publicPath = file => /^(?:[^/]+\.(?:html|css|js)|README\.md|THIRD_PARTY_NOTICES\.md|mac-notices\.md|\.nojekyll|(?:assets|help|privacy|licenses)\/)/.test(file);
const filesAt = (cwd, ref) => git(cwd, 'ls-tree', '-r', '--name-only', ref).split('\n').filter(Boolean).filter(publicPath);
function resolveCommit(cwd, ref) {
  if (!ref || ref.startsWith('-') || !/^[\w./-]+$/.test(ref)) throw new Error('Invalid commit reference');
  return git(cwd, 'rev-parse', '--verify', `${ref}^{commit}`);
}
function requireClean(cwd) {
  if (git(cwd, 'status', '--porcelain')) throw new Error('Commit or stash local changes before release tooling.');
}
function manifestAt(cwd, ref) {
  return filesAt(cwd, ref).map(file => ({ path: file, sha256: hash(execFileSync('git', ['show', `${ref}:${file}`], { cwd, maxBuffer: 32 * 1024 * 1024 })) }));
}
function snapshot(cwd, ref, output) {
  const commit = resolveCommit(cwd, ref);
  mkdirSync(output, { recursive: true });
  if (existsSync(path.join(output, 'baseline.json'))) throw new Error('Snapshot already exists. Choose a fresh output directory.');
  git(cwd, 'archive', '--format=zip', `--output=${path.join(output, 'source.zip')}`, commit);
  git(cwd, 'archive', '--format=zip', `--output=${path.join(output, 'site.zip')}`, commit, '--', ...filesAt(cwd, commit));
  const manifest = { repository: config.repository, branch: config.branch, commit, createdUtc: new Date().toISOString(), files: manifestAt(cwd, commit) };
  writeFileSync(path.join(output, 'baseline.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
function validateProduction() {
  const pages = gh(`repos/${config.repository}/pages`);
  if (pages.build_type !== config.pages.build_type || pages.source?.branch !== config.pages.branch || pages.source?.path !== config.pages.path) throw new Error('GitHub Pages configuration changed. Review deployment before proceeding.');
  return gh(`repos/${config.repository}/commits/${config.branch}`).sha;
}
function rollback(cwd, mergeRef, manifest, publish = false) {
  requireClean(cwd);
  const merge = resolveCommit(cwd, mergeRef);
  const parents = git(cwd, 'rev-list', '--parents', '-n', '1', merge).split(' ').slice(1);
  if (parents.length !== 2) throw new Error('Rollback requires the dedicated two-parent redesign merge commit.');
  if (parents[0] !== manifest.commit || manifest.repository !== config.repository) throw new Error('The snapshot does not match the pre-redesign production parent.');
  if (JSON.stringify(manifest.files) !== JSON.stringify(manifestAt(cwd, manifest.commit))) throw new Error('Snapshot hashes do not match the preserved baseline commit.');
  git(cwd, 'merge-base', '--is-ancestor', merge, 'HEAD');
  const changed = new Set(git(cwd, 'diff', '--name-only', parents[0], merge).split('\n').filter(Boolean));
  // Inspect every intervening commit, including changes later reverted.
  const later = git(cwd, 'log', '--format=', '--name-only', `${merge}..HEAD`).split('\n').filter(Boolean);
  const overlap = [...new Set(later.filter(file => changed.has(file)))];
  if (overlap.length) throw new Error('Later commits overlap the redesign; reconcile before rollback: ' + overlap.join(', '));
  if (publish) {
    if (git(cwd, 'branch', '--show-current') !== config.branch) throw new Error('Publishing rollback requires a dedicated main checkout.');
    const remote = git(cwd, 'remote', 'get-url', 'origin');
    if (!new RegExp(`^(https://github\\.com/|git@github\\.com:)${config.repository}(\\.git)?$`).test(remote)) throw new Error('Unexpected origin repository.');
    if (validateProduction() !== git(cwd, 'rev-parse', 'HEAD')) throw new Error('Local main is not the current production revision.');
  }
  git(cwd, 'revert', '-m', '1', '--no-edit', merge);
  // Validate every reverted public file; unrelated later additions must survive.
  const restored = new Map(manifestAt(cwd, 'HEAD').map(item => [item.path, item.sha256]));
  const before = new Map(manifest.files.map(item => [item.path, item.sha256]));
  for (const file of changed) {
    if (publicPath(file) && restored.get(file) !== before.get(file)) throw new Error(`Restored hash mismatch: ${file}. Nothing has been pushed.`);
  }
  const commit = git(cwd, 'rev-parse', 'HEAD');
  if (publish) git(cwd, 'push', 'origin', `HEAD:${config.branch}`);
  return commit;
}
function rehearse() {
  requireClean(root);
  const baseline = resolveCommit(root, config.commit);
  const candidate = resolveCommit(root, 'HEAD');
  if (baseline === candidate) throw new Error('Commit the prototype before rehearsing.');
  const scratch = mkdtempSync(path.join(os.tmpdir(), 'brain-site-rollback-'));
  git(scratch, 'clone', '--quiet', '--no-hardlinks', '--no-checkout', root, 'site');
  const cwd = path.join(scratch, 'site');
  git(cwd, 'remote', 'remove', 'origin');
  git(cwd, 'config', 'user.name', 'Brain rollback rehearsal');
  git(cwd, 'config', 'user.email', 'rehearsal@localhost');
  git(cwd, 'checkout', '-B', 'rehearsal-main', baseline);
  git(cwd, 'merge', '--no-ff', candidate, '-m', 'Rehearsal: website redesign');
  const merge = git(cwd, 'rev-parse', 'HEAD');
  const snapshotDir = path.join(scratch, 'baseline');
  const manifest = snapshot(cwd, baseline, snapshotDir);
  const recovered = rollback(cwd, merge, manifest);
  if (git(cwd, 'rev-parse', `${recovered}^{tree}`) !== git(cwd, 'rev-parse', `${baseline}^{tree}`)) throw new Error('Rollback tree differs from baseline.');
  // A later overlapping edit must fail before making a commit.
  git(cwd, 'checkout', '-B', 'overlap-check', merge);
  writeFileSync(path.join(cwd, 'index.html'), readFileSync(path.join(cwd, 'index.html'), 'utf8') + '\n<!-- newer release update -->\n');
  git(cwd, 'add', 'index.html'); git(cwd, 'commit', '-m', 'Rehearsal: later homepage update');
  const overlapHead = git(cwd, 'rev-parse', 'HEAD');
  let blocked = false;
  try { rollback(cwd, merge, manifest); } catch (error) { if (error.message.includes('overlap')) blocked = true; else throw error; }
  if (!blocked || git(cwd, 'rev-parse', 'HEAD') !== overlapHead) throw new Error('Overlap guard failed.');
  // An unrelated later document survives a rollback.
  git(cwd, 'checkout', '-B', 'unrelated-check', merge);
  writeFileSync(path.join(cwd, 'release-followup.txt'), 'Keep this later update.\n');
  git(cwd, 'add', 'release-followup.txt'); git(cwd, 'commit', '-m', 'Rehearsal: unrelated update');
  rollback(cwd, merge, manifest);
  if (readFileSync(path.join(cwd, 'release-followup.txt'), 'utf8') !== 'Keep this later update.\n') throw new Error('Unrelated update was lost.');
  const result = { passed: true, baseline, candidate, merge, exactTreeRestored: true, overlappingUpdateBlocked: true, unrelatedUpdatePreserved: true, scratch, completedUtc: new Date().toISOString() };
  mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  writeFileSync(path.join(root, 'artifacts/rollback-rehearsal.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
try {
  switch (args[0]) {
    case 'snapshot': {
      const ref = option('--ref') || config.commit;
      const output = path.resolve(option('--output') || path.join(root, `artifacts/baseline-${resolveCommit(root, ref).slice(0, 8)}`));
      const manifest = snapshot(root, ref, output);
      const tag = `site-before-redesign-${manifest.commit.slice(0, 12)}`;
      if (!git(root, 'tag', '--list', tag)) git(root, 'tag', '-a', tag, manifest.commit, '-m', 'Preserved website before redesign');
      console.log(`Saved source/site archives and SHA-256 manifest: ${output}\nLocal backup tag: ${tag}`);
      break;
    }
    case 'prepare': {
      requireClean(root);
      const live = validateProduction();
      if (live !== config.commit) throw new Error(`Production advanced to ${live}. Reconcile the prototype, update the baseline, and review again before launch.`);
      const output = path.resolve(option('--output') || path.join(root, `artifacts/prelaunch-${Date.now()}`));
      const manifest = snapshot(root, live, output);
      const tag = `site-before-redesign-${live.slice(0, 12)}`;
      if (!git(root, 'tag', '--list', tag)) git(root, 'tag', '-a', tag, live, '-m', 'Preserved website before redesign');
      console.log(`Prelaunch snapshot: ${output}\nCandidate: ${git(root, 'rev-parse', 'HEAD')}\nBaseline: ${manifest.commit}\nNo publication performed. User approval of this candidate is required.`);
      break;
    }
    case 'rollback': {
      const manifestFile = option('--manifest');
      if (!manifestFile) throw new Error('Use rollback --merge SHA --manifest PATH [--publish].');
      const manifest = JSON.parse(readFileSync(path.resolve(manifestFile)));
      const commit = rollback(root, option('--merge'), manifest, args.includes('--publish'));
      console.log(`Rollback commit: ${commit}\n${args.includes('--publish') ? 'Pushed to main. Check GitHub Pages deployment and public URLs.' : 'Local only. No publication performed.'}`);
      break;
    }
    case 'rehearse': rehearse(); break;
    case 'bundle': {
      requireClean(root);
      const ref = resolveCommit(root, 'HEAD');
      const output = path.join(root, 'artifacts', `brain-prototype-${ref.slice(0, 8)}`);
      snapshot(root, ref, output);
      const files = manifestAt(root, ref);
      writeFileSync(path.join(output, 'distribution-handoff.json'), JSON.stringify({ repository: config.repository, branch: config.branch, candidate: ref, previousPublicCommit: config.commit, files, instruction: 'Use this complete static site as the next reviewed public baseline. Preserve release-specific download substitutions and reconcile their hashes after rendering.' }, null, 2) + '\n');
      console.log(`Offline review bundle: ${output}\nExtract site.zip and open index.html. source.zip includes preview and rollback tooling.`);
      break;
    }
    default: throw new Error('Commands: snapshot, prepare, bundle, rehearse, rollback --merge SHA --manifest PATH [--publish]');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
