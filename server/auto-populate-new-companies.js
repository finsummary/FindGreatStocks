#!/usr/bin/env node

/**
 * Automated script to populate data for new S&P 500 companies
 * This script will wait for the server to be ready, then call the API endpoint
 */

import { setTimeout } from 'timers/promises';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5002';
const ENDPOINT = `${SERVER_URL}/api/sp500/populate-new-companies-auto`;
const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds

async function checkServer() {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function callEndpoint() {
  try {
    console.log(`📡 Calling endpoint: ${ENDPOINT}`);
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', data);
      return true;
    } else {
      const text = await response.text();
      console.error(`❌ Server returned status ${response.status}:`, text);
      return false;
    }
  } catch (error) {
    console.error('❌ Error calling endpoint:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting automated data population for new S&P 500 companies');
  console.log('📋 Companies: CVNA, CHR, FIX\n');
  console.log(`🔍 Checking if server is ready at ${SERVER_URL}...\n`);

  // Wait for server to be ready
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (await checkServer()) {
      console.log('✅ Server is ready!\n');
      break;
    }
    
    if (i < MAX_RETRIES - 1) {
      console.log(`⏳ Waiting for server... (${i + 1}/${MAX_RETRIES})`);
      await setTimeout(RETRY_DELAY);
    } else {
      console.error('❌ Server did not become ready in time');
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm run dev');
      process.exit(1);
    }
  }

  // Call the endpoint
  console.log('📞 Calling population endpoint...\n');
  const success = await callEndpoint();
  
  if (success) {
    console.log('\n✅ Data population started successfully!');
    console.log('📊 Check server logs for progress...');
  } else {
    console.log('\n❌ Failed to start data population');
    process.exit(1);
  }
}

main().catch(console.error);

