import { useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';

export function useUser() {
  const { user, profile, loading } = useAuth();

  const userData = useMemo(() => {
    if (!profile) return null;

    return {
      uid: profile.uid,
      email: profile.email,
      name: profile.displayName,
      preferredName: profile.preferredName,
      sector: profile.department,
      unit: profile.unit,
      jobTitle: profile.jobTitle,
      maturityLevel: profile.maturityLevel,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
    };
  }, [profile]);

  return { user, userData, loading };
}
