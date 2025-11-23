import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Helper to get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const buildPath = path.join(__dirname, 'dist');

// Serve static files from the dist directory
app.use(express.static(buildPath));

// Handle SPA routing: all other requests fall back to index.html
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  const apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:3001'; // Default to local API if not set

  // Read index.html content
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading application.');
    }

    // Replace a placeholder in index.html with the actual API URL
    const result = data.replace(
      '<!-- API_URL_PLACEHOLDER -->',
      `<script>window.VITE_API_URL = '${apiBaseUrl}';</script>`
    );

    res.send(result);
  });
});

app.listen(port, () => {
  console.log(`Web server listening on port ${port}`);
});
