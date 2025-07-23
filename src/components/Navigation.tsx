import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Heart, 
  User, 
  Home, 
  Settings,
  Sparkles 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface NavigationProps {
  className?: string;
}

const Navigation = ({ className }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    {
      path: "/",
      icon: Home,
      label: "Home",
      gradient: "from-sage to-lavender"
    },
    {
      path: "/chat",
      icon: MessageCircle,
      label: "Chat",
      gradient: "from-spark to-coral"
    },
    {
      path: "/memories",
      icon: Heart,
      label: "Memories",
      gradient: "from-coral to-coral-light"
    }
  ];

  if (!mounted) return null;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 glass border-t backdrop-blur-lg",
      "safe-area-inset-bottom",
      className
    )}>
      <div className="flex items-center justify-around px-6 py-3 max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label, gradient }) => {
          const isActive = location.pathname === path;
          
          return (
            <Button
              key={path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl transition-all duration-300",
                "hover:scale-105 active:scale-95",
                isActive && "shadow-warm"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
                isActive 
                  ? `bg-gradient-to-r ${gradient} shadow-glow` 
                  : "hover:bg-secondary/50"
              )}>
                <Icon className={cn(
                  "w-4 h-4 transition-colors duration-300",
                  isActive ? "text-white" : "text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors duration-300",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;