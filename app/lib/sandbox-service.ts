export interface SandboxInfo {
  sandboxId: string;
  projectId: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  previewUrl?: string;
  createdAt: string;
}

export interface SandboxResult {
  success: boolean;
  output?: string;
  exitCode?: number;
  sandboxId?: string;
  previewUrl?: string;
  error?: string;
}

const API_BASE = '/api/sandbox';

async function sandboxFetch<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Sandbox API error ${response.status}: ${errorBody || response.statusText}`);
  }

  return response.json();
}

export async function createSandbox(projectId: string): Promise<SandboxInfo> {
  return sandboxFetch<SandboxInfo>('/create', { projectId });
}

export async function writeFileToSandbox(
  projectId: string,
  filePath: string,
  content: string,
): Promise<SandboxResult> {
  return sandboxFetch<SandboxResult>('/write', { projectId, path: filePath, content });
}

export async function executeCommandInSandbox(
  projectId: string,
  command: string,
): Promise<SandboxResult> {
  return sandboxFetch<SandboxResult>('/execute', { projectId, command });
}

export async function getSandboxPreviewUrl(projectId: string): Promise<{ previewUrl: string }> {
  return sandboxFetch<{ previewUrl: string }>(`/preview?projectId=${encodeURIComponent(projectId)}`);
}

export async function deleteFileFromSandbox(
  projectId: string,
  filePath: string,
): Promise<SandboxResult> {
  return sandboxFetch<SandboxResult>('/delete', { projectId, path: filePath });
}

export async function readFileFromSandbox(
  projectId: string,
  filePath: string,
): Promise<{ content: string }> {
  return sandboxFetch<{ content: string }>(`/read?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(filePath)}`);
}

export async function readDirFromSandbox(
  projectId: string,
  dirPath: string,
): Promise<{ entries: Array<{ name: string; isDirectory: boolean }> }> {
  return sandboxFetch<{ entries: Array<{ name: string; isDirectory: boolean }> }>(
    `/readdir?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(dirPath)}`,
  );
}

export async function destroySandbox(projectId: string): Promise<{ success: boolean }> {
  return sandboxFetch<{ success: boolean }>('/destroy', { projectId });
}
