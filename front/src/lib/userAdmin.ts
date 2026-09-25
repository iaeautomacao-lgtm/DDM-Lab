import { api } from './apiClient';

export type UserRole = 'user' | 'gestor' | 'diretor' | 'rh' | 'admin';

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  preferred_name: string | null;
  department: string | null;
  role: UserRole;
  created_at: string;
}

export const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'user', label: 'Usuário' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'rh', label: 'RH' },
  { value: 'admin', label: 'Admin' },
];

export const fetchUsers = async (): Promise<ManagedUser[]> => {
  const { users } = await api.get<{ users: ManagedUser[] }>('/users');
  return users;
};

export const updateUserRole = async (id: string, role: UserRole): Promise<void> => {
  await api.patch(`/users/${id}/role`, { role });
};
