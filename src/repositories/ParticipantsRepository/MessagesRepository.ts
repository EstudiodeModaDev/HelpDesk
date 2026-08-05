import type { SolviComment } from "../../Funcionalidades/comments/hooks/useSolviComments";
import type { SolviParticipant } from "../../Models/Supabase/useSolviParticipants";

export type filterLogRepository = {
  seguimientos_solvi_id_ticket?: number
  tipo_accion?: string
}

type Participant = {
  User_ID: number;
  User_Name: string;
  User_Avatar_url: string;
  Added_Via: string;
  Added_By: number | null;
}

export type MessageResult = {
  data: Participant[]
  status: boolean
  message: string | null
}

export type Department = {
  Department_ID: number;
  Department_Name: string;
  Department_Code: string;
};

export type Team = {
  Team_ID: number;
  Team_Name: string;
  Team_Code: string;
};

export type SolviUser = {
  User_ID: number;
  User_Name: string;
  User_Email: string;
  User_Avatar_url: string | null;
  User_Role: string;

  Department_ID: number | null;
  Team_ID: number | null;

  Is_New: boolean;
  Is_Active: boolean;

  department: Department[];
  team: Team[];
};
export interface MessagesRepository {
  fetchSolviParticipants(ticketId: number): Promise<SolviParticipant[]>;
  fetchAllUsers(): Promise<SolviUser[]>;
  fetchSolviComments(ticketId: number): Promise<SolviComment[]>;
  createSolviComment(ticketId: number, text: string, userMail: string, mentionedUserIds?: number[]): Promise<SolviComment>;
  deleteSolviComment(commentId: number): Promise<{ok: boolean}>;
}
