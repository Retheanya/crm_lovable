require('./models/User');
require('./models/Lead');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/crm_lovable').then(async () => {
  const Activity = require('./models/Activity');

  // 1. Total count
  const total = await Activity.countDocuments({});
  console.log('TOTAL_ACTIVITIES:', total);

  // 2. By type
  const byType = await Activity.aggregate([
    { $group: { _id: '$activityType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('BY_TYPE:', JSON.stringify(byType));

  // 3. Check null performedBy (deleted users)
  const nullUser = await Activity.countDocuments({ performedBy: null });
  console.log('NULL_PERFORMED_BY:', nullUser);

  // 4. Check null leadId (deleted leads)
  const nullLead = await Activity.countDocuments({ leadId: null });
  console.log('NULL_LEAD_ID:', nullLead);

  // 5. Sample 5 most recent
  const sample = await Activity.find({})
    .populate('performedBy', 'name email')
    .populate('leadId', 'leadName companyName')
    .sort({ createdAt: -1 })
    .limit(5);

  console.log('RECENT_5:');
  sample.forEach(a => {
    console.log(JSON.stringify({
      activityType: a.activityType,
      desc: a.description ? a.description.substring(0, 80) : '',
      performedBy: a.performedBy ? a.performedBy.name : '(deleted)',
      leadName: a.leadId ? a.leadId.leadName : '(deleted)',
      createdAt: a.createdAt
    }));
  });

  // 6. Date grouping test - count unique dates
  const dates = sample.map(a => new Date(a.createdAt).toDateString());
  const uniqueDates = [...new Set(dates)];
  console.log('UNIQUE_DATE_GROUPS (sample):', uniqueDates.length);

  // 7. Check for duplicates by _id
  const pipeline = [
    { $group: { _id: '$_id', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ];
  const dupes = await Activity.aggregate(pipeline);
  console.log('DUPLICATE_IDS:', dupes.length);

  process.exit(0);
}).catch(err => {
  console.error('DB_ERROR:', err.message);
  process.exit(1);
});
