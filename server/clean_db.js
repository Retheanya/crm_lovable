const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const User = require('./src/models/User');
const Lead = require('./src/models/Lead');
const Activity = require('./src/models/Activity');
const Communication = require('./src/models/Communication');
const FollowUp = require('./src/models/FollowUp');

const cleanDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm');
    console.log('Connected to DB');

    // Delete all Leads, Activities, Communications, FollowUps
    await Lead.deleteMany({});
    console.log('Deleted all leads');
    
    await Activity.deleteMany({});
    console.log('Deleted all activities');

    await Communication.deleteMany({});
    console.log('Deleted all communications');

    await FollowUp.deleteMany({});
    console.log('Deleted all follow-ups');

    // Delete all users EXCEPT superadmin
    await User.deleteMany({ email: { $ne: 'superadmin@crm.com' } });
    console.log('Deleted all non-admin users');

    console.log('Database cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

cleanDatabase();
