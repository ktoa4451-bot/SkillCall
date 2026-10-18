// SkillCall: сервер аккаунтов, сигналинга и чата. Запуск: npm install && npm start
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const {WebSocketServer} = require('ws');
const PORT = process.env.PORT || 3000, MAX = 8, DATA = process.env.DATA_DIR || __dirname, DB = path.join(DATA, 'users.json');
const SECRET = process.env.SECRET || (() => { const f = path.join(DATA, '.secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), {mode: 0o600}); return fs.readFileSync(f, 'utf8'); })();

let users = {}; try { users = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch {}
const save = () => { fs.writeFileSync(DB + '.tmp', JSON.stringify(users)); fs.renameSync(DB + '.tmp', DB); };
const hash = (p, salt) => crypto.scryptSync(p, salt, 32).toString('hex');
const mac = b => crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
const sign = u => { const b = Buffer.from(JSON.stringify({id: u.id, exp: Date.now() + 30 * 864e5})).toString('base64url'); return b + '.' + mac(b); };
function verify(t) { try { const [b, s] = String(t).split('.'), ok = mac(b);
  if (s.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url')); return p.exp > Date.now() ? Object.values(users).find(u => u.id === p.id) || null : null; } catch { return null; } }
const pub = u => ({id: u.id, name: u.name});

const tries = new Map(); // защита от подбора пароля: 10 попыток за 10 минут с одного адреса
const limited = ip => { const now = Date.now(), r = tries.get(ip) || {n: 0, t: now}; if (now - r.t > 6e5) { r.n = 0; r.t = now; } r.n++; tries.set(ip, r); return r.n > 10; };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x'), json = (c, o) => { res.writeHead(c, {'Content-Type': 'application/json'}); res.end(JSON.stringify(o)); };
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/skillcall.html')) {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self)'});
    return fs.createReadStream(path.join(__dirname, 'skillcall.html')).pipe(res); }
  if (url.pathname === '/api/me') { const u = verify((req.headers.authorization || '').slice(7)); return u ? json(200, {user: pub(u)}) : json(401, {error: 'Войдите в аккаунт.'}); }
  if (req.method === 'POST' && (url.pathname === '/api/login' || url.pathname === '/api/register')) {
    let body = ''; req.on('data', c => { body += c; if (body.length > 1e4) req.destroy(); });
    return req.on('end', () => { let d; try { d = JSON.parse(body); } catch { return json(400, {error: 'Неверный запрос.'}); }
      if (limited(req.socket.remoteAddress)) return json(429, {error: 'Слишком много попыток. Подождите несколько минут.'});
      const email = String(d.email || '').trim().toLowerCase(), pw = String(d.password || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, {error: 'Проверьте адрес почты.'});
      if (url.pathname === '/api/register') {
        const name = String(d.name || '').trim().slice(0, 40);
        if (!name) return json(400, {error: 'Введите ваше имя.'});
        if (pw.length < 6) return json(400, {error: 'Пароль слишком короткий: нужно минимум 6 символов.'});
        if (users[email]) return json(409, {error: 'Эта почта уже зарегистрирована.'});
        const salt = crypto.randomBytes(16).toString('hex'); users[email] = {id: crypto.randomBytes(8).toString('hex'), name, email, salt, hash: hash(pw, salt)}; save();
        return json(200, {token: sign(users[email]), user: pub(users[email])}); }
      const u = users[email];
      if (!u || !crypto.timingSafeEqual(Buffer.from(hash(pw, u.salt)), Buffer.from(u.hash))) return json(401, {error: 'Неверная почта или пароль.'});
      json(200, {token: sign(u), user: pub(u)}); }); }
  json(404, {error: 'Не найдено.'});
});

const rooms = new Map(), wss = new WebSocketServer({noServer: true});
server.on('upgrade', (req, sock, head) => { const url = new URL(req.url, 'http://x'), user = url.pathname === '/ws' && verify(url.searchParams.get('token'));
  if (!user) return sock.destroy();
  wss.handleUpgrade(req, sock, head, ws => { ws.user = user; ws.cid = crypto.randomBytes(6).toString('hex'); ws.alive = true; wss.emit('connection', ws); }); });

const tx = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
const view = p => ({id: p.cid, name: p.user.name, ...p.s});
wss.on('connection', ws => {
  ws.on('pong', () => ws.alive = true);
  ws.on('message', raw => {
    if (raw.length > 2e4) return; let m; try { m = JSON.parse(raw); } catch { return; }
    const r = ws.room && rooms.get(ws.room);
    if (m.t === 'join' && !r) {
      if (!/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(m.room)) return;
      const room = rooms.get(m.room) || rooms.set(m.room, {peers: new Map(), chat: []}).get(m.room);
      if (room.peers.size >= MAX) return tx(ws, {t: 'full', max: MAX});
      ws.room = m.room; ws.s = {mic: m.mic !== false, cam: m.cam !== false, hand: false};
      tx(ws, {t: 'welcome', id: ws.cid, room: m.room, peers: [...room.peers.values()].map(view), chat: room.chat});
      room.peers.forEach(p => tx(p, {t: 'join', peer: view(ws)})); room.peers.set(ws.cid, ws); }
    else if (!r) return;
    else if (m.t === 'sig') { const to = r.peers.get(m.to); to && tx(to, {t: 'sig', from: ws.cid, kind: m.kind, data: m.data}); }
    else if (m.t === 'state') { for (const k of ['mic', 'cam', 'hand']) if (typeof m[k] === 'boolean') ws.s[k] = m[k];
      r.peers.forEach(p => p !== ws && tx(p, {t: 'state', id: ws.cid, s: ws.s})); }
    else if (m.t === 'chat' && typeof m.text === 'string' && m.text.trim()) {
      const msg = {t: 'chat', id: ws.cid, name: ws.user.name, text: m.text.trim().slice(0, 1000)}; r.chat.push(msg); if (r.chat.length > 50) r.chat.shift();
      r.peers.forEach(p => tx(p, msg)); }
  });
  ws.on('close', () => { const r = ws.room && rooms.get(ws.room); if (!r) return; r.peers.delete(ws.cid);
    r.peers.forEach(p => tx(p, {t: 'leave', id: ws.cid})); if (!r.peers.size) rooms.delete(ws.room); });
});
setInterval(() => wss.clients.forEach(w => { if (!w.alive) return w.terminate(); w.alive = false; w.ping(); }), 25000);
server.listen(PORT, () => console.log('SkillCall: http://localhost:' + PORT));
