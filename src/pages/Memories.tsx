import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Heart, Sparkles, Plus, Trash2 } from "lucide-react";

interface Memory {
  id: string;
  description: string;
  location: string;
  timestamp: Date;
  status: "waiting" | "matched";
  matchId?: string;
}

const Memories = () => {
  const [memories] = useState<Memory[]>([
    {
      id: "1",
      description: "I saw you at Outside Lands wearing a red jacket dancing to Tame Impala near the main stage. You had amazing energy and I couldn't stop watching you move to the music.",
      location: "Golden Gate Park, San Francisco",
      timestamp: new Date("2024-08-10T20:30:00"),
      status: "waiting",
    },
    {
      id: "2", 
      description: "We made eye contact at Equinox gym on Van Ness around 7 AM. You were doing deadlifts and I was on the treadmill. You smiled when Dua Lipa came on.",
      location: "Equinox Van Ness, San Francisco",
      timestamp: new Date("2024-01-15T07:00:00"),
      status: "matched",
      matchId: "match-1",
    },
    {
      id: "3",
      description: "You were reading 'The Seven Husbands of Evelyn Hugo' at Blue Bottle Coffee on Fillmore. We both ordered oat milk lattes at the same time and laughed.",
      location: "Blue Bottle Coffee, San Francisco",
      timestamp: new Date("2024-01-20T10:15:00"),
      status: "waiting",
    },
  ]);

  const waitingMemories = memories.filter(m => m.status === "waiting");
  const matchedMemories = memories.filter(m => m.status === "matched");

  const MemoryCard = ({ memory }: { memory: Memory }) => (
    <Card className="w-full hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge 
            variant={memory.status === "matched" ? "default" : "secondary"}
            className={memory.status === "matched" 
              ? "bg-gradient-to-r from-spark to-coral text-midnight" 
              : "bg-muted text-muted-foreground"
            }
          >
            {memory.status === "matched" ? (
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
          
          {memory.status === "waiting" && (
            <Button variant="ghost" size="sm" className="text-muted-foreground">
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
            {memory.location}
          </div>
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {memory.timestamp.toLocaleDateString()}
          </div>
        </div>
        
        {memory.status === "matched" && (
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
          
          <Button variant="spark" size="sm">
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
                <Button variant="spark">
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
            <Button variant="spark" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Share Your First Memory
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Memories;