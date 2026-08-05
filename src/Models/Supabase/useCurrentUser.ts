// src/features/requests/hooks/useCurrentUser.ts

import { useQuery } from '@tanstack/react-query';
import type { PrismaUserProfile } from './supabaseUser';
import { useAuth } from '../../auth/authContext';
import { supabase } from '../../Services/Supabase.service';


export async function getCurrentUserFromSolvi(
  email: string
): Promise<PrismaUserProfile> {
  const { data, error } = await supabase
    .from('TBL_Users')
    .select(`
      User_ID,
      User_Name,
      User_Email,
      User_Role,
      Department_ID,
      Team_ID,
      Is_New,
      Is_Active,
      team:TBL_Teams!Team_ID (
        Team_Code,
        Team_Name
      ),
      department:TBL_Departments!Department_ID (
        Department_Name,
        Department_Code
      )
    `)
    .eq('User_Email', email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('No se encontró el usuario en Solvi');
  }

  return data;
}

export function useCurrentUser() {
  const { account, ready } = useAuth();

  const email = account?.username;

  return useQuery<PrismaUserProfile>({
    queryKey: ['currentUser', email],

    queryFn: () => {
      if (!email) {
        throw new Error('El usuario autenticado no tiene correo');
      }

      return getCurrentUserFromSolvi(email);
    },

    enabled: ready && Boolean(email),
    staleTime: Infinity,
    retry: false,
  });
}