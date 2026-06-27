require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Lead = require('./src/models/Lead');
const User = require('./src/models/User');

const PORT = process.env.PORT || 5000;
const API_URL = `http://localhost:${PORT}/api/v1`;

async function fetchAPI(path, method = 'GET', body = null, token) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'API Error');
  return data;
}

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const adminUser = await User.findOne({ role: 'SUPER_ADMIN' });
  if (!adminUser) throw new Error('No admin user found');
  const otherUser = await User.findOne({ role: 'USER' });

  const token = jwt.sign(
    { userId: adminUser._id, email: adminUser.email, role: adminUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const report = [];
  const log = (msg) => { console.log(msg); report.push(msg); };

  log('--- END-TO-END CRUD PERSISTENCE AUDIT ---');

  // --- 1. CREATE LEAD ---
  log('\n### 1. CREATE LEAD');
  const createPayload = {
    leadName: 'Audit Test Lead',
    companyName: 'Audit Corp',
    phoneNumber: `555-000-${Math.floor(Math.random()*10000)}`,
    location: 'Mumbai, India',
    source: 'Website',
    status: 'New',
    value: 5000,
    notes: 'Audit test notes'
  };
  
  log(`BEFORE DB: No document exists yet.`);
  log(`API Request Payload (POST /leads):\n${JSON.stringify(createPayload, null, 2)}`);
  
  const createRes = await fetchAPI('/leads', 'POST', createPayload, token);
  log(`API Response:\n${JSON.stringify(createRes, null, 2)}`);
  
  const leadId = createRes.data._id;
  const dbAfterCreate = await Lead.findById(leadId).lean();
  log(`AFTER DB Document:\n${JSON.stringify(dbAfterCreate, null, 2)}`);

  // --- 2. UPDATE LEAD ---
  log('\n### 2. UPDATE LEAD');
  const updatePayload = {
    leadName: 'Audit Test Lead Updated',
    value: 10000,
    location: 'Delhi, India'
  };
  
  const dbBeforeUpdate = await Lead.findById(leadId).lean();
  log(`BEFORE DB:\n${JSON.stringify({ leadName: dbBeforeUpdate.leadName, value: dbBeforeUpdate.value, location: dbBeforeUpdate.location, updatedAt: dbBeforeUpdate.updatedAt }, null, 2)}`);
  log(`API Request Payload (PUT /leads/${leadId}):\n${JSON.stringify(updatePayload, null, 2)}`);
  
  const updateRes = await fetchAPI(`/leads/${leadId}`, 'PUT', updatePayload, token);
  log(`API Response:\n${JSON.stringify(updateRes, null, 2)}`);
  
  const dbAfterUpdate = await Lead.findById(leadId).lean();
  log(`AFTER DB:\n${JSON.stringify({ leadName: dbAfterUpdate.leadName, value: dbAfterUpdate.value, location: dbAfterUpdate.location, updatedAt: dbAfterUpdate.updatedAt }, null, 2)}`);

  // --- 3. STATUS CHANGE ---
  log('\n### 3. STATUS CHANGE');
  const statusPayload = { status: 'Follow-Up' };
  
  const dbBeforeStatus = await Lead.findById(leadId).lean();
  log(`BEFORE DB Status: ${dbBeforeStatus.status}`);
  log(`API Request Payload (PATCH /leads/${leadId}/status):\n${JSON.stringify(statusPayload, null, 2)}`);
  
  const statusRes = await fetchAPI(`/leads/${leadId}/status`, 'PATCH', statusPayload, token);
  log(`API Response:\n${JSON.stringify(statusRes, null, 2)}`);
  
  const dbAfterStatus = await Lead.findById(leadId).lean();
  log(`AFTER DB Status: ${dbAfterStatus.status}`);

  // --- 4. ASSIGN LEAD ---
  log('\n### 4. ASSIGN LEAD');
  const assignPayload = { assignedUser: otherUser._id };
  
  const dbBeforeAssign = await Lead.findById(leadId).lean();
  log(`BEFORE DB AssignedUser: ${dbBeforeAssign.assignedUser}`);
  log(`API Request Payload (PATCH /leads/${leadId}/assign):\n${JSON.stringify(assignPayload, null, 2)}`);
  
  const assignRes = await fetchAPI(`/leads/${leadId}/assign`, 'PATCH', assignPayload, token);
  log(`API Response:\n${JSON.stringify(assignRes, null, 2)}`);
  
  const dbAfterAssign = await Lead.findById(leadId).lean();
  log(`AFTER DB AssignedUser: ${dbAfterAssign.assignedUser}`);

  // --- 5. DELETE LEAD ---
  log('\n### 5. DELETE LEAD');
  const dbBeforeDelete = await Lead.findById(leadId).lean();
  log(`BEFORE DB isDeleted: ${dbBeforeDelete.isDeleted}`);
  log(`API Request (DELETE /leads/${leadId})`);
  
  const deleteRes = await fetchAPI(`/leads/${leadId}`, 'DELETE', null, token);
  log(`API Response:\n${JSON.stringify(deleteRes, null, 2)}`);
  
  const dbAfterDelete = await Lead.findById(leadId).lean();
  log(`AFTER DB:\n${JSON.stringify(dbAfterDelete, null, 2)}`);

  const fs = require('fs');
  fs.writeFileSync('crud_audit_results.txt', report.join('\n'));
  process.exit();
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
