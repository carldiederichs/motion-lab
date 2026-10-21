import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './renderer.mjs';
export const headers = {
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
};
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.zip':'application/zip','.md':'text/plain; charset=utf-8'};
export function createServer({directory=path.join(ROOT,'dist'),local=false}={}) {
  return http.createServer(async(req,res) => {
    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed'); return; }
    try {
      const decoded = decodeURIComponent((req.url || '/').split('?')[0]);
      if (decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(s => s.startsWith('.'))) throw Error('invalid');
      const localRoute = local && decoded.startsWith('/local/');
      const root = await realpath(localRoute ? path.join(ROOT,'local') : directory);
      let rel = localRoute ? decoded.slice(7) : decoded;
      if (rel.endsWith('/')) rel += 'index.html';
      const file = await realpath(path.join(root,rel));
      if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) throw Error('not a file');
      const ext=path.extname(file); if (!types[ext]) throw Error('unsupported');
      res.setHeader('Content-Type',types[ext]);
      if(ext === '.zip') res.setHeader('Content-Disposition','attachment; filename="motion-lab-toolkit.zip"');
      res.setHeader('Cache-Control','no-cache'); res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch { res.writeHead(404,{'Content-Type':'text/plain'}); res.end('Not found'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT,'scripts/serve.mjs')) {
  const args = process.argv.slice(2); const host = args.includes('--host') ? args[args.indexOf('--host')+1] : '127.0.0.1';
  const port = Number(process.env.PORT || 4173);
  createServer({local:args.includes('--local') && host === '127.0.0.1'}).listen(port,host,() => console.log(`Motion Lab: http://${host}:${port}`));
}
