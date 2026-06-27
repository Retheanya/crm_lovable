const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testApi() {
  const token = jwt.sign({ userId: '667500000000000000000000', email: 'admin@pulse.crm', role: 'SUPER_ADMIN' }, process.env.JWT_SECRET || 'pulse_crm_secret_key_12345', { expiresIn: '1h' });
  
  // Wait, I can just use the controller directly or a local token?
  // I will just print the result of leadService.getLeads
}
