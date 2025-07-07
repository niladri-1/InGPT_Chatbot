'use client';

import { motion } from 'framer-motion';

export function TypingAnimation() {
  return (
    <div className="flex items-center space-x-2 p-4 bg-transparent rounded-lg">
      <div className="flex space-x-1">
        <motion.div
          className="w-2 h-2 bg-muted-foreground/60 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0,
          }}
        />
        <motion.div
          className="w-2 h-2 bg-muted-foreground/60 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.2,
          }}
        />
        <motion.div
          className="w-2 h-2 bg-muted-foreground/60 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.4,
          }}
        />
      </div>
      <span className="text-sm text-muted-foreground/70">Thinking...</span>
    </div>
  );
}