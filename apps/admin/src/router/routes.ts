import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardPage.vue'),
        meta: { title: '数据看板', icon: 'DashboardOutlined' },
      },
      {
        path: 'conversations',
        name: 'ConversationList',
        component: () => import('@/views/conversation/ConversationList.vue'),
        meta: { title: '对话管理', icon: 'MessageOutlined' },
      },
      {
        path: 'conversations/:id',
        name: 'ConversationDetail',
        component: () => import('@/views/conversation/ConversationDetail.vue'),
        meta: { title: '对话详情', hidden: true },
      },
      {
        path: 'knowledge',
        name: 'KnowledgeList',
        component: () => import('@/views/knowledge/KnowledgeList.vue'),
        meta: { title: '知识库管理', icon: 'BookOutlined' },
      },
      {
        path: 'knowledge/upload',
        name: 'KnowledgeUpload',
        component: () => import('@/views/knowledge/KnowledgeUpload.vue'),
        meta: { title: '上传文档', hidden: true },
      },
      {
        path: 'knowledge/:id',
        name: 'KnowledgePreview',
        component: () => import('@/views/knowledge/KnowledgePreview.vue'),
        meta: { title: '文档预览', hidden: true },
      },
      {
        path: 'work-orders',
        name: 'WorkOrderList',
        component: () => import('@/views/work-order/WorkOrderList.vue'),
        meta: { title: '工单管理', icon: 'FileProtectOutlined' },
      },
      {
        path: 'work-orders/:id',
        name: 'WorkOrderDetail',
        component: () => import('@/views/work-order/WorkOrderDetail.vue'),
        meta: { title: '工单详情', hidden: true },
      },
      {
        path: 'agent',
        name: 'AgentConfig',
        component: () => import('@/views/agent/AgentConfig.vue'),
        meta: { title: 'Agent配置', icon: 'RobotOutlined' },
      },
      {
        path: 'settings',
        name: 'SystemSettings',
        component: () => import('@/views/system/SystemSettings.vue'),
        meta: {
          title: '系统设置',
          icon: 'SettingOutlined',
          roles: ['super_admin'],
        },
      },
    ],
  },
  // 兼容旧路径重定向 + 404 兜底
  { path: '/workorders', redirect: '/work-orders' },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];
