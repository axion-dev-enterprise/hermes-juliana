const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');
const Redis = require('ioredis');

const secret = process.env.HERMES_OPERATOR_TOKEN || '';
if (process.env.NODE_ENV === 'production' && Buffer.byteLength(secret, 'utf8') < 32) throw new Error('Strong operator secret required.');

function verify(token) {
  try {
    const [encoded, signature] = String(token || '').split('.');
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch (_) { return null; }
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"status":"ok"}'); }
  res.writeHead(404).end();
});
const wss = new WebSocket.Server({ server, path: '/ws', maxPayload: 64 * 1024 });
const subscriber = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

wss.on('connection', ws => {
  ws.identity = null;
  ws.sessionId = null;
  ws.on('message', raw => {
    try {
      const message = JSON.parse(raw);
      if (message.type === 'auth') {
        ws.identity = verify(message.token);
        ws.sessionId = String(message.sessionId || 'session-default').slice(0, 100);
        ws.send(JSON.stringify({ type: 'auth_status', authenticated: Boolean(ws.identity) }));
        if (!ws.identity) ws.close(1008, 'Authentication required');
      } else if (message.type === 'subscribe' && ws.identity) {
        ws.sessionId = String(message.sessionId || '').slice(0, 100);
      } else if (message.type === 'ping' && ws.identity) {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (_) { ws.close(1003, 'Invalid payload'); }
  });
});

subscriber.subscribe('hermes:events');
subscriber.on('message', (_channel, raw) => {
  let event;
  try { event = JSON.parse(raw); } catch (_) { return; }
  if (!event.sessionId) return;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client.identity && client.sessionId === String(event.sessionId)) client.send(raw);
  }
});

server.listen(Number(process.env.EVENT_PORT || 8001), '0.0.0.0');
