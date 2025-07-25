import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationCounts {
  matches: number;
  messages: number;
}

export const useNotifications = () => {
  const [counts, setCounts] = useState<NotificationCounts>({ matches: 0, messages: 0 });
  const { user } = useAuth();

  const loadNotificationCounts = async () => {
    if (!user) {
      setCounts({ matches: 0, messages: 0 });
      return;
    }

    try {
      // Count pending matches
      const { count: matchCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'pending');

      // Count unread messages in conversations the user participates in
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      let messageCount = 0;
      if (conversations?.length) {
        const conversationIds = conversations.map(c => c.conversation_id);
        
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .neq('sender_id', user.id)
          .is('read_at', null);

        messageCount = count || 0;
      }

      setCounts({
        matches: matchCount || 0,
        messages: messageCount
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