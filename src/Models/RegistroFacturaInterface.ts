export interface ReFactura {
  id0?: number; // opcional porque el backend puede asignarlo
  fechadeemision: string;
  numerofactura: string;
  proveedor: string;
  Title: string;   // nit va ser el title porque asi se guardo en la lista
  tipodefactura: string;
  item: string;
  descripcionitem?: string;
  valor: number;
  cc: string;   // falta añadirla en todo lo otro   centro costos
  co: string;  // centro operativo
  un: string;  //unidad de negocio
  detalle?: string;
}
