#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const fmpApiKey = process.env.FMP_API_KEY;

if (!fmpApiKey) {
  console.error('❌ FMP_API_KEY must be set');
  process.exit(1);
}

async function testFMP() {
  const testSymbol = 'AAPL';
  // Test the endpoint that we know works from routes.js
  const endpoints = [
    `/stable/batch-quote?symbols=${testSymbol}`,  // This one works in routes.js
    `/stable/profile?symbol=${testSymbol}`,
    `/stable/shares-float?symbol=${testSymbol}`,
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing FMP API endpoint: ${endpoint}...`);
    
    try {
      // Fix URL - use &apikey= if endpoint already has query params, otherwise ?apikey=
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `https://financialmodelingprep.com${endpoint}${separator}apikey=${fmpApiKey}`;
      console.log(`   URL: ${url.replace(fmpApiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(url);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   Error: ${errorText.substring(0, 200)}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`   ✅ Success! Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        console.log(`   Keys: ${Object.keys(first).slice(0, 15).join(', ')}...`);
        
        // Check for shares outstanding in various possible fields
        const sharesFields = [
          'sharesOutstandingTTM', 'sharesOutstanding', 'numberOfShares', 'weightedAverageShsOut',
          'outstandingShares', 'floatShares', 'freeFloat', 'sharesFloat'
        ];
        for (const field of sharesFields) {
          if (first[field] !== undefined && first[field] !== null) {
            console.log(`   ✅ Found ${field}: ${first[field]}`);
          }
        }
        
        // Also check nested objects
        if (first.sharesFloat) {
          console.log(`   ✅ sharesFloat object:`, JSON.stringify(first.sharesFloat, null, 2).substring(0, 200));
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log(`   Keys: ${Object.keys(data).slice(0, 15).join(', ')}...`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error:`, error?.message || error);
    }
  }
}

testFMP().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
