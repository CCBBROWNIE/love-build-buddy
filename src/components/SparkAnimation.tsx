import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface SparkAnimationProps {
  onComplete?: () => void;
}

const SparkAnimation = ({ onComplete }: SparkAnimationProps) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Phase 1: Initial explosion (0-1s)
    const phase1Timer = setTimeout(() => setAnimationPhase(1), 1000);
    
    // Phase 2: Continuous celebration (1-3s)
    const phase2Timer = setTimeout(() => setAnimationPhase(2), 3000);
    
    // Phase 3: Final burst and complete (3-4s)
    const phase3Timer = setTimeout(() => {
      setAnimationPhase(3);
      setTimeout(() => onComplete?.(), 1000); // Complete after final phase
    }, 4000);

    return () => {
      clearTimeout(phase1Timer);
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
    };
  }, [onComplete]);

  if (animationPhase === 3) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative">
        {/* Central spinning sparkle - gets bigger over time */}
        <div className="relative flex items-center justify-center">
          <Sparkles 
            className={`text-spark transition-all duration-1000 ${
              animationPhase === 0 ? 'w-16 h-16' : 
              animationPhase === 1 ? 'w-24 h-24' : 'w-32 h-32'
            }`}
            style={{ 
              animation: 'spin 2s linear infinite',
              filter: 'drop-shadow(0 0 20px hsl(var(--spark)))'
            }} 
          />
          
          {/* Pulsing background */}
          <div 
            className={`absolute rounded-full bg-gradient-to-r from-spark to-coral transition-all duration-1000 ${
              animationPhase === 0 ? 'w-20 h-20 opacity-20' :
              animationPhase === 1 ? 'w-32 h-32 opacity-30' : 'w-48 h-48 opacity-40'
            }`}
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          />
        </div>

        {/* Orbiting sparks - more appear over time */}
        {Array.from({ length: animationPhase >= 1 ? 12 : 6 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full transition-all duration-500 ${
              animationPhase === 0 ? 'w-2 h-2 bg-spark' :
              animationPhase === 1 ? 'w-3 h-3 bg-coral' : 'w-4 h-4 bg-gradient-to-r from-spark to-coral'
            }`}
            style={{
              top: `${50 + (animationPhase >= 1 ? 60 : 40) * Math.cos((i * Math.PI) / (animationPhase >= 1 ? 6 : 3))}%`,
              left: `${50 + (animationPhase >= 1 ? 60 : 40) * Math.sin((i * Math.PI) / (animationPhase >= 1 ? 6 : 3))}%`,
              animation: `ping 1s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
              filter: 'drop-shadow(0 0 10px currentColor)'
            }}
          />
        ))}

        {/* Flying confetti sparks - final phase */}
        {animationPhase >= 2 && Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`confetti-${i}`}
            className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-spark via-coral to-spark"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `bounce 0.8s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.8
            }}
          />
        ))}

        {/* Success text - appears after phase 1 */}
        {animationPhase >= 1 && (
          <div className="absolute top-full mt-8 left-1/2 transform -translate-x-1/2 text-center animate-fade-in">
            <h2 className={`font-bold text-white mb-2 transition-all duration-1000 ${
              animationPhase === 1 ? 'text-xl' : 'text-3xl'
            }`}>
              🎉 It's a Match! ✨
            </h2>
            <p className="text-white/80 text-lg">
              {animationPhase === 1 ? 'Creating your connection...' : 'Opening your chat portal...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SparkAnimation;