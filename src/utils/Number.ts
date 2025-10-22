export const formatPesosEsCO = (raw: string) => {
  // deja solo dígitos y una coma decimal
  const cleaned = raw
    .replace(/[^\d,]/g, "")     // solo dígitos y coma
    .replace(/,(?=.*,)/g, "");  // deja solo la primera coma

  const [ent, dec] = cleaned.split(",");
  const withThousands = (ent || "")
    .replace(/^0+(?=\d)/, "")               // quita ceros a la izquierda (si quieres)
    .replace(/\B(?=(\d{3})+(?!\d))/g, "."); // puntos de miles

  return dec !== undefined ? `${withThousands},${dec.slice(0,2)}` : withThousands;
};

export const toNumberFromEsCO = (formatted: string) => Number(formatted.replace(/\./g, "").replace(",", "."));
