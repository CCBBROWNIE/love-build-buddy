import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Heart, 
  User, 
  Home, 
  Settings,
  Sparkles,
  Play,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

interface NavigationProps {
  className?: string;
}

const Navigation = ({ className }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { counts } = useNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    {
      path: "/feed",
      icon: Play,
      label: "Feed",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      path: "/profile",
      icon: User,
      label: "Profile",
      gradient: "from-blue-500 to-purple-500"
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
    },
    {
      path: "/matches",
      icon: Sparkles,
      label: "Matches",
      gradient: "from-spark to-yellow-400"
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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
              onClick={() => {
                if (path === "/chat" && counts.messages > 0) {
                  // Navigate to chat with private messages only
                  const targetTab = "messages";
                  navigate(path, { state: { activeTab: targetTab } });
                } else if (path === "/matches" && counts.sparkMessages > 0) {
                  // Navigate to matches with spark messages tab
                  navigate(path, { state: { activeTab: "sparks" } });
                } else {
                  navigate(path);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl transition-all duration-300",
                "hover:scale-105 active:scale-95",
                isActive && "shadow-warm"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 relative",
                isActive 
                  ? `bg-gradient-to-r ${gradient} shadow-glow` 
                  : "hover:bg-secondary/50"
              )}>
                <Icon className={cn(
                  "w-4 h-4 transition-colors duration-300",
                  isActive ? "text-white" : "text-muted-foreground"
                )} />
                
                {/* Notification badge */}
                {((path === "/matches" && (counts.matches > 0 || counts.sparkMessages > 0)) || 
                  (path === "/chat" && counts.privateMessages > 0)) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">
                      {path === "/matches" ? (counts.matches + counts.sparkMessages) : counts.privateMessages}
                    </span>
                  </div>
                )}
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
        
        {/* Sign Out Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:bg-destructive/20">
            <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors duration-300" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Sign Out
          </span>
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;