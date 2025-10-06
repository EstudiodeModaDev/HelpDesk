import type { UserOption } from "./Commons";

export type Ticket = {
  ID?: string;
  Nombreresolutor?: string;
  IdResolutor?: string;
  Solicitante?: string;
  Title?: string; //Asunto
  FechaApertura?: string; // "dd/mm/yyyy hh:mm"
  TiempoSolucion?: string;   // "dd/mm/yyyy hh:mm"
  Estadodesolicitud?: string;
  observador?: string;
  Descripcion?: string;
  Categoria?: string;
  SubCategoria?: string;
  SubSubCategoria?: string;
  Fuente?: string;
  CorreoResolutor?: string;
  CorreoSolicitante?: string;
  IdCasoPadre?: string;
  ANS?: string;
  CorreoObservador?: string;
};

export type FormRecategorizarState = {
  categoria: string;
  subcategoria: string;
  articulo: string;
};

export type FormReasignarState = {
    resolutor: UserOption | null;
    Nota: string
}

export type FormObservadorState = {
    observador: UserOption | null;
}

// Para filtros locales
export type SortDir = 'asc' | 'desc';
export type SortField = 'ID' | 'FechaApertura' | 'TiempoSolucion' | 'Title' | 'resolutor';