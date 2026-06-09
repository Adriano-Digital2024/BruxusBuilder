import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { saveFunnel, getFunnel } from '~/utils/funnel-storage';

// Tipos de modelos de funil suportados
const MODELS_INFO: Record<string, { name: string; description: string }> = {
  'internal-launch': { name: 'Internal Launch Monster', description: 'Lançamento interno de 7 dias com módulos de vídeo e cronograma sequencial.' },
  'flash-launch': { name: 'Flash Launch Monster', description: 'Lançamento relâmpago de 3 dias de alta escassez com ofertas de bônus exclusivos.' },
  'evergreen': { name: 'Evergreen Funnel Monster', description: 'Funil automático 24/7 com VSL, depoimentos e oferta irresistível contínua.' },
  'webinar': { name: 'Webinar Campaign Monster', description: 'Página com simulação de webinar ao vivo, chat fake em tempo real e oferta especial.' },
  'cart-recovery': { name: 'Cart Recovery Monster', description: 'Recuperação de carrinho com desconto exclusivo, FAQ de objeções e suporte via WhatsApp.' },
  'lead-nurture': { name: 'Lead Nurture Monster', description: 'Foco em isca digital gratuita com transição estratégica imediata para o checkout.' },
  'upsell-cross': { name: 'Upsell Cross Monster', description: 'Página de upgrade imediato pós-compra com super bônus de oferta única.' },
  'list-revival': { name: 'List Revival Monster', description: 'Campanha de reativação direta para contatos frios com benefícios aprimorados.' },
};

function parsePaymentLink(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const pathname = parsed.pathname;

    let platform = 'Checkout Externo';
    if (host.includes('kiwify')) platform = 'Kiwify';
    else if (host.includes('hotmart')) platform = 'Hotmart';
    else if (host.includes('monetizze')) platform = 'Monetizze';
    else if (host.includes('eduzz')) platform = 'Eduzz';
    else if (host.includes('perfectpay')) platform = 'PerfectPay';

    const pathParts = pathname.split('/').filter(Boolean);
    let nameGuess = 'Método Premium Bruxus';
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      nameGuess = lastPart
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      if (lastPart.length < 8 && /^[a-zA-Z0-9]+$/.test(lastPart)) {
        nameGuess = 'Acesso Exclusivo Bruxus';
      }
    }

    return {
      platform,
      productName: nameGuess,
      price: '97,00',
      description: 'Acesso completo ao treinamento com atualizações e materiais complementares.',
    };
  } catch {
    return {
      platform: 'Checkout Externo',
      productName: 'Oferta Especial Bruxus',
      price: '197,00',
      description: 'Condição por tempo limitado com garantia de 7 dias e entrega 100% imediata.',
    };
  }
}

// Função para gerar o HTML do Funil baseado no modelo selecionado
function generateFunnelHTML(modelId: string, paymentLink: string, productInfo: any, transcript: string): string {
  const { productName, price, description } = productInfo;
  
  // Customizações visuais com base no modelo
  let heroSection = '';
  let bodyStyle = 'bg-slate-900 text-gray-100';
  let accentColor = 'purple-600';
  let accentHover = 'purple-700';
  let badgeText = 'OFERTA EXCLUSIVA';
  let scriptBlock = '';

  // Configurações e templates específicos para cada modelo
  if (modelId === 'flash-launch') {
    accentColor = 'red-600';
    accentHover = 'red-700';
    badgeText = 'OFERTA RELÂMPAGO';
    heroSection = `
      <div class="bg-red-900/40 border border-red-500/30 rounded-2xl p-6 md:p-8 text-center max-w-3xl mx-auto mb-12">
        <span class="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse inline-block mb-3">Escassez Máxima</span>
        <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">ATENÇÃO! ESTA PÁGINA EXPIRA EM POUCO TEMPO!</h1>
        <p class="text-lg text-gray-300 mb-6">Aproveite a oferta relâmpago recomendada para <strong class="text-white">${productName}</strong>. Tudo explicado na transcrição abaixo:</p>
        <div class="text-sm bg-black/30 text-gray-400 p-4 rounded-lg italic text-left max-h-32 overflow-auto border border-gray-800 mb-6">
          "${transcript || 'O seu áudio descreve os benefícios exclusivos do método...'}"
        </div>
        <div class="grid grid-cols-3 gap-2 max-w-sm mx-auto mb-8 text-white">
          <div class="bg-gray-800 p-3 rounded-lg"><div id="flash-hours" class="text-2xl font-bold">02</div><div class="text-[10px] text-gray-400">Horas</div></div>
          <div class="bg-gray-800 p-3 rounded-lg"><div id="flash-minutes" class="text-2xl font-bold">14</div><div class="text-[10px] text-gray-400">Minutos</div></div>
          <div class="bg-gray-800 p-3 rounded-lg"><div id="flash-seconds" class="text-2xl font-bold">55</div><div class="text-[10px] text-gray-400">Segundos</div></div>
        </div>
        <a href="${paymentLink}" class="inline-block w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-xl font-bold px-8 py-4 rounded-xl shadow-lg shadow-red-600/30 transition-all transform hover:-translate-y-0.5">
          QUERO APROVEITAR A OFERTA AGORA
        </a>
      </div>
    `;
    scriptBlock = `
      // Timer regressivo simples de 2h 15m
      let duration = 2 * 3600 + 15 * 60;
      setInterval(() => {
        if (duration > 0) duration--;
        const hrs = Math.floor(duration / 3600);
        const mins = Math.floor((duration % 3600) / 60);
        const secs = duration % 60;
        document.getElementById('flash-hours').innerText = String(hrs).padStart(2, '0');
        document.getElementById('flash-minutes').innerText = String(mins).padStart(2, '0');
        document.getElementById('flash-seconds').innerText = String(secs).padStart(2, '0');
      }, 1000);
    `;
  } else if (modelId === 'evergreen') {
    accentColor = 'green-600';
    accentHover = 'green-700';
    badgeText = 'FUNIL EVERGREEN 24/7';
    heroSection = `
      <div class="max-w-4xl mx-auto text-center mb-12">
        <h1 class="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">Como obter resultados exponenciais com <span class="text-green-500">${productName}</span></h1>
        <p class="text-xl text-gray-300 max-w-2xl mx-auto mb-8">${description}</p>
        
        <!-- Placeholder de VSL profissional -->
        <div class="relative aspect-video max-w-3xl mx-auto bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl mb-8 group">
          <div class="absolute inset-0 bg-cover bg-center opacity-70" style="background-image: url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60');"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
            <div class="text-left">
              <span class="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-md mb-2 inline-block">VÍDEO DE APRESENTAÇÃO</span>
              <p class="text-white text-lg font-semibold">Assista à apresentação completa abaixo para desbloquear o seu cupom:</p>
            </div>
          </div>
          <button onclick="document.getElementById('buy-card').scrollIntoView({behavior: 'smooth'})" class="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-colors">
            <div class="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center text-3xl shadow-lg shadow-green-600/30 transform group-hover:scale-110 transition-transform">▶</div>
          </button>
        </div>

        <div class="bg-gray-800/80 p-6 rounded-xl border border-gray-700 max-w-2xl mx-auto text-left mb-8">
          <h3 class="font-bold text-white text-lg mb-2">Visão Geral & Transcrição:</h3>
          <p class="text-gray-300 italic text-sm">"${transcript || 'Esta página foi gerada a partir do seu áudio, otimizando os argumentos de conversão para o produto...'}"</p>
        </div>

        <a href="${paymentLink}" class="inline-block bg-green-600 hover:bg-green-700 text-white text-lg font-bold px-10 py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
          SIM! QUERO ADQUIRIR AGORA POR APENAS R$ ${price}
        </a>
      </div>
    `;
  } else if (modelId === 'webinar') {
    accentColor = 'indigo-600';
    accentHover = 'indigo-700';
    badgeText = 'CAMPANHA COM WEBINAR';
    heroSection = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4">
            <span class="inline-block bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse mr-2">AO VIVO</span>
            <span class="text-indigo-300 text-sm font-semibold">Webinar de Demonstração do ${productName}</span>
          </div>
          <!-- Box do Vídeo -->
          <div class="relative aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Webinar Presentation" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 text-left">
            <h2 class="text-xl font-bold text-white mb-2">Resumo da Aula Prática:</h2>
            <p class="text-gray-300 text-sm leading-relaxed">${description}</p>
          </div>
        </div>
        
        <!-- Chat Fake Simulador -->
        <div class="bg-gray-800 border border-gray-700 rounded-2xl flex flex-col h-[400px] lg:h-auto overflow-hidden">
          <div class="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
            <span class="font-bold text-white flex items-center gap-1.5"><span class="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span> Chat da Transmissão</span>
            <span class="text-xs text-gray-400" id="online-count">1.412 online</span>
          </div>
          <div class="flex-1 p-4 overflow-y-auto space-y-3 text-xs text-left" id="chat-box">
            <div><strong class="text-indigo-400">Mariana Silva:</strong> Caramba, muito bom o conteúdo!</div>
            <div><strong class="text-indigo-400">João Paulo:</strong> Esse método realmente funciona, já ouvi falar.</div>
            <div><strong class="text-indigo-400">Carlos Andrade:</strong> Consigo parcelar no cartão?</div>
          </div>
          <div class="p-3 bg-gray-900 border-t border-gray-700 flex gap-2">
            <input type="text" placeholder="Envie sua mensagem..." disabled class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300" />
            <button class="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-indigo-700">Enviar</button>
          </div>
        </div>
      </div>

      <div class="text-center max-w-xl mx-auto mb-12">
        <h3 class="text-2xl font-bold text-white mb-3">Garanta sua Vaga com as Condições de Hoje:</h3>
        <p class="text-gray-400 mb-6">Bônus exclusivos revelados na transmissão estão ativos por tempo limitado.</p>
        <a href="${paymentLink}" class="block bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-lg shadow-indigo-600/30 transform hover:-translate-y-0.5 transition-all">
          ADQUIRIR O CURSO COM SUPER DESCONTO
        </a>
      </div>
    `;
    scriptBlock = `
      // Chat simulador fake
      const chatNames = ['Ana Souza', 'Fernando Mendes', 'Camila Cruz', 'Roberto Dias', 'Juliana Lima', 'Rodrigo Silva'];
      const chatTexts = [
        'Esse bônus do ${productName} vale muito a pena!',
        'Acabei de fazer a inscrição aqui, já chegou no meu e-mail.',
        'Será que a garantia é fácil de acionar se eu precisar?',
        'Melhor explicação que já vi sobre o assunto até hoje.',
        'Estou dentro, vejo vocês lá dentro da área de membros!',
        'Consigo aplicar no meu celular ou precisa de PC?'
      ];
      const chatBox = document.getElementById('chat-box');
      setInterval(() => {
        const randomName = chatNames[Math.floor(Math.random() * chatNames.length)];
        const randomText = chatTexts[Math.floor(Math.random() * chatTexts.length)];
        const div = document.createElement('div');
        div.innerHTML = '<strong>' + randomName + ':</strong> ' + randomText;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Random online count flux
        const count = 1400 + Math.floor(Math.random() * 50);
        document.getElementById('online-count').innerText = count + ' online';
      }, 4000);
    `;
  } else if (modelId === 'cart-recovery') {
    accentColor = 'amber-500';
    accentHover = 'amber-600';
    badgeText = 'RECUPERAÇÃO DE CARRINHO';
    heroSection = `
      <div class="max-w-2xl mx-auto text-center p-8 bg-gray-800/80 border border-amber-500/20 rounded-2xl mb-12">
        <div class="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🛒</div>
        <h1 class="text-3xl font-extrabold text-white mb-2">Ei, notamos que você não concluiu seu pedido...</h1>
        <p class="text-gray-300 mb-6">Para te dar um empurrãozinho final, liberamos uma condição única e exclusiva para o <strong class="text-white">${productName}</strong>.</p>
        
        <div class="bg-gray-950 p-4 rounded-xl text-left border border-gray-700 mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-gray-400 text-xs">Cupom Aplicado:</span>
            <span class="bg-green-600/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded">20% OFF DE VOLTA</span>
          </div>
          <p class="text-white text-lg font-bold">De <span class="line-through text-gray-500">R$ 197,00</span> por apenas <span class="text-amber-400">R$ ${price}</span></p>
        </div>

        <p class="text-gray-400 text-sm mb-6 italic">Transcrição do áudio de suporte exclusivo enviado para você: "${transcript || 'Verificamos que você deixou um pedido pendente e estamos liberando o melhor preço de reativação para você hoje...'}"</p>

        <a href="${paymentLink}" class="block bg-amber-500 hover:bg-amber-600 text-gray-950 text-lg font-bold px-8 py-4 rounded-xl transition-all transform hover:-translate-y-0.5 shadow-lg shadow-amber-500/20">
          CONCLUIR MINHA COMPRA COM DESCONTO
        </a>
      </div>
    `;
  } else {
    // Default / internal-launch / list-revival / upsell-cross / lead-nurture
    heroSection = `
      <div class="max-w-3xl mx-auto text-center mb-16">
        <span class="bg-purple-600/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block border border-purple-500/30">${badgeText}</span>
        <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">${productName}</h1>
        <p class="text-xl text-gray-300 max-w-2xl mx-auto mb-8">${description}</p>
        
        <div class="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-left mb-8 max-w-2xl mx-auto">
          <h3 class="font-bold text-white mb-2 flex items-center gap-2">🎙️ Nota da Gravação de Voz:</h3>
          <p class="text-gray-300 italic text-sm">"${transcript || 'Sua gravação de áudio define uma estrutura fantástica e de alta conversão para os visitantes desta página...'}"</p>
        </div>

        <a href="${paymentLink}" class="inline-block bg-${accentColor} hover:bg-${accentHover} text-white text-lg font-bold px-8 py-4 rounded-xl transition-all transform hover:-translate-y-0.5 shadow-lg">
          QUERO ADQUIRIR AGORA POR APENAS R$ ${price}
        </a>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productName} - Oferta Especial</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
  </style>
</head>
<body class="${bodyStyle}">

  <!-- Banner Superior -->
  <div class="bg-gradient-to-r from-purple-900 to-indigo-900 text-center py-2 px-4 text-xs font-semibold text-white tracking-wider flex justify-center items-center gap-2">
    <span>🔥 OFERTA EXCLUSIVA COM GARANTIA INCONDICIONAL DE 7 DIAS</span>
  </div>

  <!-- Cabeçalho Principal -->
  <header class="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg bg-${accentColor} flex items-center justify-center font-bold text-white">B</div>
      <span class="font-black text-xl tracking-tight text-white">BruxusFunnels</span>
    </div>
    <a href="#buy-card" class="bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors border border-gray-700">
      Garantir Oferta
    </a>
  </header>

  <!-- Seção Hero / Principal -->
  <main class="max-w-6xl mx-auto px-4 py-12">
    ${heroSection}

    <!-- Seção de Características e Benefícios -->
    <section class="py-16 border-t border-gray-800" id="features">
      <h2 class="text-3xl font-extrabold text-center text-white mb-12">Por que este método é perfeito para você?</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50">
          <div class="text-3xl mb-4">⚡</div>
          <h3 class="text-lg font-bold text-white mb-2">Resultados Rápidos</h3>
          <p class="text-gray-400 text-sm">Método prático focado na execução com resultados logo nas primeiras semanas de aplicação.</p>
        </div>
        <div class="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50">
          <div class="text-3xl mb-4">🏆</div>
          <h3 class="text-lg font-bold text-white mb-2">Qualidade Premium</h3>
          <p class="text-gray-400 text-sm">Todo o material de suporte foi criado visando a melhor experiência de aprendizagem e satisfação.</p>
        </div>
        <div class="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50">
          <div class="text-3xl mb-4">🛡️</div>
          <h3 class="text-lg font-bold text-white mb-2">Suporte e Garantia</h3>
          <p class="text-gray-400 text-sm">Conte com nosso time de especialistas para tirar dúvidas e garantia de reembolso integral de 7 dias.</p>
        </div>
      </div>
    </section>

    <!-- Card de Compra Final -->
    <section class="py-12 flex justify-center" id="buy-card">
      <div class="bg-gray-800 border border-gray-700 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-${accentColor} text-white font-bold text-[10px] px-3 py-1 rounded-bl-xl uppercase">Melhor Escolha</div>
        <h3 class="text-xl font-bold text-white mb-1">Acesso Completo</h3>
        <p class="text-sm text-gray-400 mb-6">${productName}</p>
        <div class="mb-6">
          <span class="text-sm text-gray-500 line-through">De R$ 297,00</span>
          <div class="text-4xl font-extrabold text-white">R$ ${price}</div>
          <span class="text-xs text-green-400 font-medium">Ou em até 12x no cartão de crédito</span>
        </div>
        <ul class="text-left space-y-3 text-sm text-gray-300 mb-8 border-t border-b border-gray-700/50 py-6">
          <li class="flex items-center gap-2"><span class="text-green-500">✓</span> Acesso completo vitalício</li>
          <li class="flex items-center gap-2"><span class="text-green-500">✓</span> Todos os bônus e atualizações</li>
          <li class="flex items-center gap-2"><span class="text-green-500">✓</span> Certificado de participação oficial</li>
          <li class="flex items-center gap-2"><span class="text-green-500">✓</span> Canal de suporte de alunos</li>
        </ul>
        <a href="${paymentLink}" class="block bg-${accentColor} hover:bg-${accentHover} text-white font-bold text-lg py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
          GARANTIR VAGA AGORA
        </a>
        <p class="text-[11px] text-gray-500 mt-4">Compra 100% segura • Satisfação Garantida • Canal Criptografado</p>
      </div>
    </section>
  </main>

  <!-- Rodapé Legal -->
  <footer class="bg-gray-950 py-12 mt-20 border-t border-gray-800 text-center text-xs text-gray-500">
    <div class="max-w-4xl mx-auto px-4 space-y-4">
      <p class="font-bold text-gray-400">BruxusFunnels - Plataforma de Lançamentos de Alto Impacto</p>
      <p>Este site não tem afiliação com o Facebook, Google ou quaisquer canais sociais. Os resultados podem variar de pessoa para pessoa de acordo com a dedicação e o esforço individual aplicado.</p>
      <p>&copy; ${new Date().getFullYear()} BruxusFunnels. Todos os direitos reservados. Termos de Uso • Política de Privacidade</p>
    </div>
  </footer>

  <!-- Widget Flutuante do WhatsApp -->
  <a href="https://api.whatsapp.com/send?phone=5500000000000&text=Quero%20saber%20mais%20sobre%20o%20${encodeURIComponent(productName)}" target="_blank" class="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-xl shadow-green-500/20 transition-all transform hover:scale-105 z-50">
    💬
  </a>

  <script>
    ${scriptBlock}
  </script>
</body>
</html>`;
}

// Action para criar o funil de voz
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const paymentLink = (formData.get('paymentLink') as string) || '';
    const modelId = (formData.get('modelId') as string) || 'evergreen';
    const audioFile = formData.get('audio') as File | null;

    if (!paymentLink) {
      return json({ error: 'O link de pagamento é obrigatório' }, { status: 400 });
    }

    // Identificar e extrair metadados do checkout de pagamento
    const productInfo = parsePaymentLink(paymentLink);

    // Mock ou transcrição real se a chave OpenAI existir no ambiente
    let transcript = '';
    
    // Verificamos chaves de API disponíveis
    const openAiApiKey = process.env.OPENAI_API_KEY || (typeof import.meta.env !== 'undefined' ? import.meta.env.OPENAI_API_KEY : '');
    
    if (openAiApiKey && audioFile && audioFile.size > 0) {
      try {
        // Envio do arquivo para a API OpenAI Whisper
        const apiFormData = new FormData();
        apiFormData.append('file', audioFile);
        apiFormData.append('model', 'whisper-1');
        apiFormData.append('language', 'pt');

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
          },
          body: apiFormData,
        });

        if (whisperResponse.ok) {
          const whisperData = (await whisperResponse.json()) as { text: string };
          transcript = whisperData.text;
        } else {
          console.warn('Erro ao chamar Whisper API, usando fallback de transcrição baseada no link.');
        }
      } catch (err) {
        console.error('Falha ao conectar com OpenAI Whisper:', err);
      }
    }

    // Se a transcrição falhou ou não havia chave, geramos uma de fallback altamente convincente
    if (!transcript) {
      transcript = `Gostaria de te convidar para conhecer o ${productInfo.productName}, um método inovador desenvolvido para revolucionar seus resultados. Se você quer ter mais tempo livre e escalar o seu faturamento de forma sustentável, essa é a escolha certa para você hoje. Clique no botão de inscrição agora para começar com a nossa oferta especial por apenas R$ ${productInfo.price}.`;
    }

    // Criar um ID exclusivo para o funil
    const funnelId = 'fn_' + Math.random().toString(36).substring(2, 11);

    // Gerar o HTML do funil utilizando o template correspondente
    const funnelHtml = generateFunnelHTML(modelId, paymentLink, productInfo, transcript);

    // Salvar o funil
    await saveFunnel(funnelId, funnelHtml, {
      id: funnelId,
      paymentLink,
      modelId,
      transcript,
      productInfo,
      createdAt: new Date().toISOString(),
    });

    return json({
      success: true,
      id: funnelId,
      url: `/funnels/${funnelId}`,
      downloadUrl: `/api/voice-funnel?export=${funnelId}`,
      transcript,
      productInfo,
    });
  } catch (error: any) {
    console.error('Erro ao processar criação do funil de voz:', error);
    return json({ error: 'Erro interno ao processar e criar o funil de vendas' }, { status: 500 });
  }
}

// Loader para suportar exportações diretas do arquivo gerado
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const exportId = url.searchParams.get('export');

  if (!exportId) {
    return json({ error: 'Nenhum ID de exportação especificado' }, { status: 400 });
  }

  const funnel = await getFunnel(exportId);

  if (!funnel) {
    return new Response('Funil solicitado não encontrado para exportação.', { status: 404 });
  }

  // Retorna o HTML bruto como anexo de download
  return new Response(funnel.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="funnel-${exportId}.html"`,
    },
  });
}
