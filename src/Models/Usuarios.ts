export type UsuariosSP = {
    Title: string; // Nombre completo
    Correo: string;
    Id?: string;
    Rol: string;
    Numerodecasos?: number;
    Disponible: string;
    _x0052_ol2?: string; // Rol2
};

export type UserMe = {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string | null;
  userPrincipalName?: string;
  jobTitle?: string | null;
  department?: string | null;
  officeLocation?: string | null;
  businessPhones?: string[]; 
  mobilePhone?: string | null;
};