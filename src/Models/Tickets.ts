export type Ticket = {
  id: string;
  resolutor?: string;
  solicitante?: string;
  Title?: string;
  apertura?: string; // "dd/mm/yyyy hh:mm"
  maxima?: string;   // "dd/mm/yyyy hh:mm"
  estado?: string;
  observador?: string;
  descripcion?: string;
  categoria?: string;
  subcategoria?: string;
  articulo?: string;
  fuente?: string;
};