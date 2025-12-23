#!/usr/bin/env node

/**
 * Script to call the populate-derived-metrics endpoint on Railway
 * Usage: node call-populate-derived-metrics.js
 */

const RAILWAY_URL = process.argv[2] || process.env.RAILWAY_URL || 'https://findgreatstocks-production.up.railway.app';
const ENDPOINT = `${RAILWAY_URL}/api/metrics/populate-derived-all`;

async function callEndpoint() {
  console.log('🚀 Calling populate derived metrics endpoint for ALL companies...');
  console.log(`📡 URL: ${ENDPOINT}\n`);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('\n📊 Derived metrics population started for ALL companies');
      console.log('💡 This will process:');
      console.log('   - sp500_companies');
      console.log('   - nasdaq100_companies');
      console.log('   - dow_jones_companies');
      console.log('   - ftse100_companies');
      console.log('\n💡 Check Railway logs for progress...');
      return true;
    } else {
      const text = await response.text();
      console.error(`❌ Server returned status ${response.status}`);
      console.error('Response:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ Error calling endpoint:', error.message);
    if (error.name === 'TimeoutError') {
      console.error('⏱️ Request timed out. Server might be starting up...');
    }
    return false;
  }
}

callEndpoint()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

