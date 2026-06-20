import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { Daytona } from '@daytona/sdk';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4321',
    'https://bruxus-oficial.pages.dev',
    'https://bruxus.pages.dev',
    'https://bruxus.me',
    'https://builder.bruxus.me',
    'https://chatfunnels.bruxus.me',
  ],
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

const PROJECT_ID_LABEL = 'projectId';

// Concurrency lock to prevent multiple simultaneous sandbox creations for the same project
const sandboxCreationLocks = new Map();

async function getSandbox(projectId) {
  if (!daytona) return null;
  try {
    // Find sandbox by label instead of in-memory Map
    for await (const sandbox of daytona.list({ labels: { [PROJECT_ID_LABEL]: projectId }, states: ['started', 'starting', 'creating'] })) {
      if (sandbox.state !== 'destroyed') {
        return sandbox;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to list sandboxes:', err.message);
    return null;
  }
}

async function getOrCreateSandbox(projectId) {
  if (!daytona) return null;

  const pid = projectId || 'bruxus-dev-project';

  // If another request is already creating a sandbox for this project, wait for it
  if (sandboxCreationLocks.has(pid)) {
    console.log(`Waiting for existing sandbox creation for project ${pid}`);
    return sandboxCreationLocks.get(pid);
  }

  const creationPromise = (async () => {
    try {
      // Try to reuse an existing sandbox
      const existing = await getSandbox(pid);

      if (existing) {
        console.log(`Reusing existing sandbox ${existing.id} for project ${pid}`);
        return existing;
      }

      // Create a new sandbox on demand
      const sandbox = await daytona.create({
        language: 'typescript',
        autoStopInterval: 60,
        labels: { [PROJECT_ID_LABEL]: pid },
      });

      console.log(`Sandbox auto-created: ${sandbox.id} for project ${pid}`);
      return sandbox;
    } catch (error) {
      console.error('Failed to auto-create sandbox:', error);
      return null;
    } finally {
      // Always release the lock, even on failure
      sandboxCreationLocks.delete(pid);
    }
  })();

  sandboxCreationLocks.set(pid, creationPromise);

  return creationPromise;
}

// ── Sandbox routes ──────────────────────────────────────

function sanitizeOutput(output) {
  return output
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')   // strip ANSI escape sequences
    .replace(/\x1b\][0-9;]*[^\x07]*\x07/g, '') // strip OSC sequences
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

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
    // Check if a sandbox already exists for this project (via Daytona labels)
    const existing = await getSandbox(pid);
    if (existing) {
      console.log(`Reusing existing sandbox ${existing.id} for project ${pid}`);
      return res.json({
        sandboxId: existing.id,
        projectId: pid,
        status: existing.state || 'started',
        createdAt: existing.createdAt || new Date().toISOString(),
      });
    }

    const sandbox = await daytona.create({
      language: 'typescript',
      autoStopInterval: 60,
      labels: { [PROJECT_ID_LABEL]: pid },
    });
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
    const sandbox = await getOrCreateSandbox(projectId);
    if (!sandbox) return res.status(500).json({ success: false, error: 'Unable to get or create sandbox' });

    await sandbox.fs.uploadFile(Buffer.from(content || ' '), filePath);
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
    const sandbox = await getOrCreateSandbox(projectId);
    if (!sandbox) return res.status(500).json({ success: false, error: 'Unable to get or create sandbox' });

    const result = await sandbox.process.executeCommand(command);
    const output = sanitizeOutput(result.result || '');
    res.json({
      success: true,
      output,
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
    return res.json({ success: true });
  }

  try {
    const sandbox = await getSandbox(projectId);
    if (sandbox) {
      await daytona.delete(sandbox);
      console.log(`Sandbox deleted: ${sandbox.id}`);
    }
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
    const sandbox = await getOrCreateSandbox(projectId);
    if (!sandbox) return res.status(500).json({ success: false, error: 'Unable to get or create sandbox' });

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
    const sandbox = await getOrCreateSandbox(projectId);
    if (!sandbox) return res.status(500).json({ success: false, error: 'Unable to get or create sandbox' });

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
    const sandbox = await getOrCreateSandbox(projectId);
    if (!sandbox) return res.status(500).json({ content: '', error: 'Unable to get or create sandbox' });

    const buffer = await sandbox.fs.downloadFile(filePath);
    res.json({ content: buffer.toString('utf-8') });
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
    const sandbox = await getOrCreateSandbox(projectId);
    if (!sandbox) return res.status(500).json({ entries: [], error: 'Unable to get or create sandbox' });

    const files = await sandbox.fs.listFiles(dirPath);
    const entries = (files || []).map((f) => ({
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
    timestamp: new Date().toISOString(),
  });
});

// ── HTTP + WebSocket server ─────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const projectId = url.searchParams.get('projectId') || 'unknown';
  console.log(`WebSocket client connected for project ${projectId}`);

  ws.send('Conectado ao terminal do Bruxus Sandbox\n');

  ws.on('message', (data) => {
    console.log(`[terminal] input from ${projectId}:`, data.toString().substring(0, 100));
  });

  ws.on('close', () => {
    console.log(`WebSocket client disconnected for project ${projectId}`);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for project ${projectId}:`, err.message);
  });
});

server.listen(PORT, () => {
  console.log(`Bruxus Sandbox Backend running on port ${PORT}`);
  console.log(`Daytona SDK: ${daytona ? 'connected' : 'dummy mode (set DAYTONA_API_KEY)'}`);
  console.log(`WebSocket server attached`);
});
