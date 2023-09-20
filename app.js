const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const assert = require('assert');
const mongoose = require('mongoose');
const session = require("express-session");
const { routes } = require('./routes/routes');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure express-session
// app.use(session({
//     secret: 'secret-key', // Replace with your secret key for session encryption
//     resave: false,
//     saveUninitialized: true,
// }));
  

// MongoDB Connection
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,  
})
.then((result) => {
    console.log("Database connected!");
})
.catch((error) => {
    console.log("Database connection error := ", error);    
});

// Load config
// const stage = process.env.NODE_ENV || 'production';
// const env = dotenv.config({
//     path: `${stage}.env`
// });
// assert.equal(null, env.error);
// app.set('env', stage);

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use('/api/', routes);

app.get('/', function (req, res) {
    res.send('Server is running');
});

app.listen(PORT, function () {
    console.log('Listenning to PORT := ', PORT);
});
