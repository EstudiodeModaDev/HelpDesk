export type Ticket = {
  id: string;
  resolutor?: string;
  resolutorId?: string;
  solicitante?: string;
  Title?: string;
  FechaApertura?: string; // "dd/mm/yyyy hh:mm"
  TiempoSolucion?: string;   // "dd/mm/yyyy hh:mm"
  estado?: string;
  observador?: string;
  Descripcion?: string;
  Categoria?: string;
  Subcategoria?: string;
  Articulo?: string;
  Fuente?: string;
  CorreoResolutor?: string;
  CorreoSolicitante?: string;
  IdCasoPadre?: string;
  ANS?: string;
  CorreoObservador?: string;
};

// Para filtros locales
export type SortDir = 'asc' | 'desc';
export type SortField = 'id' | 'FechaApertura' | 'TiempoSolucion' | 'Title' | 'resolutor';