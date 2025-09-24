export type NuevaTarea = {
  titulo: string;
  solicitante?: string;
  responsable?: string;
  fecha?: string; // yyyy-mm-dd
  hora?: string;  // hh:mm
  estado?: "Pendiente" | "Iniciada" | "Finalizada";
};

export type Tarea = {
  id: string;
  titulo: string;
  responsable: string;
  solicitante: string;
  fechaSolicitada?: string;
  estado?: "Pendiente" | "Iniciada" | "Finalizada" | string;
};