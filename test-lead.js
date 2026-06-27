const axios = require('axios');
const mongoose = require('mongoose');

async function testLead() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'superadmin@crm.com',
      password: 'Password123'
    });
    const token = loginRes.data.data.token;
    console.log("Token received.");

    // 2. Create Lead
    const payload = {
      leadName: "Test Enterprise Lead",
      companyName: "Acme Corp Ltd",
      phoneNumber: "+19998887776",
      location: "San Francisco, CA",
      source: "WhatsApp",
      status: "NEW",
      value: 120000,
      notes: "This is a high value enterprise lead."
    };
    
    console.log("\n--- API Request Payload ---");
    console.log(JSON.stringify(payload, null, 2));

    const createRes = await axios.post('http://localhost:5000/api/v1/leads', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("\n--- API Response ---");
    console.log(JSON.stringify(createRes.data, null, 2));
    
    // 3. Connect to MongoDB and query the document
    await mongoose.connect('mongodb://localhost:27017/crm_lovable', { useNewUrlParser: true, useUnifiedTopology: true });
    const Lead = require('./server/src/models/Lead');
    const doc = await Lead.findById(createRes.data.data._id).lean();
    
    console.log("\n--- MongoDB Document ---");
    console.log(JSON.stringify(doc, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testLead();
