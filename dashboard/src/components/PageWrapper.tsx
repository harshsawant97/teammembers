import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

const AmbientOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
    <motion.div
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen"
    />
    <motion.div
      animate={{
        x: [0, -150, 100, 0],
        y: [0, 150, -100, 0],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] bg-teal-500/10 rounded-full blur-[150px] mix-blend-screen"
    />
  </div>
);

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -10,
    scale: 1.02
  }
};

const pageTransition = {
  type: "tween" as const,
  ease: "anticipate" as const,
  duration: 0.4
};

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`w-full relative z-0 ${className || ''}`}
    >
      <AmbientOrbs />
      {children}
    </motion.div>
  );
};
