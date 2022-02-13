const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const db = require('./config/db')

// Laod env vars
dotenv.config({ path: './config/config.env' });

// Load models
const User  = require('./models/User');


// Connect to DB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }); or
db()

// Read JSON Files


const users = JSON.parse(
  fs.readFileSync(`${__dirname}/data/users.json`, 'utf-8')
);


// Import into DB
const importData = async () => {
  try {
    await User.create(users);
    console.log('Data Created..');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};
// Delete Data
const deleteData = async () => {
  try {
  await User.deleteMany();
  console.log('Data Destroyed..');
  process.exit();
  } catch (err) {
    console.error(err);
  }
};

console.log(process.argv)

if (process.argv[2] === '-i') {
  importData();
}else if (process.argv[2] === '-d'){
    deleteData()
}
