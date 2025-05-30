#!/usr/bin/env node

// This script sets up a development environment for testing the app locally
// It uses smee-client to forward GitHub webhook payloads to localhost

require('dotenv').config();
const SmeeClient = require('smee-client');
const { exec } = require('child_process');

// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// Default to smee.io if no webhook proxy URL is specified
const webhookProxyUrl = process.env.WEBHOOK_PROXY_URL || 'https://smee.io/new';

// Set up a smee client to receive webhooks
const smee = new SmeeClient({
  source: webhookProxyUrl,
  target: `http://localhost:${process.env.PORT || 3000}/api/github/webhooks`,
  logger: console
});

console.log('Starting webhook forwarding from', webhookProxyUrl);
const events = smee.start();

// Start the app with nodemon for auto-reloading
console.log('Starting the app in development mode...');
const app = exec('NODE_ENV=development nodemon --inspect index.js');

// Forward stdout and stderr to console
app.stdout.on('data', console.log);
app.stderr.on('data', console.error);

// Handle cleanup on exit
process.on('exit', () => {
  console.log('Shutting down...');
  events.close();
  app.kill();
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  events.close();
  app.kill();
  process.exit(0);
});

console.log(`
TemplataBot Development Server
------------------------------
• App URL: http://localhost:${process.env.PORT || 3000}
• Webhook Forwarding URL: ${webhookProxyUrl}
• GitHub App Webhook URL: ${webhookProxyUrl}
• Webhook Signature Verification: DISABLED (development mode)

Use the Webhook Forwarding URL in your GitHub App settings.
Press Ctrl+C to exit.
`);
