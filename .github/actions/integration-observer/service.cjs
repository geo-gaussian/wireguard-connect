const fs = require('node:fs');
const http = require('node:http');

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' || request.url !== '/health') {
    response.writeHead(404);
    response.end();
    return;
  }
  response.end('wireguard-ok');
});

server.listen(8080, '10.99.0.1', () => {
  fs.writeFileSync(process.env.SERVICE_PID_FILE, String(process.pid), { mode: 0o600 });
});
