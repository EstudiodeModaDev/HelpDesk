export type NuevaTarea = {
  titulo: string;
  solicitante?: string;
  responsable?: string;
  fecha?: string; // yyyy-mm-dd
  hora?: string;  // hh:mm
  estado?: "Pendiente" | "Iniciada" | "Finalizada";
};

export type Tarea = {
  Id: string;
  Title: string;
  Reportadapor: string;
  Quienlasolicita: string;
  Fechadesolicitud?: string;
  Fechadelanota?: string;
  ReportadaporCorreo: string;
  Estado: string;
  Cantidaddediasalarma: string;
};

export type FilterMode = 'Pendientes' | 'Iniciadas' | 'Finalizadas';