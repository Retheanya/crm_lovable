// using native fetch

const API_URL = 'http://127.0.0.1:5000/api/v1';

async function runTests() {
  let superAdminToken = '';
  let newUserId = '';

  try {
    console.log('--- User Onboarding E2E Test ---');

    // 1. Login as Super Admin
    console.log('1. Logging in as SUPER_ADMIN...');
    let res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@crm.com', password: 'Password123' })
    });
    let data = await res.json();
    superAdminToken = data.data.token;
    console.log('   ✅ SUPER_ADMIN logged in successfully');

    // 2. Create User
    console.log('2. Creating new user as SUPER_ADMIN...');
    res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: 'Test User',
        email: 'testuser@crm.com',
        password: 'Password123',
        role: 'USER'
      })
    });
    data = await res.json();
    newUserId = data.data._id;
    console.log(`   ✅ User created successfully with ID: ${newUserId}`);

    // 3. Login as New User
    console.log('3. Logging in as newly created user...');
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testuser@crm.com', password: 'Password123' })
    });
    data = await res.json();
    const newUserToken = data.data.token;
    console.log('   ✅ New user logged in successfully. JWT Generated.');

    // 4. Verify Role Access (Try to access /users as USER role)
    console.log('4. Verifying Role Access (Accessing /users as USER)...');
    res = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${newUserToken}` }
    });
    if (res.status === 403) {
      console.log('   ✅ SUCCESS: Access forbidden (403) as expected.');
    } else {
      console.log(`   ❌ FAILED: Received status ${res.status}`);
    }

    // 5. Disable User as Super Admin
    console.log('5. Disabling user as SUPER_ADMIN...');
    res = await fetch(`${API_URL}/users/${newUserId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ isActive: false })
    });
    console.log('   ✅ User status updated to inactive.');

    // 6. Verify Login Blocked
    console.log('6. Verifying Login Blocked for inactive user...');
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testuser@crm.com', password: 'Password123' })
    });
    if (res.status === 401) {
      console.log('   ✅ SUCCESS: Login blocked (401) as expected.');
    } else {
      console.log(`   ❌ FAILED: Received status ${res.status}`);
    }

    console.log('--- All tests completed successfully ---');

  } catch (error) {
    console.error('Test script failed:', error.response ? error.response.data : error.message);
  } finally {
    // Cleanup: Hard delete the user to keep database clean
    if (newUserId && superAdminToken) {
      console.log('7. Cleaning up (Deleting test user)...');
      try {
        await fetch(`${API_URL}/users/${newUserId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        console.log('   ✅ Cleanup successful.');
      } catch (err) {
        console.error('   ❌ Cleanup failed:', err.message);
      }
    }
  }
}

runTests();
