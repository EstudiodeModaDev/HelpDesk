// src/features/requests/hooks/useSolviParticipants.ts
import { useQuery, } from '@tanstack/react-query';
import { useRepositories } from '../../repositories/repositoriesContext';

export type SolviParticipant = {
  User_ID: number; User_Name: string; User_Avatar_url: string;
  Added_Via: string; Added_By: number | null;
};

export function useSolviParticipants(ticketId: number) {
  const {messages} = useRepositories();

  return useQuery<SolviParticipant[]>({
    queryKey:  ['solvi-participants', ticketId],
    queryFn:   () => messages.fetchSolviParticipants(ticketId),
    staleTime: 30_000,
  });
}

