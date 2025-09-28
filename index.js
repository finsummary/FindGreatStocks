// Railway entry point - redirects to server
import { spawn } from 'child_process';
import path from 'path';

// Change to server directory
process.chdir('./server');

// Start the server using tsx
const server = spawn('npx', ['tsx', 'index.ts'], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});
