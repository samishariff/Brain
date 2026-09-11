// Import native Mac captures into assets/ and write tools/native-captures-mac.json.
// The Mac twin of Import-NativeCaptures.ps1: every asset is a copy or a pixel-only crop
// of a window capture listed in artifacts/native-capture-mac/capture-provenance.json.
// Crops are pixel-exact CGImage crops (tools/crop-png.swift, compiled on first use with the
// Xcode command-line tools). Nothing is redrawn, recoloured or relabelled.
import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const captureRoot = path.resolve(root, process.argv[2] || 'artifacts/native-capture-mac');
const receipt = JSON.parse(await readFile(path.join(captureRoot, 'capture-provenance.json'), 'utf8'));
const specs = JSON.parse(await readFile(path.join(root, 'tools/mac-capture-crops.json'), 'utf8'));
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const size = file => Object.fromEntries(execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' })
  .split('\n').filter(line => line.includes('pixel')).map(line => { const [key, value] = line.trim().split(': '); return [key, Number(value)]; }));
const work = path.join(tmpdir(), 'brain-mac-import'); await mkdir(work, { recursive: true });
const cropTool = path.join(work, 'crop-png');
execFileSync('swiftc', ['-O', '-o', cropTool, path.join(root, 'tools/crop-png.swift')], { stdio: 'inherit' });
const files = [];
for (const spec of specs) {
  const source = path.join(captureRoot, 'originals', spec.source);
  const expected = receipt.images.find(image => image.file === spec.source);
  if (!expected) throw new Error(`No receipt entry for ${spec.source}`);
  const sourceSha256 = await sha256(source);
  if (sourceSha256 !== expected.sha256) throw new Error(`Native source capture differs from its receipt: ${spec.source}`);
  const output = path.join(root, 'assets', spec.file);
  if (spec.crop) {
    const [x, y, w, h] = spec.crop;
    execFileSync(cropTool, [source, output, String(x), String(y), String(w), String(h)], { stdio: 'ignore' });
  } else {
    await copyFile(source, output);
  }
  const { pixelWidth, pixelHeight } = size(output);
  let origin = `Origin: actual Brain for Mac SwiftUI capture, source ${receipt.sourceCommit} (Brain ${receipt.appVersion}), ${spec.source}. Seeded sample content, not evidence of a live call, transcription or dictation. No redraw, recolor, text replacement, or fabricated controls.`;
  if (spec.crop) origin += ` Pixel crop x,y,width,height=${spec.crop.join(',')}.`;
  files.push({ file: spec.file, source: spec.source, sourceSha256, crop: spec.crop, width: pixelWidth, height: pixelHeight, sha256: await sha256(output), origin });
  console.log(`${spec.file} ${pixelWidth}x${pixelHeight}`);
}
const manifest = {
  platform: 'mac',
  sourceCommit: receipt.sourceCommit,
  appVersion: receipt.appVersion,
  capturedUtc: receipt.capturedUtc,
  method: 'Native SwiftUI render of the Brain Dev bundle; macOS window capture at 2x; unchanged production controls; pixel-only crops',
  sampleContent: 'Meetings, transcript passages, helper answer, voice assessments, Speak history and the listening capsule are seeded demonstration data in a scratch home. These captures do not prove live ASR, calls, inference, or text insertion.',
  files
};
await writeFile(path.join(root, 'tools/native-captures-mac.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote tools/native-captures-mac.json');
