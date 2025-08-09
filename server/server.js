const express = require('express');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Code Link server is running');
});

server.on('upgrade', (request, socket, head) => {
  setupWSConnection(request, socket, head);
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});