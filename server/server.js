const http = require('http');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const server = http.createServer((request, response) => {
  // This is the health check for Render and UptimeRobot
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Code Link server is running');
});

// Create a WebSocket server instance and attach it to the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  console.log('New WebSocket connection established. Setting up Y.js...');
  try {
    // Use the y-websocket utility to handle all the Y.js magic
    setupWSConnection(conn, req);
  } catch (error) {
    console.error('CRITICAL ERROR during setupWSConnection:', error);
    conn.close();
  }
});

const port = process.env.PORT || 8080;

// Listen on 0.0.0.0 to be accessible in a hosting environment like Render
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});