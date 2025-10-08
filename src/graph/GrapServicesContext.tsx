import * as React from 'react';

// Auth 
import { useAuth } from '../auth/authContext'; // asegúrate del case correcto

//  Cliente REST para Graph
import { GraphRest } from './GraphRest';

// 🧩 Servicios (versiones 100% Graph que ya creaste)
import { SociedadesService } from '../Services/Sociedades.service';
import { ProveedoresService } from '../Services/Proveedores.service';
import { PlantillasService } from '../Services/Plantillas.service';
import { InternetService } from '../Services/Internet.service';
import { CasosHijosRequeridosService } from '../Services/CasosHijosRequeridos.service';
import { ActasdeentregaService } from '../Services/Actasdeentrega.service';
import { AnunciosService } from '../Services/Anuncios.service';
import { ArticulosService } from '../Services/Articulos.service';
import { UsuariosSPService } from '../Services/Usuarios.Service';
import { LogService } from '../Services/Log.service';
import { TicketsService } from '../Services/Tickets.service';
import { CategoriasService } from '../Services/Categorias.service';
import { FranquiciasService } from '../Services/Franquicias.service';
import { SubCategoriasService } from '../Services/SubCategorias.Service';
import {InternetTiendasService } from '../Services/InternetTiendas.service'
//import { SharedServices } from '../Services/Shared.service'; // <- singular

// ================== Tipos ==================
export type GraphSiteConfig = {
  hostname: string;          
  sitePath: string;         
  lists: {
    Sociedades: string;        
    Proveedores: string;  
    Plantillas: string;     
    Internet: string;     
    CasosHijosRequeridos: string;            
    ActasEntrega: string;
    Anuncios: string;
    Articulos: string;
    Usuarios: string;
    Logs: string;
    Tickets: string;
    Categorias: string;
    Franquicias: string;
    SubCategorias: string;
    InternetTiendas: string
  };
};

export type GraphServices = {
  graph: GraphRest;
  // SharePoint list services
  Sociedades: SociedadesService;
  Proveedores: ProveedoresService;
  Plantillas: PlantillasService;
  Internet: InternetService;
  CasosHijosRequeridos: CasosHijosRequeridosService;
  ActasEntrega: ActasdeentregaService;
  Anuncios: AnunciosService;
  Articulos: ArticulosService;
  Usuarios: UsuariosSPService;
  Logs: LogService;
  Tickets: TicketsService;
  Categorias: CategoriasService; 
  Franquicias: FranquiciasService;
  SubCategorias: SubCategoriasService;
  InternetTiendas: InternetTiendasService

};

// ================== Contexto ==================
const GraphServicesContext = React.createContext<GraphServices | null>(null);

// ================== Provider ==================
type ProviderProps = {
  children: React.ReactNode;
  config?: Partial<GraphSiteConfig>;
};

const DEFAULT_CONFIG: GraphSiteConfig = {
  hostname: 'estudiodemoda.sharepoint.com',
  sitePath: '/sites/TransformacionDigital/IN/HD',
  lists: {
    Sociedades: 'Sociedades',
    Proveedores: 'Proveedores de internet',
    Plantillas: 'Plantillas',
    Internet: 'Internet',
    CasosHijosRequeridos: 'Casos hijos requeridos',
    ActasEntrega: 'Actas de entrega', 
    Anuncios: 'Anuncios',
    Articulos: 'Articulos',
    Usuarios: 'Usuarios',
    Logs: 'Log',
    Tickets: 'Tickets',
    Categorias: 'Categorias',
    Franquicias: 'Franquicias',
    SubCategorias: 'SubCategorias',
    InternetTiendas: 'Internet Tiendas'
  },
};

export const GraphServicesProvider: React.FC<ProviderProps> = ({ children, config }) => {
  const { getToken } = useAuth();

  // Mergear config
  const cfg: GraphSiteConfig = React.useMemo(() => {
    const base = DEFAULT_CONFIG;
    const sitePath = (config?.sitePath ?? base.sitePath);
    return {
      hostname: config?.hostname ?? base.hostname,
      sitePath: sitePath.startsWith('/') ? sitePath : `/${sitePath}`,
      lists: {
        Sociedades:                     config?.lists?.Sociedades               ?? base.lists.Sociedades,
        Proveedores:                    config?.lists?.Proveedores              ?? base.lists.Proveedores,
        Plantillas:                     config?.lists?.Plantillas               ?? base.lists.Plantillas,
        Internet:                       config?.lists?.Internet                 ?? base.lists.Internet,
        CasosHijosRequeridos:           config?.lists?.CasosHijosRequeridos     ?? base.lists.CasosHijosRequeridos,
        ActasEntrega:                   config?.lists?.ActasEntrega             ?? base.lists.ActasEntrega,
        Anuncios:                       config?.lists?.Anuncios                 ?? base.lists.Anuncios,
        Articulos:                      config?.lists?.Articulos                ?? base.lists.Articulos,
        Usuarios:                       config?.lists?.Usuarios                 ?? base.lists.Usuarios,
        Logs:                           config?.lists?.Logs                     ?? base.lists.Logs,
        Tickets:                        config?.lists?.Tickets                  ?? base.lists.Tickets,
        Categorias:                     config?.lists?.Categorias               ?? base.lists.Categorias,
        Franquicias:                    config?.lists?.Franquicias              ?? base.lists.Franquicias,
        SubCategorias:                  config?.lists?.SubCategorias            ?? base.lists.SubCategorias,
        InternetTiendas:                config?.lists?.InternetTiendas          ?? base.lists.InternetTiendas,
      },
    };
  }, [config]);

  // Cliente Graph REST (usa getToken del AuthContext/MSAL)
  const graph = React.useMemo(() => {
    // tu GraphRest original sólo acepta getToken
    return new GraphRest(getToken);
  }, [getToken]);

  // Instancias de servicios (memo)
  const services = React.useMemo<GraphServices>(() => {
    const { hostname, sitePath, lists } = cfg;

    const Sociedades                = new SociedadesService(graph, hostname, sitePath, lists.Sociedades);
    const Proveedores               = new ProveedoresService(graph, hostname, sitePath, lists.Proveedores);
    const Plantillas                = new PlantillasService(graph, hostname, sitePath, lists.Plantillas);
    const Internet                  = new InternetService(graph, hostname, sitePath, lists.Internet);
    const CasosHijosRequeridos      = new CasosHijosRequeridosService(graph, hostname, sitePath, lists.CasosHijosRequeridos);
    const ActasEntrega              = new ActasdeentregaService(graph, hostname, sitePath, lists.ActasEntrega);
    const Anuncios                  = new AnunciosService(graph, hostname, sitePath, lists.Anuncios);
    const Articulos                 = new ArticulosService(graph, hostname, sitePath, lists.Articulos);
    const Usuarios                  = new UsuariosSPService(graph, hostname, sitePath, lists.Usuarios);
    const Logs                      = new LogService(graph, hostname, sitePath, lists.Logs);
    const Tickets                   = new TicketsService(graph, hostname, sitePath, lists.Tickets);
    const Categorias                = new CategoriasService(graph, hostname, sitePath, lists.Categorias);
    const Franquicias               = new FranquiciasService(graph, hostname, sitePath, lists.Franquicias);
    const SubCategorias             = new SubCategoriasService(graph, hostname, sitePath, lists.SubCategorias);
    const InternetTiendas            = new InternetTiendasService(graph, hostname, sitePath, lists.InternetTiendas)


    // SharedService depende de UsuariosParkingService
    //const shared             = new SharedServices(usuariosParking);

    return {
        graph,
        Sociedades,
        Proveedores,
        Plantillas,
        Internet,
        CasosHijosRequeridos,
        ActasEntrega,
        Anuncios,
        Articulos,
        Usuarios,
        Logs,
        Tickets,
        Categorias,
        Franquicias,
        SubCategorias,
        InternetTiendas
    };
  }, [graph, cfg]);

  return (
    <GraphServicesContext.Provider value={services}>
      {children}
    </GraphServicesContext.Provider>
  );
};

// ================== Hook de consumo ==================
export function useGraphServices(): GraphServices {
  const ctx = React.useContext(GraphServicesContext);
  if (!ctx) throw new Error('useGraphServices debe usarse dentro de <GraphServicesProvider>.');
  return ctx;
}
