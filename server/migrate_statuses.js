/**
 * Migration: Normalize all lead status values to match CRM setting labels.
 * Old: "NEW", "CONTACTED", "FOLLOW_UP" (uppercase constants)
 * New: "New", "Contacted", "Follow-Up" (human-readable labels matching CRM settings)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');

const STATUS_MAP = {
  // Legacy uppercase values → normalized human-readable labels
  'NEW': 'New',
  'CONTACTED': 'Contacted',
  'FOLLOW_UP': 'Follow-Up',
  'FOLLOW UP': 'Follow-Up',
  'CLOSED': 'Closed Won',
  'CLOSED_WON': 'Closed Won',
  'CLOSED_LOST': 'Closed Lost',
  'PROPOSAL_SENT': 'Proposal Sent',
  'NEGOTIATION': 'Negotiation',
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm').then(async () => {
  const leads = await Lead.find({ isDeleted: false }).lean();
  console.log(`Found ${leads.length} leads to audit.\n`);

  let updated = 0;
  for (const lead of leads) {
    const normalized = STATUS_MAP[lead.status];
    if (normalized) {
      await Lead.updateOne({ _id: lead._id }, { $set: { status: normalized } });
      console.log(` ✓ "${lead.leadName}": "${lead.status}" → "${normalized}"`);
      updated++;
    } else {
      console.log(` · "${lead.leadName}": "${lead.status}" — already normalized, no change.`);
    }
  }

  console.log(`\nMigration complete. ${updated} leads updated.\n`);

  // Verify final state
  const agg = await Lead.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Final status distribution in DB:');
  agg.forEach(s => console.log(`  "${s._id}": ${s.count}`));

  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
