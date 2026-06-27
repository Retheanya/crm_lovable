const mongoose = require('mongoose');
require('dotenv').config();
require('./src/models/User');
const User = mongoose.model('User');

const API_URL = 'http://localhost:5000/api/v1';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Get/Create Test Users
  let superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
  if (!superAdmin) {
    superAdmin = await User.create({ name: 'SA', email: 'sa@test.com', password: 'Password123', role: 'SUPER_ADMIN' });
  }

  let admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Password123', role: 'ADMIN' });
  }

  let user = await User.findOne({ role: 'USER' });
  if (!user) {
    user = await User.create({ name: 'User', email: 'user@test.com', password: 'Password123', role: 'USER' });
  }

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

  console.log('--- TEST 1: USER attempting to elevate to SUPER_ADMIN via /profile ---');
  let userToken = await login(user.email);
  let userHeaders = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };
  
  let p1 = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: userHeaders,
    body: JSON.stringify({ role: 'SUPER_ADMIN', name: 'Escalated User' })
  });
  console.log(`Status: ${p1.status}`);
  let check1 = await User.findById(user._id);
  console.log(`Role in MongoDB: ${check1.role} (Expected: USER)`);

  console.log('\n--- TEST 2: USER attempting to modify SUPER_ADMIN via /users/:id ---');
  let p2 = await fetch(`${API_URL}/users/${superAdmin._id}`, {
    method: 'PUT',
    headers: userHeaders,
    body: JSON.stringify({ name: 'Hacked' })
  });
  console.log(`Status: ${p2.status} (Expected: 403 Forbidden)`);
  let check2 = await User.findById(superAdmin._id);
  console.log(`SUPER_ADMIN Name in MongoDB: ${check2.name} (Expected: Unchanged)`);

  console.log('\n--- TEST 3: ADMIN attempting to elevate to SUPER_ADMIN via /profile ---');
  let adminToken = await login(admin.email);
  let adminHeaders = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
  
  let p3 = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ role: 'SUPER_ADMIN', name: 'Escalated Admin' })
  });
  console.log(`Status: ${p3.status}`);
  let check3 = await User.findById(admin._id);
  console.log(`Role in MongoDB: ${check3.role} (Expected: ADMIN)`);

  console.log('\n--- TEST 4: ADMIN attempting to elevate themselves via /users/:id ---');
  let p4 = await fetch(`${API_URL}/users/${admin._id}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ role: 'SUPER_ADMIN' })
  });
  let d4 = await p4.json();
  console.log(`Status: ${p4.status} (Expected: 403)`);
  console.log(`Response: ${d4.error || d4.message}`);
  let check4 = await User.findById(admin._id);
  console.log(`Role in MongoDB: ${check4.role} (Expected: ADMIN)`);

  console.log('\n--- TEST 5: ADMIN attempting to modify SUPER_ADMIN via /users/:id ---');
  let p5 = await fetch(`${API_URL}/users/${superAdmin._id}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ name: 'Downgraded', role: 'USER' })
  });
  let d5 = await p5.json();
  console.log(`Status: ${p5.status} (Expected: 403)`);
  console.log(`Response: ${d5.error || d5.message}`);
  let check5 = await User.findById(superAdmin._id);
  console.log(`SUPER_ADMIN Role in MongoDB: ${check5.role} (Expected: SUPER_ADMIN)`);

  console.log('\n--- TEST 6: SUPER_ADMIN deleting themselves via /users/:id ---');
  let saToken = await login(superAdmin.email);
  let saHeaders = { 'Authorization': `Bearer ${saToken}`, 'Content-Type': 'application/json' };
  let p6 = await fetch(`${API_URL}/users/${superAdmin._id}`, {
    method: 'DELETE',
    headers: saHeaders
  });
  let d6 = await p6.json();
  console.log(`Status: ${p6.status} (Expected: 400)`);
  console.log(`Response: ${d6.error || d6.message}`);
  let check6 = await User.findById(superAdmin._id);
  console.log(`SUPER_ADMIN exists in MongoDB? ${!!check6} (Expected: true)`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
