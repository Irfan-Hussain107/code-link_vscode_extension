const http = require('http');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Code Link server is running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  console.log('New WebSocket connection established. Setting up Y.js...');
  try {
    setupWSConnection(conn, req);
  } catch (error) {
    console.error('CRITICAL ERROR during setupWSConnection:', error);
    conn.close();
  }
});

const port = process.env.PORT || 8080;

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});