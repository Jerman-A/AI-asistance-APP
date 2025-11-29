import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Activity, XCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioUtils';

const LiveSession: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  
  // Refs for audio handling to avoid re-renders
  const nextStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const stopSession = () => {
    // Clean up audio sources
    activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();

    // Clean up input
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    
    // Close audio contexts
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }

    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
  };

  const startSession = async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const outputNode = audioContextRef.current.createGain();
      outputNode.connect(audioContextRef.current.destination);

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Processing
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              // Simple volume calculation for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1)); // Scale up for visual effect

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
               const ctx = audioContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const audioBuffer = await decodeAudioData(
                 decode(base64Audio),
                 ctx,
                 24000,
                 1
               );

               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode);
               
               source.addEventListener('ended', () => {
                 activeSourcesRef.current.delete(source);
               });

               source.start(nextStartTimeRef.current);
               activeSourcesRef.current.add(source);
               
               nextStartTimeRef.current += audioBuffer.duration;
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                activeSourcesRef.current.forEach((src) => {
                    try { src.stop(); } catch(e){}
                    activeSourcesRef.current.delete(src);
                });
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error(e);
            setConnectionState(ConnectionState.ERROR);
            stopSession();
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are a helpful, witty, and concise AI assistant.",
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start session:", error);
      setConnectionState(ConnectionState.ERROR);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-white relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 blur-[100px] rounded-full transition-all duration-700 ${connectionState === ConnectionState.CONNECTED ? 'scale-150 opacity-100' : 'scale-100 opacity-20'}`}></div>
         <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full transition-all duration-700 delay-100 ${connectionState === ConnectionState.CONNECTED ? 'scale-150 opacity-100' : 'scale-50 opacity-0'}`}></div>
      </div>

      <div className="z-10 flex flex-col items-center gap-12">
        <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Gemini Live</h2>
            <p className="text-slate-400">Real-time low-latency voice interaction</p>
        </div>

        {/* Visualizer Orb */}
        <div className="relative">
            {/* Ripple rings */}
            {connectionState === ConnectionState.CONNECTED && (
                <>
                <div className="absolute inset-0 rounded-full border border-rose-500/30 animate-ping opacity-20"></div>
                <div className="absolute -inset-4 rounded-full border border-purple-500/20 animate-pulse"></div>
                </>
            )}
            
            <div 
                className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-md ${
                    connectionState === ConnectionState.CONNECTED 
                    ? 'bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-rose-500/50 shadow-[0_0_50px_rgba(225,29,72,0.3)]' 
                    : 'bg-slate-900/50 border-slate-700 shadow-xl'
                }`}
                style={{
                    transform: connectionState === ConnectionState.CONNECTED ? `scale(${1 + volume * 0.5})` : 'scale(1)'
                }}
            >
                {connectionState === ConnectionState.CONNECTING ? (
                    <Activity className="w-16 h-16 text-blue-400 animate-spin" />
                ) : connectionState === ConnectionState.CONNECTED ? (
                    <Activity className="w-16 h-16 text-rose-500" />
                ) : (
                    <MicOff className="w-16 h-16 text-slate-600" />
                )}
            </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
            {connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR ? (
                 <button
                 onClick={startSession}
                 className="flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold shadow-lg shadow-white/10 hover:bg-slate-200 transition-all transform hover:scale-105 active:scale-95"
               >
                 <Mic size={24} />
                 Start Conversation
               </button>
            ) : (
                <button
                onClick={stopSession}
                className="flex items-center gap-3 px-8 py-4 bg-rose-500/10 text-rose-500 border border-rose-500/50 rounded-full font-bold hover:bg-rose-500/20 transition-all transform hover:scale-105 active:scale-95"
              >
                <XCircle size={24} />
                End Session
              </button>
            )}
           
           {connectionState === ConnectionState.ERROR && (
               <p className="text-red-400 text-sm mt-4">Connection failed. Please try again.</p>
           )}
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
