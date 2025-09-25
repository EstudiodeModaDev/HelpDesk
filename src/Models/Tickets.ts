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
  descripcion?: string;
  Categoria?: string;
  Subcategoria?: string;
  Articulo?: string;
  Fuente?: string;
  Descripcion?: string;
  CorreoResolutor?: string;
  CorreoSolicitante?: string;
  IdCasoPadre?: string;
  ANS?: string;
  CorreoObservador?: string;
};