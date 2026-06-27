require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const Activity = require('./src/models/Activity');
const FollowUp = require('./src/models/FollowUp');
const Communication = require('./src/models/Communication');

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Find all leads that are marked as isDeleted: true
  const deletedLeads = await Lead.find({ isDeleted: true });
  const deletedIds = deletedLeads.map(l => l._id);

  console.log(`Found ${deletedIds.length} soft-deleted leads to clean up.`);

  if (deletedIds.length > 0) {
    // Delete associated records for these leads
    const actRes = await Activity.deleteMany({ leadId: { $in: deletedIds } });
    const folRes = await FollowUp.deleteMany({ leadId: { $in: deletedIds } });
    const comRes = await Communication.deleteMany({ leadId: { $in: deletedIds } });

    console.log(`Cleaned up ${actRes.deletedCount} activities.`);
    console.log(`Cleaned up ${folRes.deletedCount} follow-ups.`);
    console.log(`Cleaned up ${comRes.deletedCount} communications.`);

    // Hard delete the leads
    const leadRes = await Lead.deleteMany({ _id: { $in: deletedIds } });
    console.log(`Hard deleted ${leadRes.deletedCount} leads.`);
  }

  process.exit();
}

cleanup().catch(console.error);
