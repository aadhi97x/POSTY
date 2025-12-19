
import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Waves, Volume2, ShieldCheck, Loader2, Sparkles } from "lucide-react";
import { getAI, decodeAudio, decodeAudioData, createBlobFromPCM } from "../services/geminiService";
import { LiveServerMessage, Modality } from "@google/genai";

interface LiveVoiceAssistantProps {
  onClose: () => void;
}

export default function LiveVoiceAssistant({ onClose }: LiveVoiceAssistantProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [userTranscription, setUserTranscription] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextIn = useRef<AudioContext | null>(null);
  const audioContextOut = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSession = async () => {
    setIsConnecting(true);
    const ai = getAI();
    
    try {
      audioContextIn.current = new AudioContext({ sampleRate: 16000 });
      audioContextOut.current = new AudioContext({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            const source = audioContextIn.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextIn.current!.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate audio level for visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setAudioLevel(Math.sqrt(sum / inputData.length));

              const pcmBlob = createBlobFromPCM(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextIn.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.inputTranscription) {
              setUserTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              setTranscription("");
              setUserTranscription("");
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextOut.current) {
              nextStartTime.current = Math.max(nextStartTime.current, audioContextOut.current.currentTime);
              const buffer = await decodeAudioData(decodeAudio(base64Audio), audioContextOut.current, 24000, 1);
              const sourceNode = audioContextOut.current.createBufferSource();
              sourceNode.buffer = buffer;
              sourceNode.connect(audioContextOut.current.destination);
              sourceNode.start(nextStartTime.current);
              nextStartTime.current += buffer.duration;
              sources.current.add(sourceNode);
              sourceNode.onended = () => sources.current.delete(sourceNode);
            }

            if (message.serverContent?.interrupted) {
              sources.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sources.current.clear();
              nextStartTime.current = 0;
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => {
            console.error("Live Error:", e);
            stopSession();
          }
        },
        config: {
          // Fix: Use Modality.AUDIO enum instead of string literal to satisfy type checker.
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are Dak-Mitra, the India Post official voice assistant. Help citizens with tracking, grievances, and postal rules. Be professional and helpful.',
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start Live API:", err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setIsConnecting(false);
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextIn.current && audioContextIn.current.state !== 'closed') {
      audioContextIn.current.close().catch(() => {});
      audioContextIn.current = null;
    }
    if (audioContextOut.current && audioContextOut.current.state !== 'closed') {
      audioContextOut.current.close().catch(() => {});
      audioContextOut.current = null;
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center p-12 text-center">
        <button onClick={onClose} className="absolute top-10 right-10 p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indiapost-red transition-all">
          <X size={24} />
        </button>

        <div className="mb-12">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Neural Voice Protocol</h2>
          <p className="text-[10px] font-black text-indiapost-red uppercase tracking-[0.5em] mt-3 flex items-center justify-center gap-3">
             <ShieldCheck size={14} /> Encrypted Direct Link
          </p>
        </div>

        {/* ORB VISUALIZER */}
        <div className="relative mb-20">
          <div className={`w-48 h-48 rounded-full bg-gradient-to-tr from-indiapost-red via-indiapost-amber to-red-400 blur-2xl opacity-20 animate-pulse absolute inset-0 -translate-y-4 scale-150 ${isActive ? '' : 'hidden'}`} />
          <div 
            className={`w-48 h-48 rounded-full border-8 border-indiapost-red/10 flex items-center justify-center relative transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
            style={{ 
              boxShadow: isActive ? `0 0 ${audioLevel * 400}px rgba(209, 33, 40, 0.4)` : 'none'
            }}
          >
            {isConnecting ? (
              <Loader2 className="text-indiapost-red animate-spin" size={64} />
            ) : isActive ? (
              <div className="flex gap-1 items-end h-12">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-indiapost-red rounded-full transition-all duration-75" style={{ height: `${20 + (audioLevel * 300 * Math.random())}%` }} />
                ))}
              </div>
            ) : (
              <Sparkles className="text-slate-200 dark:text-slate-800" size={64} />
            )}
          </div>
        </div>

        <div className="w-full space-y-10 min-h-[120px]">
           {isActive && (
             <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Live Transcription</p>
                <div className="max-h-24 overflow-y-auto custom-scrollbar px-6">
                   <p className="text-lg font-bold text-slate-900 dark:text-white italic leading-relaxed">
                     {userTranscription || transcription || "Listening for your voice..."}
                   </p>
                </div>
             </div>
           )}

           {!isActive && !isConnecting && (
              <div className="space-y-6">
                <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">Establish a low-latency neural link with Dak-Mitra for real-time grievance redressal.</p>
                <button 
                  onClick={startSession}
                  className="bg-indiapost-red text-white px-12 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-red-800 transition-all flex items-center gap-4 mx-auto shadow-2xl shadow-red-500/30"
                >
                  <Mic size={20} /> Initiate Voice Link
                </button>
              </div>
           )}

           {isActive && (
             <button 
               onClick={stopSession}
               className="bg-black dark:bg-white dark:text-black text-white px-12 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center gap-4 mx-auto"
             >
               <MicOff size={20} /> Terminate Connection
             </button>
           )}
        </div>

        <div className="mt-16 pt-10 border-t border-slate-100 dark:border-slate-800 w-full">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Ministry of Communications • Govt. of India • AI v4.2</p>
        </div>
      </div>
    </div>
  );
}
