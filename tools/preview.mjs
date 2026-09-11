import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
export async function startServer({ directory = root, port = 4173 } = {}) {
  const base = path.resolve(directory);
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relative = pathname.replace(/^\/Brain(?=\/|$)/, '').replace(/^\/+/, '');
      // Preview only public content. Do not expose Git, tools, dependencies, or evidence.
      if (relative.split(/[\\/]/).some(part => part.startsWith('.') || ['tools', 'node_modules', 'artifacts'].includes(part))) throw new Error('Private path');
      let file = path.resolve(base, relative || 'index.html');
      if (!file.startsWith(base + path.sep)) throw new Error('Outside site');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const contents = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(contents);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/Brain/` };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startServer({ port: Number(process.env.PORT || 4173) });
  console.log(`Brain prototype: ${url}\nLocal preview only. Ctrl+C stops the server.`);
}
