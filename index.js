const express = require('express');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

const io = socketIO(server);

const supabaseUrl = 'https://steuaippbrlbwilvzltr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0ZXVhaXBwYnJsYndpbHZ6bHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUwNTExNjYsImV4cCI6MjAzMDYyNzE2Nn0.MJY3oTZ9iwL5jq_R3swYyT8DM-tXF7cWyR_R9RkU1D0';
const supabase = createClient(supabaseUrl, supabaseKey);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + fileExtension);
  }
});

const upload = multer({ storage });

app.post('/:room', async (req, res) => {
  const room = req.params.room;
  const { message, writerName } = req.body;
  const timestamp = new Date().toISOString();

  console.log('Received message:', message);

  const { data, error } = await supabase
    .from('messages')
    .insert([{{ message, writerName } }]);

  if (error) {
    console.error('Error saving message:', error);
    res.status(500).send('Error saving message');
    return;
  }

  res.redirect(`/messages/${room}`);
});

app.get('/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'custom', 'location', filename);

  fs.readFile(imagePath, (error, data) => {
    if (error) {
      console.error('Error reading image:', error);
      res.status(404).json({ error: 'Image not found' });
    } else {
      const base64Image = Buffer.from(data).toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;
      res.json({ imageUrl });
    }
  });
});

app.post('/send-message', upload.single('file'), async (req, res) => {
  const { message, room } = req.body;
  const file = req.file;
  const writerName = req.body.writerName;
  const timestamp = new Date().toISOString();

  let imageUrl = null;

  if (file) {
    const data = fs.readFileSync(file.path);
    const base64Image = Buffer.from(data).toString('base64');
    imageUrl = `data:image/jpeg;base64,${base64Image}`;

    const destinationPath = path.join(__dirname, 'custom', 'location', file.originalname);

    fs.mkdir(path.join(__dirname, 'custom', 'location'), { recursive: true }, (error) => {
      if (error) {
        console.error('Error creating destination directory:', error);
        res.send({ imageUrl: null });
      } else {
        fs.rename(file.path, destinationPath, (error) => {
          if (error) {
            console.error('Error moving file:', error);
            res.send({ imageUrl: null });
          } else {
            console.log('File moved to:', destinationPath);
            res.json({ imageUrl });
          }
        });
      }
    });
  } else {
    res.send({ imageUrl: null });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([{ room, writerName, message, timestamp, imageUrl }]);

  if (error) {
    console.error('Error saving message:', error);
    res.status(500).send('Error saving message');
    return;
  }

  io.to(room).emit('chat message', { room, writerName, message, timestamp, imageUrl });
});

app.get('/messages/:room', async (req, res) => {
  const room = req.params.room;

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room', room);

  if (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).send('Error retrieving messages');
    return;
  }

  res.json({ messages });
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('join room', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on('chat message', (msg) => {
    console.log('Received message:', msg);
    io.to(msg.room).emit('chat message', msg);
  });
});

