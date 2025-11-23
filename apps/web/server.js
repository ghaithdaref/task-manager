import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

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
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Web server listening on port ${port}`);
});
