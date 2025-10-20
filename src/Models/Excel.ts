export type TicketExcelRow = {
  Asunto: string;
  Categoria?: string;
  Subcategoria?: string;
  Articulo?: string;     
  Observador?: string;
  Resuelto: string;
  Solicitante: string;
  CorreoSolicitante: string;
  Fuente: string;
  Descripcion?: string;
  Seguimiento: string;
  Solucion: string;
  IdPadre?: number | string;
  IdResolutorPrincipal?: number | string;
  Cesar: string | number;
};
