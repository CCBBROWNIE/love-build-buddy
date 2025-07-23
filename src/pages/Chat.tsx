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
    setIsTyping(true);
    
    setTimeout(() => {
      let aiResponse = "";
      
      // Handle conversational/personal questions naturally
      if (userMessage.toLowerCase().includes("how are you") || userMessage.toLowerCase().includes("how's it going")) {
        aiResponse = "I'm doing really well, thank you for asking! I've been helping people find their missed connections all day, and honestly, every story I hear makes me feel more optimistic about human connection.\n\nWhat about you? Ready to share a memory that's been on your mind?";
      }
      else if (userMessage.toLowerCase().includes("what's your name") || userMessage.toLowerCase().includes("who are you")) {
        aiResponse = "I'm MeetCute! I'm an AI designed specifically to help people reconnect with those special moments when they almost met someone but didn't exchange contact info.\n\nI love hearing about those butterflies-in-your-stomach encounters. Do you have one you'd like to share?";
      }
      else if (userMessage.toLowerCase().includes("thank you") || userMessage.toLowerCase().includes("thanks")) {
        aiResponse = "You're so welcome! That's exactly why I'm here. There's something magical about helping people find each other again.\n\nIs there a specific encounter you'd like my help with?";
      }
      else if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
        aiResponse = "Hi there! 👋 I'm MeetCute, and I'm genuinely excited to meet you.\n\nI spend my days helping people reconnect with those amazing humans they crossed paths with but never got to properly meet. You know that feeling when you see someone and there's just... a spark? I live for those stories.\n\nDo you have a moment like that you'd like to share with me?";
      }
      else {
        // Check for missing key information in memory stories
        const hasTime = /\b(morning|afternoon|evening|night|\d{1,2}:\d{2}|\d{1,2}(am|pm)|yesterday|today|last week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|\d{4})\b/i.test(userMessage);
        const hasLocation = /\b(at|in|near|outside|inside|gym|coffee|cafe|store|park|concert|beach|bar|restaurant|school|work|office|street|mall|theater|library|hospital|airport|train|bus|uber|lyft|apartment|complex|building|plaza|center)\b/i.test(userMessage);
        const hasDescription = /\b(wearing|had|looked|tall|short|hair|eyes|shirt|dress|jacket|smile|beautiful|handsome|cute)\b/i.test(userMessage);
        
        if (userMessage.length < 20) {
          aiResponse = "I can tell you're thinking about someone special! I'd love to hear the whole story though.\n\nCan you paint me a detailed picture? The more you share, the better chance I have of finding someone who remembers that exact same moment. What happened?";
        }
        else if (!hasTime && !hasLocation) {
          aiResponse = "Wow, I can already feel the connection in your story! This is exactly the kind of moment that gives me chills.\n\nTo help me find your match, I need two crucial pieces:\n\n📍 **Where exactly did this happen?** (the specific place)\n⏰ **When was this?** (day, time, or timeframe)\n\nThese details are like fingerprints - they help me match you with someone who was there at that exact moment!";
        }
        else if (!hasTime) {
          aiResponse = "I love how detailed you are about the place! That really helps me picture the scene.\n\nNow I'm curious about the timing:\n⏰ **When did this magical moment happen?**\n• What day was it?\n• What time of day?\n• How recent was this?\n\nTiming is everything when it comes to finding someone who shared that same moment with you!";
        }
        else if (!hasLocation) {
          aiResponse = "The timing details are perfect! I can almost feel myself there in that moment.\n\nNow tell me:\n📍 **Where exactly did this unfold?**\n• What's the specific place?\n• What area of the city?\n• Any details about the setting?\n\nLocation is key to finding someone who was in that exact same spot!";
        }
        else if (!hasDescription) {
          aiResponse = "This is beautiful! I have the when and where locked in.\n\nNow help me see them through your eyes:\n👤 **What did they look like?**\n• Hair, style, what they were wearing?\n• Anything that caught your attention?\n• What made you notice them?\n\nThese visual details help me confirm when someone else describes remembering the same person!";
        }
        else if (userMessage.length > 80) {
          aiResponse = "This gave me actual goosebumps! 💫 What a beautiful, detailed memory.\n\nI'm carefully storing this in your Spark Vault with all those perfect details. If someone else describes this same moment from their perspective, I'll know immediately.\n\nIs there anything else about that moment - maybe the vibe, any brief interaction, or what made it feel so special?";
        }
        else {
          aiResponse = "I'm loving this story! You're giving me some great pieces, but I want to make sure I don't miss anything important.\n\nCould you add a bit more about:\n• The exact location?\n• What time this happened?\n• What they looked like?\n\nI'm pretty good at this matching thing, but the devil's in the details!";
        }
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