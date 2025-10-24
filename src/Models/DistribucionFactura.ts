export interface DistribucionFacturaData {
  Id?: string;
  Proveedor: string; // nombre del proveedor
  Title: string; // NIT
  CargoFijo: number;
  CosToImp: number ;
  ValorAnIVA: number;
  ImpBnCedi: number;
  ImpBnPalms: number;
  ImpColorPalms: number;
  ImpBnCalle: number;
  ImpColorCalle: number;
  CosTotMarNacionales: number;
  CosTotMarImpor: number;
  CosTotCedi: number;
  CosTotMarServAdmin: number;
}