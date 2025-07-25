import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface SparkAnimationProps {
  onComplete?: () => void;
}

const SparkAnimation = ({ onComplete }: SparkAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 4000); // Extended to 4 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative">
        {/* Main sparkles logo - bigger and slower animation */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <Sparkles className="w-24 h-24 text-spark" style={{ animation: 'spin 4s linear infinite' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-spark to-coral rounded-full opacity-30" style={{ animation: 'pulse 4s ease-in-out infinite' }}></div>
        </div>

        {/* Flying sparks in spark color - slower animations */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-spark rounded-full shadow-glow"
            style={{
              top: `${50 + 35 * Math.cos((i * Math.PI) / 4)}%`,
              left: `${50 + 35 * Math.sin((i * Math.PI) / 4)}%`,
              animation: `ping 4s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}

        {/* Outer ring of smaller sparks in coral color - slower animations */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`outer-${i}`}
            className="absolute w-2 h-2 bg-coral rounded-full shadow-soft"
            style={{
              top: `${50 + 45 * Math.cos((i * Math.PI) / 6)}%`,
              left: `${50 + 45 * Math.sin((i * Math.PI) / 6)}%`,
              animation: `bounce 4s ease-in-out infinite`,
              animationDelay: `${i * 0.33}s`,
            }}
          />
        ))}

        {/* Success text */}
        <div className="absolute top-full mt-8 left-1/2 transform -translate-x-1/2 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">It&apos;s a Match! ✨</h2>
          <p className="text-white/80">Opening your chat...</p>
        </div>
      </div>
    </div>
  );
};

export default SparkAnimation;