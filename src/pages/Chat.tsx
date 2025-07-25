import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, MessageCircle } from "lucide-react";
import AIAssistant from "@/components/AIAssistant";
import PrivateMessages from "@/components/PrivateMessages";

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("ai");

  // Handle navigation state for directing to specific tab
  useEffect(() => {
    const state = location.state as { activeTab?: string };
    if (state?.activeTab && (state.activeTab === "ai" || state.activeTab === "messages")) {
      setActiveTab(state.activeTab);
      // Clear the state to prevent unwanted tab switches
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);


  const handleNavigateToMemories = () => {
    navigate('/memories');
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="bg-background/95 border-b border-border/50 backdrop-blur-lg p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Private Messages
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="border-2 border-spark shadow-warm animate-gentle-bounce">
              <AvatarFallback className="bg-gradient-to-br from-spark to-coral text-midnight font-bold">
                {activeTab === "ai" ? "MC" : "PM"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg font-heading">
                {activeTab === "ai" ? (
                  <>
                    <span className="text-foreground">Meet</span>
                    <span className="text-spark">Cute</span>
                  </>
                ) : (
                  <span className="text-foreground">Private Messages</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === "ai" 
                  ? "Your AI Memory Assistant" 
                  : "Direct conversations"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Flexible */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsContent value="ai" className="flex-1 flex flex-col m-0">
            <AIAssistant onNavigateToMemories={handleNavigateToMemories} />
          </TabsContent>

          <TabsContent value="messages" className="flex-1 flex flex-col m-0">
            <PrivateMessages />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;