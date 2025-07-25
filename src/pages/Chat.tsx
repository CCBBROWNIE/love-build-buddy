import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, MessageCircle, Heart } from "lucide-react";
import AIAssistant from "@/components/AIAssistant";
import SparkMessages from "@/components/SparkMessages";
import PrivateMessages from "@/components/PrivateMessages";

const Chat = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai");

  // Listen for custom event to open spark messages
  useEffect(() => {
    const handleOpenSparkMessages = () => {
      setActiveTab("sparks");
    };

    window.addEventListener('openSparkMessages', handleOpenSparkMessages);
    return () => window.removeEventListener('openSparkMessages', handleOpenSparkMessages);
  }, []);

  const handleNavigateToMemories = () => {
    navigate('/memories');
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="bg-background/95 border-b border-border/50 backdrop-blur-lg p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="sparks" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Spark Messages
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
                {activeTab === "ai" ? "MC" : activeTab === "sparks" ? "✨" : "PM"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg font-heading">
                {activeTab === "ai" ? (
                  <>
                    <span className="text-foreground">Meet</span>
                    <span className="text-spark">Cute</span>
                  </>
                ) : activeTab === "sparks" ? (
                  <span className="text-foreground">Spark Messages</span>
                ) : (
                  <span className="text-foreground">Private Messages</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === "ai" 
                  ? "Your AI Memory Assistant" 
                  : activeTab === "sparks"
                  ? "Chat with your confirmed matches"
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

          <TabsContent value="sparks" className="flex-1 flex flex-col m-0">
            <SparkMessages />
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