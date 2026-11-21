// Servidor sem dependências. Uso: ADMIN_PASSWORD=xxx node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PASS = process.env.ADMIN_PASSWORD || '';
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data', 'data.json');
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

if (!PASS) console.warn('AVISO: ADMIN_PASSWORD não definida. O painel de admin está desativado.');

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/data' && req.method === 'GET') {
    return send(res, 200, fs.readFileSync(DATA));
  }
  if (url.pathname === '/api/data' && req.method === 'PUT') {
    if (!PASS || req.headers['x-admin-password'] !== PASS) return send(res, 401, { error: 'Palavra-passe errada' });
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 5e6) req.destroy(); });
    req.on('end', () => {
      try {
        const d = JSON.parse(raw);
        if (!Array.isArray(d.competitions)) throw new Error('Formato inválido');
        fs.writeFileSync(DATA + '.tmp', JSON.stringify(d, null, 1));
        fs.renameSync(DATA + '.tmp', DATA);
        send(res, 200, { ok: true });
      } catch (e) { send(res, 400, { error: e.message }); }
    });
    return;
  }
  if (url.pathname === '/api/check' && req.method === 'POST') {
    return send(res, PASS && req.headers['x-admin-password'] === PASS ? 200 : 401, { ok: !!PASS });
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  if (p === '/admin') p = '/admin.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
}).listen(PORT, () => console.log('Onze Feminino em http://localhost:' + PORT));
