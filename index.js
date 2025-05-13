/**
 * TemplateBot - GitHub App entry point
 * 
 * This is the main entry point for the TemplateBot GitHub App
 */

require('dotenv').config();
const { Probot } = require('probot');
const app = require('./src/app');

// Create a Probot instance
const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  secret: process.env.WEBHOOK_SECRET,
});

// Load the app into the Probot instance
probot.load(app);

// Start the server
probot.start();