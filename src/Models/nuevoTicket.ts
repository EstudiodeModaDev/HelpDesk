import type { UserOption } from "./Commons";

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
  IdResolutor: string
  nombreResolutor: string
  correoResolutor: string
};


export type FormErrors = Partial<Record<keyof FormState, string>>;