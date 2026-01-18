require('dotenv').config();
const { startServer } = require('./app');

// Get port from environment
const PORT = process.env.PORT || 3001;

// Start server
startServer(PORT);
