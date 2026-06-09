import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('funnel-storage');

// Global in-memory fallback
const inMemoryStore = new Map<string, { html: string; info: any }>();

// Simple file-based storage helper for Node/Docker environment
const STORAGE_DIR = './data/funnels';

async function getFs() {
  if (typeof window !== 'undefined') {
    return null;
  }
  try {
    const fs = await import('node:fs/promises');
    return fs;
  } catch {
    return null;
  }
}

async function getPath() {
  if (typeof window !== 'undefined') {
    return null;
  }
  try {
    const path = await import('node:path');
    return path;
  } catch {
    return null;
  }
}

export async function saveFunnel(id: string, html: string, info: any) {
  inMemoryStore.set(id, { html, info });
  
  const fs = await getFs();
  const path = await getPath();
  
  if (fs && path) {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      await fs.writeFile(path.join(STORAGE_DIR, `${id}.json`), JSON.stringify({ html, info }, null, 2), 'utf8');
      logger.info(`Funnel ${id} saved to disk`);
    } catch (err) {
      logger.warn(`Failed to save funnel ${id} to disk, using in-memory only:`, err);
    }
  }
}

export async function getFunnel(id: string): Promise<{ html: string; info: any } | null> {
  if (inMemoryStore.has(id)) {
    return inMemoryStore.get(id) || null;
  }
  
  const fs = await getFs();
  const path = await getPath();
  
  if (fs && path) {
    try {
      const filePath = path.join(STORAGE_DIR, `${id}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      // Cache in memory for faster subsequent access
      inMemoryStore.set(id, data);
      return data;
    } catch (err) {
      logger.debug(`Funnel ${id} not found on disk or failed to read: ${err}`);
    }
  }
  
  return null;
}
