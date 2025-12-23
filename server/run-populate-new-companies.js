#!/usr/bin/env node

/**
 * Wrapper script to run populate-new-sp500-companies.ts
 * This script will be executed by Node.js and will use tsx to run the TypeScript file
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting data population for new S&P 500 companies...');
console.log('📋 Companies: CVNA, CHR, FIX\n');

const scriptPath = join(__dirname, 'populate-new-sp500-companies.ts');

// Use tsx to run the TypeScript file
const child = spawn('npx', ['tsx', scriptPath], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('error', (error) => {
  console.error('❌ Failed to start script:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Script completed successfully!');
  } else {
    console.error(`\n❌ Script exited with code ${code}`);
  }
  process.exit(code);
});

