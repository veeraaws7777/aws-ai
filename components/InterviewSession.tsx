
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Type } from '@google/genai';
import { UserData, InterviewResult } from '../types';

interface InterviewSessionProps {
  userData: UserData;
  onComplete: (result: InterviewResult) => void;
}

const InterviewSession: React.FC<InterviewSessionProps> = ({ userData, onComplete }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [transcript, setTranscript] = useState<{role: string, text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(480); // 8 minutes
  const [volume, setVolume] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<{role: string, text: string}[]>([]);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  // Sync transcript state with ref to avoid stale closures in listeners
  const addTranscriptLine = useCallback((role: string, text: string) => {
    const newLine = { role, text };
    transcriptRef.current = [...transcriptRef.current, newLine];
    setTranscript(prev => [...prev, newLine]);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const decode = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      return new Uint8Array(0);
    }
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const handleFinalEvaluation = async () => {
    // Prevent multiple evaluation triggers
    if (isEvaluating) return;
    
    // Check transcript length from ref to be safe
    if (transcriptRef.current.length < 2) {
      setError("Interview ended prematurely with insufficient data for evaluation.");
      setIsConnected(false);
      return;
    }
    
    setIsEvaluating(true);
    setIsConnected(false); // Stop interaction
    setError(null);

    // Stop and clear all audio
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const historyText = transcriptRef.current.map(t => `${t.role}: ${t.text}`).join('\n');
      
      const prompt = `
        You are a highly senior AWS Solutions Architect. Evaluate this 8-minute interview transcript for ${userData.name}.
        
        TRANSCRIPT DATA:
        ${historyText}
        
        STRICT GRADING RUBRIC:
        1. Deep knowledge of VPC, Subnets, Transit Gateway, Route 53, Direct Connect, and Hybrid architectures.
        2. Score (0-100): Be very strict. Award points only for specific, accurate technical answers.
        3. Penalty: If the candidate avoided questions or was vague, assign 0 for that section.
        4. Strengths: List areas where they showed senior-level expertise.
        5. Weaknesses: List every technical gap discovered.
        
        OUTPUT FORMAT: JSON ONLY.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              questionsAnswered: { type: Type.NUMBER }
            },
            required: ['score', 'feedback', 'strengths', 'weaknesses', 'questionsAnswered']
          }
        }
      });

      const result = JSON.parse(response.text || '{}') as InterviewResult;
      onComplete(result);
    } catch (err: any) {
      console.error("Evaluation failure", err);
      setError("Network fault during score compilation. Quota limit or project restriction encountered.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const initInterview = useCallback(async () => {
    setError(null);
    setIsConnected(false);

    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      }
      if (videoRef.current) videoRef.current.srcObject = streamRef.current;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            
            // Start Timer with precise countdown
            timerRef.current = window.setInterval(() => {
              setTimeLeft(prev => {
                if (prev <= 1) {
                  clearInterval(timerRef.current!);
                  // Time ended: trigger analysis immediately
                  handleFinalEvaluation();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);

            const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate real-time volume
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length) * 100);

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);

            const frameInt = window.setInterval(() => {
              if (videoRef.current && canvasRef.current && isConnected) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  canvasRef.current.width = 320;
                  canvasRef.current.height = 240;
                  ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                  canvasRef.current.toBlob(async (b) => {
                    if (b) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } })).catch(() => {});
                      };
                      reader.readAsDataURL(b);
                    }
                  }, 'image/jpeg', 0.4);
                }
              }
            }, 1000);
            (window as any)._interviewFrameInterval = frameInt;
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioBase64 && outputAudioContextRef.current) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const bytes = decode(audioBase64);
              if (bytes.length > 0) {
                const buffer = await decodeAudioData(bytes, outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(outputNodeRef.current!);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setIsSpeaking(false);
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }
            }
            if (message.serverContent?.outputTranscription) {
              addTranscriptLine('AI', message.serverContent?.outputTranscription?.text || '');
            }
            if (message.serverContent?.inputTranscription) {
              addTranscriptLine('User', message.serverContent?.inputTranscription?.text || '');
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error("Live Stream Error", e);
            setIsConnected(false);
          },
          onclose: () => {
            setIsConnected(false);
            if (timerRef.current) clearInterval(timerRef.current);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a Lead AWS Networking Engineer conducting a high-stakes 8-minute technical interview for ${userData.name}.
          TONE: Professional, architectural, direct.
          BEHAVIOR:
          1. Ask scenario-based networking questions.
          2. If the user is silent or doesn't know, move to a completely different AWS networking topic immediately.
          3. Monitor time. Ensure you cover multiple domains: VPC, Hybrid (DX/VPN), Security (WAF/Shield/NACL), and DNS (Route53).
          The session ends exactly at 8 minutes.`,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setError("AI Core failed to initialize. Please verify your API Key and network connectivity.");
    }
  }, [userData.name, addTranscriptLine]);

  useEffect(() => {
    initInterview();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if ((window as any)._interviewFrameInterval) clearInterval((window as any)._interviewFrameInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initInterview]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative max-w-6xl mx-auto w-full">
      {(isEvaluating || (!isConnected && !error)) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] border border-white/5">
          <div className="relative">
             <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-6 h-6 bg-orange-500 rounded-full animate-ping" />
             </div>
          </div>
          <h3 className="text-3xl font-black text-orange-400 mt-10 tracking-tighter uppercase italic">
            {isEvaluating ? 'Compiling Assessment' : 'Connecting To VPC Assessor'}
          </h3>
          <p className="text-slate-500 text-[10px] mt-4 font-mono uppercase tracking-[0.6em] animate-pulse">
            {isEvaluating ? 'Generating Official Technical PDF Report...' : 'Establishing Low-Latency Voice Uplink...'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User View */}
        <div className="relative aspect-video bg-black rounded-[2.5rem] overflow-hidden border-2 border-slate-800 shadow-2xl group ring-1 ring-white/5">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror grayscale hover:grayscale-0 transition-all duration-1000" />
          
          <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">UPLINK • {userData.name}</span>
            </div>
          </div>

          <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between pointer-events-none">
            {/* Visualizer */}
            <div className="flex gap-1.5 items-end h-14">
              {[...Array(15)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-orange-500/80 rounded-full transition-all duration-100" 
                  style={{ height: `${Math.random() * volume * (i+1)/8 + 5}%`, opacity: volume > 1 ? 1 : 0.1 }}
                />
              ))}
            </div>
            
            <div className="bg-slate-900/90 backdrop-blur-2xl text-white font-black px-8 py-4 rounded-[2rem] text-3xl shadow-2xl shadow-black font-mono border border-white/10 flex items-center gap-4">
              <span className="text-orange-500 text-sm font-black uppercase tracking-widest">Time</span>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* AI View */}
        <div className="relative aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden border-2 border-slate-800 shadow-2xl flex flex-col items-center justify-center p-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 ring-1 ring-white/5">
          <div className={`flex flex-col items-center gap-10 transition-all duration-700 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
            <div className="relative">
              <div className={`absolute -inset-16 rounded-full bg-orange-500/5 blur-[80px] transition-opacity duration-1000 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`} />
              
              <div className={`w-48 h-48 rounded-full border-2 flex items-center justify-center transition-all duration-500 relative ${isSpeaking ? 'border-orange-500/50 bg-orange-500/5 shadow-[0_0_80px_rgba(249,115,22,0.1)]' : 'border-slate-800 bg-slate-900/30'}`}>
                 <div className={`absolute inset-5 rounded-full border border-dashed border-slate-700 animate-[spin_15s_linear_infinite] ${isSpeaking ? 'border-orange-500/40' : ''}`} />
                 <div className={`w-24 h-24 rounded-full border flex items-center justify-center bg-slate-800/80 backdrop-blur-sm transition-all duration-300 ${isSpeaking ? 'scale-125 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)]' : 'border-slate-700'}`}>
                   <svg className={`w-12 h-12 transition-colors duration-500 ${isSpeaking ? 'text-orange-500' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                   </svg>
                 </div>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center justify-center gap-3">
                Assessor AI
                {isSpeaking && <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" /></div>}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.6em] mt-4">
                {isSpeaking ? 'Critically Evaluating Topology' : isConnected ? 'Monitoring Candidate Response' : 'Awaiting Uplink Initiation'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-950/50 p-8 rounded-[2rem] border border-white/5 max-h-64 overflow-y-auto custom-scrollbar shadow-inner">
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-950/90 backdrop-blur-md py-3 border-b border-white/5 z-10">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Real-Time Interaction Log</h4>
            <span className="text-[9px] font-mono text-slate-700">MODEL: GEMINI_2.5_NATIVE_VOICE</span>
          </div>
          
          <div className="space-y-5">
            {transcript.length === 0 && <p className="text-xs text-slate-700 italic text-center py-10 uppercase tracking-widest font-bold">Waiting for assessment data packets...</p>}
            {transcript.map((line, idx) => (
              <div key={idx} className={`flex gap-5 animate-fade-in ${line.role === 'AI' ? 'opacity-100' : 'opacity-80'}`}>
                <span className={`text-[9px] font-black shrink-0 mt-1 uppercase w-20 px-3 py-1 rounded-full text-center border ${line.role === 'AI' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                  {line.role}
                </span>
                <p className={`text-sm leading-relaxed font-medium ${line.role === 'AI' ? 'text-orange-50' : 'text-slate-400'}`}>
                  {line.text}
                </p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-xl flex-1 flex flex-col justify-between">
             <div>
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Security Module</h4>
               <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Shield</span>
                    <span className="text-[9px] text-green-500 font-black">ENCRYPTED</span>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">VPC Flow</span>
                    <span className="text-[9px] text-orange-400 font-mono tracking-tighter">STREAMING_4K</span>
                 </div>
               </div>
             </div>
             
             <button
              onClick={handleFinalEvaluation}
              disabled={!isConnected || isEvaluating}
              className="w-full mt-10 py-5 bg-gradient-to-br from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-2xl shadow-red-900/20 active:scale-95 disabled:opacity-20"
            >
              Finish & Score
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 backdrop-blur-2xl border border-red-500/30 p-8 rounded-[2rem] text-red-200 text-sm font-black text-center animate-shake ring-1 ring-red-500/20">
          SYSTEM ERROR DETECTED: {error}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default InterviewSession;
