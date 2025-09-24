export type OpcionSolicitud =
  | "Solicitud de servicios de TI"
  | "FR Admin seguridad unidad de red"
  | "FR Administrador seguridad ERP"
  | "Administrador"
  | "permisos de navegacion";

//Modelo de Servicios TI
export type TipoContratacion = "Directo" | "Temporal" | "Practicante" | "Tercero";
export type TipoEquipo = "Escritorio" | "Portátil" | "Sin equipo";
export type ExtensionTelefonica =
  | "No aplica"
  | "Extensión fija"
  | "Extensión IP"
  | "Solicitud nueva"
  | "Traslado";

export type ServicioPrograma =
  | "ERP"
  | "Sistema de pedidos"
  | "AdminPOS"
  | "POS Principal"
  | "Correo"
  | "Office"
  | "Impresoras"
  | "Generic Transfer";

  export type PermisoRed = "Lectura" | "Escritura" | "Lectura y escritura";

  //Modelo solicitud de permisos de red
  export interface FilaSolicitudRed {
  id: string;       
  carpeta1: string;
  subcarpeta1: string;
  subcarpeta2: string;
  personas: string;    // puedes cambiar a string[] si usas multiselect real
  permiso: PermisoRed | "";
  observaciones: string;
}

export type State = {
  filas: FilaSolicitudRed[];
  sending: boolean;
  error?: string;
};

export type Action =
  | { type: "ADD" }
  | { type: "REMOVE"; id: string }
  | { type: "SET"; id: string; key: keyof FilaSolicitudRed; value: any }
  | { type: "RESET" }
  | { type: "SENDING"; value: boolean }
  | { type: "ERROR"; message?: string };

  //Modelo seguridad de reERP
export interface FilaSolicitudERP {
  id: string;       
  nombreperfil: string;
  metodogeneral: string;
  metodoespecifico: string;
  permisoespecifico: string;
  usuarioNombre: string;
  usuarioMail: string;
  observaciones: string;
}