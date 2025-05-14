/**
 * TemplataBot - Server implementation
 *
 * This file provides middleware setup for the GitHub App
 */

const { createNodeMiddleware, createProbot } = require('probot');
const app = require('./src/app');
const config = require('./config/config');

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Create a Probot instance with appropriate configuration
const probot = createProbot({
  appId: config.github.appId,
  privateKey: config.github.privateKey,
  secret: isDevelopment ? undefined : config.github.webhookSecret,
});

// Load the app into the Probot instance
probot.load(app);

// Configure middleware options
const middlewareOptions = {
  probot,
  webhooksPath: config.server.webhookPath
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
