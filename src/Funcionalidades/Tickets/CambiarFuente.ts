import * as React from "react";
import { useState,  } from "react";
import type { FormErrors } from "../../Models/nuevoTicket";
import type { Ticket } from "../../Models/Tickets";
import type { TicketsRepository } from "../../repositories/TicketsRepository/TicketRepository";
import toast from "react-hot-toast";
import type { SupabaseTickets } from "../../Models/DTO/Tickets";

type Params = {
  Tickets: TicketsRepository | null;
  ticket: Ticket
};

export function useCambiarFuenteSolicitante({ticket, Tickets}: Params) {
  const [fuente, setFuente] = React.useState<string>("")

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if(ticket.Fuente) setFuente(ticket.Fuente)
  }, [ticket.Fuente])


  const handleCambiarCategoria = async (e: React.FormEvent,): Promise<boolean> => {
    e.preventDefault();
    
    if (!fuente) {
      setErrors({fuente: "Por favor seleccione una fuente solicitante valida"})
      toast.error("Por favor seleccione una fuente solicitante valida")
      return false
    };

    setSubmitting(true);
    try {
      const payloadUpdate: Partial<SupabaseTickets> = {
        ticket_solvi_fuente: fuente
      };

      if (!Tickets?.updateTicket) {
        toast.error("Tickets service no disponible. Verifica el GraphServicesProvider.")
        throw new Error("Tickets service no disponible. Verifica el GraphServicesProvider.")
      } 

      await Tickets.updateTicket(String(ticket.ID), payloadUpdate);

      setErrors({});
      return true
  
    } finally {
      setSubmitting(false);
    }
  };

  return {
    errors,
    submitting,
    fuente,
    setFuente,
    handleCambiarCategoria
  };
}
