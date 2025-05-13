/**
 * TemplateBot - GitHub App entry point
 *
 * This is the main entry point for the TemplateBot GitHub App
 */

const { middleware } = require('./server');

// Start the server
const port = process.env.PORT || 3000;

require('http').createServer(middleware).listen(port, () => {
  const mode = process.env.NODE_ENV || 'production';
  console.log(`TemplateBot server running in ${mode} mode on port ${port}`);
});
