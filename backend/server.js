import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4321', '*'],
  credentials: true,
}));
app.use(express.json());

// ── Sandbox routes ──────────────────────────────────────

app.post('/api/sandbox/create', (req, res) => {
  console.log('[POST] /api/sandbox/create', req.body);
  res.json({
    sandboxId: 'sandbox-placeholder-id',
    projectId: req.body.projectId || 'bruxus-dev-project',
    status: 'running',
    createdAt: new Date().toISOString(),
  });
});

app.post('/api/sandbox/write', (req, res) => {
  console.log('[POST] /api/sandbox/write', req.body);
  res.json({
    success: true,
    sandboxId: req.body.sandboxId,
  });
});

app.post('/api/sandbox/execute', (req, res) => {
  console.log('[POST] /api/sandbox/execute', req.body);
  res.json({
    success: true,
    output: 'Command executed successfully (dummy response)',
    exitCode: 0,
  });
});

app.post('/api/sandbox/destroy', (req, res) => {
  console.log('[POST] /api/sandbox/destroy', req.body);
  res.json({ success: true });
});

app.post('/api/sandbox/delete', (req, res) => {
  console.log('[POST] /api/sandbox/delete', req.body);
  res.json({ success: true });
});

app.get('/api/sandbox/preview', (req, res) => {
  console.log('[GET] /api/sandbox/preview', req.query);
  res.json({
    previewUrl: 'http://localhost:3000/preview-placeholder',
  });
});

app.get('/api/sandbox/read', (req, res) => {
  console.log('[GET] /api/sandbox/read', req.query);
  res.json({ content: '' });
});

app.get('/api/sandbox/readdir', (req, res) => {
  console.log('[GET] /api/sandbox/readdir', req.query);
  res.json({ entries: [] });
});

// ── Health check ────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Bruxus Sandbox Backend running on http://localhost:${PORT}`);
});
