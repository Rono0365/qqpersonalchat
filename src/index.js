//designed this for p2p chat communication 
//ps: data here is'nt stored anywhere besides the receiver and sender's device plus it's 
//encrypted hence end to end encryption ... it's mostly designed for afleet||Onestack||freshfit||and now buswise (formarlly Afleet)
const express = require('express');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
const xx =[];

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set the destination folder where the uploaded files will be stored
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Set the filename of the uploaded file
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + fileExtension);
  }
});

const upload = multer({ storage });
const messagesByRoom = {};

app.post('/:room', (req, res) => {
  const room = req.params.room;
  const message = req.body.message;
  const writerName = req.body.writerName;
  const timestamp = new Date().toLocaleString();
  // Process the message as needed
  console.log('Received message:', message);

  // Save the message for the specified room
  xx.push([room, [writerName,message,timestamp]]);

  // Retrieve messages for the specified room
  retrieveMessages(room)
    .then((messages) => {
      res.render('index', { room: room, imageUrl: null, messages: messages });
    })
    .catch((error) => {
      console.error('Error retrieving messages:', error);
      res.render('index', { room: room, imageUrl: null, messages: [] });
    });
});

app.post('status/:room', (req, res) => {
  const room = req.params.room;
  const message = req.body.message;
  const writerName = req.body.writerName;
  const timestamp = new Date().toLocaleString();
  // Process the message as needed
  console.log('Received message:', message);

  // Save the message for the specified room
  xx.push([room, [writerName,message,timestamp]]);

  // Retrieve messages for the specified room
  retrieveMessages(room)
    .then((messages) => {
      res.render('index', { room: room, imageUrl: null, messages: messages });
    })
    .catch((error) => {
      console.error('Error retrieving messages:', error);
      res.render('index', { room: room, imageUrl: null, messages: [] });
    });
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

app.post('/send-message', upload.single('file'), (req, res) => {
  const message = req.body.message;
  const file = req.file;
  const room = req.body.room;

  let imageUrl = null;

  // Customize the file handling logic here
  if (file) {
    // Perform actions with the uploaded file
    console.log('Received file:', file.originalname);
    console.log('Stored file path:', file.path);
    // Example: Read and encode the file as Base64
    const data = fs.readFileSync(file.path);
    const base64Image = Buffer.from(data).toString('base64');
    imageUrl = `data:image/jpeg;base64,${base64Image}`;

    // Move the file to a specific location
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
    // If no file is uploaded, send an empty response
    res.send({ imageUrl: null });
  }
  xx.push([room,message]);
  //console.log(xx);
  // Process the message as needed
  console.log('Received message:', message);

  // Emit the message to the specific room
  io.to(room).emit('chat message', { room: room, message: message, imageUrl: imageUrl });
});
app.get('/messages', (req, res) => {
  res.json(messages); // Return the messages as JSON
});
app.get('/messages/:room', (req, res) => {
  const room = req.params.room;

  // Retrieve messages for the specified room
  const messages =  xx.filter((list) => list[0] === room);//xx//messagesByRoom[room] || [];

  res.json({ messages });
});
app.get('/status/:room', (req, res) => {
  const room = req.params.room;

  // Retrieve messages for the specified room
  const messages =  xx.filter((list) => list[0] === room);//xx//messagesByRoom[room] || [];

  res.json({ messages });
});



const io = socketIO(server);

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
    xx.push(msg);
    
    console.log(xx.toString);
    
    console.log('Received message:', msg);
    io.to(msg.room).emit('chat message', msg);
  });
});

// Placeholder function to simulate retrieving messages from a database
function retrieveMessages(room) {
  return new Promise((resolve, reject) => {
    // Replace this placeholder logic with your own code to fetch messages based on the room parameter
    // Example: Query a database for messages belonging to the specified room
    //const ronos = listOfLists.filter((list) => list[0] === "rono");
    const messages =  xx.filter((list) => list[0] === room);

    resolve(messages);
  });
}
