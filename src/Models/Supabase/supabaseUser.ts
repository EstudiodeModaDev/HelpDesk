export type AppUser = {
  User_ID:         number;
  User_Name:       string;
  User_Email:      string;
  User_Avatar_url: string;
User_Role:       string;
  Department_ID:   number | null;   // ← requerido para filtrar menciones
  department?:     { Department_ID: number; Department_Name: string; Department_Code: string } | null;
};

type PrismaDepartment = {
  Department_Name: string; 
  Department_Code: string 
}

type PrismaTeam = {
  Team_Code: string;
  Team_Name: string;
}

export type PrismaUserProfile = {
  User_ID:       number;
  User_Name:     string;
  User_Email:    string;
  User_Role:     string;
  Department_ID: number | null;
  Team_ID:       number | null;
  Is_New:        boolean;
  Is_Active:     boolean;
  team: PrismaTeam[];
  department?: PrismaDepartment[]
};