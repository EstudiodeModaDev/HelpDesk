export type Proveedor = {
  id: string;
  nombre: string;
  nit: string;
};

export type Item = {
  Identificador: string;
  descripcion: string;
  valor: number;
};

export type Provider = {
  id: string;
  nombre: string;
  nit: string;
};

export type InvoiceLine = {
  tempId: string; // id temporal para key render
  itemId: string;
  descripcion?: string;
  valorUnitario: number;
  cantidad: number;
  subtotal: number;
};

export type InvoicePayload = {
  fecha: string; 
  numero: string;
  proveedorId: string;
  nit: string;
  co: string; 
  centroCostos: string;
  lineas: Array<InvoiceLine>;
  total: number;
};


export type FormErrors = Partial<Record<keyof InvoicePayload, string>>;
