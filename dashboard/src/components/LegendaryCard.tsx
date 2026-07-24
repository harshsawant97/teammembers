import React, { MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

export const LegendaryCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // 3D Tilt calculations
  const rotateX = useSpring(useMotionValue(0), { stiffness: 400, damping: 40 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 400, damping: 40 });

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    
    // Spotlight position
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
    
    // Tilt position (from -10deg to 10deg for subtle pro effect)
    const x = (clientY - top - height / 2) / 20;
    const y = -(clientX - left - width / 2) / 20;
    
    rotateX.set(x);
    rotateY.set(y);
  }
  
  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_16px_48px_0_rgba(0,0,0,0.3)] transition-colors duration-500 hover:border-indigo-500/50 ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              rgba(99, 102, 241, 0.25),
              transparent 80%
            )
          `,
        }}
      />
      <div style={{ transform: "translateZ(40px)" }} className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
};
