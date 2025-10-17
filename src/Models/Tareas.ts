import type { UserOption } from "./Commons";

export type NuevaTarea = {
  titulo: string;
  solicitante?: UserOption | null;
  fecha?: string; // yyyy-mm-dd
  hora?: string;  // hh:mm
  diasRecordatorio: number;
};

export type Tarea = {
  Id?: string;
  Title: string;
  Reportadapor: string;
  Quienlasolicita: string;
  Fechadesolicitud?: string;
  Fechadelanota?: string;
  ReportadaporCorreo: string;
  Estado: string;
  Cantidaddediasalarma: number;
};

export type TareasError = Partial<Record<keyof NuevaTarea, string>>;

export type FilterMode = 'Pendientes' | 'Iniciadas' | 'Finalizadas';