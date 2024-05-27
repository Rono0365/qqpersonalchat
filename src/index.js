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
const xx =[];
const supabaseUrl = 'https://steuaippbrlbwilvzltr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0ZXVhaXBwYnJsYndpbHZ6bHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUwNTExNjYsImV4cCI6MjAzMDYyNzE2Nn0.MJY3oTZ9iwL5jq_R3swYyT8DM-tXF7cWyR_R9RkU1D0';
const supabase = createClient(supabaseUrl, supabaseKey);

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
async function fetchData() {
  const { data, error } = await supabase
      .from('chatnode1')
      .select('message')
      .order('id', { ascending: false })
      .limit(1);

  if (error) {
      console.error('Error fetching data:', error);
      return;
  }

  console.log('Data:', JSON.parse(data.map((tt) => tt['message'])));
}
async function deleteAllExceptLast() {
  // Step 1: Fetch the last row
  const { data: lastRow, error: fetchError } = await supabase
    .from('chatnode1')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Error fetching last row:', fetchError);
    return;
  }

  if (lastRow.length === 0) {
    console.log('No rows found in the table.');
    return;
  }

  const lastRowId = lastRow[0].id;

  // Step 2: Delete all rows except the last one
  const { error: deleteError } = await supabase
    .from('chatnode1')
    .delete()
    .neq('id', lastRowId);

  if (deleteError) {
    console.error('Error deleting rows:', deleteError);
  } else {
    console.log('All rows except the last one have been deleted.');
  }
}
async function saveList(list) {
  try {
    const { data, error } = await supabase
      .from('chatnode1')
      .insert({'message':xx});

    if (error) {
      throw error;
    }

   // console.log('List saved successfully:', data);
  } catch (error) {
    //console.error('Error saving list:', error.message);
  }
}
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
  saveList([room, [writerName,message,timestamp]]);
  deleteAllExceptLast();

    console.log('List saved successfully:', xx);
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
app.get('/messages/:room', async (req, res) => {
  const room = req.params.room;

  // Retrieve messages for the specified room
  fetchData();
  const { data, error } = await supabase
      .from('chatnode1')
      .select('message')
      .order('id', { ascending: false })
      .limit(1);

  if (error) {
      console.error('Error fetching data:', error);
      return;
  }
  const x1 = JSON.parse(data.map((tt) => tt['message']));
  //x1 === saved directly on a supabase server 
  //downfall for that is that it's slow and behaves weird in prod
  //returned the old system works fine except no data us saved for p2p chat (xx)
  const messages =  xx.filter((list) => list[0] === room);//x1.filter((list) => list[0] === room);//xx//messagesByRoom[room] || [];
  
  //res.json( {"messages":JSON.parse(data.map((tt) => tt['message']))});

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
