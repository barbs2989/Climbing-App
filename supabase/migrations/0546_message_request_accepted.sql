-- 0546 — Messages: a message request can be ACCEPTED without becoming friends.
--
-- With "Send non-friends to Message requests" on, a chat from someone who is not your friend sat under Message
-- requests, and the only way out of it was "+ Add friend": to talk to a climber you had to send them a friend
-- request (owner note 2026-11-26: "you shouldn't have to accept a friend request to view the message ... you should
-- be able to accept or decline the message request"). Messenger, Instagram and X all separate the two: you read
-- the request, then Accept (it moves to your chats), Delete, or Block. Replying accepts it too.
--
-- Accepting is a personal filing choice like Archive or Mute, so it lives on the same owner-only row (0422):
--   accepted_at  set → this direct chat is in your chats, not Message requests, whoever the other climber is.
-- Decline is the existing Delete (cleared_before). No new policy: 0422's own-row policies cover the column.

alter table public.conversation_state add column if not exists accepted_at timestamptz;
