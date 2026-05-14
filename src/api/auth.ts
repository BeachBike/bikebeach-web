import { api } from './client';
import type { AuthUser } from '@/stores/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export type UserGoalEnum =
  | 'PERDER_PESO'
  | 'GANHAR_CONDICIONAMENTO'
  | 'MANTER_FORMA'
  | 'COMPETIR'
  | 'OUTRO';
export type FitnessLevelEnum = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  goal?: UserGoalEnum;
  fitnessLevel?: FitnessLevelEnum;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  signup(payload: SignupPayload) {
    return api.post<TokenPair>('/auth/signup', payload).then((r) => r.data);
  },
  login(payload: LoginPayload) {
    return api.post<TokenPair>('/auth/login', payload).then((r) => r.data);
  },
  forgotPassword(email: string) {
    return api
      .post<{ emailSent: boolean; devToken?: string }>('/auth/forgot-password', { email })
      .then((r) => r.data);
  },
  resetPassword(payload: { token: string; password: string }) {
    return api
      .post<void>('/auth/reset-password', payload)
      .then((r) => r.data);
  },
};
