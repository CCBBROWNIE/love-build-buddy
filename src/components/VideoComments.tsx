import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/components/UserProfile';
import { sanitizeText, commentSchema } from '@/lib/security';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  isLiked?: boolean;
  profiles?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  } | null;
}

interface VideoCommentsProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoComments = ({ videoId, isOpen, onClose }: VideoCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, videoId]);

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, likes_count')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      // Fetch profiles separately
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_photo_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Fetch current user's likes for these comments
      const { data: userLikes } = user ? await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentsData?.map(c => c.id) || []) : { data: [] };

      const likedCommentsSet = new Set(userLikes?.map(like => like.comment_id) || []);

      const commentsWithProfiles = commentsData?.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null,
        isLiked: likedCommentsSet.has(comment.id)
      })) || [];

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error in fetchComments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    // Validate comment content
    const validationResult = commentSchema.safeParse(newComment.trim());
    if (!validationResult.success) {
      toast({
        title: "Invalid comment",
        description: validationResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Sanitize the comment content
      const sanitizedContent = sanitizeText(newComment.trim());
      
      const { error } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: sanitizedContent
        });

      if (error) {
        console.error('Error adding comment:', error);
        toast({
          title: "Error adding comment",
          description: "Failed to add comment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setNewComment('');
      fetchComments();
      
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    } catch (error) {
      console.error('Error in handleAddComment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      if (comment.isLiked) {
        // Unlike the comment
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like the comment
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Update local state optimistically
      setComments(prevComments => 
        prevComments.map(c => 
          c.id === commentId 
            ? { 
                ...c, 
                isLiked: !c.isLiked,
                likes_count: c.isLiked ? c.likes_count - 1 : c.likes_count + 1
              }
            : c
        )
      );
    } catch (error) {
      console.error('Error liking comment:', error);
      toast({
        title: "Error",
        description: "Failed to like comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">Comments</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1 p-4">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage 
                        src={comment.profiles?.profile_photo_url || undefined}
                        className="object-cover w-full h-full"
                      />
                      <AvatarFallback className="text-sm">
                        {comment.profiles?.first_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUserId(comment.user_id);
                            setSelectedUsername(comment.profiles?.first_name?.toLowerCase() || 'user');
                          }}
                          className="font-medium text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          @{comment.profiles?.first_name?.toLowerCase() || 'user'}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 break-words">{comment.content}</p>
                      
                      {/* Like section */}
                      <div className="flex items-center mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLikeComment(comment.id)}
                          className="h-auto p-1 hover:bg-transparent"
                          disabled={!user}
                        >
                          <Heart 
                            className={cn(
                              "w-4 h-4 mr-1",
                              comment.isLiked 
                                ? "fill-red-500 text-red-500" 
                                : "text-muted-foreground hover:text-red-500"
                            )} 
                          />
                          <span className="text-xs text-muted-foreground">
                            {comment.likes_count || 0}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Add Comment */}
        {user && (
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                disabled={isLoading}
                maxLength={500}
              />
              {newComment.length > 450 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {500 - newComment.length} characters remaining
                </p>
              )}
              <Button 
                onClick={handleAddComment} 
                disabled={!newComment.trim() || isLoading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          username={selectedUsername}
          isOpen={!!selectedUserId}
          onClose={() => {
            setSelectedUserId(null);
            setSelectedUsername('');
          }}
        />
      )}
    </div>
  );
};