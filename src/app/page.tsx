'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const QUICK_QUESTIONS = [
  '报到流程是什么？',
  '宿舍怎么安排？',
  '军训需要准备什么？',
  '选课怎么选？',
  '食堂推荐',
  '转专业政策',
  '助学贷款怎么申请？',
  '校园快递在哪取？',
];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好呀！我是济大四的学长，欢迎来到济南大学！有什么关于入学的问题都可以问我，报到流程、宿舍、军训、选课、食堂……我都能帮你解答~',
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.id !== 'welcome' || m.content !== '')
              .slice(-10)
              .map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: content.trim() },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: '抱歉，网络好像出了点问题，请稍后再试一次~',
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAFBFC]">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-[720px] mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4A90D9] flex items-center justify-center text-white font-semibold text-sm">
            济
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-[#2C3E50] leading-tight">
              济大新生答疑助手
            </h1>
            <p className="text-xs text-[#7F8C9B] leading-tight mt-0.5">
              大四学长在线，有问必答
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#52C4A0] animate-pulse"></span>
            <span className="text-xs text-[#7F8C9B]">在线</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-[720px] mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2.5 animate-[fadeInUp_0.2s_ease-out] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  message.role === 'user'
                    ? 'bg-[#E8F4FD] text-[#4A90D9]'
                    : 'bg-[#4A90D9] text-white'
                }`}
              >
                {message.role === 'user' ? '我' : '学长'}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-[#4A90D9] text-white rounded-tr-md'
                    : 'bg-[#F5F7FA] text-[#2C3E50] rounded-tl-md'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content || (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7F8C9B] animate-bounce [animation-delay:0ms]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7F8C9B] animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7F8C9B] animate-bounce [animation-delay:300ms]"></span>
                    </span>
                  )}
                </div>
                <div
                  className={`text-[10px] mt-1 ${
                    message.role === 'user'
                      ? 'text-blue-100 text-right'
                      : 'text-[#7F8C9B]'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="max-w-[720px] mx-auto">
            <p className="text-xs text-[#7F8C9B] mb-2">猜你想问：</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-[13px] rounded-full bg-white border border-gray-200 text-[#2C3E50] hover:bg-[#E8F4FD] hover:border-[#4A90D9] hover:text-[#4A90D9] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题，按 Enter 发送..."
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-200 bg-[#FAFBFC] px-4 py-2.5 text-sm text-[#2C3E50] placeholder:text-[#7F8C9B] focus:outline-none focus:border-[#4A90D9] focus:ring-1 focus:ring-[#4A90D9] transition-colors"
                style={{ minHeight: '40px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height =
                    Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-[#4A90D9] text-white flex items-center justify-center hover:bg-[#3A7BC8] active:scale-95 transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-[#7F8C9B] text-center mt-2">
            仅解答济南大学长清主校区新生入学相关问题
          </p>
        </div>
      </footer>
    </div>
  );
}
