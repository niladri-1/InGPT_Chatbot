'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  onPartialUpdate?: (content: string) => void;
}

export function TypingMessage({ content, onComplete, onPartialUpdate }: TypingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const { theme } = useTheme();
  const messageRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom during typing
  const scrollToBottom = () => {
    const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
        
        // Call onPartialUpdate to keep parent component updated with current content
        if (onPartialUpdate) {
          onPartialUpdate(content.slice(0, currentIndex + 1));
        }
        
        // Scroll every few characters to keep up with typing
        if (currentIndex % 5 === 0) {
          scrollToBottom();
        }
      }, 10); // Faster typing speed

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, content, onComplete]);

  // Scroll when typing starts
  useEffect(() => {
    scrollToBottom();
  }, []);

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start space-x-4 w-full"
    >
      <div className="text-3xl flex-shrink-0">🤖</div>
      
      <div className="flex-1 max-w-4xl">
        <div className="bg-transparent rounded-lg p-4 w-full overflow-x-auto">
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
              {displayedContent}
            </ReactMarkdown>
            {currentIndex < content.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-foreground/70 ml-1"
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}