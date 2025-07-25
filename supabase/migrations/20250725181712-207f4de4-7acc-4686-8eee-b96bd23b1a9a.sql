-- Delete duplicate conversation participants and conversations
-- Keep the conversation with more recent last_message_at

-- Delete older conversation participants
DELETE FROM conversation_participants 
WHERE conversation_id = 'e09dde75-0852-4aa6-89b8-f2964b203e06';

-- Delete the older conversation
DELETE FROM conversations 
WHERE id = 'e09dde75-0852-4aa6-89b8-f2964b203e06';