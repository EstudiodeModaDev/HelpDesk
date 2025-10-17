export type Internet = {
    Id?: string;
    Title: string; //Nit
    Empresa: string;
    Cedula: string;
    Nombre: string;
    Apellidos: string;
    Telefono: string;
    Identificador: string;
    Descripcion: string;
    Tienda: string;
    Ciudad: string;
    Centrocomercial: string;
    Local: string;
    Proveedor: string;
};

export type InternetTiendas = {
    ID: string;
    Title: string; //Ciudad
    Centro_x0020_Comercial: string;
    Tienda: string
    CORREO: string;
    PROVEEDOR: string;
    IDENTIFICADOR: string;
    SERVICIO_x0020_COMPARTIDO: string;
    DIRECCI_x00d3_N: string;
    Local: string;
    Nota: string;
    Compa_x00f1__x00ed_a:string
};

export type InfoInternetTienda = {
    ID?: string;
    Ciudad: string; //Ciudad
    CentroComercial: string;
    Tienda: string
    Correo: string;
    Proveedor: string;
    Identificador: string;
    Comparte: string;
    Direccion: string;
    Local: string;
    Nota: string;
    ComparteCon:string
    Nit: string;
    Sociedad: string;
};


export type FormEscalamientoState = {
  proveedor: string;
  identificador: string;
  tienda: string;
  ciudad: string;
  empresa: string;
  nit: string;
  centroComercial: string;
  local: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  descripcion: string;
  adjuntos: File[];
};