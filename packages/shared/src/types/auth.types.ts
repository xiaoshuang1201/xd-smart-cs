export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    avatarUrl?: string;
  };
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  displayName: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export interface SessionResponse {
  sessionToken: string;
  csrfToken: string;
  conversationId: string;
  greeting: string;
  suggestedQuestions: string[];
}
