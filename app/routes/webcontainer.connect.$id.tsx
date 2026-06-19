import { type LoaderFunction } from '@remix-run/cloudflare';

export const loader: LoaderFunction = async ({ request }) => {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bruxus Builder</title>
      </head>
      <body>
        <p>Sandbox connect is no longer used. The sandbox is managed remotely.</p>
      </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } },
  );
};
