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
    // Initial AI greeting
    const greeting: Message = {
      id: "1",
      text: "Hi there! 👋 I'm MeetCute, your AI assistant.\n\nI'm here to help you find someone you met—or almost met—in real life.\n\nJust describe the memory, and I'll hold onto it until someone describes the same moment.\n\nReady to tell your story?",
      sender: "ai",
      timestamp: new Date(),
    };

    setTimeout(() => {
      setMessages([greeting]);
    }, 500);
  }, []);

  const simulateAIResponse = (userMessage: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      let aiResponse = "";
      
      // Check for missing key information
      const hasTime = /\b(morning|afternoon|evening|night|\d{1,2}:\d{2}|\d{1,2}(am|pm)|yesterday|today|last week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|\d{4})\b/i.test(userMessage);
      const hasLocation = /\b(at|in|near|outside|inside|gym|coffee|cafe|store|park|concert|beach|bar|restaurant|school|work|office|street|mall|theater|library|hospital|airport|train|bus|uber|lyft)\b/i.test(userMessage);
      const hasDescription = /\b(wearing|had|looked|tall|short|hair|eyes|shirt|dress|jacket|smile|beautiful|handsome|cute)\b/i.test(userMessage);
      
      if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
        aiResponse = "Hi there! 👋 I'm so excited to help you find that special connection.\n\nTell me about someone you encountered - where did you see them, when did it happen, and what caught your attention about them?";
      } 
      else if (userMessage.length < 20) {
        aiResponse = "I'd love to hear more! Can you paint me a detailed picture? The more specific you are, the better I can help match you with someone who remembers the same moment.\n\nTry describing:\n• Where exactly this happened\n• What time/day it was\n• What they looked like\n• What made this moment special";
      }
      else if (!hasTime && !hasLocation) {
        aiResponse = "That sounds like a meaningful encounter! I need a bit more detail to help find your match.\n\n📍 **Where exactly did this happen?** (specific location, street, venue name)\n\n⏰ **When was this?** (day, time, or even just morning/afternoon)\n\nThese details will help me match you with someone who remembers the same moment!";
      }
      else if (!hasTime) {
        aiResponse = "Great location details! Now I need to know:\n\n⏰ **When did this happen?**\n• What day was it?\n• What time of day?\n• How long ago?\n\nTiming is crucial for finding someone who was there at the exact same moment as you!";
      }
      else if (!hasLocation) {
        aiResponse = "Perfect timing info! Now tell me:\n\n📍 **Where exactly did this happen?**\n• What's the specific place or venue?\n• What part of the city/area?\n• Any landmarks nearby?\n\nLocation details help me find someone who was in that exact same spot!";
      }
      else if (!hasDescription) {
        aiResponse = "Excellent! I have the when and where. Now help me picture them:\n\n👤 **What did they look like?**\n• Hair color/style?\n• What were they wearing?\n• Height, build, or other features?\n• What caught your eye about them?\n\nThese visual details help confirm a match when someone else describes the same person!";
      }
      else if (userMessage.length > 80) {
        aiResponse = "Beautiful memory! 💫 I'm saving this in your Spark Vault.\n\nI have great details about the time, place, and person. Is there anything else that made this moment special? Maybe:\n• What they were doing\n• Any conversation or eye contact\n• Music playing or other atmosphere details\n\nIf someone else describes remembering this same moment, I'll let you know immediately!";
      }
      else {
        aiResponse = "This is coming together nicely! Just a few more details to make sure I can find your perfect match:\n\n• Can you be more specific about the location?\n• What time of day was this?\n• Any other details about what they looked like or what happened?\n\nThe more complete your memory, the better chance of finding someone who remembers you too!";
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([aiMessage]));
      setIsTyping(false);
    }, 1500);
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add typing indicator
    const typingMessage: Message = {
      id: "typing",
      text: "MeetCute is typing...",
      sender: "ai",
      timestamp: new Date(),
      typing: true,
    };
    
    setMessages(prev => [...prev, typingMessage]);
    
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