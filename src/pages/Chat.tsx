import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

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
        text: "Hi there! 👋 I'm MeetCute, and I'm genuinely excited to meet you.\n\nI spend my days helping people reconnect with those amazing humans they crossed paths with but never got to properly meet. You know that feeling when you see someone and there's just... a spark? I live for those stories.\n\nDo you have a moment like that you'd like to share with me?",
        sender: "ai",
        timestamp: new Date(),
      };

      setTimeout(() => {
        setMessages([greeting]);
      }, 500);
    }
  }, []); // Empty dependency array so it only runs once

  const simulateAIResponse = (userMessage: string) => {
    console.log("AI function started with message:", userMessage);
    setIsTyping(true);
    
    setTimeout(() => {
      let aiResponse = "";
      
      // Simple logic - if the message contains memory details, respond positively
      if (userMessage.toLowerCase().includes("saw") && 
          (userMessage.toLowerCase().includes("yesterday") || userMessage.toLowerCase().includes("today")) &&
          userMessage.length > 30) {
        
        aiResponse = "This gave me actual goosebumps! 💫 What a beautiful, detailed memory.\n\nI'm carefully storing this in your Spark Vault with all those perfect details about the time, place, and person. If someone else describes this same moment from their perspective, I'll know immediately.\n\nIs there anything else about that moment - maybe the vibe, any brief interaction, or what made it feel so special?";
        
      } else if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
        
        aiResponse = "Hi there! 👋 I'm MeetCute, and I'm genuinely excited to meet you.\n\nI spend my days helping people reconnect with those amazing humans they crossed paths with but never got to properly meet. You know that feeling when you see someone and there's just... a spark? I live for those stories.\n\nDo you have a moment like that you'd like to share with me?";
        
      } else {
        
        aiResponse = "I'd love to hear more details! Can you tell me when and where this happened, and what the person looked like? The more specific you are, the better I can help match you with someone who remembers the same moment.";
        
      }

      console.log("AI will respond with:", aiResponse);

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([aiMessage]));
      setIsTyping(false);
    }, 1000); // Reduced delay to see faster
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
    
    console.log("About to call simulateAIResponse with:", currentMessage);
    simulateAIResponse(currentMessage);
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