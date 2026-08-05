import { useMemo,} from 'react';
import { Trash2, X } from 'lucide-react';
import type { Ticket } from '../../../../Models/Tickets';
import {useCreateSolviComment, useDeleteSolviComment, useSolviComments,} from '../../../../Funcionalidades/comments/hooks/useSolviComments';
import { useUsers } from '../../../../Models/Supabase/useUsers';
import { useCurrentUser } from '../../../../Models/Supabase/useCurrentUser';
import { useSolviParticipants,} from '../../../../Models/Supabase/useSolviParticipants';
import { ParticipantsPanel } from './ParticipantPanel';
import { useAuth } from '../../../../auth/authContext';
import { CommentText } from './CommentText';
import { CommentComposer } from './CommentComposer';
import './Messages.css';
import React from 'react';

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—';

  const isoValue = /Z|[+-]\d{2}:\d{2}$/.test(value)
    ? value
    : `${value}Z`;

  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  ticket: Ticket;
  onClose: () => void;
  isOpen: boolean;
};

export function MensajesModal({ticket, onClose, isOpen,}: Props) {
  const ticketId = Number(ticket.ID);
  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
  } = useSolviComments(ticketId);
  const { mutate: createComment, isPending: sending,} = useCreateSolviComment();
  const {mutate: deleteComment,} = useDeleteSolviComment();
  const {data: allUsers = [], isLoading: isLoadingUsers,} = useUsers();
  const {
    data: currentUser,
    isLoading: isLoadingCurrentUser,
    error: currentUserError,
  } = useCurrentUser();
  const {
    data: participants = [],
    isLoading: isLoadingParticipants,
    error: participantsError,
  } = useSolviParticipants(ticketId);
  const auth = useAuth()

  const isLoading = isLoadingComments || isLoadingUsers || isLoadingCurrentUser || isLoadingParticipants;
  const loadError = commentsError ?? currentUserError ?? participantsError;

  const myEmail = auth.account?.username.trim().toLowerCase() ?? '';
  const requesterEmail = String(ticket.CorreoSolicitante ?? '').toLowerCase().trim();
  const resolverEmail = String(ticket.Correoresolutor ?? '').toLowerCase().trim();
  const status = String(ticket.Estadodesolicitud ?? '').toLowerCase().trim();
  const isClosed = status.includes('cerrado')
  const isRequester = myEmail !== '' && myEmail === requesterEmail;
  const isResolver = myEmail !== '' && myEmail === resolverEmail;
  const isParticipant = currentUser !== undefined && participants.some(
      (participant) =>
        participant.User_ID === currentUser.User_ID,
    );

  const canComment = !isClosed && Boolean(currentUser) && (isRequester || isResolver || isParticipant);

  /*
   * Intenta relacionar el solicitante y resolutor de SOLVI
   * con los usuarios registrados en PRISMA.
   */
  const extraPeople = useMemo(() => {
    const people: {
      userId: number | null;
      name: string;
      role: 'solicitante' | 'resolutor';
    }[] = [];

    const findUserByEmail = (email: string) => {
      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail) {
        return null;
      }

      return (
        allUsers.find(
          (user) =>
            String(user.User_Email ?? '')
              .toLowerCase()
              .trim() === normalizedEmail,
        ) ?? null
      );
    };

    const requesterName = String(
      ticket.Solicitante ?? '',
    ).trim();

    if (requesterName || requesterEmail) {
      const requesterUser =
        findUserByEmail(requesterEmail);

      people.push({
        userId: requesterUser?.User_ID ?? null,
        name:
          requesterUser?.User_Name ||
          requesterName ||
          requesterEmail ||
          'Solicitante',
        role: 'solicitante',
      });
    }

    const resolverName = String(
      ticket.Nombreresolutor ?? '',
    ).trim();

    if (resolverName || resolverEmail) {
      const resolverUser =
        findUserByEmail(resolverEmail);

      people.push({
        userId: resolverUser?.User_ID ?? null,
        name:
          resolverUser?.User_Name ||
          resolverName ||
          resolverEmail ||
          'Resolutor',
        role: 'resolutor',
      });
    }

    return people;
  }, [
    allUsers,
    requesterEmail,
    resolverEmail,
    ticket.Solicitante,
    ticket.Nombreresolutor,
  ]);

  React.useEffect(() => {
    console.log(comments)
  }, [comments])

  const handleDeleteComment = (commentId: number,): void => {
    deleteComment({
      commentId,
      ticketId,
    });
  };

  const handleCreateComment = (
    text: string,
    mentionedUserIds: number[],
  ): void => {
    if (!currentUser) return;

    createComment({
      ticketId,
      text,
      userMail: auth.account?.username ?? "",
      mentionedUserIds,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'color-mix(in oklab, var(--ink) 14%, transparent)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={{
          width: '100%',
          maxWidth: 820,
          height: '88vh',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--bd)',
          borderRadius: 'var(--radius-3xl, var(--radius))',
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
          position: 'relative',
        }}
      >
        {/* Línea superior de acento */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Encabezado */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--bd)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: 1,
                userSelect: 'all',
                flexShrink: 0,
              }}
            >
              #{ticket.ID}
            </span>

            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Mensajes
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid var(--bd)',
              color: 'var(--muted)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isLoading ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 0',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13,
              }}
            >
              Cargando mensajes…
            </div>
          ) : (
            <>
              {loadError && (
                <div
                  style={{
                    margin: '16px 22px 0',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#991b1b',
                    fontSize: 12,
                  }}
                >
                  {loadError instanceof Error
                    ? loadError.message
                    : 'No se pudieron cargar los comentarios del ticket.'}
                </div>
              )}

              {/* Participantes */}
              {currentUser && (
                <ParticipantsPanel
                  participants={participants}
                  extraPeople={extraPeople}
                  allUsers={allUsers}
                />
              )}

              {/* Comentarios */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '16px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
              >
                {comments.length === 0 ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: 0.5,
                  }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        stroke="var(--muted)"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <p style={{fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: 0,}}>
                      Sin comentarios aún.
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isOwnComment = comment.author.User_ID === currentUser?.User_ID;
                    const initials = String(comment.author.User_Name ?? '?',).split(' ').filter(Boolean).slice(0, 2).map((name) => name[0] ?? '').join('').toUpperCase();

                    return (
                      <div
                        key={comment.Comment_ID}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          alignItems: isOwnComment ? 'flex-end' : 'flex-start',}}
                      >
                        <div style={{display: 'flex', alignItems: 'center', gap: 6, flexDirection: isOwnComment ? 'row-reverse' : 'row',}}>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: isOwnComment ? 'linear-gradient(135deg, var(--primary), var(--brand-400))' : 'linear-gradient(135deg, var(--brand-700), var(--brand-500))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 8,
                              fontWeight: 700,
                              color: 'white',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>

                          <span style={{fontSize: 11, fontWeight: 600, color: 'var(--ink)',}}>
                            {comment.author.User_Name ?? 'Desconocido'}
                          </span>

                          <span style={{fontSize: 9, color: 'var(--muted)',}}>
                            {fmtDateTime(comment.Comment_Created_At, )}
                          </span>

                          {isOwnComment && (
                            <button
                              type="button"
                              aria-label="Eliminar comentario"
                              onClick={() => handleDeleteComment(comment.Comment_ID,)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--muted)',
                                padding: 2,
                                display: 'flex',
                                opacity: 0.5,
                              }}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.opacity = '1';

                                event.currentTarget.style.color = '#dc2626';
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.opacity = '0.5';

                                event.currentTarget.style.color = 'var(--muted)';
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>

                        <div
                          style={{
                            maxWidth: '78%',
                            fontSize: 12.5,
                            color: 'var(--ink)',
                            lineHeight: 1.55,
                            background: isOwnComment ? 'color-mix(in oklab, var(--primary) 10%, transparent)' : 'var(--surface-elev)',
                            border: `1px solid ${isOwnComment ? 'color-mix(in oklab, var(--primary) 30%, var(--bd))' : 'var(--bd)'}`,
                            borderRadius: isOwnComment ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                            padding: '8px 12px',
                            wordBreak: 'break-word',
                          }}
                        >
                          <CommentText text={comment.Comment_Text} users={allUsers}/>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Caja para escribir comentarios */}
              {currentUser && canComment ? (
                <div style={{borderTop: '1px solid var(--bd)', flexShrink: 0,}}>
                  <CommentComposer 
                    users={allUsers} 
                    mentioner={{User_ID: currentUser.User_ID, User_Role: currentUser.User_Role, Department_ID:currentUser.Department_ID,}}
                    isConfidential={false}
                    sending={sending}
                    onSubmit={handleCreateComment}
                  />
                </div>
              ) : (
                <p style={{
                    margin: 0,
                    padding: '14px 22px',
                    borderTop:
                      '1px solid var(--bd)',
                    fontSize: 11,
                    color: 'var(--muted)',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isClosed ? 'Este ticket está cerrado. No se pueden agregar comentarios.' : 'Solo el solicitante, el resolutor o quienes fueron mencionados pueden comentar.'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
