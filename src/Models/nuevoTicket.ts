import type { UserOption } from "./Commons";
import type { FormObservadorState, FormReasignarState } from "./Tickets";

export type FormState = {
  solicitante: UserOption | null;
  resolutor: UserOption | null;
  usarFechaApertura: boolean;
  fechaApertura: string | null; // YYYY-MM-DD
  fuente: "correo" | "teams" | "whatsapp" | "presencial" | "";
  motivo: string;
  descripcion: string;
  categoria: string;
  subcategoria: string;
  articulo: string;
  archivo: File | null;
  ANS?: "";
};

export type FormDocumentarState = {
  documentacion: string;
  resolutor: string;
  correoresolutor: string;
};

export type FormErrors = Partial<Record<keyof FormState, string>>;

export type FormReasignarErrors = Partial<Record<keyof FormReasignarState, string>>

export type FormObservadorErrors = Partial<Record<keyof FormObservadorState, string>>

export type FormDocErrors = Partial<Record<keyof FormDocumentarState, string>>