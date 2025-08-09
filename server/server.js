const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/' // This allows any path to work
});

const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Code Link server is running');
});

app.get('/health', (req, res) => {
  res.send('OK');
});

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  try {
    console.log(`WebSocket connection established for: ${request.url}`);
    setupWSConnection(ws, request);
  } catch (error) {
    console.error('WebSocket setup error:', error);
    ws.close();
  }
});

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

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