import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send, Sparkles, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface MemorySubmissionProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const MemorySubmission = ({ onClose, onSuccess }: MemorySubmissionProps) => {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: "Memory required",
        description: "Please describe your memory",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to submit a memory",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the conversation string for the AI to process
      const conversation = `User: I want to share a missed connection memory.

MeetCute: Tell me about your memory!

User: ${description}

${location ? `The location was: ${location}` : ''}
${date ? `This happened around: ${format(date, "PPP")}` : ''}

MeetCute: I'll help you find this person! Let me process your memory and look for potential matches.`;

      // Call the memory processor edge function
      const { data, error } = await supabase.functions.invoke('memory-processor', {
        body: {
          conversation,
          userId: user.id
        }
      });

      if (error) {
        console.error('Memory processing error:', error);
        throw error;
      }

      toast({
        title: "Memory submitted successfully!",
        description: data.potential_matches > 0 
          ? `Found ${data.potential_matches} potential matches to review`
          : "Your memory is now waiting for a match",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting memory:', error);
      toast({
        title: "Error submitting memory",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 text-spark mr-2" />
              Share Your Memory
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Tell us about your moment</Label>
              <Textarea
                id="description"
                placeholder="Describe the moment when you almost met someone special. Include details about what they looked like, what you were wearing, what was happening..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The more details you include, the better we can find matches!
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Where did this happen? (Optional)</Label>
              <Input
                id="location"
                placeholder="e.g., Blue Bottle Coffee on Fillmore, Golden Gate Park"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>When did this happen? (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="spark"
                disabled={isSubmitting || !description.trim()}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Share Memory
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};