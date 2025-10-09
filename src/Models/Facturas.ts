export type Facturas = {
  Id?: string;
  Title: string;
  FechaEmision: string;
  NoFactura: string;
  IdProveedor: string;
  CO: string;
  Total: number | string;
  un: string;
}

export type Proveedor = {
  Id?: string;
  Title: string; // Nombre proveedor
  Nit: string;
}

export type ItemFactura = {
  Id?: string;
  Title: string; // IdItem
  IdFactura: string;
  Cantidad: number;
}

export type ItemUx = {
  Id?: string;
  tempId: string;
  Title: string //Codigo Item
  NombreItem: string;
  Valor: number; 
  cantidad: number,
  subtotal: number,
}

export type ItemBd = {
  Id?: string;
  Title: string //Codigo Item
  NombreItem: string;
  Valor: number; 
}

export type FacturasUx = {
  Id?: string;
  Title: string;
  FechaEmision: string;
  NoFactura: string;
  IdProveedor: string;
  CO: string;
  Total: number;
  un: string;
  lineas: ItemUx[],
  nit: string
}

export type FormErrors = Partial<Record<keyof FacturasUx, string>>;
