const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./src/models/User');
const { LEAD_STATUS } = require('./src/constants');
const dashboardService = require('./src/services/dashboard.service');
const leadService = require('./src/services/lead.service');
const followupService = require('./src/services/followup.service');
const communicationService = require('./src/services/communication.service');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_lovable');
  console.log('Connected to DB');
  
  const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
  if (!superAdmin) throw new Error('No SUPER_ADMIN found');

  const summaryBefore = await dashboardService.getSummary(superAdmin);
  console.log('\n--- WEEKLY PIPELINE BEFORE TEST ---');
  console.log(JSON.stringify(summaryBefore.weeklyPipeline, null, 2));

  // Create leads (increases 'leads' count)
  console.log('\nCreating Lead A, B, C...');
  const leadA = await leadService.createLead({ leadName: 'Test Lead A', companyName: 'Company A', phoneNumber: '5551230001', location: 'Mumbai' }, superAdmin._id);
  const leadB = await leadService.createLead({ leadName: 'Test Lead B', companyName: 'Company B', phoneNumber: '5551230002', location: 'Delhi' }, superAdmin._id);
  const leadC = await leadService.createLead({ leadName: 'Test Lead C', companyName: 'Company C', phoneNumber: '5551230003', location: 'Pune' }, superAdmin._id);

  console.log('Contacting Lead A...');
  await communicationService.addCommunication(leadA._id, { type: 'CALL', remarks: 'test call' }, superAdmin);
  
  console.log('Scheduling Follow-Up for Lead B...');
  await followupService.addFollowUp(leadB._id, { followUpDate: new Date(), notes: 'test follow-up' }, superAdmin);
  
  console.log('Closing Lead C...');
  await leadService.updateStatus(leadC._id, LEAD_STATUS.CLOSED, superAdmin);

  const summaryAfter = await dashboardService.getSummary(superAdmin);
  console.log('\n--- WEEKLY PIPELINE AFTER TEST ---');
  console.log(JSON.stringify(summaryAfter.weeklyPipeline, null, 2));

  // Clean up
  console.log('\nCleaning up test data...');
  const Lead = require('./src/models/Lead');
  const Activity = require('./src/models/Activity');
  const FollowUp = require('./src/models/FollowUp');
  const Communication = require('./src/models/Communication');
  
  const testIds = [leadA._id, leadB._id, leadC._id];
  await Lead.deleteMany({ _id: { $in: testIds } });
  await Activity.deleteMany({ leadId: { $in: testIds } });
  await FollowUp.deleteMany({ leadId: { $in: testIds } });
  await Communication.deleteMany({ leadId: { $in: testIds } });

  console.log('Cleanup complete.');
  process.exit(0);
}

run().catch(console.error);
