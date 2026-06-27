require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const DashboardService = require('./src/services/dashboard.service');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const adminUser = await User.findOne({ role: 'SUPER_ADMIN' });
    const summary = await DashboardService.getSummary(adminUser);
    
    console.log(`Summary totalLeads: ${summary.totalLeads}`);
    console.log(`Summary statusCounts:`, summary.statusCounts);
    
    process.exit();
  });
