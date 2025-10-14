export type TipoCompra = "Producto" | "Servicio" | "Alquiler";
export type CargarA = "CO" | "Marca";
export type Opcion = { value: string; label: string };
export type CO = { value: string; code: string };
export type comprasState = {
  tipoCompra: TipoCompra;
  productoServicio: string;     
  solicitadoPor: string;
  fechaSolicitud: string;       
  dispositivo: string;
  co: string;                   
  un: string;                 
  ccosto: string;                
  cargarA: CargarA;
  noCO: string;         
  marcasPct: Record<string, number>;
};
export type Compra = {
  Title: string;
  SolicitadoPor: string;
  FechaSolicitud: string;
  Dispositivo: string;
  CO: string;
  UN: string;
  CCosto: string;
  CargarA: string;
  PorcentajeMFG: string;
  PorcentajeDiesel: string;
  PorcentajePilatos: string;
  PorcentajeSuperdry: string;
  PorcentajeKipling: string;
  PorcentajeBroken: string;
  Id?: string
}