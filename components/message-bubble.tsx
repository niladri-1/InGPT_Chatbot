'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
  onCopy: (content: string) => void;
}

export function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-4 w-full ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
    >
      <div className="text-3xl flex-shrink-0">
        {isUser ? '👤' : '🤖'}
      </div>
      
      <div className={`flex-1 max-w-4xl ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`${isUser ? 'bg-transparent' : 'bg-transparent'} rounded-lg p-4 w-full overflow-x-auto`}>
          <div className="flex flex-col space-y-3">
            <div className="min-w-0 overflow-x-auto">
              {isUser ? (
                <p className={`text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium ${isUser ? 'text-right' : 'text-left'}`}>
                  {message.content}
                </p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div className="overflow-x-auto">
                            <SyntaxHighlighter
                              style={theme === 'dark' ? oneDark : oneLight}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-md"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mt-6 mb-4 text-foreground/95">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mt-5 mb-3 text-foreground/95">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-medium mt-4 mb-2 text-foreground/95">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-3 leading-relaxed text-foreground/85">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground/95">
                          {children}
                        </strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-3 space-y-1 text-foreground/85">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground/85">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-border/50 pl-4 italic text-muted-foreground/80 mb-3">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs opacity-60 hover:opacity-100 transition-all"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" />
                    {isUser && <span className="ml-1 text-green-500">Copied!</span>}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    {isUser && <span className="ml-1">Copy</span>}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}