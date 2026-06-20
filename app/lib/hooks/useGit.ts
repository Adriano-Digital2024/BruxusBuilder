import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { webcontainer as sandboxProxyPromise } from '~/lib/sandbox';
import git, { type GitAuth, type PromiseFsClient } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import {
  writeFileToSandbox,
  readFileFromSandbox,
  deleteFileFromSandbox,
  readDirFromSandbox,
} from '~/lib/sandbox-service';
import { WORK_DIR } from '~/utils/constants';

const DEFAULT_PROJECT_ID = 'bruxus-dev-project';

const lookupSavedPassword = (url: string) => {
  const domain = url.split('/')[2];
  const gitCreds = Cookies.get(`git:${domain}`);

  if (!gitCreds) {
    return null;
  }

  try {
    const { username, password } = JSON.parse(gitCreds || '{}');
    return { username, password };
  } catch (error) {
    console.log(`Failed to parse Git Cookie ${error}`);
    return null;
  }
};

const saveGitAuth = (url: string, auth: GitAuth) => {
  const domain = url.split('/')[2];
  Cookies.set(`git:${domain}`, JSON.stringify(auth));
};

export function useGit() {
  const [ready, setReady] = useState(false);
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const [fs, setFs] = useState<PromiseFsClient>();
  const fileData = useRef<Record<string, { data: any; encoding?: string }>>({});
  useEffect(() => {
    sandboxProxyPromise.then((sandbox) => {
      fileData.current = {};
      setProjectId(sandbox.projectId);
      setFs(getFs(sandbox.projectId, fileData));
      setReady(true);
    });
  }, []);

  const gitClone = useCallback(
    async (url: string, retryCount = 0) => {
      if (!ready || !fs) {
        throw new Error('Sandbox not initialized. Please try again later.');
      }

      fileData.current = {};

      let branch: string | undefined;
      let baseUrl = url;

      if (url.includes('#')) {
        [baseUrl, branch] = url.split('#');
      }

      const headers: {
        [x: string]: string;
      } = {
        'User-Agent': 'bolt.diy',
      };

      const auth = lookupSavedPassword(url);

      if (auth) {
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
      }

      try {
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
          console.log(`Retrying git clone (attempt ${retryCount + 1})...`);
        }

        await git.clone({
          fs,
          http,
          dir: WORK_DIR,
          url: baseUrl,
          depth: 1,
          singleBranch: true,
          ref: branch,
          corsProxy: '/api/git-proxy',
          headers,
          onProgress: (event) => {
            console.log('Git clone progress:', event);
          },
          onAuth: (baseUrl) => {
            let auth = lookupSavedPassword(baseUrl);

            if (auth) {
              console.log('Using saved authentication for', baseUrl);
              return auth;
            }

            console.log('Repository requires authentication:', baseUrl);

            if (confirm('This repository requires authentication. Would you like to enter your GitHub credentials?')) {
              auth = {
                username: prompt('Enter username') || '',
                password: prompt('Enter password or personal access token') || '',
              };
              return auth;
            } else {
              return { cancel: true };
            }
          },
          onAuthFailure: (baseUrl, _auth) => {
            console.error(`Authentication failed for ${baseUrl}`);
            toast.error(
              `Authentication failed for ${baseUrl.split('/')[2]}. Please check your credentials and try again.`,
            );
            throw new Error(
              `Authentication failed for ${baseUrl.split('/')[2]}. Please check your credentials and try again.`,
            );
          },
          onAuthSuccess: (baseUrl, auth) => {
            console.log(`Authentication successful for ${baseUrl}`);
            saveGitAuth(baseUrl, auth);
          },
        });

        const data: Record<string, { data: any; encoding?: string }> = {};

        for (const [key, value] of Object.entries(fileData.current)) {
          data[key] = value;
        }

        return { workdir: WORK_DIR, data };
      } catch (error) {
        console.error('Git clone error:', error);

        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Authentication failed')) {
          toast.error(`Authentication failed. Please check your GitHub credentials and try again.`);
          throw error;
        } else if (
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ECONNREFUSED')
        ) {
          toast.error(`Network error while connecting to repository. Please check your internet connection.`);

          if (retryCount < 3) {
            return gitClone(url, retryCount + 1);
          }

          throw new Error(
            `Failed to connect to repository after multiple attempts. Please check your internet connection.`,
          );
        } else if (errorMessage.includes('404')) {
          toast.error(`Repository not found. Please check the URL and make sure the repository exists.`);
          throw new Error(`Repository not found. Please check the URL and make sure the repository exists.`);
        } else if (errorMessage.includes('401')) {
          toast.error(`Unauthorized access to repository. Please connect your GitHub account with proper permissions.`);
          throw new Error(
            `Unauthorized access to repository. Please connect your GitHub account with proper permissions.`,
          );
        } else {
          toast.error(`Failed to clone repository: ${errorMessage}`);
          throw error;
        }
      }
    },
    [fs, ready],
  );

  return { ready, gitClone };
}

const getFs = (
  projectId: string,
  record: MutableRefObject<Record<string, { data: any; encoding?: string }>>,
) => ({
  promises: {
    readFile: async (path: string, options: any) => {
      try {
        const result = await readFileFromSandbox(projectId, path);
        return result.content;
      } catch (error) {
        throw error;
      }
    },
    writeFile: async (path: string, data: any, _options: any = {}) => {
      if (record.current) {
        record.current[path] = { data };
      }

      try {
        const content = data instanceof Uint8Array ? Buffer.from(data).toString('base64') : String(data);
        await writeFileToSandbox(projectId, path, content);
      } catch (error) {
        throw error;
      }
    },
    mkdir: async (_path: string, _options: any) => {
      // Directories are created implicitly by the sandbox backend on file write
    },
    readdir: async (path: string, _options: any) => {
      try {
        const result = await readDirFromSandbox(projectId, path);
        return result.entries.map((entry: { name: string; isDirectory: boolean }) => ({
          name: entry.name,
          isDirectory: () => entry.isDirectory,
          isFile: () => !entry.isDirectory,
        }));
      } catch (error) {
        throw error;
      }
    },
    rm: async (path: string, _options: any) => {
      try {
        await deleteFileFromSandbox(projectId, path);
      } catch (error) {
        throw error;
      }
    },
    rmdir: async (path: string, _options: any) => {
      try {
        await deleteFileFromSandbox(projectId, path);
      } catch (error) {
        throw error;
      }
    },
    unlink: async (path: string) => {
      try {
        await deleteFileFromSandbox(projectId, path);
      } catch (error) {
        throw error;
      }
    },
    stat: async (path: string) => {
      try {
        const dirPath = pathUtils.dirname(path);
        const fileName = pathUtils.basename(path);

        if (path === '.git/index') {
          return {
            isFile: () => true,
            isDirectory: () => false,
            isSymbolicLink: () => false,
            size: 12,
            mode: 0o100644,
            mtimeMs: Date.now(),
            ctimeMs: Date.now(),
            birthtimeMs: Date.now(),
            atimeMs: Date.now(),
            uid: 1000,
            gid: 1000,
            dev: 1,
            ino: 1,
            nlink: 1,
            rdev: 0,
            blksize: 4096,
            blocks: 1,
            mtime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
            atime: new Date(),
          };
        }

        const resp = await readDirFromSandbox(projectId, dirPath);
        const fileInfo = resp.entries.find((x: { name: string; isDirectory: boolean }) => x.name === fileName);

        if (!fileInfo) {
          const err = new Error(`ENOENT: no such file or directory, stat '${path}'`) as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          err.errno = -2;
          err.syscall = 'stat';
          err.path = path;
          throw err;
        }

        return {
          isFile: () => !fileInfo.isDirectory,
          isDirectory: () => fileInfo.isDirectory,
          isSymbolicLink: () => false,
          size: fileInfo.isDirectory ? 4096 : 1,
          mode: fileInfo.isDirectory ? 0o040755 : 0o100644,
          mtimeMs: Date.now(),
          ctimeMs: Date.now(),
          birthtimeMs: Date.now(),
          atimeMs: Date.now(),
          uid: 1000,
          gid: 1000,
          dev: 1,
          ino: 1,
          nlink: 1,
          rdev: 0,
          blksize: 4096,
          blocks: 8,
          mtime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atime: new Date(),
        };
      } catch (error: any) {
        if (!error.code) {
          error.code = 'ENOENT';
          error.errno = -2;
          error.syscall = 'stat';
          error.path = path;
        }

        throw error;
      }
    },
    lstat: async (path: string) => {
      return await getFs(projectId, record).promises.stat(path);
    },
    readlink: async (path: string) => {
      throw new Error(`EINVAL: invalid argument, readlink '${path}'`);
    },
    symlink: async (target: string, path: string) => {
      throw new Error(`EPERM: operation not permitted, symlink '${target}' -> '${path}'`);
    },

    chmod: async (_path: string, _mode: number) => {
      return await Promise.resolve();
    },
  },
});

const pathUtils = {
  dirname: (path: string) => {
    if (!path || !path.includes('/')) {
      return '.';
    }

    path = path.replace(/\/+$/, '');
    return path.split('/').slice(0, -1).join('/') || '/';
  },

  basename: (path: string, ext?: string) => {
    path = path.replace(/\/+$/, '');
    const base = path.split('/').pop() || '';

    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }

    return base;
  },
};
