// src/features/requests/hooks/useUsers.ts
import { useQuery, } from '@tanstack/react-query';
import { useRepositories } from '../../repositories/repositoriesContext';
import type { SolviUser } from '../../repositories/ParticipantsRepository/MessagesRepository';

export function useUsers() {
  const { messages } = useRepositories();
  return useQuery<SolviUser[]>({
    queryKey:  ['users'],
    queryFn:   () => messages.fetchAllUsers(),
    staleTime: 5 * 60 * 1000,
    retry:     1,
  });
}
