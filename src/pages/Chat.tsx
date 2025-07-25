import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Send, Mic, MicOff, Volume2, VolumeX, Settings, MessageCircle, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  typing?: boolean;
}

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  useEffect(() => {
    // Initial AI greeting - only set once when component mounts
    if (messages.length === 0) {
      const greeting: Message = {
        id: "1",
        text: "Hi! I'm MeetCute's AI assistant. Want help writing about your real-life memory? Just tell me what happened — like where you were, what you noticed, and why it stood out. I'll help you save it for potential matches! ✨",
        sender: "ai",
        timestamp: new Date(),
      };

      setTimeout(() => {
        setMessages([greeting]);
      }, 500);
    }
  }, []); // Empty dependency array so it only runs once


  const callClaude = async (userMessage: string) => {
    console.log("=== CHAT DEBUG START ===");
    console.log("Real AI function started with message:", userMessage);
    setIsTyping(true);
    
    try {
      const conversationHistory = messages.filter(msg => !msg.typing).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      console.log("Previous messages:", conversationHistory);
      console.log("About to call supabase.functions.invoke...");

      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          message: userMessage,
          conversationHistory: conversationHistory,
          userId: user?.id
        }
      });

      console.log("Supabase function response:", { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(`AI function error: ${error.message || JSON.stringify(error)}`);
      }

      const aiResponse = data?.response || data?.error || "I'm sorry, I had trouble processing that. Could you try again?";

      console.log("Real AI responded with:", aiResponse);
      console.log("=== CHAT DEBUG SUCCESS ===");

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([aiMessage]));
      setIsTyping(false);

      // If AI suggests saving memory, we could show a save button here
      if (data?.suggested_action === 'save_memory') {
        console.log("AI suggests saving memory - could show save button");
      }
      
    } catch (error) {
      console.error('=== CHAT DEBUG ERROR ===');
      console.error('Real AI error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Fallback to smart simulation if API fails
      let aiResponse = "";
      const msgLower = userMessage.toLowerCase();
      
      if (msgLower.includes("hello") || msgLower.includes("hi") || msgLower.includes("hey")) {
        aiResponse = "Hey there! 😊 I'm MeetCute and I'm genuinely excited to meet you! I help people reconnect with those special moments when you see someone and feel a spark but circumstances don't allow you to properly meet. Do you have a story like that?";
      } else {
        aiResponse = `I love that you're here! 😊 Tell me about a missed connection moment - where you saw someone and felt that instant spark but couldn't properly meet them. Even the smallest details could help us find them! ✨`;
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([aiMessage]));
      setIsTyping(false);
      console.log("=== CHAT DEBUG FALLBACK USED ===");
    }
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    console.log("=== SENDING MESSAGE ===");
    console.log("Current message:", currentMessage);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage,
      sender: "user",
      timestamp: new Date(),
    };

    console.log("Adding user message:", userMessage);
    setMessages(prev => {
      console.log("Previous messages:", prev);
      return [...prev, userMessage];
    });
    
    // Add typing indicator
    const typingMessage: Message = {
      id: "typing",
      text: "MeetCute is typing...",
      sender: "ai",
      timestamp: new Date(),
      typing: true,
    };
    
    console.log("Adding typing message");
    setMessages(prev => [...prev, typingMessage]);
    
    console.log("About to call callClaude with:", currentMessage);
    callClaude(currentMessage);
    setCurrentMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Here you'd implement actual voice recording
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    // Here you'd implement text-to-speech
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-primary/5 to-background flex flex-col"> {/* Fixed background gradient */}
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
              <AvatarImage src="" />
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
                  : "Connect with people who found you"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAudio}
              className="rounded-full"
            >
              {audioEnabled ? (
                <Volume2 className="w-4 h-4 text-spark" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area - Flexible */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsContent value="ai" className="flex-1 flex flex-col m-0">
            {/* AI Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`max-w-[85%] ${message.sender === "user" ? "order-2" : "order-1"}`}>
                    {message.sender === "ai" && (
                      <div className="flex items-center space-x-2 mb-2 animate-slide-in-left">
                        <Sparkles className="w-4 h-4 text-spark animate-spark-pulse" />
                        <span className="text-sm font-medium text-foreground">MeetCute</span>
                      </div>
                    )}
                    
                    <Card className={`${
                      message.sender === "user" 
                        ? "bg-gradient-to-r from-spark to-coral text-midnight shadow-warm" 
                        : "bg-card/80 backdrop-blur-sm border-border/50 shadow-soft"
                    } ${message.typing ? "animate-pulse" : "hover:shadow-elegant transition-all duration-300"}`}>
                      <CardContent className="p-4">
                        <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                          message.sender === "user" ? "text-midnight font-medium" : "text-foreground"
                        }`}>
                          {message.text}
                        </p>
                        <p className={`text-xs mt-2 ${
                          message.sender === "user" 
                            ? "text-midnight/70" 
                            : "text-muted-foreground"
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="w-4 h-4 text-spark animate-spin" />
                      <span className="text-sm font-medium text-black">MeetCute is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* AI Input - Fixed at bottom */}
            <div className="border-t border-border/50 bg-background/95 backdrop-blur-lg p-4 mb-20"> {/* Consistent background */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleRecording}
                  className={`rounded-full transition-all duration-300 ${
                    isRecording 
                      ? "bg-coral text-white shadow-warm animate-spark-pulse" 
                      : "hover:scale-105"
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
                
                <Input
                  placeholder="Share your spark moment... Where were you? What happened?"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:shadow-warm focus:border-spark/50 transition-all duration-300"
                />
                
                <Button
                  variant="spark"
                  size="lg"
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim()}
                  className="rounded-xl px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-center mt-2">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Pro tip:</strong> Mention specific details like time, place, what you were wearing, or what caught your attention
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="flex-1 flex flex-col m-0">
            {/* Private Messages Content */}
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Private Messages</h2>
                <p className="text-muted-foreground mb-6">
                  Don't worry, people can only find your profile through the feed if you comment or post.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>No messages yet</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;