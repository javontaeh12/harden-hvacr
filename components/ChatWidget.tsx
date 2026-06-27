'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Send, X, Phone } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_REPLIES = [
  'Schedule Service',
  'Get a Price Quote',
  'Emergency Repair',
  'Membership Info',
];

export default function ChatWidget() {
  const pathname = usePathname();

  // Hide on admin, portal, login, and onboarding pages
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.startsWith('/login') || pathname.startsWith('/onboarding');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Alex from Harden HVAC & Refrigeration. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCollected, setPhoneCollected] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Only auto-focus on desktop (not mobile — prevents keyboard from popping up)
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const isMobile = window.innerWidth < 640;
      if (!isMobile) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  // Lock body scroll when chat is open on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Listen for 'open-chat' custom event from other components
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Add a placeholder for streaming assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/customer-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          phone: phone || undefined,
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

      // If we got no content from streaming, set a fallback
      if (!fullContent) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: "Sorry, I couldn't process that. Please call us at (956) 669-9093 for help.",
          };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please call us directly at (956) 669-9093 for immediate help.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      setPhoneCollected(true);
      setShowPhonePrompt(false);
    }
  };

  const skipPhone = () => {
    setShowPhonePrompt(false);
  };

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const showQuickReplies = userMessageCount === 0 && !isLoading;

  if (hidden) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-[#1e40af] px-5 py-3 text-white shadow-lg transition-all hover:bg-blue-800 hover:shadow-xl active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Chat with Alex</span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px] sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1e40af] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                A
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Alex</p>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-[11px] leading-tight text-blue-200">Online now</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3">
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Skip empty assistant placeholders */}
                  {(msg.content || msg.role === 'user') && (
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'rounded-br-md bg-[#1e40af] text-white'
                          : 'rounded-bl-md bg-white text-gray-800 shadow-sm ring-1 ring-gray-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator — only when streaming hasn't started */}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick reply chips */}
              {showQuickReplies && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {QUICK_REPLIES.map((text) => (
                    <button
                      key={text}
                      onClick={() => sendMessage(text)}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 active:scale-95"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              {/* Phone number prompt */}
              {showPhonePrompt && !phoneCollected && messages.length >= 1 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                    <p className="mb-2 text-sm text-gray-700">
                      Want us to follow up? Drop your phone number (optional):
                    </p>
                    <form onSubmit={handlePhoneSubmit} className="flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-[#1e40af] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800"
                      >
                        Save
                      </button>
                    </form>
                    <button
                      onClick={skipPhone}
                      className="mt-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {/* Phone saved confirmation */}
              {phoneCollected && messages.length <= 2 && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100">
                    Got it! I have your number on file.
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e40af] text-white transition-all hover:bg-blue-800 active:scale-95 disabled:opacity-40 disabled:hover:bg-[#1e40af]"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
