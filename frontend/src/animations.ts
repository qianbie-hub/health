export const fluidEase = [0.16, 1, 0.3, 1] as const;

export const elasticSnapSpring = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 18,
  mass: 0.5,
};

export const cardSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 32,
  mass: 0.8,
};

export const microSpring = {
  type: 'spring' as const,
  stiffness: 480,
  damping: 24,
};

export const drawerSpring = {
  type: 'spring' as const,
  damping: 32,
  stiffness: 300,
};

export const smoothSpring = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

// "Appear out of nowhere" materialization effect
export const materializeVariant = {
  hidden: {
    opacity: 0,
    scale: 0.72,
    y: 36,
    filter: 'blur(20px) brightness(1.6)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px) brightness(1)',
    transition: {
      duration: 0.75,
      ease: fluidEase,
    },
  },
};

export const fadeUpVariant = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: fluidEase,
    },
  },
};

export const scaleUpVariant = {
  hidden: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.55,
      ease: fluidEase,
    },
  },
};

// Liquid floating wave
export const liquidFloat = {
  animate: {
    y: [0, -12, 0, 8, 0],
    rotate: [0, 1.5, -1, 0.5, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

