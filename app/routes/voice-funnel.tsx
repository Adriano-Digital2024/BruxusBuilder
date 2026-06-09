import { useState, useRef, useEffect } from 'react';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [
    { title: 'Criador de Funil por Voz - BruxusFunnels' },
    { name: 'description', content: 'Crie um funil de vendas completo usando apenas a sua voz em menos de 2 minutos.' },
  ];
};

const FUNNEL_MODELS = [
  { id: 'internal-launch', name: 'Internal Launch Monster', emoji: '🚀', desc: 'Lançamento interno de 7 dias com módulos de vídeo e cronograma sequencial.' },
  { id: 'flash-launch', name: 'Flash Launch Monster', emoji: '⚡', desc: 'Lançamento relâmpago de 3 dias de alta escassez com ofertas de bônus exclusivos.' },
  { id: 'evergreen', name: 'Evergreen Funnel Monster', emoji: '🌲', desc: 'Funil automático 24/7 com VSL, depoimentos e oferta irresistível contínua.' },
  { id: 'webinar', name: 'Webinar Campaign Monster', emoji: '🎥', desc: 'Página com simulação de webinar ao vivo, chat fake em tempo real e oferta especial.' },
  { id: 'cart-recovery', name: 'Cart Recovery Monster', emoji: '🛒', desc: 'Recuperação de carrinho com desconto exclusivo, FAQ de objeções e suporte via WhatsApp.' },
  { id: 'lead-nurture', name: 'Lead Nurture Monster', emoji: '🧲', desc: 'Foco em isca digital gratuita com transição estratégica imediata para o checkout.' },
  { id: 'upsell-cross', name: 'Upsell Cross Monster', emoji: '📈', desc: 'Página de upgrade imediato pós-compra com super bônus de oferta única.' },
  { id: 'list-revival', name: 'List Revival Monster', emoji: '✉️', desc: 'Campanha de reativação direta para contatos frios com benefícios aprimorados.' },
];

export default function VoiceFunnel() {
  const [modelId, setModelId] = useState('evergreen');
  const [paymentLink, setPaymentLink] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs para áudio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Efeito para contar o tempo de gravação
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Iniciar gravação de áudio do microfone
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const file = new File([audioBlob], 'voice-pitch.mp3', { type: 'audio/mp3' });
        setAudioFile(file);
        
        // Parar todos os canais de mídia para desligar a luz do microfone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      setError('Não foi possível acessar o seu microfone. Verifique as permissões do seu navegador.');
    }
  };

  // Parar gravação de áudio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Selecionar arquivo de áudio carregado manualmente
  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('O arquivo de áudio deve ter no máximo 10MB.');
        return;
      }
      setAudioFile(file);
      setError(null);
    }
  };

  // Enviar os dados para gerar o funil
  const handleCreateFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!paymentLink) {
      setError('Por favor, informe o link de pagamento do seu produto.');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingStep('Subindo áudio e analisando formulário...');

    try {
      const formData = new FormData();
      formData.append('paymentLink', paymentLink);
      formData.append('modelId', modelId);
      if (audioFile) {
        formData.append('audio', audioFile);
      }

      // Intervalo simulado para dar sensação de progresso real enquanto o backend trabalha
      const steps = [
        { progress: 25, label: 'Transcrevendo áudio com IA...' },
        { progress: 45, label: 'Analisando página de checkout e metadados...' },
        { progress: 65, label: 'Estruturando copy persuasiva baseada no modelo...' },
        { progress: 85, label: 'Estilizando página de vendas de alta conversão...' },
        { progress: 95, label: 'Finalizando publicação na nuvem BruxusFunnels...' },
      ];

      let currentStepIndex = 0;
      const progressInterval = setInterval(() => {
        if (currentStepIndex < steps.length) {
          const step = steps[currentStepIndex];
          setProcessingProgress(step.progress);
          setProcessingStep(step.label);
          currentStepIndex++;
        }
      }, 5000); // Muda a cada 5 segundos

      // Chamada real da API
      const response = await fetch('/api/voice-funnel', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao criar o funil de vendas.');
      }

      const data = await response.json();
      setProcessingProgress(100);
      setProcessingStep('Funil criado com sucesso!');
      
      // Pequeno delay para exibir o sucesso
      setTimeout(() => {
        setResult(data);
        setIsProcessing(false);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao gerar seu funil de vendas.');
      setIsProcessing(false);
    }
  };

  // Resetar formulário para criar outro
  const handleReset = () => {
    setResult(null);
    setAudioFile(null);
    setPaymentLink('');
    setModelId('evergreen');
    setError(null);
    setProcessingProgress(0);
    setProcessingStep('');
  };

  return (
    <div className="flex flex-col h-full w-full min-h-screen bg-bolt-elements-background-depth-1 text-white">
      <BackgroundRays />
      <Header />

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 overflow-y-auto">
        {/* Banner de Introdução */}
        {!result && !isProcessing && (
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="bg-purple-500/10 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block border border-purple-500/20">
              Nova Funcionalidade BruxusFunnels
            </span>
            <h1 className="text-3xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
              Criador de Funis por Voz
            </h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              Grave um áudio de até 60 segundos explicando seu produto, cole o seu link de pagamento e receba uma página de vendas persuasiva pronta e publicada em menos de 2 minutos!
            </p>
          </div>
        )}

        {/* ERRO */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 max-w-3xl mx-auto mb-6 text-red-300 text-sm flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-white">Ops, ocorreu um erro</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* PROCESSANDO */}
        {isProcessing && (
          <div className="max-w-xl mx-auto bg-gray-900/60 border border-gray-800 rounded-3xl p-8 md:p-12 text-center shadow-2xl backdrop-blur-sm">
            <div className="w-20 h-20 relative mx-auto mb-6">
              {/* Círculo animado */}
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🎙️</div>
            </div>
            
            <h2 className="text-xl font-bold mb-2">Construindo seu Funil...</h2>
            <p className="text-purple-400 font-medium text-sm mb-6 animate-pulse">{processingStep}</p>
            
            {/* Barra de Progresso */}
            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <div className="text-right text-xs text-gray-500 mt-1.5 font-bold">{processingProgress}%</div>
          </div>
        )}

        {/* FORMULÁRIO DE CRIAÇÃO */}
        {!result && !isProcessing && (
          <form onSubmit={handleCreateFunnel} className="max-w-4xl mx-auto bg-gray-900/40 border border-gray-800/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* LADO ESQUERDO: ÁUDIO & LINK */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">1. Grave a sua proposta (máx. 60s)</label>
                  <div className="bg-gray-950 rounded-2xl p-5 border border-gray-800 text-center flex flex-col items-center justify-center min-h-[160px]">
                    {isRecording ? (
                      <div className="space-y-4 w-full">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Gravando Áudio</span>
                        </div>
                        <div className="text-3xl font-extrabold text-white">{String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}</div>
                        
                        {/* Ondas visuais simuladas */}
                        <div className="flex justify-center items-center gap-1 h-6">
                          <div className="w-1 bg-red-500 h-3 animate-pulse rounded-full"></div>
                          <div className="w-1 bg-red-500 h-5 animate-pulse rounded-full delay-75"></div>
                          <div className="w-1 bg-red-500 h-2 animate-pulse rounded-full delay-150"></div>
                          <div className="w-1 bg-red-500 h-4 animate-pulse rounded-full delay-100"></div>
                          <div className="w-1 bg-red-500 h-1 animate-pulse rounded-full"></div>
                        </div>

                        <button 
                          type="button" 
                          onClick={stopRecording} 
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors"
                        >
                          Parar Gravação
                        </button>
                      </div>
                    ) : audioFile ? (
                      <div className="space-y-4 w-full">
                        <div className="text-green-400 text-2xl">✓</div>
                        <p className="text-xs text-gray-400 font-medium truncate max-w-xs">{audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                        <audio src={URL.createObjectURL(audioFile)} controls className="mx-auto max-w-xs h-10 w-full rounded-md" />
                        <div className="flex gap-2 justify-center">
                          <button 
                            type="button" 
                            onClick={startRecording} 
                            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold text-xs px-4 py-2 rounded-lg border border-purple-500/20 transition-colors"
                          >
                            Regravar
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setAudioFile(null)} 
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button 
                          type="button" 
                          onClick={startRecording} 
                          className="bg-purple-600 hover:bg-purple-700 text-white w-14 h-14 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-105 shadow-lg shadow-purple-600/20"
                        >
                          🎙️
                        </button>
                        <p className="text-xs text-gray-400 font-medium">Clique para gravar sua voz ou suba um arquivo abaixo</p>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="audio/*" 
                            onChange={handleAudioUpload} 
                            className="hidden" 
                            id="file-upload" 
                          />
                          <label 
                            htmlFor="file-upload" 
                            className="cursor-pointer text-xs text-purple-400 hover:text-purple-300 underline font-semibold"
                          >
                            Selecionar arquivo do dispositivo
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">2. Cole seu Link de Pagamento (Checkout)</label>
                  <input 
                    type="url" 
                    placeholder="https://pay.kiwify.com.br/abcdef" 
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Compatível com Kiwify, Hotmart, Monetizze, Eduzz, etc.</span>
                </div>
              </div>

              {/* LADO DIREITO: SELEÇÃO DE MODELOS */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">3. Escolha o Modelo do Funil</label>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 border border-gray-800 rounded-xl bg-gray-950 p-2">
                  {FUNNEL_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setModelId(model.id)}
                      className={`flex items-start text-left p-3 rounded-lg border text-xs transition-all ${
                        modelId === model.id 
                          ? 'bg-purple-900/20 border-purple-500 text-white' 
                          : 'bg-gray-900/40 border-transparent text-gray-400 hover:bg-gray-900/80 hover:text-gray-200'
                      }`}
                    >
                      <span className="text-xl mr-3">{model.emoji}</span>
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-0.5">{model.name}</h4>
                        <p className="text-gray-400 leading-tight text-[11px]">{model.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* BOTÃO DE SUBMIT */}
            <div className="pt-4 border-t border-gray-800/60 flex justify-end">
              <button
                type="submit"
                className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-base px-10 py-3.5 rounded-xl shadow-lg shadow-purple-600/15 transform hover:-translate-y-0.5 transition-all"
              >
                CRIAR MEU FUNIL AGORA 🚀
              </button>
            </div>
          </form>
        )}

        {/* EXIBIÇÃO DE RESULTADO DO FUNIL */}
        {result && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header de sucesso */}
            <div className="bg-green-950/20 border border-green-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center md:text-left">
                <span className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center text-2xl">🎉</span>
                <div>
                  <h2 className="text-xl font-bold">Seu funil foi publicado com sucesso!</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Disponível em uma URL pública e pronto para o deploy.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  🔗 Abrir Página Pública
                </a>
                <a 
                  href={result.downloadUrl}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 border border-gray-700"
                >
                  📥 Baixar Código HTML
                </a>
                <button 
                  onClick={handleReset}
                  className="bg-gray-900 hover:bg-gray-800 text-gray-400 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors border border-gray-800"
                >
                  Criar Outro
                </button>
              </div>
            </div>

            {/* Split screen: Metadados + Iframe Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Coluna de Metadados / Detalhes */}
              <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 space-y-5 flex-1">
                  <h3 className="font-bold border-b border-gray-800 pb-3">Detalhamento do Produto</h3>
                  
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-gray-500 block mb-0.5">Nome do Produto</span>
                      <strong className="text-sm text-purple-300">{result.productInfo.productName}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Preço Estimado</span>
                      <strong className="text-sm">R$ {result.productInfo.price}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Plataforma de Pagamento</span>
                      <strong className="text-sm">{result.productInfo.platform}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">URL de Checkout</span>
                      <a href={result.paymentLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block">{result.paymentLink}</a>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 flex-1 mt-6">
                  <h3 className="font-bold border-b border-gray-800 pb-3 mb-3">Transcrição do Áudio</h3>
                  <div className="text-xs text-gray-400 italic max-h-[160px] overflow-y-auto leading-relaxed">
                    "{result.transcript}"
                  </div>
                </div>
              </div>

              {/* Coluna do Iframe Preview */}
              <div className="lg:col-span-8 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col min-h-[450px]">
                <div className="bg-gray-950 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold flex items-center gap-2"><span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span> Visualização em Tempo Real (Live Preview)</span>
                  <span className="text-[10px] text-gray-600">dispositivo responsivo</span>
                </div>
                <div className="flex-1 bg-white relative">
                  <iframe 
                    src={result.url} 
                    title="Live Preview" 
                    className="absolute inset-0 w-full h-full border-none"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
