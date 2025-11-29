import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, Loader2, Search } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ChatMessage } from '../types';
import { blobToBase64 } from '../utils/audioUtils';
import ChatMessageBubble from './ChatMessageBubble';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [useGrounding, setUseGrounding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await blobToBase64(file);
        setSelectedImage(`data:${file.type};base64,${base64}`);
      } catch (error) {
        console.error("Error reading file", error);
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    // Placeholder for stream
    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: 'model', text: '' },
    ]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';
      
      const config: any = {};
      if (useGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      let contents: any;
      if (userMsg.image) {
        const base64Data = userMsg.image.split(',')[1];
        const mimeType = userMsg.image.split(':')[1].split(';')[0];
        contents = {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: userMsg.text || 'Describe this image.' }
          ]
        };
      } else {
        contents = userMsg.text;
      }

      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config
      });

      let fullText = '';
      let groundingSources: { uri: string; title: string }[] = [];

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text; // Access .text property directly
        if (textChunk) {
            fullText += textChunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, text: fullText } : msg
              )
            );
        }
        
        // Check for grounding
        const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
           chunks.forEach((chunk: any) => {
             if (chunk.web) {
               groundingSources.push({ uri: chunk.web.uri, title: chunk.web.title });
             }
           });
        }
      }
      
      // Update final message with sources if any
      if (groundingSources.length > 0) {
        setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, groundingSources } : msg
            )
        );
      }

    } catch (error: any) {
      console.error('API Error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, text: 'An error occurred. Please try again.', isError: true }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
               <span className="text-4xl">✨</span>
            </div>
            <p className="text-lg font-medium">How can I help you today?</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
            {selectedImage && (
                <div className="mb-4 relative inline-block">
                    <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-slate-600" />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                        ✕
                    </button>
                </div>
            )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
                 <button
                    onClick={() => setUseGrounding(!useGrounding)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        useGrounding ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <Search size={12} />
                    Google Search {useGrounding ? 'On' : 'Off'}
                </button>
            </div>

            <div className="relative flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                title="Upload Image"
              >
                <ImagePlus size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              />

              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">Gemini 2.5 Flash</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
