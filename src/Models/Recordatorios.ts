export type Recordatorios = {
    Id: string;
    Title: string; //Titulo del recordatorio
    Reportadapor: string;
    Quienlasolicita?: string;
    Fechadesolicitud: string;
    Fechadelanota: string;
    ReportadaporCorreo: string;
    Estado: string;
    Cantidaddediasalarma: number;
};