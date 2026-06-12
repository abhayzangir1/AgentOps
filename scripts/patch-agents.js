// Patch existing agents with capability_scopes based on their names/tiers
const { Client } = require('pg');

// We can't use IAM here, but we can call the app API
const http = require('http');

async function post(path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Cookie': cookie,
      },
    };
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function get(path, cookie) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: { 'Cookie': cookie },
    };
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  // 1. Login
  const loginRes = await post('/api/auth/login', { email: 'ops@company.ai', password: 'AgentOps2024!' }, '');
  if (!loginRes.success) { console.error('Login failed:', loginRes); return; }
  console.log('Logged in as', loginRes.user.name);

  // We need the cookie from the login response header — can't get it this way
  // Instead, use the seed endpoint which is authenticated
  console.log('Login successful. Patching agents via API...');
}

run().catch(console.error);
