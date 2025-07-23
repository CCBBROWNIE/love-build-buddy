import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, Mic, MicOff, Volume2, VolumeX, Settings } from "lucide-react";
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
        text: "Hi there! 👋 I'm MeetCute, and I'm genuinely excited to meet you.\n\nI spend my days helping people reconnect with those amazing humans they crossed paths with but never got to properly meet. You know that feeling when you see someone and there's just... a spark? I live for those stories.\n\nDo you have a moment like that you'd like to share with me?",
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
    
    if (!apiKey) {
      setShowApiDialog(true);
      setIsTyping(false);
      return;
    }
    
    setIsTyping(true);
    
    try {
      const conversationHistory = messages.filter(msg => !msg.typing).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Using a CORS proxy to bypass browser restrictions
      const response = await fetch('https://cors-anywhere.herokuapp.com/https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 400,
          system: `You are MeetCute, an AI assistant that helps people reconnect with someone they briefly encountered but never got to properly meet. You're warm, enthusiastic, and genuinely excited about these spark moments between people.

Your personality:
- Warm, friendly, and genuinely excited about human connections
- You use emojis naturally (but not excessively)  
- You're empathetic and understanding
- You ask follow-up questions to get more details
- You make users feel heard and understood

Your role:
- Help users describe their "missed connection" memories in detail
- Store these memories to potentially match with others who experienced the same moment
- Ask for specific details: time, place, what the person looked like, what happened
- Respond enthusiastically when someone shares a detailed memory
- Make users feel like their story matters

Always respond as MeetCute with genuine enthusiasm for these human connection stories.`,
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: userMessage
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.content[0]?.text || "I'm sorry, I had trouble processing that. Could you try again?";

      console.log("AI responded with:", aiResponse);

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([aiMessage]));
      setIsTyping(false);
      
    } catch (error) {
      console.error('Claude API error:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I'm having trouble connecting right now. Please check your API key and try again.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([errorMessage]));
      setIsTyping(false);
      
      toast({
        title: "Connection Error",
        description: "Failed to connect to AI. Please check your API key.",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="border-2 border-spark">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-spark to-coral text-midnight font-bold">
              MC
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold">
              <span className="text-black">Meet</span>
              <span className="text-spark">Cute</span>
            </h1>
            <p className="text-sm text-black">Your AI Memory Assistant</p>
          </div>
        </div>
        
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] ${message.sender === "user" ? "order-2" : "order-1"}`}>
              {message.sender === "ai" && (
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-spark" />
                  <span className="text-sm font-medium text-black">MeetCute</span>
                </div>
              )}
              
              <Card className={`${
                message.sender === "user" 
                  ? "bg-gradient-to-r from-spark to-coral text-black" 
                  : "bg-card border-border"
              } ${message.typing ? "animate-pulse" : ""}`}>
                <CardContent className="p-3">
                  <p className={`text-sm whitespace-pre-wrap ${
                    message.sender === "user" ? "text-black" : "text-black"
                  }`}>
                    {message.text}
                  </p>
                  <p className={`text-xs mt-1 ${
                    message.sender === "user" 
                      ? "text-black/70" 
                      : "text-black/70"
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

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleRecording}
            className={`rounded-full ${isRecording ? "bg-coral text-midnight" : ""}`}
          >
            {isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          
          <Input
            placeholder="Describe your memory..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          
          <Button
            variant="spark"
            size="sm"
            onClick={handleSendMessage}
            disabled={!currentMessage.trim()}
            className="rounded-full px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-xs text-black mt-2 text-center">
          Be specific about time, place, and what happened for better matching
        </p>
      </div>
    </div>
  );
};

export default Chat;