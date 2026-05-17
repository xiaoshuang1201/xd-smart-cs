export const DIFY_ENDPOINTS = {
  CHAT_MESSAGES: '/chat-messages',
  CONVERSATIONS: '/conversations',
  CONVERSATION_VARIABLES: (id: string) => `/conversations/${id}/variables`,
  WORKFLOWS_RUN: '/workflows/run',
  DATASETS: '/datasets',
  KNOWLEDGE_RETRIEVE: '/datasets/retrieve',
} as const;
