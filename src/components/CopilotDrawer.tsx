import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  Paperclip, 
  Mic, 
  RotateCw, 
  MessageSquare,
  Box,
  Store,
  BarChart,
  CloudRain,
  Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from '../types';
import { MessageRenderer } from './MessageRenderer';

export function CopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome-1',
    role: 'assistant',
    content: "Hi! I'm your **AgriGPT Copilot**. \n\nI am embedded right here to assist you with live 3D field telemetry, product comparisons, yield forecasts, disease diagnostics, and weather advisories. How can I assist your farm today?",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Listen for global open events from anywhere in the app
  useEffect(() => {
    const handleOpenCopilot = (e: CustomEvent<{ prompt?: string }>) => {
      setIsOpen(true);
      if (e.detail?.prompt) {
        submitMessage(e.detail.prompt);
      }
    };

    window.addEventListener('open-copilot' as any, handleOpenCopilot);
    return () => window.removeEventListener('open-copilot' as any, handleOpenCopilot);
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Contextual prompts based on current page
  const getContextPrompts = () => {
    switch (location.pathname) {
      case '/3d-view':
        return [
          "Analyze Sector Alpha Durum Wheat status",
          "Recommend irrigation schedule for Sector Gamma",
          "Explain NDVI canopy health scores",
          "Diagnose nitrogen deficit in Sector Beta"
        ];
      case '/store':
        return [
          "Which tomato seed variety has highest yield?",
          "Recommend organic fertilizers for wheat",
          "Compare prices of Bio-NPK boosters",
          "What supplies do I need for drip irrigation?"
        ];
      case '/analytics':
        return [
          "Generate Q4 revenue forecast line chart",
          "Break down water usage efficiency heatmap",
          "Compare wheat vs corn profit margins",
          "Export farm yield report summary"
        ];
      case '/weather':
        return [
          "Is frost expected in the next 7 days?",
          "Best spraying window given current wind speed?",
          "Rainfall prediction for upcoming harvest",
          "Humidity impact on tomato blight risk"
        ];
      case '/scan':
        return [
          "How to treat early blight on tomato leaves?",
          "Identify yellow rust symptoms on wheat",
          "Preventative bio-fungicide application rate",
          "Organic pest management for maize stem borer"
        ];
      default:
        return [
          "Show 3D Farm digital twin overview",
          "Suggest high-yield crop rotation",
          "Check store discounts on seeds",
          "Analyze today's farm weather advisories"
        ];
    }
  };

  const submitMessage = async (text: string) => {
    if ((!text.trim() && !attachedImage) || isLoading) return;

    let contentToDisplay = text;
    if (attachedImage) {
      contentToDisplay = `![Attached Image](${attachedImage})\n\n${text}`;
    }

    // Attach contextual page info quietly
    const pageContext = `[Context: User is currently on page ${location.pathname}]`;
    const fullTextForAPI = `${pageContext}\n${text}`;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: contentToDisplay,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImage(null);
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    try {
      const apiMessages = [...messages, { ...userMsg, content: fullTextForAPI }].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { value, done } = await reader.read();
          isDone = done;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') {
                  isDone = true;
                  break;
                }
                try {
                  const data = JSON.parse(dataStr);
                  if (data.text) {
                    setMessages(prev => prev.map(m => 
                      m.id === assistantId ? { ...m, content: m.content + data.text } : m
                    ));
                  }
                } catch (e) {
                  // ignore JSON chunk parse error
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Copilot Error:", err);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: "**Error:** I encountered an issue retrieving data. Please check your connection or try again." } 
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          setInput(transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {/* Floating Trigger Button (Always available in bottom-right if drawer closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-full shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105 active:scale-95"
            title="Open AgriGPT Embedded AI Assistant"
          >
            <Sparkles className="w-5 h-5 text-zinc-950 animate-pulse" />
            <span className="text-xs sm:text-sm tracking-tight font-extrabold">Ask AgriGPT</span>
            <span className="w-2 h-2 rounded-full bg-zinc-950 animate-ping" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-over Embedded Copilot Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed inset-y-0 right-0 z-50 bg-[#0c0c0e] border-l border-zinc-800 shadow-2xl flex flex-col transition-all duration-300 ${
              isExpanded 
                ? 'w-full md:w-[650px]' 
                : 'w-full sm:w-[420px]'
            }`}
          >
            {/* Drawer Header */}
            <div className="h-14 bg-[#121215] border-b border-zinc-800/80 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    AgriGPT AI Copilot
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h2>
                  <p className="text-[10px] text-zinc-400">Inbuilt Context-Aware Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors hidden sm:block"
                  title={isExpanded ? "Collapse width" : "Expand width"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Close Assistant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Context Prompt Chips Header Ribbon */}
            <div className="px-3 py-2 bg-zinc-950/80 border-b border-zinc-800/60 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Bot className="w-3 h-3" /> Page Insights:
              </span>
              {getContextPrompts().map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => submitMessage(prompt)}
                  className="text-[10px] whitespace-nowrap px-2.5 py-1 bg-zinc-900 hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-zinc-800 text-zinc-300 rounded-full transition-all shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-zinc-950 font-medium rounded-tr-none'
                        : 'bg-zinc-900/90 border border-zinc-800/80 text-zinc-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MessageRenderer content={msg.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl w-fit">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>AgriGPT is processing knowledge base & field telemetry...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Attachment Preview */}
            {attachedImage && (
              <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <img src={attachedImage} alt="Attachment" className="w-10 h-10 object-cover rounded-lg border border-zinc-700" />
                  <span className="text-xs text-zinc-300">Image attached for diagnosis</span>
                </div>
                <button onClick={() => setAttachedImage(null)} className="text-xs text-rose-400 hover:underline">
                  Remove
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-[#121215] border-t border-zinc-800 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMessage(input);
                }}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 focus-within:border-emerald-500/60 transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Attach leaf or field image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleListen}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800'
                  }`}
                  title="Voice dictation"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AgriGPT anything about this page..."
                  className="flex-1 bg-transparent border-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none px-1"
                />

                <button
                  type="submit"
                  disabled={(!input.trim() && !attachedImage) || isLoading}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
