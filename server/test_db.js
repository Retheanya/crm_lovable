require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const allCount = await Lead.countDocuments();
    const notDeletedCount = await Lead.countDocuments({ isDeleted: false });
    const isDeletedCount = await Lead.countDocuments({ isDeleted: true });
    
    console.log(`Total Leads: ${allCount}`);
    console.log(`Not Deleted: ${notDeletedCount}`);
    console.log(`Deleted: ${isDeletedCount}`);
    
    const leads = await Lead.find({ isDeleted: false });
    const statusCounts = {};
    leads.forEach(l => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });
    console.log('Statuses:', statusCounts);

    const users = await User.find();
    for (const u of users) {
      const uCount = await Lead.countDocuments({ assignedUser: u._id, isDeleted: false });
      console.log(`User ${u.name} (${u.role}): ${uCount}`);
    }
    
    const noAssignedCount = await Lead.countDocuments({ assignedUser: null, isDeleted: false });
    console.log(`Unassigned: ${noAssignedCount}`);

    process.exit();
  });
