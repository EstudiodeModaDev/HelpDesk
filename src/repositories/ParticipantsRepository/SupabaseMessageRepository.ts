import type { SolviComment } from "../../Funcionalidades/comments/hooks/useSolviComments";
import {
  notifyCommentMention,
  notifyConversationComment,
} from "../../Funcionalidades/Tickets/utils/notifications";
import type { SolviParticipant } from "../../Models/Supabase/useSolviParticipants";
import { supabase } from "../../Services/Supabase.service";
import type { MessagesRepository, SolviUser } from "./MessagesRepository";

export class SupabaseMessageRepository implements MessagesRepository {
  async createSolviComment(
    ticketId: number,
    text: string,
    userMail: string,
    mentionedUserIds?: number[],
  ): Promise<SolviComment> {
    const trimmed = text.trim();
    const { data: user } = await supabase
      .from("TBL_Users")
      .select("User_ID, User_Email, User_Role")
      .eq("User_Email", userMail)
      .single();

    {
      const [{ data: ticket }, { data: part }] = await Promise.all([
        supabase
          .from("TBL_Ticket_Solvi")
          .select("ticket_solvi_correo_solicitante, ticket_solvi_correo_resolutor")
          .eq("ticket_solvi_id", ticketId)
          .single(),
        supabase
          .from("TBL_Solvi_Participants")
          .select("User_ID")
          .eq("Ticket_ID", ticketId)
          .eq("User_ID", user?.User_ID)
          .single(),
      ]);

      const myEmail = (userMail ?? "").toLowerCase().trim();
      const reqEmail = String(ticket?.ticket_solvi_correo_solicitante ?? "").toLowerCase().trim();
      const resEmail = String(ticket?.ticket_solvi_correo_resolutor ?? "").toLowerCase().trim();
      const isAdmin = user?.User_Role === "admin";
      const allowed =
        isAdmin ||
        (myEmail !== "" && (myEmail === reqEmail || myEmail === resEmail)) ||
        !!part;

      if (!allowed) {
        throw new Error("No autorizado para comentar en este ticket");
      }
    }

    const { data, error } = await supabase
      .from("TBL_Solvi_Comments")
      .insert({
        Comment_Ticket_ID: ticketId,
        Comment_User_ID: user?.User_ID,
        Comment_Text: trimmed,
        Comment_Created_At: new Date().toISOString(),
      })
      .select(`Comment_ID, Comment_Text, Comment_Created_At,
               author:TBL_Users!Comment_User_ID ( User_ID, User_Name, User_Avatar_url )`)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("No se pudo crear el comentario");
    }

    const author = Array.isArray(data.author) ? data.author[0] : data.author;

    let allowedMentionIds: number[] = [];
    if ((mentionedUserIds?.length ?? 0) > 0) {
      allowedMentionIds = [...new Set(mentionedUserIds)];
    }

    if (allowedMentionIds.length > 0) {
      const commentId = (data as { Comment_ID: number }).Comment_ID;

      await supabase.from("TBL_Solvi_Comment_Mentions").insert(
        allowedMentionIds.map((mid) => ({
          Comment_ID: commentId,
          Mentioned_User_ID: mid,
        })),
      );

      await supabase.from("TBL_Solvi_Participants").upsert(
        allowedMentionIds.map((mid) => ({
          Ticket_ID: ticketId,
          User_ID: mid,
          Added_Via: "mention",
          Added_By: user?.User_ID,
        })),
        { onConflict: "Ticket_ID,User_ID", ignoreDuplicates: true },
      );
    }

    try {
      const [ticketInfoResult, participantIdsResult, mentionedUsersResult] = await Promise.all([
        supabase
          .from("TBL_Ticket_Solvi")
          .select("ticket_solvi_id, ticket_solvi_titulo, ticket_solvi_correo_solicitante, ticket_solvi_correo_resolutor")
          .eq("ticket_solvi_id", ticketId)
          .single(),
        supabase
          .from("TBL_Solvi_Participants")
          .select("User_ID")
          .eq("Ticket_ID", ticketId),
        allowedMentionIds.length > 0
          ? supabase
              .from("TBL_Users")
              .select("User_ID, User_Name, User_Email")
              .in("User_ID", allowedMentionIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (ticketInfoResult.error) {
        throw ticketInfoResult.error;
      }
      if (participantIdsResult.error) {
        throw participantIdsResult.error;
      }
      if (mentionedUsersResult.error) {
        throw mentionedUsersResult.error;
      }

      const participantIds = [...new Set(
        (participantIdsResult.data ?? [])
          .map((row) => row.User_ID)
          .filter((value): value is number => typeof value === "number"),
      )];

      const participantUsersResult = participantIds.length > 0
        ? await supabase
            .from("TBL_Users")
            .select("User_ID, User_Email")
            .in("User_ID", participantIds)
        : { data: [], error: null };

      if (participantUsersResult.error) {
        throw participantUsersResult.error;
      }

      const normalizeEmail = (value: string | null | undefined) =>
        String(value ?? "").trim().toLowerCase();

      const ticketInfo = ticketInfoResult.data;
      const authorEmail = normalizeEmail(user?.User_Email ?? userMail);
      const authorName = author?.User_Name ?? user?.User_Email ?? "Usuario";
      const conversationRecipients = [
        ticketInfo?.ticket_solvi_correo_solicitante,
        ticketInfo?.ticket_solvi_correo_resolutor,
        ...(participantUsersResult.data ?? []).flatMap((row) =>
          row.User_Email ? [row.User_Email] : [],
        ),
      ]
        .map(normalizeEmail)
        .filter((email) => email && email !== authorEmail);
      await notifyConversationComment({
        ticket: {
          ID: String(ticketInfo?.ticket_solvi_id ?? ticketId),
          AsuntoTicket: ticketInfo?.ticket_solvi_titulo ?? "",
        },
        authorName,
        authorEmail,
        commentText: trimmed,
        recipients: conversationRecipients,
      });

      const mentionRecipients = (mentionedUsersResult.data ?? [])
        .map((mentionedUser) => normalizeEmail(mentionedUser.User_Email))
        .filter((email) => email && email !== authorEmail);

      if (mentionRecipients.length > 0) {
        await notifyCommentMention({
          ticket: {
            ID: String(ticketInfo?.ticket_solvi_id ?? ticketId),
            AsuntoTicket: ticketInfo?.ticket_solvi_titulo ?? "",
          },
          authorName,
          authorEmail,
          commentText: trimmed,
          recipients: mentionRecipients,
        });
      }
    } catch (notificationError) {
      console.error("No se pudieron enviar las notificaciones del comentario", notificationError);
    }

    return { ...data, author };
  }

  async deleteSolviComment(commentId: number): Promise<{ ok: boolean }> {
    const { error } = await supabase.from("TBL_Solvi_Comments").delete().eq("Comment_ID", commentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  }

  async fetchAllUsers(): Promise<SolviUser[]> {
    const { data, error } = await supabase
      .from("TBL_Users")
      .select(`
        User_ID,
        User_Name,
        User_Email,
        User_Avatar_url,
        User_Role,
        Department_ID,
        Team_ID,
        Is_New,
        Is_Active,
        department:TBL_Departments!Department_ID (
          Department_ID,
          Department_Name,
          Department_Code
        ),
        team:TBL_Teams!Team_ID (
          Team_ID,
          Team_Name,
          Team_Code
        )
      `)
      .order("User_Name", { ascending: true });

    if (error) throw error;

    return (data ?? []) as SolviUser[];
  }

  async fetchSolviParticipants(ticketId: number): Promise<SolviParticipant[]> {
    const { data, error } = await supabase
      .from("TBL_Solvi_Participants")
      .select("User_ID, Added_Via, Added_By, Created_At")
      .eq("Ticket_ID", ticketId);

    if (error) {
      throw error;
    }

    return (data ?? []).map((r) => ({
      User_ID: r.User_ID,
      User_Name: "",
      User_Avatar_url: "",
      Added_Via: r.Added_Via,
      Added_By: r.Added_By,
    }));
  }

  async fetchSolviComments(ticketId: number): Promise<SolviComment[]> {
    const { data, error } = await supabase
      .from("TBL_Solvi_Comments")
      .select(`
        Comment_ID,
        Comment_Text,
        Comment_Created_At,
        author:TBL_Users!Comment_User_ID (
          User_ID,
          User_Name,
          User_Avatar_url
        )
      `)
      .eq("Comment_Ticket_ID", ticketId)
      .order("Comment_Created_At", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((comment) => {
      const author = Array.isArray(comment.author)
        ? comment.author[0]
        : comment.author;

      if (!author) {
        throw new Error(
          `El comentario ${comment.Comment_ID} no tiene un autor asociado`,
        );
      }

      return {
        Comment_ID: comment.Comment_ID,
        Comment_Text: comment.Comment_Text,
        Comment_Created_At: comment.Comment_Created_At,
        author: {
          User_ID: author.User_ID,
          User_Name: author.User_Name,
          User_Avatar_url: author.User_Avatar_url,
        },
      };
    });
  }
}
