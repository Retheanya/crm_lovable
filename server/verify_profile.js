const mongoose = require('mongoose');
require('dotenv').config();
require('./src/models/User'); // ensure registered
const User = mongoose.model('User');

const API_URL = 'http://localhost:5000/api/v1';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Find Admin user
  let admin = await User.findOne({ role: 'ADMIN' }).select('+password');
  if (!admin) {
    admin = await User.findOne().select('+password');
  }
  
  if (!admin) {
    console.log('No users found in database to test with.');
    process.exit(1);
  }

  const oldEmail = admin.email;
  const oldName = admin.name;
  const newEmail = `updated_${Date.now()}@test.com`;
  const newName = `Updated Name ${Date.now()}`;
  
  console.log('=== BEFORE PROFILE UPDATE (DB STATE) ===');
  console.log(`_id: ${admin._id}`);
  console.log(`name: ${admin.name}`);
  console.log(`email: ${admin.email}`);
  console.log(`role: ${admin.role}`);
  console.log(`updatedAt: ${admin.updatedAt}`);
  console.log(`password hash: ${admin.password}`);
  console.log('------------------------------------------\n');

  // Login to get token
  // Let's force-set the password to Admin@123 to ensure we can login for the test
  admin.password = 'Admin@123';
  await admin.save();
  let currentPassword = 'Admin@123';

  console.log('Logging in to get JWT...');
  let loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: currentPassword })
  });
  let loginData = await loginRes.json();
  if (!loginData.success) {
    console.log('Failed to login:', loginData);
    process.exit(1);
  }
  let token = loginData.data.token;
  let headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  };

  console.log('\n=== PROFILE UPDATE VERIFICATION ===');
  const profilePayload = { name: newName, email: newEmail };
  console.log(`Calling PUT /api/v1/profile with payload:`, profilePayload);
  
  let profileRes = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profilePayload)
  });
  let profileData = await profileRes.json();
  console.log(`Response Status: ${profileRes.status}`);
  console.log(`Response Payload:`, profileData);

  // Check DB again
  let updatedAdmin = await User.findById(admin._id).select('+password');
  console.log('\n=== AFTER PROFILE UPDATE (DB STATE) ===');
  console.log(`_id: ${updatedAdmin._id}`);
  console.log(`name: ${updatedAdmin.name}`);
  console.log(`email: ${updatedAdmin.email}`);
  console.log(`role: ${updatedAdmin.role}`);
  console.log(`updatedAt: ${updatedAdmin.updatedAt}`);
  console.log('------------------------------------------\n');

  console.log('=== CHANGE PASSWORD VERIFICATION ===');
  const newPassword = 'NewSecurePassword123!';
  const pwdPayload = {
    currentPassword: currentPassword,
    newPassword: newPassword,
    confirmPassword: newPassword
  };
  console.log(`Calling PUT /api/v1/profile/change-password with payload:`, { currentPassword: '***', newPassword: '***', confirmPassword: '***' });
  
  let pwdRes = await fetch(`${API_URL}/profile/change-password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(pwdPayload)
  });
  let pwdData = await pwdRes.json();
  console.log(`Response Status: ${pwdRes.status}`);
  console.log(`Response Payload:`, pwdData);

  // Check DB again
  let finalAdmin = await User.findById(admin._id).select('+password');
  console.log('\n=== AFTER PASSWORD UPDATE (DB STATE) ===');
  console.log(`password hash: ${finalAdmin.password}`);
  console.log(`Hash changed? ${updatedAdmin.password !== finalAdmin.password ? 'YES' : 'NO'}`);
  console.log('------------------------------------------\n');

  console.log('=== LOGIN VERIFICATION ===');
  console.log('Attempting login with OLD password (should fail)...');
  let oldLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newEmail, password: currentPassword })
  });
  if (oldLoginRes.ok) {
    console.log('ERROR: Login with old password succeeded!');
  } else {
    console.log(`Success: Login failed as expected (Status: ${oldLoginRes.status})`);
  }

  console.log('\nAttempting login with NEW password (should succeed)...');
  let newLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newEmail, password: newPassword })
  });
  if (newLoginRes.ok) {
    console.log(`Success: Login succeeded with new password! (Token received)`);
  } else {
    console.log(`ERROR: Login failed with new password! (Status: ${newLoginRes.status})`);
  }

  // Restore original data
  finalAdmin.name = oldName;
  finalAdmin.email = oldEmail;
  finalAdmin.password = 'Admin@123';
  await finalAdmin.save();

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
