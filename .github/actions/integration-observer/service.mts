import { writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

const pidFile = process.env.SERVICE_PID_FILE;
if (!pidFile) throw new Error('SERVICE_PID_FILE is required.');

const server = createServer((request, response) => {
  if (request.method !== 'GET' || request.url !== '/health') {
    response.writeHead(404);
    response.end();
    return;
  }
  response.end('wireguard-ok');
});

server.listen(8080, '10.99.0.1', () => {
  writeFileSync(pidFile, String(process.pid), { mode: 0o600 });
});
