const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const User = require('../models/User');
const { ROLES } = require('../constants');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm');
    console.log(`MongoDB Connected: Database ${conn.connection.name} at ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing existing users...');
    await User.deleteMany();

    const users = [
      {
        name: 'Super Admin',
        email: 'superadmin@crm.com',
        password: 'Password123',
        role: ROLES.SUPER_ADMIN
      },
      {
        name: 'Sales Rep 1',
        email: 'sales1@crm.com',
        password: 'Password123',
        role: ROLES.USER
      },
      {
        name: 'Sales Rep 2',
        email: 'sales2@crm.com',
        password: 'Password123',
        role: ROLES.USER
      }
    ];

    console.log('Seeding users...');
    await User.create(users);

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
