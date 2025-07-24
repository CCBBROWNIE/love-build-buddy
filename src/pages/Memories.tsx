import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Heart, Sparkles, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MemorySubmission } from "@/components/MemorySubmission";

interface Memory {
  id: string;
  description: string;
  location: string | null;
  timestamp: string;
  status: string | null;
  match_id: string | null;
  extracted_location: string | null;
  extracted_time_period: string | null;
}

const Memories = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmission, setShowSubmission] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadMemories = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error loading memories:', error);
      toast({
        title: "Error loading memories",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [user]);

  const deleteMemory = async (memoryId: string) => {
    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      toast({
        title: "Memory deleted",
        description: "Your memory has been removed",
      });
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast({
        title: "Error deleting memory",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const waitingMemories = memories.filter(m => m.status === "waiting" || m.status === null);
  const matchedMemories = memories.filter(m => m.status === "matched");

  const MemoryCard = ({ memory }: { memory: Memory }) => {
    const isMatched = memory.status === "matched";
    const displayLocation = memory.extracted_location || memory.location || "Location not specified";
    const memoryDate = new Date(memory.timestamp);
    
    return (
      <Card className="w-full hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <Badge 
              variant={isMatched ? "default" : "secondary"}
              className={isMatched 
                ? "bg-gradient-to-r from-spark to-coral text-midnight" 
                : "bg-muted text-muted-foreground"
              }
            >
              {isMatched ? (
                <>
                  <Heart className="w-3 h-3 mr-1" />
                  Matched!
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Waiting...
                </>
              )}
            </Badge>
            
            {!isMatched && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground"
                onClick={() => deleteMemory(memory.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            {memory.description}
          </p>
          
          <div className="flex items-center text-xs text-muted-foreground space-x-4">
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {displayLocation}
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {memoryDate.toLocaleDateString()}
            </div>
          </div>
          
          {memory.extracted_time_period && (
            <div className="text-xs text-muted-foreground">
              Time: {memory.extracted_time_period}
            </div>
          )}
          
          {isMatched && (
            <div className="pt-2 border-t border-border">
              <Button variant="spark" size="sm" className="w-full">
                <Heart className="w-4 h-4 mr-2" />
                Start Conversation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-spark border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Sparkles className="w-6 h-6 text-spark mr-2" />
              Your Spark Vault
            </h1>
            <p className="text-sm text-muted-foreground">
              {waitingMemories.length} waiting • {matchedMemories.length} matched
            </p>
          </div>
          
          <Button variant="spark" size="sm" onClick={() => setShowSubmission(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Memory
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Matched Memories */}
        {matchedMemories.length > 0 && (
          <div>
            <div className="flex items-center mb-4">
              <Heart className="w-5 h-5 text-coral mr-2" />
              <h2 className="text-lg font-semibold">Matched Connections</h2>
            </div>
            <div className="space-y-3">
              {matchedMemories.map(memory => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          </div>
        )}

        {/* Waiting Memories */}
        <div>
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-muted-foreground mr-2" />
            <h2 className="text-lg font-semibold">Waiting for a Match</h2>
          </div>
          
          {waitingMemories.length > 0 ? (
            <div className="space-y-3">
              {waitingMemories.map(memory => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">No memories waiting</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your first memory to start finding connections
                </p>
                <Button variant="spark" onClick={() => setShowSubmission(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Memory
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Empty State for All */}
        {memories.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-2">Start Your Story</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Describe a moment when you almost met someone special. 
              If they remember it too, we'll make the connection.
            </p>
            <Button variant="spark" size="lg" onClick={() => setShowSubmission(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Share Your First Memory
            </Button>
          </div>
        )}
      </div>

      {showSubmission && (
        <MemorySubmission
          onClose={() => setShowSubmission(false)}
          onSuccess={loadMemories}
        />
      )}
    </div>
  );
};

export default Memories;