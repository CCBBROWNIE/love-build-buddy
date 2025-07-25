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
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative">
        {/* Main sparkles logo - same as MeetCute AI but bigger */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <Sparkles className="w-24 h-24 text-spark animate-spin" />
          <div className="absolute inset-0 bg-gradient-to-r from-spark to-coral rounded-full opacity-30 animate-pulse"></div>
        </div>

        {/* Flying sparks in spark color */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-spark rounded-full animate-ping shadow-glow"
            style={{
              top: `${50 + 35 * Math.cos((i * Math.PI) / 4)}%`,
              left: `${50 + 35 * Math.sin((i * Math.PI) / 4)}%`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.8s',
            }}
          />
        ))}

        {/* Outer ring of smaller sparks in coral color */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`outer-${i}`}
            className="absolute w-2 h-2 bg-coral rounded-full animate-bounce shadow-soft"
            style={{
              top: `${50 + 45 * Math.cos((i * Math.PI) / 6)}%`,
              left: `${50 + 45 * Math.sin((i * Math.PI) / 6)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: '1s',
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