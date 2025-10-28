import * as React from "react";
import "./App.css";
import Home from "./components/Home/Home";
import NuevoTicketForm from "./components/NuevoTicket/NuevoTicketForm";
import NuevoTicketUsuarioForm from "./components/NuevoTicketUsuario/NuevoTicketFormUsuario";
import TablaTickets from "./components/Tickets/Tickets";
import TareasPage from "./components/Tareas/Tareas";
import Formatos from "./components/Formatos/Formatos";
import InfoPage from "./components/Info/Informacion";
import CrearPlantilla from "./components/NuevaPlantilla/NuevaPlantilla";
import UsuariosPanel from "./components/Usuarios/Usuarios";
import CajerosPOSForm from "./components/CajerosPOS/CajerosPOS";
import ComprasPage from "./components/Compras/ComprasPage";
import RegistroFactura from "./components/RegistroFactura/RegistroFactura";
import type { User } from "./Models/User";
import { AuthProvider, useAuth } from "./auth/authContext";
import { useUserRoleFromSP } from "./Funcionalidades/Usuarios";
import { GraphServicesProvider, useGraphServices } from "./graph/GrapServicesContext";
import type { TicketsService } from "./Services/Tickets.service";
import type { UsuariosSPService } from "./Services/Usuarios.Service";
import type { LogService } from "./Services/Log.service";
import HomeIcon from "./assets/home.svg";
import addIcon from "./assets/add.svg";
import seeTickets from "./assets/tickets.svg";
import tareasIcon from "./assets/tareas.svg";
import filesIcon from "./assets/file.svg";

/* ============================================================
   Tipos de navegación y contexto de visibilidad
   ============================================================ */

type Role = "Administrador" | "Técnico" | "Usuario";

type RenderCtx = {services?: { Tickets: TicketsService; Usuarios: UsuariosSPService; Logs: LogService }};

type Services = {Tickets: TicketsService; Usuarios: UsuariosSPService; Logs: LogService;};

export type MenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  to?: React.ReactNode | ((ctx: RenderCtx) => React.ReactNode);
  children?: MenuItem[];
  roles?: Role[];
  flags?: string[];
  when?: (ctx: NavContext) => boolean;
};

export type NavContext = {
  role: Role;
  flags?: Set<string>;
  hasService?: (k: keyof Services) => boolean;   // ya no es never
};

/* ============================================================
   Árbol único de navegación con reglas de visibilidad
   ============================================================ */

const NAV: MenuItem[] = [
  {id: "home", label: "Home", icon: <img src={HomeIcon} alt="" className="sb-icon" />, to: <Home /> },
  {id: "ticketform", label: "Nuevo Ticket", icon: <img src={addIcon} alt="" className="sb-icon" />, to: () => <NuevoTicketForm />, roles: ["Administrador", "Técnico"],},
  {id: "ticketform_user", label: "Nuevo Ticket", icon: <img src={addIcon} alt="" className="sb-icon" />, to: <NuevoTicketUsuarioForm />, roles: ["Usuario"],},
  {id: "ticketTable", label: "Ver Tickets", icon: <img src={seeTickets} alt="" className="sb-icon" />, to: <TablaTickets />, roles: ["Administrador", "Técnico", "Usuario"],},
  {id: "task", label: "Tareas", icon: <img src={tareasIcon} alt="" className="sb-icon" />, to: <TareasPage /> },
  {id: "formatos", label: "Formatos", icon: <img src={filesIcon} alt="" className="sb-icon" />, to: <Formatos />, roles: ["Administrador"] },
  {id: "info", label: "Información", to: <InfoPage /> },
  {id: "admin", label: "Administración", roles: ["Administrador", "Técnico"], children: [
      { id: "anuncios", label: "Anuncios", to: <RegistroFactura /> },
      { id: "plantillas", label: "Plantillas", to: <CrearPlantilla /> },
      { id: "usuarios", label: "Usuarios", to: <UsuariosPanel />, roles: ["Administrador"] },
    ],
  },
  {id: "acciones", label: "Acciones", roles: ["Administrador", "Técnico"], children: [
      {id: "siesa", label: "Siesa", children: [{id: "cajpos", label: "Cajeros POS", to: (rctx: RenderCtx) =>
                                                                                      rctx.services ? (
                                                                                        <CajerosPOSForm services={{ Tickets: rctx.services.Tickets, Logs: rctx.services.Logs }} />
                                                                                      ) : (
                                                                                        <div>Cargando servicios…</div>
                                                                                      ),
          },
        ],
      },
      {id: "cesar", label: "Cesar", children: [
          { id: "compras", label: "Compras", to: <ComprasPage />},
          { id: "facturas", label: "Facturas", to: <RegistroFactura /> },
        ],
      },
    ],
  },
];

/* ============================================================
   Utilidades de árbol: filtrado, búsqueda y primera hoja
   ============================================================ */

// Aplica reglas de visibilidad a un nodo
function isVisible(node: MenuItem, ctx: NavContext): boolean {
  if (node.roles && !node.roles.includes(ctx.role)) return false;
  if (node.flags && node.flags.some((f) => !ctx.flags?.has(f))) return false;
  if (node.when && !node.when(ctx)) return false;
  return true;
}

// Devuelve el árbol filtrado (oculta carpetas sin hijos visibles)
function filterNavTree(nodes: readonly MenuItem[], ctx: NavContext): MenuItem[] {
  return nodes
    .map((n) => {
      const children = n.children ? filterNavTree(n.children, ctx) : undefined;
      const self = isVisible(n, ctx);
      if (children && children.length === 0 && !self) return null;
      if (!self && !children) return null;
      return { ...n, children };
    })
    .filter(Boolean) as MenuItem[];
}

// Primer leaf para selección inicial
function firstLeafId(nodes: readonly MenuItem[]): string {
  const pick = (n: MenuItem): string => (n.children?.length ? pick(n.children[0]) : n.id);
  return nodes.length ? pick(nodes[0]) : "";
}

// Busca un ítem por id
function findById(nodes: readonly MenuItem[], id: string): MenuItem | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const hit = findById(n.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

/* ============================================================
   Header superior simple
   ============================================================ */

function HeaderBar(props: {user: User; role: string; onPrimaryAction?: { label: string; onClick: () => void; disabled?: boolean } | null}) {
  const { user, role, onPrimaryAction } = props;
  const isLogged = Boolean(user);
  return (
    <div className="headerRow">
      <div className="brand">
        <h1>Helpdesk EDM</h1>
      </div>
      <div className="userCluster">
        <div className="avatar">{user?.displayName ? user.displayName[0] : "?"}</div>
        <div className="userInfo">
          <div className="userName">{isLogged ? user?.displayName : "Invitado"}</div>
          <div className="userMail">{isLogged ? role : "–"}</div>
        </div>
        {onPrimaryAction && (
          <button
            className="btn-logout"
            onClick={onPrimaryAction.onClick}
            disabled={onPrimaryAction.disabled}
            aria-busy={onPrimaryAction.disabled}
          >
            {onPrimaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Sidebar con árbol recursivo y apertura de carpetas
   ============================================================ */

function Sidebar(props: {navs: readonly MenuItem[]; selected: string; onSelect: (k: string) => void; user: User; role: string;}) {
  const { navs, selected, onSelect, user, role } = props;
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    const walk = (nodes: readonly MenuItem[], path: string[] = []) => {
      nodes.forEach((n) => {
        const p = [...path, n.id];
        if (n.id === selected) p.slice(0, -1).forEach((id) => (next[id] = true));
        if (n.children?.length) walk(n.children, p);
      });
    };
    walk(navs);
    setOpen((prev) => ({ ...prev, ...next }));
  }, [selected, navs]);

  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  const renderTree = (nodes: readonly MenuItem[], depth = 0) => (
    <ul className="sb-ul">
      {nodes.map((n) => {
        const hasChildren = !!n.children?.length;
        const expanded = !!open[n.id];
        const pad = 10 + depth * 14;

        if (hasChildren) {
          return (
            <li key={n.id} className="sb-li">
              <button className="sideItem sideItem--folder" style={{ paddingLeft: pad }} onClick={() => toggle(n.id)} aria-expanded={expanded}>
                <span className={`caret ${expanded ? "rot" : ""}`}>▸</span>
                <span className="sb-icon-wrap" aria-hidden>
                  {n.icon ?? null}
                </span>
                <span className="sideItem__label">{n.label}</span>
              </button>
              {expanded && renderTree(n.children!, depth + 1)}
            </li>
          );
        }

        const active = selected === n.id;
        return (
          <li key={n.id} className="sb-li">
            <button className={`sideItem sideItem--leaf ${active ? "sideItem--active" : ""}`} style={{ paddingLeft: pad + 18 }} onClick={() => onSelect(n.id)} aria-current={active ? "page" : undefined}>
              <span className="sideItem__icon" aria-hidden="true">
                {n.icon ?? "•"}
              </span>
              <span className="sideItem__label">{n.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__header">
        <div style={{ fontWeight: 800 }}>Soporte Técnico</div>
        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>Estamos aquí para ayudarte.</div>
      </div>
      <nav className="sidebar__nav" role="navigation">
        {renderTree(navs)}
      </nav>
      <div className="sidebar__footer">
        <div className="sb-prof__avatar">{user?.displayName ? user.displayName[0] : "U"}</div>
        <div className="sb-prof__info">
          <div className="sb-prof__mail">{user?.mail || "usuario@empresa.com"}</div>
          <div className="sb-prof__mail" aria-hidden="true">
            {role}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   Shell: controla autenticación básica y muestra LoggedApp
   ============================================================ */

function Shell() {
  const { ready, account, signIn, signOut } = useAuth();
  const [loadingAuth, setLoadingAuth] = React.useState(false);

  // mapea la cuenta MSAL a tipo User para el header
  const user: User = account
    ? { displayName: account.name ?? account.username ?? "Usuario", mail: account.username ?? "", jobTitle: "" }
    : null;

  const isLogged = Boolean(account);

  const handleAuthClick = async () => {
    if (!ready || loadingAuth) return;
    setLoadingAuth(true);
    try {
      if (isLogged) await signOut();
      else await signIn("popup");
    } finally {
      setLoadingAuth(false);
    }
  };

  const actionLabel = !ready
    ? "Cargando…"
    : loadingAuth
    ? isLogged
      ? "Cerrando…"
      : "Abriendo Microsoft…"
    : isLogged
    ? "Cerrar sesión"
    : "Iniciar sesión";

  // estado no logueado: solo header con botón de acción
  if (!ready || !isLogged) {
    return (
      <div className="page layout">
        <HeaderBar user={user} role={"Usuario"} onPrimaryAction={{ label: actionLabel, onClick: handleAuthClick, disabled: !ready || loadingAuth }}/>
      </div>
    );
  }

  // estado logueado
  return <LoggedApp user={user as User} />;
}

/* ============================================================
   LoggedApp: calcula árbol visible y renderiza el contenido
   ============================================================ */

function LoggedApp({ user }: { user: User }) {
  const { role } = useUserRoleFromSP(user!.mail);
  // servicios de Graph para condiciones y render perezoso
  const services = useGraphServices() as {Tickets: TicketsService; Usuarios: UsuariosSPService; Logs: LogService;};

  // contexto de visibilidad: rol, flags y disponibilidad de servicios
  const navCtx = React.useMemo<NavContext>(() => {
    const safeRole: Role = role === "Administrador" || role === "Técnico" || role === "Usuario" ? (role as Role) : "Usuario";
    return {
      role: safeRole,
      flags: new Set<string>([ ]),
      hasService: (k) => {
        if (k === "Usuarios") return Boolean(services?.Usuarios);
        if (k === "Tickets") return Boolean(services?.Tickets);
        if (k === "Logs") return Boolean(services?.Logs);
        return false;
      },
    };
  }, [role, services]);

  // árbol filtrado según reglas
  const navs = React.useMemo(() => filterNavTree(NAV, navCtx), [navCtx]);

  // selección actual
  const [selected, setSelected] = React.useState<string>(() => firstLeafId(navs));

  // corrige selección si el árbol cambia y el id ya no existe
  React.useEffect(() => {
    if (!findById(navs, selected)) setSelected(firstLeafId(navs));
  }, [navs, selected]);

  // busca item seleccionado
  const item = React.useMemo(() => findById(navs, selected), [navs, selected]);

  // resuelve el elemento a renderizar (soporta factory con contexto)
  const element = React.useMemo(() => {
    if (!item) return null;
    if (typeof item.to === "function") {
      return (item.to as (ctx: RenderCtx) => React.ReactNode)({ services });
    }
    return item.to ?? null;
  }, [item, services]);

  return (
    <div className="page layout layout--withSidebar">
      <Sidebar navs={navs} selected={selected} onSelect={setSelected} user={user} role={role} />
      <main className="content content--withSidebar">
        <div className="page-viewport">
          <div className="page page--fluid center-all">{element}</div>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   App root y gate de servicios
   ============================================================ */

export default function App() {
  return (
    <AuthProvider>
      <GraphServicesGate>
        <Shell />
      </GraphServicesGate>
    </AuthProvider>
  );
}

// Provee GraphServices solo si hay sesión iniciada
function GraphServicesGate({ children }: { children: React.ReactNode }) {
  const { ready, account } = useAuth();
  if (!ready || !account) return <>{children}</>;
  return <GraphServicesProvider>{children}</GraphServicesProvider>;
}
