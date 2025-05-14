/**
 * TemplataBot - GitHub App entry point
 *
 * This is the main entry point for the TemplataBot GitHub App
 */

const { middleware } = require('./server');
const config = require('./config/config');

// Start the server
const port = config.server.port;

require('http').createServer(middleware).listen(port, () => {
  const mode = process.env.NODE_ENV || 'production';
  console.log(`TemplataBot server running in ${mode} mode on port ${port}`);
});
