import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LiquidNegateCursorProps {
  enabled?: boolean;
}

export default function LiquidNegateCursor({ enabled = true }: LiquidNegateCursorProps) {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.getAttribute('role') === 'button' ||
          target.closest('button') ||
          target.closest('a') ||
          target.classList.contains('cursor-pointer'))
      ) {
        setIsHoveringInteractive(true);
      } else {
        setIsHoveringInteractive(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, isVisible]);

  if (!enabled || !isVisible) return null;

  return (
    <>
      {/* Outer Liquid Morphing Color-Negate Lens */}
      <motion.div
        className="liquid-cursor-negate hidden lg:block animate-liquid-morph"
        animate={{
          x: mousePos.x,
          y: mousePos.y,
          width: isHoveringInteractive ? 72 : 36,
          height: isHoveringInteractive ? 72 : 36,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 28,
          mass: 0.25,
        }}
      />

      {/* Tiny Precision Inner Dot */}
      <motion.div
        className="fixed pointer-events-none z-[10000] w-2 h-2 rounded-full bg-white mix-blend-difference hidden lg:block"
        animate={{
          x: mousePos.x - 4,
          y: mousePos.y - 4,
        }}
        transition={{
          type: 'spring',
          stiffness: 900,
          damping: 35,
          mass: 0.1,
        }}
      />
    </>
  );
}
