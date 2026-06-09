import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getFunnel } from '~/utils/funnel-storage';

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) {
    return new Response('ID do funil não especificado', { status: 400 });
  }

  const funnel = await getFunnel(id);

  if (!funnel) {
    // Retorna uma página de 404 estilizada e profissional
    const notFoundHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Funil Não Encontrado - BruxusFunnels</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">
        <div class="text-center p-8 max-w-md bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
          <div class="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 class="text-2xl font-bold mb-2">Funil Não Encontrado</h1>
          <p class="text-gray-400 mb-6">O funil de vendas solicitado não existe, expirou ou ainda está sendo gerado.</p>
          <a href="/voice-funnel" class="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            Criar Meu Próprio Funil
          </a>
        </div>
      </body>
      </html>
    `;
    return new Response(notFoundHtml, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(funnel.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
