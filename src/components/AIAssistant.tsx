import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Mic, MicOff, Volume2, VolumeX, Save, Check } from "lucide-react";
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

interface AIAssistantProps {
  onNavigateToMemories: () => void;
}

const AIAssistant = ({ onNavigateToMemories }: AIAssistantProps) => {
  const { user } = useAuth();
  
  // Initialize messages directly from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('meetcute-chat-messages');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    return [];
  });
  
  // Initialize saved conversations from localStorage
  const [savedConversations, setSavedConversations] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('meetcute-saved-conversations');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      }
    } catch (error) {
      console.error('Error loading saved conversations:', error);
    }
    return new Set();
  });
  
  const [currentMessage, setCurrentMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const messagesToSave = JSON.stringify(messages);
        localStorage.setItem('meetcute-chat-messages', messagesToSave);
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }
  }, [messages]);

  // Save savedConversations to localStorage whenever it changes
  useEffect(() => {
    try {
      const conversationsArray = Array.from(savedConversations);
      localStorage.setItem('meetcute-saved-conversations', JSON.stringify(conversationsArray));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }, [savedConversations]);

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
  }, []);

  const callClaude = async (userMessage: string) => {
    setIsTyping(true);
    
    try {
      const conversationHistory = messages.filter(msg => !msg.typing).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          message: userMessage,
          conversationHistory: conversationHistory
        }
      });

      if (error) {
        throw new Error(`AI function error: ${error.message || JSON.stringify(error)}`);
      }

      const aiResponse = data?.response || data?.error || "I'm sorry, I had trouble processing that. Could you try again?";

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(msg => !msg.typing).concat([aiMessage]));
      setIsTyping(false);
      
    } catch (error) {
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
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const saveConversationAsMemory = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save memories.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const userMessages = messages.filter(msg => msg.sender === "user" && !msg.typing);
      
      if (userMessages.length === 0) {
        toast({
          title: "No conversation to save",
          description: "Start a conversation with the AI first.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const conversationText = userMessages.map(msg => msg.text).join(" ");
      
      const { data, error } = await supabase.functions.invoke('memory-processor', {
        body: {
          conversation: conversationText,
          userId: user.id,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process memory');
      }

      const conversationId = userMessages.map(m => m.id).join('-');
      setSavedConversations(prev => new Set([...prev, conversationId]));

      toast({
        title: "Memory saved successfully! ✨",
        description: "Your conversation has been processed and saved to your memories.",
      });

      setTimeout(() => {
        onNavigateToMemories();
      }, 2000);

    } catch (error) {
      toast({
        title: "Error saving memory",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canSaveConversation = () => {
    const userMessages = messages.filter(msg => msg.sender === "user" && !msg.typing);
    const conversationId = userMessages.map(m => m.id).join('-');
    return userMessages.length > 0 && !savedConversations.has(conversationId) && !isTyping;
  };

  return (
    <div className="h-full flex flex-col">
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
      <div className="bg-background/95 border-t border-border/50 backdrop-blur-lg p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
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
          
          {canSaveConversation() && (
            <Button
              onClick={saveConversationAsMemory}
              disabled={isSaving}
              size="sm"
              className="bg-gradient-to-r from-spark to-coral hover:shadow-glow transition-all duration-300"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? "Saving..." : "Save as Memory"}
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Share your memory with MeetCute..."
            onKeyPress={handleKeyPress}
            className="flex-1 border-border/50 focus:border-spark focus:ring-spark/20 transition-all duration-300"
          />
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "default" : "outline"}
            size="icon"
            className={`${isRecording ? "bg-destructive hover:bg-destructive/90 animate-pulse" : ""} transition-all duration-300`}
          >
            {isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim()}
            className="bg-gradient-to-r from-spark to-coral hover:shadow-glow transition-all duration-300"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;