export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  lastLoginAt?: string;
  avatarUrl?: string;
}

export type AdminRole = 'super_admin' | 'customer_service' | 'knowledge_admin';
