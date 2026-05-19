/**
 * Service d'authentification — client/admin/agent.
 * Tous les appels passent par le backend FastAPI.
 */
import { api, tokenStorage } from './api';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  numero_telephone?: string | null;
  nom_complet?: string | null;
  photo_profil?: string | null;
  date_naissance?: string | null;
  langue_preferee: string;
  is_active: boolean;
  is_superuser: boolean;
  notification_email: boolean;
  notification_sms: boolean;
}

export const authService = {
  async login(username: string, password: string): Promise<AuthUser> {
    const tokens = await api.post<AuthTokens>('/auth/login', { username, password }, { auth: false });
    tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
    const user = await this.me();
    tokenStorage.setUser(user);
    return user;
  },

  async adminLogin(email: string, password: string, company_code: string): Promise<AuthUser> {
    const tokens = await api.post<AuthTokens>(
      '/auth/admin/login',
      { email, password, company_code },
      { auth: false }
    );
    tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
    const user = await this.me();
    tokenStorage.setUser(user);
    return user;
  },

  async register(data: {
    email: string;
    nom_complet: string;
    numero_telephone: string;
    password: string;
    date_naissance: string;
    langue_preferee?: string;
  }): Promise<AuthUser> {
    return api.post<AuthUser>('/auth/register', data, { auth: false });
  },

  async me(): Promise<AuthUser> {
    return api.get<AuthUser>('/auth/me');
  },

  logout(): void {
    tokenStorage.clear();
  },

  isAuthenticated(): boolean {
    return !!tokenStorage.getAccess();
  },

  currentUser(): AuthUser | null {
    return tokenStorage.getUser<AuthUser>();
  },

  async googleLoginUrl(): Promise<string> {
    const res = await api.get<{ auth_url: string }>('/auth/google/login', { auth: false });
    return res.auth_url;
  },
};
