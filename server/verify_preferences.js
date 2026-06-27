const mongoose = require('mongoose');
require('dotenv').config();
require('./src/models/User');
const User = mongoose.model('User');

const API_URL = 'http://localhost:5000/api/v1';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  let user = await User.findOne({ email: 'admin@pulse.io' });
  if (!user) {
    user = await User.findOne();
  }

  console.log('\n--- MongoDB Document Before Update ---');
  console.log(JSON.stringify({ _id: user._id, preferences: user.preferences }, null, 2));

  // Helper to login and get token
  async function login(email) {
    let u = await User.findOne({ email });
    u.password = 'Password123';
    await u.save();
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123' })
    });
    const data = await res.json();
    return data.data.token;
  }

  let token = await login(user.email);
  let headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  const payload = { theme: 'dark', accentColor: '#7c3aed', density: 'compact' };

  console.log('\n--- API Request Payload ---');
  console.log('PUT /api/v1/preferences');
  console.log(JSON.stringify(payload, null, 2));

  let p1 = await fetch(`${API_URL}/preferences`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  
  let d1 = await p1.json();
  console.log('\n--- API Response ---');
  console.log(`Status: ${p1.status}`);
  console.log(JSON.stringify(d1, null, 2));

  let check1 = await User.findById(user._id);
  console.log('\n--- MongoDB Document After Update ---');
  console.log(JSON.stringify({ _id: check1._id, preferences: check1.preferences }, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
