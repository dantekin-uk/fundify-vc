#!/usr/bin/env node
/**
 * Smart development starter that checks for required configuration
 * and launches both frontend and API server
 */

import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';

dotenv.config();

const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const isWindows = process.platform === 'win32';

console.log('🚀 Fundify Development Environment Starter\n');
console.log('Configuration Check:');
console.log(`  ✓ OpenAI API Key: ${hasOpenAIKey ? '✅ Configured' : '⚠️  NOT configured'}`);

if (!hasOpenAIKey) {
  console.log('\n⚠️  Note: OpenAI API key not found.');
  console.log('   AI insights will fall back to generic suggestions.\n');
}

console.log('\n📝 Starting services...\n');

// Start Vite frontend
console.log('▶️  Starting Vite frontend (port 3000)...');
const viteName = isWindows ? 'npm.cmd' : 'npm';
const viteProcess = spawn(viteName, ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// Give Vite a moment to start
setTimeout(() => {
  // Start API server
  if (hasOpenAIKey) {
    console.log('\n▶️  Starting API server (port 3001)...');
    const apiName = isWindows ? 'node.cmd' : 'node';
    const apiProcess = spawn('node', ['api-dev-server.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    apiProcess.on('error', (err) => {
      console.error('❌ API server error:', err);
    });
  } else {
    console.log('\n⏭️  Skipping API server (OpenAI key not configured)');
    console.log('   Run "npm run api:dev" separately if you add the key later\n');
  }
}, 3000);

viteProcess.on('error', (err) => {
  console.error('❌ Vite error:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down development servers...');
  viteProcess.kill();
  process.exit(0);
});
