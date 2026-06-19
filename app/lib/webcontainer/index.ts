import { WORK_DIR } from '~/utils/constants';
import { createSandbox } from '~/lib/sandbox-service';

const DEFAULT_PROJECT_ID = 'bruxus-dev-project';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
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
