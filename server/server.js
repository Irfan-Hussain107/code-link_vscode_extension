const express = require('express');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Code Link server is running');
});

app.get('/health', (req, res) => {
  res.send('OK');
});

server.on('upgrade', (request, socket, head) => {
  try {
    // Ensure request has proper URL
    const url = request.url || '/default-room';
    
    console.log(`WebSocket upgrade request for: ${url}`);
    
    // Create a proper request object with required properties
    const wsRequest = {
      url: url,
      headers: request.headers || {},
      connection: request.connection || socket,
      socket: request.socket || socket
    };
    
    setupWSConnection(socket, wsRequest);
    
  } catch (error) {
    console.error('WebSocket setup error:', error);
    socket.destroy();
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});