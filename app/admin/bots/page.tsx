'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { ChatMessage } from '@/types';
import {
  Send,
  Bot,
  User,
  Loader2,
  Briefcase,
  Megaphone,
  Shield,
  DollarSign,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

interface BotConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof Briefcase;
  color: string;
  bgColor: string;
  borderColor: string;
  suggestions: string[];
}

const BOTS: BotConfig[] = [
  {
    id: 'manager',
    name: 'Business Manager',
    description: 'Strategy, operations, scheduling, hiring, growth planning',
    icon: Briefcase,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    suggestions: [
      'How should I price a maintenance agreement to be profitable?',
      'Create a plan to add 2 new techs this year',
      'What KPIs should I track weekly?',
      'Help me write an SOP for service call procedures',
      'How do I handle a tech who is consistently late?',
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Expert',
    description: 'Social media, ads, email campaigns, branding, reviews',
    icon: Megaphone,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    suggestions: [
      'Write a Facebook post about spring AC tune-up specials',
      'Create a Google Ads campaign for emergency repair services',
      'Draft a referral program that actually works',
      'How should I respond to a 1-star review?',
      'Give me a month of social media content ideas',
    ],
  },
  {
    id: 'security',
    name: 'Security & Compliance',
    description: 'Safety, OSHA, EPA, insurance, data protection, policies',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    suggestions: [
      'What OSHA requirements apply to my HVAC techs?',
      'Create a vehicle safety checklist for my fleet',
      'Help me set up a refrigerant tracking system for EPA compliance',
      'What insurance coverage do I need for my business?',
      'Draft a cybersecurity policy for my team',
    ],
  },
  {
    id: 'finance',
    name: 'Financial Advisor',
    description: 'Pricing, profitability, cash flow, taxes, budgeting',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    suggestions: [
      'Calculate my true cost per hour for a technician',
      'What should my parts markup be to hit 20% net profit?',
      'Help me create a seasonal cash flow plan',
      'Should I buy or lease my next service van?',
      'Analyze which service types are most profitable',
    ],
  },
];

export default function BotsPage() {
  const [activeBot, setActiveBot] = useState<BotConfig | null>(null);
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = activeBot ? (conversations[activeBot.id] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const setMessages = (botId: string, msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setConversations(prev => ({
      ...prev,
      [botId]: typeof msgs === 'function' ? msgs(prev[botId] || []) : msgs,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeBot) return;

    const userMessage = input.trim();
    const botId = activeBot.id;
    setInput('');
    setMessages(botId, prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const allMessages = [...(conversations[botId] || []), { role: 'user', content: userMessage }];
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, bot: botId }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(botId, prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMessage += decoder.decode(value);
        setMessages(botId, prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
          return updated;
        });
      }
    } catch (error) {
      console.error('Bot error:', error);
      setMessages(botId, prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }

    setIsLoading(false);
  };

  // Bot selection grid
  if (!activeBot) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            AI Business Bots
          </h1>
          <p className="text-gray-600 mt-1">Powered by GPT-5.4 — your AI team for running a better business</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BOTS.map((bot) => {
            const msgCount = (conversations[bot.id] || []).length;
            return (
              <button
                key={bot.id}
                onClick={() => setActiveBot(bot)}
                className={`text-left p-5 rounded-xl border-2 ${bot.borderColor} ${bot.bgColor} hover:shadow-lg transition-all group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bot.bgColor} border ${bot.borderColor} group-hover:scale-110 transition-transform`}>
                    <bot.icon className={`w-6 h-6 ${bot.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900">{bot.name}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{bot.description}</p>
                    {msgCount > 0 && (
                      <p className="text-xs text-gray-400 mt-2">{msgCount} messages in conversation</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">Tip:</span> Each bot remembers your conversation within this session. Switch between bots freely — your chats are preserved.
          </p>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveBot(null)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeBot.bgColor} border ${activeBot.borderColor}`}>
          <activeBot.icon className={`w-5 h-5 ${activeBot.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">{activeBot.name}</h2>
          <p className="text-xs text-gray-500">GPT-5.4 with web search</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages(activeBot.id, []); }}
            className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-4 -mx-1 px-1">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${activeBot.bgColor} border ${activeBot.borderColor} mx-auto mb-4`}>
              <activeBot.icon className={`w-8 h-8 ${activeBot.color}`} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{activeBot.name}</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{activeBot.description}</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-2">
              {activeBot.suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className={`px-3 py-2.5 text-sm ${activeBot.bgColor} hover:opacity-80 active:opacity-60 rounded-lg text-gray-700 transition-colors border ${activeBot.borderColor}`}
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
                <div className={`w-7 h-7 sm:w-8 sm:h-8 ${activeBot.bgColor} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                  <activeBot.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${activeBot.color}`} />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-2xl px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 justify-start">
            <div className={`w-8 h-8 ${activeBot.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
              <activeBot.icon className={`w-5 h-5 ${activeBot.color}`} />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-gray-200">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask the ${activeBot.name}...`}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={!input.trim() || isLoading}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
