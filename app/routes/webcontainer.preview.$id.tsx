import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export async function loader({ params }: LoaderFunctionArgs) {
  const previewId = params.id;

  if (!previewId) {
    throw new Response('Preview ID is required', { status: 400 });
  }

  return json({ previewId });
}

export default function SandboxPreview() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-bolt-elements-background-depth-1">
      <div className="text-center text-bolt-elements-textSecondary">
        <p className="text-lg mb-2">Preview migrated to sandbox backend</p>
        <p className="text-sm">The preview is now available in the main workbench.</p>
      </div>
    </div>
  );
}
