import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationCounts {
  matches: number;
  messages: number;
  sparkMessages: number;
  privateMessages: number;
}

export const useNotifications = () => {
  const [counts, setCounts] = useState<NotificationCounts>({ 
    matches: 0, 
    messages: 0, 
    sparkMessages: 0, 
    privateMessages: 0 
  });
  const { user } = useAuth();

  const loadNotificationCounts = async () => {
    if (!user) {
      setCounts({ matches: 0, messages: 0, sparkMessages: 0, privateMessages: 0 });
      return;
    }

    try {
      // Count pending matches where current user hasn't responded yet
      const { data: allMatches } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'pending');

      // Filter to only count matches where current user hasn't responded
      const unrespondedMatches = (allMatches || []).filter(match => {
        const isUser1 = match.user1_id === user.id;
        if (isUser1) {
          return !match.user1_confirmed; // Count only if user1 hasn't confirmed
        } else {
          return !match.user2_confirmed; // Count only if user2 hasn't confirmed
        }
      });

      const matchCount = unrespondedMatches.length;

      // Count unread messages in conversations the user participates in
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      let messageCount = 0;
      let sparkMessageCount = 0;
      let privateMessageCount = 0;

      if (conversations?.length) {
        const conversationIds = conversations.map(c => c.conversation_id);
        
        // Get all unread messages
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select(`
            conversation_id,
            sender_id,
            read_at
          `)
          .in('conversation_id', conversationIds)
          .neq('sender_id', user.id)
          .is('read_at', null);

        if (unreadMessages?.length) {
          // Get conversation details to check if they're linked to matches
          const { data: conversationDetails } = await supabase
            .from('conversations')
            .select(`
              id,
              conversation_participants!inner(user_id)
            `)
            .in('id', conversationIds);

          // Check which conversations are from matches
          const { data: matchConversations } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .eq('status', 'accepted');

          const sparkConversationIds = new Set();
          
          conversationDetails?.forEach(conv => {
            const participants = conv.conversation_participants.map(p => p.user_id);
            const isFromMatch = matchConversations?.some(match => 
              (participants.includes(match.user1_id) && participants.includes(match.user2_id))
            );
            
            if (isFromMatch) {
              sparkConversationIds.add(conv.id);
            }
          });

          // Count messages by type
          unreadMessages.forEach(message => {
            if (sparkConversationIds.has(message.conversation_id)) {
              sparkMessageCount++;
            } else {
              privateMessageCount++;
            }
          });

          messageCount = unreadMessages.length;
        }
      }

      setCounts({
        matches: matchCount || 0,
        messages: messageCount,
        sparkMessages: sparkMessageCount,
        privateMessages: privateMessageCount
      });
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  useEffect(() => {
    loadNotificationCounts();

    // Set up real-time subscriptions
    const matchesChannel = supabase
      .channel('matches-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${user?.id},user2_id=eq.${user?.id}`
        },
        loadNotificationCounts
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        loadNotificationCounts
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  return { counts, refreshCounts: loadNotificationCounts };
};