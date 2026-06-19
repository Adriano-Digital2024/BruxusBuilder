import { WORK_DIR } from '~/utils/constants';
import { createSandbox } from '~/lib/sandbox-service';

const DEFAULT_PROJECT_ID = 'bruxus-dev-project';

interface SandboxContext {
  loaded: boolean;
}

export const webcontainerContext: SandboxContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

interface SandboxProxy {
  workdir: string;
  sandboxId: string;
  projectId: string;
}

export let webcontainer: Promise<SandboxProxy> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    createSandbox(DEFAULT_PROJECT_ID).then((sandbox) => {
      webcontainerContext.loaded = true;

      window.addEventListener('beforeunload', () => {
        const body = new Blob(
          [JSON.stringify({ projectId: sandbox.projectId })],
          { type: 'application/json' },
        );
        navigator.sendBeacon(
          `${import.meta.env.VITE_BACKEND_URL || ''}/api/sandbox/destroy`,
          body,
        );
      });

      return {
        workdir: WORK_DIR,
        sandboxId: sandbox.sandboxId,
        projectId: sandbox.projectId,
      };
    });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
