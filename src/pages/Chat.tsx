import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Send, Mic, MicOff, Volume2, VolumeX, Settings, MessageCircle, Users, Save, Check } from "lucide-react";
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
  const [conversations, setConversations] = useState<any[]>([]);
  
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

  // Load conversations when user changes or component mounts
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      if (participantData && participantData.length > 0) {
        const conversationIds = participantData.map(p => p.conversation_id);
        
        // Get conversation details
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds)
          .order('last_message_at', { ascending: false });

        if (conversationsError) throw conversationsError;

        // For each conversation, get the other participant's profile
        const conversationsWithProfiles = await Promise.all(
          conversationsData.map(async (conv) => {
            const { data: otherParticipants, error } = await supabase
              .from('conversation_participants')
              .select(`
                user_id,
                profiles (
                  first_name,
                  last_name,
                  profile_photo_url
                )
              `)
              .eq('conversation_id', conv.id)
              .neq('user_id', user.id);

            if (error) throw error;

            return {
              ...conv,
              otherParticipant: otherParticipants[0]
            };
          })
        );

        setConversations(conversationsWithProfiles);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    console.log("Messages changed, length:", messages.length);
    if (messages.length > 0) {
      try {
        const messagesToSave = JSON.stringify(messages);
        console.log("Saving to localStorage:", messagesToSave);
        localStorage.setItem('meetcute-chat-messages', messagesToSave);
        
        // Verify it was saved
        const verification = localStorage.getItem('meetcute-chat-messages');
        console.log("Verification - saved successfully:", !!verification);
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
      console.log("Saved conversations:", conversationsArray);
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
          conversationHistory: conversationHistory
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

  const saveConversationAsMemory = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save memories.",
        variant: "destructive",
      });
      return;
    }

    console.log("=== SAVING MEMORY START ===");
    setIsSaving(true);
    
    try {
      // Get the user's messages (excluding AI responses and typing indicators)
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

      // Create a conversation text from all user messages
      const conversationText = userMessages.map(msg => msg.text).join(" ");
      
      // Call the memory-processor edge function (enhanced with AI matching)
      const { data, error } = await supabase.functions.invoke('memory-processor', {
        body: {
          conversation: conversationText,
          userId: user.id,
        }
      });

      if (error) {
        console.error('Memory processing error:', error);
        throw new Error(error.message || 'Failed to process memory');
      }

      // Mark this conversation as saved
      const conversationId = userMessages.map(m => m.id).join('-');
      setSavedConversations(prev => new Set([...prev, conversationId]));

      toast({
        title: "Memory saved successfully! ✨",
        description: "Your conversation has been processed and saved to your memories.",
      });

      // Navigate to memories page to show the saved memory
      setTimeout(() => {
        navigate('/memories');
      }, 2000);

    } catch (error) {
      console.error('Error saving memory:', error);
      toast({
        title: "Error saving memory",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if the current conversation can be saved
  const canSaveConversation = () => {
    const userMessages = messages.filter(msg => msg.sender === "user" && !msg.typing);
    const conversationId = userMessages.map(m => m.id).join('-');
    return userMessages.length > 0 && !savedConversations.has(conversationId) && !isTyping;
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
              
              {/* Save Memory Button */}
              {canSaveConversation() && (
                <div className="flex justify-center mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveConversationAsMemory}
                    disabled={isSaving}
                    className="rounded-xl border-spark/50 text-spark hover:bg-spark/10 transition-all duration-300"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-spark/30 border-t-spark mr-2" />
                        Saving Memory...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save as Memory
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              <div className="text-center mt-2">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Pro tip:</strong> Mention specific details like time, place, what you were wearing, or what caught your attention
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="flex-1 flex flex-col m-0">
            {/* Private Messages Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {conversations.length > 0 ? (
                <div className="space-y-3">
                  {conversations.map((conversation) => (
                    <Card 
                      key={conversation.id} 
                      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/chat/${conversation.id}`)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={conversation.otherParticipant?.profiles?.profile_photo_url} />
                          <AvatarFallback>
                            {conversation.otherParticipant?.profiles?.first_name?.[0]}
                            {conversation.otherParticipant?.profiles?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {conversation.otherParticipant?.profiles?.first_name} {conversation.otherParticipant?.profiles?.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {conversation.last_message_at ? 
                              new Date(conversation.last_message_at).toLocaleDateString() : 
                              'New conversation'
                            }
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
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
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;