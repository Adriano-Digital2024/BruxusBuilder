import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Daytona } from '@daytona/sdk';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4321', '*'],
  credentials: true,
}));
app.use(express.json());

// ── Daytona client ─────────────────────────────────────

let daytona;

try {
  daytona = new Daytona();
  console.log('Daytona client initialized');
} catch (error) {
  console.warn('Daytona SDK not configured — running in dummy mode:', error.message);
  daytona = null;
}

// In-memory project→sandbox mapping (replace with DB in production)
const projects = new Map();

async function getSandbox(projectId) {
  const sandboxId = projects.get(projectId);
  if (!sandboxId) return null;
  if (!daytona) return null;
  try {
    return await daytona.get(sandboxId);
  } catch (err) {
    console.warn('Failed to get sandbox:', err.message);
    return null;
  }
}

// ── Sandbox routes ──────────────────────────────────────

app.post('/api/sandbox/create', async (req, res) => {
  const { projectId } = req.body || {};
  const pid = projectId || 'bruxus-dev-project';

  if (!daytona) {
    return res.json({
      sandboxId: 'dummy-sandbox-' + Date.now(),
      projectId: pid,
      status: 'running',
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const sandbox = await daytona.create({
      language: 'typescript',
      autoStopInterval: 60,
      labels: { projectId: pid },
    });
    projects.set(pid, sandbox.id);
    console.log(`Sandbox created: ${sandbox.id} for project ${pid}`);
    res.json({
      sandboxId: sandbox.id,
      projectId: pid,
      status: sandbox.state || 'started',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sandbox creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sandbox/write', async (req, res) => {
  const { projectId, path: filePath, content } = req.body || {};

  if (!daytona) {
    console.log('[DUMMY write]', { projectId, filePath, content: (content||'').substring(0, 50) });
    return res.json({ success: true });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (!sandbox) return res.status(404).json({ success: false, error: 'Sandbox not found' });

    await sandbox.fs.setFile(filePath, content || ' ');
    console.log(`File written: ${filePath} in sandbox ${sandbox.id}`);
    res.json({ success: true, sandboxId: sandbox.id });
  } catch (error) {
    console.error('File write failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sandbox/execute', async (req, res) => {
  const { projectId, command } = req.body || {};

  if (!daytona) {
    console.log('[DUMMY execute]', { projectId, command });
    return res.json({ success: true, output: 'Command executed (dummy)', exitCode: 0 });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (!sandbox) return res.status(404).json({ success: false, error: 'Sandbox not found' });

    const result = await sandbox.process.codeRun(command);
    res.json({
      success: true,
      output: result.result || '',
      exitCode: result.exitCode ?? 0,
    });
  } catch (error) {
    console.error('Command execution failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sandbox/destroy', async (req, res) => {
  const { projectId } = req.body || {};

  if (!daytona) {
    console.log('[DUMMY destroy]', projectId);
    projects.delete(projectId);
    return res.json({ success: true });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (sandbox) {
      await daytona.delete(sandbox);
      console.log(`Sandbox deleted: ${sandbox.id}`);
    }
    projects.delete(projectId);
    res.json({ success: true });
  } catch (error) {
    console.error('Sandbox destroy failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sandbox/delete', async (req, res) => {
  const { projectId, path: filePath } = req.body || {};

  if (!daytona) {
    console.log('[DUMMY delete]', { projectId, filePath });
    return res.json({ success: true });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (!sandbox) return res.status(404).json({ success: false, error: 'Sandbox not found' });

    await sandbox.fs.deleteFile(filePath);
    console.log(`File deleted: ${filePath} in sandbox ${sandbox.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('File delete failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sandbox/preview', async (req, res) => {
  const { projectId, port } = req.query;
  const previewPort = parseInt(port) || 3000;

  if (!daytona) {
    console.log('[DUMMY preview]', projectId);
    return res.json({ previewUrl: `http://localhost:${previewPort}/dummy-preview` });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (!sandbox) return res.status(404).json({ success: false, error: 'Sandbox not found' });

    const previewLink = await sandbox.getPreviewLink(previewPort);
    res.json({ previewUrl: previewLink.url });
  } catch (error) {
    console.error('Preview URL fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sandbox/read', async (req, res) => {
  const { projectId, path: filePath } = req.query;

  if (!daytona) {
    return res.json({ content: '' });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (!sandbox) return res.status(404).json({ content: '', error: 'Sandbox not found' });

    const content = await sandbox.fs.readFile(filePath);
    res.json({ content });
  } catch (error) {
    res.json({ content: '', error: error.message });
  }
});

app.get('/api/sandbox/readdir', async (req, res) => {
  const { projectId, path: dirPath = '/' } = req.query;

  if (!daytona) {
    return res.json({ entries: [] });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (!sandbox) return res.status(404).json({ entries: [], error: 'Sandbox not found' });

    const info = await sandbox.fs.listFiles(dirPath);
    const entries = (info.files || []).map((f) => ({
      name: f.name,
      isDirectory: f.isDir,
    }));
    res.json({ entries });
  } catch (error) {
    console.error('readdir failed:', error);
    res.json({ entries: [], error: error.message });
  }
});

// ── Health check ────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    daytonaConfigured: !!daytona,
    activeProjects: projects.size,
    timestamp: new Date().toISOString(),
  });
});

// ── Start ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Bruxus Sandbox Backend running on http://localhost:${PORT}`);
  console.log(`Daytona SDK: ${daytona ? 'connected' : 'dummy mode (set DAYTONA_API_KEY)'}`);
});
