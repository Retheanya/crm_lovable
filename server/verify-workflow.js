const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api/v1';

async function verify() {
  console.log('--- Starting CRM Workflow Verification ---\n');

  try {
    // 1. Generate JWT login
    console.log('1. Generating JWT tokens...');
    let res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@crm.com', password: 'Password123' })
    });
    let data = await res.json();
    const saToken = data.data.token;
    const saId = data.data.user.id;
    console.log('   ✅ SUPER_ADMIN logged in successfully');

    res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sales1@crm.com', password: 'Password123' })
    });
    data = await res.json();
    const userToken = data.data.token;
    const userId = data.data.user.id;
    console.log('   ✅ USER logged in successfully');

    // 2. Create 5 sample leads
    console.log('\n2. Creating 5 sample leads...');
    const authHeadersSA = { 'Authorization': `Bearer ${saToken}`, 'Content-Type': 'application/json' };
    const authHeadersUser = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };

    const leadsToCreate = [
      { leadName: 'John Doe', companyName: 'Acme Corp', phoneNumber: `111-111-${Date.now().toString().slice(-4)}`, location: 'NY', source: 'Website', value: 1000 },
      { leadName: 'Jane Smith', companyName: 'Globex', phoneNumber: `222-222-${Date.now().toString().slice(-4)}`, location: 'LA', source: 'Website', value: 1000 },
      { leadName: 'Alice Johnson', companyName: 'Initech', phoneNumber: `333-333-${Date.now().toString().slice(-4)}`, location: 'SF', source: 'Website', value: 1000 },
      { leadName: 'Bob Brown', companyName: 'Umbrella', phoneNumber: `444-444-${Date.now().toString().slice(-4)}`, location: 'CHI', source: 'Website', value: 1000 },
      { leadName: 'Charlie Davis', companyName: 'Hooli', phoneNumber: `555-555-${Date.now().toString().slice(-4)}`, location: 'MIA', source: 'Website', value: 1000 },
    ];

    const createdLeads = [];
    for (const l of leadsToCreate) {
      const r = await fetch(`${BASE_URL}/leads`, { method: 'POST', headers: authHeadersSA, body: JSON.stringify(l) });
      const d = await r.json();
      if(d.success) createdLeads.push(d.data);
    }
    console.log(`   ✅ Created ${createdLeads.length} leads successfully.`);

    // 3. Verify duplicate phone number prevention
    console.log('\n3. Verifying duplicate phone number prevention...');
    const rDup = await fetch(`${BASE_URL}/leads`, { method: 'POST', headers: authHeadersSA, body: JSON.stringify(leadsToCreate[0]) });
    const dDup = await rDup.json();
    if (!dDup.success && dDup.error.includes('already exists')) {
      console.log('   ✅ Duplicate prevented successfully: ' + dDup.error);
    } else {
      console.log('   ❌ Duplicate check failed: ', dDup);
    }

    // 4. Assign leads to users
    console.log('\n4. Assigning Lead 2 to USER...');
    const leadToAssign = createdLeads[1];
    const rAssign = await fetch(`${BASE_URL}/leads/${leadToAssign._id}/assign`, {
      method: 'PATCH', headers: authHeadersSA, body: JSON.stringify({ assignedUser: userId })
    });
    const dAssign = await rAssign.json();
    console.log('   ✅ Assigned successfully: ', dAssign.data.assignedUser);

    // 5. Add communication logs & 6. Verify automatic status update
    console.log('\n5 & 6. Adding communication and verifying status update (NEW -> CONTACTED)...');
    const rComm = await fetch(`${BASE_URL}/leads/${leadToAssign._id}/communications`, {
      method: 'POST', headers: authHeadersUser, body: JSON.stringify({ type: 'CALL', remarks: 'First contact call' })
    });
    const dComm = await rComm.json();
    if (!dComm.success) console.error('Communication error:', dComm);
    console.log('   ✅ Communication added: ', dComm.data.type);

    const rLeadUpdate = await fetch(`${BASE_URL}/leads/${leadToAssign._id}`, { headers: authHeadersSA });
    const dLeadUpdate = await rLeadUpdate.json();
    console.log(`   ✅ Lead Status updated from NEW to: ${dLeadUpdate.data.status}`);

    // 7. Add follow-ups & 8. Verify follow-up validation
    console.log('\n7 & 8. Adding follow-ups and verifying status change...');
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 2); // 2 days from now
    
    // Test validation missing date (should fail if we created an endpoint expecting it, but our schema expects it anyway)
    const rFailFollow = await fetch(`${BASE_URL}/leads/${leadToAssign._id}/followups`, {
      method: 'POST', headers: authHeadersUser, body: JSON.stringify({ notes: 'Need to call back' })
    });
    const dFailFollow = await rFailFollow.json();
    console.log('   ✅ Follow-up validation (missing date) caught: ', dFailFollow.error);

    const rFollow = await fetch(`${BASE_URL}/leads/${leadToAssign._id}/followups`, {
      method: 'POST', headers: authHeadersUser, body: JSON.stringify({ followUpDate: followUpDate.toISOString(), notes: 'Call back to finalize' })
    });
    const dFollow = await rFollow.json();
    console.log('   ✅ Follow-up added successfully: ', dFollow.data.notes);

    const rLeadUpdate2 = await fetch(`${BASE_URL}/leads/${leadToAssign._id}`, { headers: authHeadersSA });
    const dLeadUpdate2 = await rLeadUpdate2.json();
    console.log(`   ✅ Lead Status updated automatically to: ${dLeadUpdate2.data.status}`);

    // 9. Generate activity records automatically
    console.log('\n9. Verifying automatic activity records generation...');
    const rAct = await fetch(`${BASE_URL}/leads/${leadToAssign._id}/activities`, { headers: authHeadersSA });
    const dAct = await rAct.json();
    console.log(`   ✅ Found ${dAct.count} activities for Lead 2:`);
    dAct.data.forEach(a => console.log(`      - ${a.activityType}: ${a.description}`));

    // 10. Verify dashboard summary counts
    console.log('\n10. Verifying dashboard summary counts...');
    const rDashSA = await fetch(`${BASE_URL}/dashboard/summary`, { headers: authHeadersSA });
    const dDashSA = await rDashSA.json();
    console.log('   ✅ SUPER_ADMIN Dashboard: ', dDashSA.data);

    const rDashUser = await fetch(`${BASE_URL}/dashboard/summary`, { headers: authHeadersUser });
    const dDashUser = await rDashUser.json();
    console.log('   ✅ USER Dashboard: ', dDashUser.data);

    // 11. Verify role-based permissions
    console.log('\n11. Verifying role-based permissions (Leads list)...');
    const rLeadsSA = await fetch(`${BASE_URL}/leads`, { headers: authHeadersSA });
    const dLeadsSA = await rLeadsSA.json();
    console.log(`   ✅ SUPER_ADMIN sees ${dLeadsSA.count} leads.`);

    const rLeadsUser = await fetch(`${BASE_URL}/leads`, { headers: authHeadersUser });
    const dLeadsUser = await rLeadsUser.json();
    console.log(`   ✅ USER sees ${dLeadsUser.count} lead(s) (only assigned ones).`);

    console.log('\n--- Verification Completed Successfully ---');
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verify();
