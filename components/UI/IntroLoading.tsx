import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// ==========================================
// 1. Logo Component (Exact Isometric SVG)
// ==========================================
interface LogoProps {
  pathsRef?: React.MutableRefObject<SVGPathElement[]>;
  className?: string;
  color?: string;
}

const Logo: React.FC<LogoProps> = ({ pathsRef, className, color = "#ffffff" }) => {
  const setRef = (index: number) => (el: SVGPathElement | null) => {
    if (pathsRef && el) {
      pathsRef.current[index] = el;
    }
  };
  /* <defs>

        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>*/

  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="-120 -130 240 260">
      <defs>

        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop className="logo-stop" offset="0%" stopColor="#ffffff" />
          <stop className="logo-stop" offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <g stroke={color} strokeWidth="20" strokeLinejoin="round" filter="url(#glow)">
        <path ref={setRef(0)} d="M 0 -115.47 L 100 -57.735 L 100 -5 L 0 -62.735 L -100 -5 L -100 -57.735 Z" fill="none" />
        <path ref={setRef(1)} d="M 0 -42.735 L 74.02 0 L 0 42.735 L -74.02 0 Z" fill="none" />
        <path ref={setRef(2)} d="M -100 5 L -17.32 52.735 L -17.32 105.47 L -100 57.735 Z" fill="none" />
        <path ref={setRef(3)} d="M 100 5 L 17.32 52.735 L 17.32 105.47 L 100 57.735 Z" fill="none" />
      </g>
    </svg>
  );
};

// ==========================================
// 2. Logo Animation Content
// ==========================================
interface MotionAppContentProps {
  onComplete?: () => void;
  theme?: 'dark' | 'light';
}

const MotionAppContent: React.FC<MotionAppContentProps> = ({ onComplete, theme = 'dark' }) => {
  const introLogoPaths = useRef<SVGPathElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Initializing LabSTX.");
  const isDark = theme === 'dark';

  const statusMessages = [
    "Initializing LabSTX...",
    "Loading Clarity environment...",
    "Setting up workspace...",
    "Scanning project files...",
    "Preparing the IDE environment...",
    "Welcome to LabSTX"
  ];

  // GSAP Logo Animation Sequence
  useEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline();
      const paths = introLogoPaths.current;
      const logoColor = isDark ? "#ffffff" : "#000000";

      // 1. Initial High-End Setup
      paths.forEach((path) => {
        const length = path.getTotalLength() || 500;
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
          fill: 'url(#logoGradient)',
          fillOpacity: 0,
          strokeWidth: 2,
          opacity: 0,
          stroke: logoColor,
        });
      });

      gsap.set(".logo-stop", { stopColor: logoColor });

      gsap.set(textRef.current, { opacity: 0, y: 20 });
      gsap.set(progressBarRef.current, { scaleX: 0, transformOrigin: "left" });
      gsap.set(statusRef.current, { opacity: 0 });

      // Explode pieces outward for dramatic assembly
      gsap.set(paths[0], { y: -60, x: -30, opacity: 0 });
      gsap.set(paths[1], { scale: 0, rotation: -45, opacity: 0 });
      gsap.set(paths[2], { x: -40, y: 40, opacity: 0 });
      gsap.set(paths[3], { x: 40, y: 40, opacity: 0 });

      // 2. Blueprint Trace & Assemble
      tl.to(paths, {
        opacity: 1,
        strokeDashoffset: 0,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        duration: 1.8,
        stagger: 0.2,
        ease: "power4.out"
      })
        // 3. The Solidification
        .to(paths, {
          fillOpacity: 1,
          strokeWidth: 1,
          duration: 1,
          stagger: { from: "center", amount: 0.3 },
          ease: "power2.inOut"
        }, "-=0.5")
        // Smoothly animate the gradient stops to add color
        .to(".logo-stop", {
          stopColor: logoColor,
          duration: 1.5,
          ease: "sine.inOut"
        }, "-=1")
        // 4. Reveal Text
        .to(textRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out"
        }, "-=0.3")
        // 5. Reveal Status & Progress
        .to(statusRef.current, {
          opacity: 1,
          duration: 0.5
        }, "-=0.5")
        .to(progressBarRef.current, {
          scaleX: 1,
          duration: 3,
          ease: "none",
          onUpdate: function () {
            const progress = this.progress();
            const messageIndex = Math.min(
              Math.floor(progress * statusMessages.length),
              statusMessages.length - 1
            );
            if (statusMessages[messageIndex] !== status) {
              setStatus(statusMessages[messageIndex]);
            }
          },
          onComplete: () => {
            gsap.to(containerRef.current, {
              opacity: 0,
              duration: 0.6,
              ease: "power2.in",
              onComplete: () => {
                if (onComplete) onComplete();
              }
            });
          }
        });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete, isDark]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] ${isDark ? 'bg-black' : 'bg-white'} flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-500`}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] ${isDark ? 'bg-blue-900/10' : 'bg-blue-100/30'}`} />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo */}
        <Logo
          pathsRef={introLogoPaths}
          className="w-20 h-18 md:w-40 md:h-40 mb-8 "
          color={isDark ? "#ffffff" : "#000000"}
        />

        {/* Brand Text */}
        <div ref={textRef} className="flex flex-col items-center text-center">
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'} mb-2`}>
            LabSTX<span className="text-[#3B82F6] pl-2">IDE</span>
          </h1>
          <p className={`${isDark ? 'text-caspier-muted' : 'text-gray-400'} text-xs  font-medium tracking-[0.2em] opacity-60`}>
            BUILDING THE FUTURE ON BITCOIN
          </p>
        </div>

        {/* Progress & Status */}
        <div className="mt-16 w-64 md:w-80">
          <div ref={statusRef} className="flex justify-between items-end mb-2">
            <span className={`text-[10px] ${isDark ? 'text-caspier-muted' : 'text-gray-500'} font-medium uppercase tracking-widest animate-pulse`}>
              {status}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-caspier-muted' : 'text-gray-400'} font-mono opacity-50`}>
              v1.2.1
            </span>
          </div>
          <div className={`h-[2px] w-full ${isDark ? 'bg-white/10' : 'bg-black/5'} rounded-full overflow-hidden`}>
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Legal/Version Footer */}
      <div className="absolute bottom-10 text-center opacity-20 transition-opacity hover:opacity-100">
        <p className={`text-[9px] ${isDark ? 'text-white' : 'text-black'} tracking-widest uppercase font-semibold`}>
          © 2026 LabSTX. Building the future on Stacks.
        </p>
      </div>
    </div>
  );
};

interface IntroLoadingProps {
  onComplete?: () => void;
  theme?: 'dark' | 'light';
}

export default function IntroLoading({ onComplete, theme }: IntroLoadingProps) {
  return <MotionAppContent onComplete={onComplete} theme={theme} />;
}