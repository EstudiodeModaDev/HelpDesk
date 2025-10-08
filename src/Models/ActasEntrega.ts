export type ActasEntrega = {
    Id: string;
    Title: string; //Correo (usuario que entrega)
    Id_caso: string;
    Tecnico_x0028_Queentrega_x0029_: string; //Tecnico (usuario que entrega)
    Persona_x0028_Quienrecibe_x0029_?: string; //Persona (usuario que recibe)
    Correo_x0028_QuienRecibe_x0029_: string; //Correo (usuario que recibe)
    Fecha?: string;
    Estado: string;
    Cedula: string;
};

export type TipoUsuario = "Usuario administrativo" | "Usuario de diseño" | "Tienda";

export type FormStateActa = {
  numeroTicket: string;
  persona: string;
  sedeDestino: string;
  correo: string;
  cedula: string;
  enviarEquipos: string;
  tipoUsuario: TipoUsuario | "";
  tipoComputador?: "Portátil" | "Escritorio" | "";
  entregas: Record<string, boolean>;
};

export type FormActaStateErrors = Partial<Record<keyof FormStateActa, string>>;