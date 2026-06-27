'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ChatMessage } from '@/types';
import {
  Send,
  User,
  Loader2,
  Sparkles,
  ArrowLeft,
  Wrench,
  Thermometer,
  Zap,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

const SUGGESTIONS = [
  'AC not cooling — compressor running, fan running, but warm air',
  'Walk-in freezer alarm, temperature rising, compressor short cycling',
  'Furnace 3 flashes on control board, what does that mean?',
  'How do I check superheat and subcooling on a TXV system?',
  'Capacitor testing — how to check with a multimeter',
  'Mini split error code E1 on Mitsubishi — what do I check?',
  'Ice machine not making ice, water flowing but no freeze cycle',
  'How to properly evacuate and charge a system after coil replacement',
];

export default function TechAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const allMessages = [...messages, { role: 'user', content: userMessage }];
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, bot: 'tech' }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMessage += decoder.decode(value);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
          return updated;
        });
      }
    } catch (error) {
      console.error('Tech bot error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header — Navy gradient */}
      <div className="bg-gradient-to-r from-[#0a1f3f] to-[#1a3a5c] rounded-xl p-4 mb-4 flex items-center gap-3">
        <Link
          href="/admin/tech"
          className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </Link>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 border border-white/15">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">AI Tech Assistant</h2>
          <p className="text-xs text-white/60">GPT-5.4 HVAC & Refrigeration troubleshooting</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2 -mx-1 px-1">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#0a1f3f] to-[#1a3a5c] mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="text-lg font-bold text-[#0a1f3f] mb-1">Tech Assistant</h2>
            <p className="text-sm text-[#4a6580] mb-4 max-w-sm mx-auto">
              Your AI troubleshooting partner. Describe symptoms, error codes, or ask diagnostic questions.
            </p>

            {/* Quick category badges */}
            <div className="flex justify-center gap-2 mb-4">
              <Badge variant="info" size="md" icon={<Thermometer className="w-3 h-3" />}>HVAC</Badge>
              <Badge variant="default" size="md" icon={<Wrench className="w-3 h-3" />}>Refrigeration</Badge>
              <Badge variant="warning" size="md" icon={<Zap className="w-3 h-3" />}>Electrical</Badge>
              <Badge variant="danger" size="md" icon={<AlertTriangle className="w-3 h-3" />}>Error Codes</Badge>
            </div>

            {/* Quick suggestions — ember-outlined pills */}
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-4 py-2 text-sm border border-[#e55b2b]/30 text-[#e55b2b] rounded-full hover:bg-[#e55b2b]/5 active:bg-[#e55b2b]/10 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#0a1f3f] to-[#1a3a5c] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-2xl px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base ${
                  message.role === 'user'
                    ? 'bg-[#e55b2b]/10 text-[#0a1f3f]'
                    : 'bg-white border border-[#c8d8ea] text-[#0a1f3f]'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <p className="text-xs text-[#4a6580] mt-1.5 text-right">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#e55b2b]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#e55b2b]" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0a1f3f] to-[#1a3a5c] rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="bg-white border border-[#c8d8ea] px-4 py-3 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin text-[#4a6580]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — bottom-fixed bar */}
      <div className="bg-white border-t border-[#c8d8ea] pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the problem or ask a question..."
            className="flex-1 px-4 py-3 text-sm border border-[#c8d8ea] rounded-full focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b] text-[#0a1f3f] placeholder:text-[#4a6580]/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-[#e55b2b] text-white rounded-full p-3 hover:bg-[#d14e22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
