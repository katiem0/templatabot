/**
 * TemplateBot - Server implementation
 *
 * This file provides middleware setup for the GitHub App
 */

require('dotenv').config();
const { createNodeMiddleware, createProbot } = require('probot');
const app = require('./src/app');

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Create a Probot instance with appropriate configuration
const probot = createProbot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  secret: isDevelopment ? undefined : process.env.WEBHOOK_SECRET,
});

// Load the app into the Probot instance
probot.load(app);

// Configure middleware options
const middlewareOptions = {
  probot,
  webhooksPath: '/api/github/webhooks'
};

// In development mode, disable signature verification
if (isDevelopment) {
  middlewareOptions.secret = false;
  console.log('Running in development mode - webhook signature verification disabled');
}

// Export the middleware
module.exports = {
  // Export the middleware for the HTTP server
  middleware: createNodeMiddleware(app, middlewareOptions),

  // Export Probot instance for testing
  probot
};
