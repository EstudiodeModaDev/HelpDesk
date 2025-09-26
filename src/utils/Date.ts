// src/components/Tickets/Tickets.tsx
import { parseFecha } from '../Funcionalidades/Tickets';

export function toISODate(v: Date): string;
export function toISODate(v: string | undefined): string;
export function toISODate(v: Date | string | undefined): string {
  const d = v instanceof Date ? v : parseFecha(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}