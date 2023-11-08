// server.js
//a user's guide 
const express = require('express');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const app = express();
const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

app.set('view engine', 'ejs');
//this is awesome
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');
});

const io = socketIO(server);

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('chat message', (msg) => {
    console.log('Received message:', msg);
    io.emit('chat message', msg);
  });
});

