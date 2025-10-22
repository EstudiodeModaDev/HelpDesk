export interface ReFactura {
  id0?: number; // opcional porque el backend puede asignarlo
  FechaEmision: string;
  NoFactura: string;
  Proveedor: string;
  Title: string;   // nit va ser el title porque asi se guardo en la lista
  Items: string;
  DescripItems?: string;
  ValorAnIVA: number;
  CC: string;   // falta añadirla en todo lo otro   centro costos
  CO: string;  // centro operativo
  un: string;  //unidad de negocio
  DetalleFac?: string;
  FecEntregaCont: string;
  DocERP: string;
  Observaciones: string;
  RegistradoPor: string;
  NIT? : string;
  
}
