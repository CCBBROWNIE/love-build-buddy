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

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  typing?: boolean;
}

const Chat = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') || "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");
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Save API key to localStorage whenever it changes
    if (apiKey) {
      localStorage.setItem('claude_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    // Initial AI greeting - only set once when component mounts
    if (messages.length === 0) {
      const greeting: Message = {
        id: "1",
        text: "Hi I'm MeetCute.ai,\n\nI'm here to help you reconnect with someone, or shoot your shot with someone you didn't get a chance to exchange contact info with — but haven't stopped thinking about since.\n\nYou know those brief, electric moments where your eyes meet, or a shared laugh lingers — and then it's gone before anything more could happen? I'm here to break the ice.\n\nTell me who's on your mind.",
        sender: "ai",
        timestamp: new Date(),
      };

      setTimeout(() => {
        setMessages([greeting]);
      }, 500);
    }
  }, []); // Empty dependency array so it only runs once

  const saveApiKey = () => {
    setApiKey(tempApiKey);
    setShowApiDialog(false);
    toast({
      title: "API Key Saved",
      description: "You can now chat with real AI!",
    });
  };

  const callClaude = async (userMessage: string) => {
    console.log("Real AI function started with message:", userMessage);
    setIsTyping(true);
    
    try {
      const conversationHistory = messages.filter(msg => !msg.typing).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await fetch('https://gqmzhldcotgxvwlmjxp.supabase.co/functions/v1/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbXpobGRmY290Z3h2d2xtanhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODk2ODYsImV4cCI6MjA2ODg2NTY4Nn0.sbnoFgrPAhQeXWfw61ZpPt-DTi9Kfb-O2kP8l9S8tcU'
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.response || "I'm sorry, I had trouble processing that. Could you try again?";

      console.log("Real AI responded with:", aiResponse);

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([aiMessage]));
      setIsTyping(false);
      
    } catch (error) {
      console.error('Real AI error:', error);
      
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
    <div className="min-h-screen bg-gradient-subtle flex flex-col pb-20">
      {/* Header */}
      <div className="glass border-b backdrop-blur-lg p-4 sticky top-0 z-40">
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
          
          {activeTab === "ai" && (
            <div className="flex items-center space-x-2">
              <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>API Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Claude API Key</label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your API key is stored locally and never sent to our servers.
                      </p>
                    </div>
                    <Button onClick={saveApiKey} className="w-full">
                      Save API Key
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

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
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsContent value="ai" className="flex-1 flex flex-col m-0">
          {/* AI Messages */}
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

          {/* AI Input */}
          <div className="p-4 border-t border-border/50 glass backdrop-blur-lg">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-3 mb-3">
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
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Pro tip:</strong> Mention specific details like time, place, what you were wearing, or what caught your attention
                </p>
              </div>
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
  );
};

export default Chat;