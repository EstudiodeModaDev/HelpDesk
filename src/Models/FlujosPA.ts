import type { UserOption } from "./Commons";

export type FormStateCajeros = {
    solicitante: UserOption | null;
    resolutor: UserOption | null;
    usuario: string;
    CorreoUsuario: string ;
    Cedula: string;
    CO: string;
    CorreoTercero: string;
    Compañia: string
};

export type FormErrorsCajeros = Partial<Record<keyof FormStateCajeros, string>>;

export type FlowToUser = {
  recipient: string;            
  message: string;
  title?: string;
  mail: boolean
};

export type FlowToSP = {
  Usuario: string;            
  CorreoUsuario: string;
  Cedula: string;
  CorreoTercero: string;
  Compañia: string;
  CO: string
};