/**
 * Application configuration
 *
 * Centralizes all configuration settings from environment variables
 * with sensible defaults.
 */

require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    webhookPath: '/api/github/webhooks'
  },

  // GitHub App configuration
  github: {
    appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY,
    webhookSecret: process.env.WEBHOOK_SECRET
  },

  // Template settings
  template: {
    branchPrefix: process.env.UPDATE_BRANCH_PREFIX || 'template-update-',
    propertyName: process.env.CUSTOM_PROPERTY_NAME || 'template-repo'
  }
};
