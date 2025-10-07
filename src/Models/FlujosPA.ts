import type { UserOption } from "./Commons";

export type FormStateCajeros = {
    solicitante: UserOption | null;
    resolutor: UserOption | null;
    usuario: string;
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

export type AdjuntoPayload = {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  contentBase: string; // o contentBase64 si prefieres ese nombre
};

export type Escalamiento = {
  proveedor: string,
  identificador: string,
  tienda: string,
  ciudad: string,
  empresa: string,
  nit: string,
  centroComercial: string,
  local: string,
  nombre: string,
  apellidos: string,
  cedula: string,
  telefono: string,
  descripcion: string,
  adjuntos: AdjuntoPayload[]
}

export type FlowToSP = {
  Usuario: string;            
  Cedula: string;
  CorreoTercero: string;
  Compañia: string;
  CO: string
};

export type FlowToReasign = {
  IDCandidato: number;            
  Nota: string;
  IDCaso: number;
  IDSolicitante: number;
};