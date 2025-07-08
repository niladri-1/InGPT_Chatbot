'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Sun,
  Moon,
  PanelLeft,
  Square
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { MessageBubble } from '@/components/message-bubble';
import { TypingAnimation } from '@/components/typing-animation';
import { TypingMessage } from '@/components/typing-message';
import { Sidebar } from '@/components/sidebar';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
  messages: Message[];
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to true
  const [typingMessage, setTypingMessage] = useState<string | null>(null);
  const [currentTypingContent, setCurrentTypingContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update document title based on active chat
  useEffect(() => {
    if (activeChat && chats.length > 0) {
      const currentChat = chats.find(chat => chat.id === activeChat);
      if (currentChat && currentChat.title !== 'New Chat') {
        document.title = `${currentChat.title} - InGPT`;
      } else {
        document.title = 'InGPT - AI Assistant';
      }
    } else {
      document.title = 'InGPT - AI Assistant';
    }
  }, [activeChat, chats]);

  // Improved scroll function
  const scrollToBottom = (smooth = true) => {
    if (scrollAreaRef.current && shouldAutoScroll) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  };

  // Check if user is at the bottom of the scroll area
  const isAtBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        return scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      }
    }
    return false;
  };

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    let isScrolling = false;
    
    const handleScroll = () => {
      // Prevent auto-scroll detection during programmatic scrolling
      if (isScrolling) return;
      
      // Check if user scrolled back to bottom
      if (isAtBottom()) {
        setShouldAutoScroll(true);
      } else {
        // Only disable auto-scroll if user manually scrolled up
        setShouldAutoScroll(false);
      }
    };

    // Override scrollTo to mark programmatic scrolling
    const originalScrollTo = scrollContainer.scrollTo;
    scrollContainer.scrollTo = function(...args: any[]) {
      isScrolling = true;
      originalScrollTo.apply(this, args as any);
      setTimeout(() => { isScrolling = false; }, 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      scrollContainer.scrollTo = originalScrollTo;
    };
  }, []);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, shouldAutoScroll]);

  // Scroll when typing starts
  useEffect(() => {
    if (typingMessage) {
      scrollToBottom();
    }
  }, [typingMessage, shouldAutoScroll]);

  // Reset auto-scroll when starting new generation
  useEffect(() => {
    if (isGenerating) {
      setShouldAutoScroll(true);
    }
  }, [isGenerating]);

  const generateChatTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  };

  const createNewChat = (): string => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: 'New Chat',
      timestamp: new Date(),
      messageCount: 0,
      messages: [],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChatId);
    setMessages([]);
    return newChatId;
  };

  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: newMessages,
              messageCount: newMessages.length,
              title:
                newMessages.length === 1
                  ? generateChatTitle(newMessages[0].content)
                  : chat.title,
            }
          : chat
      )
    );
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
    setIsGenerating(false);
    
    // Save partial response if there's any typed content
    if (currentTypingContent && activeChat) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: currentTypingContent,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, assistantMessage];
      setMessages(updatedMessages);
      updateChatMessages(activeChat, updatedMessages);
    }
    
    setTypingMessage(null);
    setCurrentTypingContent('');
    
    // Keep focus on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      toast.error('Gemini API key not configured. Please check your environment variables.');
      return;
    }

    let currentChatId = activeChat;
    if (!currentChatId) {
      currentChatId = createNewChat();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateChatMessages(currentChatId, newMessages);
    setInput('');
    setIsLoading(true);
    setIsGenerating(true);

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    // Keep focus on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent(input);
      
      // Check if generation was aborted
      if (controller.signal.aborted) {
        return;
      }

      const response = await result.response;
      const text = response.text();

      setIsLoading(false);
      setTypingMessage(text);
      setCurrentTypingContent(''); // Reset when new response starts
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        // Generation was stopped by user
        return;
      }
      console.error('Error generating response:', error);
      toast.error('Failed to generate response. Please try again.');
      setIsLoading(false);
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleTypingComplete = () => {
    if (typingMessage && activeChat) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typingMessage,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, assistantMessage];
      setMessages(updatedMessages);
      updateChatMessages(activeChat, updatedMessages);
      setTypingMessage(null);
      setCurrentTypingContent('');
      setIsGenerating(false);
      setAbortController(null);
      
      // Keep focus on textarea after response
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handlePartialUpdate = (content: string) => {
    setCurrentTypingContent(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating) {
        stopGeneration();
      } else {
        handleSendMessage();
      }
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    toast.success('Message copied to clipboard');
  };

  const handleChatSelect = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      // Stop any ongoing generation when switching chats
      if (isGenerating) {
        stopGeneration();
      }
      
      setActiveChat(chatId);
      setMessages(chat.messages);
      setIsSidebarOpen(false);
      // Keep focus on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom(false); // Instant scroll when switching chats
      }, 100);
    }
  };

  const handleNewChat = () => {
    // Stop any ongoing generation when creating new chat
    if (isGenerating) {
      stopGeneration();
    }
    
    createNewChat();
    setIsSidebarOpen(false);
    // Keep focus on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleDeleteChat = (chatId: string) => {
    // Stop generation if deleting the active chat
    if (activeChat === chatId && isGenerating) {
      stopGeneration();
    }
    
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChat === chatId) {
      setActiveChat(null);
      setMessages([]);
    }
    toast.success('Chat deleted');
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats(prev =>
      prev.map(chat => (chat.id === chatId ? { ...chat, title: newTitle } : chat))
    );
    toast.success('Chat renamed');
  };

  const suggestedQuestions = [
    'What is artificial intelligence?',
    'How does machine learning work?',
    'Write a Python function to sort a list',
    'Explain quantum computing in simple terms',
    'What are the benefits of renewable energy?',
    'How to create a responsive website?',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chats={chats}
        activeChat={activeChat}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
      />
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-80' : ''}`}>
        <header className="backdrop-blur-sm bg-background/60 sticky top-0 z-40 border-b border-border/20">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="text-3xl">🤖</div>
              <h1 className="text-2xl font-bold gradient-text">InGPT</h1>
            </div>
            {mounted && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-5xl">
          {messages.length === 0 && !typingMessage ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8">
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto text-6xl">🧠</div>
                <h2 className="text-3xl font-bold gradient-text">Hello! How can I help you today?</h2>
                <p className="text-muted-foreground/80 max-w-md mx-auto">
                  I'm here to assist you with questions, provide information, help with coding, and much more.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {suggestedQuestions.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all bg-transparent border-border/30 hover:border-border/60"
                      onClick={() => setInput(question)}
                    >
                      <CardContent className="p-4">
                        <p className="text-sm text-foreground/70">{question}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-200px)] pr-4">
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map(message => (
                  <MessageBubble key={message.id} message={message} onCopy={copyMessage} />
                ))}
                {typingMessage && (
                  <TypingMessage 
                    content={typingMessage} 
                    onComplete={handleTypingComplete}
                    onPartialUpdate={handlePartialUpdate}
                  />
                )}
                {isLoading && !typingMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start space-x-4 max-w-4xl mx-auto"
                  >
                    <div className="text-3xl">🤖</div>
                    <div className="flex-1">
                      <TypingAnimation />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
          
          <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border/20">
            <div className="container mx-auto px-4 py-4 max-w-5xl">
              <div className="relative max-w-4xl mx-auto">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="pr-12 min-h-[50px] resize-none bg-transparent border-border/30 focus:border-border/60 text-foreground/90"
                  disabled={isLoading || !!typingMessage}
                  autoFocus
                />
                <Button
                  onClick={isGenerating ? stopGeneration : handleSendMessage}
                  disabled={(!input.trim() && !isGenerating) || (isLoading && !isGenerating)}
                  size="icon"
                  className="absolute right-2 bottom-2 h-8 w-8"
                  variant={isGenerating ? "destructive" : "default"}
                >
                  {isGenerating ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}