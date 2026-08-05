// src/features/requests/hooks/useSolviComments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '../../../repositories/repositoriesContext';
import toast from 'react-hot-toast';

export type SolviAuthor = {
  User_ID: number;
  User_Name: string;
  User_Avatar_url: string;
};

export type SolviComment = {
  Comment_ID:         number;
  Comment_Text:       string;
  Comment_Created_At: string;
  author: SolviAuthor
};

export function useSolviComments(ticketId: number) {
  const {messages} = useRepositories()

  return useQuery<SolviComment[]>({
    queryKey:  ['solvi-comments', ticketId],
    queryFn:   () => messages.fetchSolviComments(ticketId),
    staleTime: 0,
    retry:     1,
  });
}

export function useCreateSolviComment() {
  const {messages} = useRepositories()
  
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, text, mentionedUserIds, userMail }: { ticketId: number; text: string; mentionedUserIds?: number[]; userMail: string }) => messages.createSolviComment(ticketId, text, userMail, mentionedUserIds, ),
    onSuccess: (_data, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ["solvi-comments", ticketId] });
      toast.success("Comentario creado correctamente.");
    },
    onError: (error: any) => {
      toast.error(`Error al crear comentario: ${error.message}`);
    }
  });
}

export function useDeleteSolviComment() {
  const {messages} = useRepositories()

  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; ticketId: number }) => messages.deleteSolviComment(commentId),
    onSuccess: (_d, { ticketId }) =>{ 
      qc.invalidateQueries({ queryKey: ['solvi-comments', ticketId]} )
      toast.success("Comentario eliminado correctamente.");
    },
    onError: (error: any) => {
      toast.error(`Error al eliminar comentario: ${error.message}`);
    }
  });

}