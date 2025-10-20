import type { CCOption } from "./CentroCostos";
import type { COOption } from "./CO";

export type TipoCompra = "Producto" | "Servicio" | "Alquiler";
export type CargarA = "CO" | "Marca";
export type Opcion = { value: string; label: string };
export type CO = { value: string; code: string };
export type comprasState = {
  tipoCompra: TipoCompra;
  productoServicio: string;     
  solicitadoPor: string;
  solicitadoPorCorreo: string;
  fechaSolicitud: string;       
  dispositivo: string;
  co: COOption | null;                   
  un: string;                 
  ccosto: CCOption | null;                
  cargarA: CargarA;
  noCO: string;         
  marcasPct: Record<string, number>;
  motivo: string,
  estado?: string;
  codigoItem: string;
  DescItem: string
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
  Id?: string,
  Estado?: string,
  CodigoItem: string;
  DescItem: string
}
export const Items = [
    { codigo: "SC11", descripcion: "ARREND. EQ. COMPUTAC Y COMUNICACIÓN" },
    { codigo: "SC40", descripcion: "MMTO. EQ. COMPUTO Y COMU COMPRAS RC" },
    { codigo: "SC41", descripcion: "MMTO. EQ. COMPUTO Y COMU SERVICIOS RC" },
    { codigo: "SC70", descripcion: "UTILES, PAPELERIA Y FOTOCOPIAS RC" },
    { codigo: "SC80", descripcion: "SERVICIO DE TELEFONIA" },
  ];
