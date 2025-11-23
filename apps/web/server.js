const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const buildPath = path.join(__dirname, 'dist');

// Serve static files from the dist directory
app.use(express.static(buildPath));

// Handle SPA routing: all other requests fall back to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Web server listening on port ${port}`);
});
