require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm').then(async () => {
  // Show all leads with their raw status values
  const leads = await Lead.find({ isDeleted: false }).populate('assignedUser', 'name').lean();
  console.log('All leads (raw status from DB):');
  leads.forEach(l => console.log(` - "${l.leadName}" | status: "${l.status}" | assignedUser: ${l.assignedUser ? l.assignedUser.name : 'null'}`));

  // Group by status
  const agg = await Lead.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  console.log('\nStatus aggregation (what dashboard sees):');
  agg.forEach(s => console.log(` - status "${s._id}": ${s.count} leads`));

  // Count leads per user
  const users = await User.find({}).lean();
  console.log('\nAssigned leads per user:');
  for (const u of users) {
    const count = await Lead.countDocuments({ isDeleted: false, assignedUser: u._id });
    console.log(` - ${u.name} (${u._id}): ${count} leads`);
  }
  const unassigned = await Lead.countDocuments({ isDeleted: false, assignedUser: null });
  console.log(` - Unassigned (null): ${unassigned} leads`);

  const total = await Lead.countDocuments({ isDeleted: false });
  console.log(`\nTotal non-deleted leads: ${total}`);
  
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
