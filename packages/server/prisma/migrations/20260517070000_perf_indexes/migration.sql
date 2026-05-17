-- Phase 8 - Performance Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_visitor_status ON conversations (visitor_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_active_recent ON conversations (updated_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_messages_conv_role ON messages (conversation_id, role);
CREATE INDEX IF NOT EXISTS idx_messages_intent_date ON messages (intent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kdocs_active_type ON knowledge_docs (is_active, file_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workorders_status_created ON work_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workorders_assignee_status ON work_orders (assignee_id, status) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_role_status ON admin_users (role, status);
CREATE INDEX IF NOT EXISTS idx_visitors_ip_seen ON visitors (ip_address, last_seen_at DESC) WHERE ip_address IS NOT NULL;
