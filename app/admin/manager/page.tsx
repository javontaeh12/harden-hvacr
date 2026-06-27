'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  ClipboardList,
  BarChart3,
  Megaphone,
  Truck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { label: 'Executive Briefing', prompt: 'Give me a full executive briefing on the business right now. Revenue, operations, pipeline, and anything I need to act on.', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { label: 'Financial Report', prompt: 'Generate a financial report for this month. Revenue vs expenses, profit margin, top expense categories, and cash flow analysis. Compare to last month if possible.', icon: DollarSign, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { label: 'Sales Pipeline', prompt: 'What does my sales pipeline look like? Pending quotes, their values, follow-up recommendations, and conversion strategy.', icon: BarChart3, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { label: 'Customer Analysis', prompt: 'Give me a customer analysis — total customers, growth trend, new customers this month, retention, and any at-risk accounts or expiring contracts.', icon: Users, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { label: 'Operations Check', prompt: "What's the operations status? Today's schedule, pending requests, active jobs, technician utilization, and any bottlenecks.", icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { label: 'Marketing Review', prompt: 'Review my marketing campaigns. What\'s active, what\'s the ROI, and what should I do next to drive more leads?', icon: Megaphone, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { label: 'Fleet & Inventory', prompt: 'Fleet and inventory status — total miles, fuel costs, any maintenance due, and low stock alerts.', icon: Truck, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { label: 'Action Items', prompt: 'What are the TOP 5 things I should focus on TODAY to move the business forward? Be specific and prioritize by impact.', icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200' },
];

export default function ManagerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/manager-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('API error');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullContent };
          return updated;
        });
      }

      if (!fullContent) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, I encountered an issue. Please try again.' };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Connection error. Please try again.' };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] -m-4 sm:-m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Operations Manager</h1>
            <p className="text-xs text-gray-500">Financial, Marketing, Sales &amp; Operations Expert</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New Chat
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {messages.length === 0 ? (
              <div className="max-w-3xl mx-auto">
                <div className="text-center py-6 sm:py-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Your Operations Manager</h2>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    I have real-time access to your entire business — financials, operations, customers, fleet, marketing, and more. Ask me anything or pick a quick action below.
                  </p>
                </div>

                {/* Quick action grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-4">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:shadow-md active:scale-[0.98] ${action.color}`}
                    >
                      <action.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-semibold">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {(msg.content || msg.role === 'user') && (
                      <div
                        className={`max-w-[85%] sm:max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gray-900 text-white rounded-br-md'
                            : 'bg-white text-gray-800 shadow-sm ring-1 ring-gray-100 rounded-bl-md'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.content === '' && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm ring-1 ring-gray-100">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        <span className="text-xs text-gray-400">Analyzing business data...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about financials, operations, customers, marketing..."
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-200 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white transition-all hover:from-violet-600 hover:to-purple-700 active:scale-95 disabled:opacity-40 shadow-sm"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
