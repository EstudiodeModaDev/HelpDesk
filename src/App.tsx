// src/App.tsx
import * as React from 'react';
import './App.css';

import Home from './components/Home/Home';
import NuevoTicketForm from './components/NuevoTicket/NuevoTicketForm';
import TablaTickets from './components/Tickets/Tickets';
import TareasPage from './components/Tareas/Tareas';
import Formatos from './components/Formatos/Formatos';
import type { User } from './Models/User';
import { GraphServicesProvider, useGraphServices } from './graph/GrapServicesContext';
import { AuthProvider, useAuth } from './auth/authContext';
import { useUserRoleFromSP } from './Funcionalidades/Usuarios';
import CajerosPOSForm from './components/CajerosPOS/CajerosPOS';
import type { TicketsService } from './Services/Tickets.service';
import type { UsuariosSPService } from './Services/Usuarios.Service';
import type { LogService } from './Services/Log.service';
import NuevaFactura from './components/Facturas/Facturas';
import ComprasPage from './components/Compras/ComprasPage';

/* ---------------------- ROLES & NAVS ---------------------- */

// Roles de la aplicación
type Role = 'Administrador' | 'Técnico' | 'Usuario';

export type MenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  to?: React.ReactNode;   // componente a renderizar si es hoja (opcional)
  children?: MenuItem[];  // subitems si es carpeta
};

/* Árbol de navegación con nivel intermedio "Siesa" */
const NAVS_ADMIN: MenuItem[] = [
  { id: 'home',        label: 'Home',         icon: '🏠', to: <Home/> },
  { id: 'ticketform',  label: 'Nuevo Ticket', icon: '➕', to: <NuevoTicketForm/> },
  { id: 'ticketTable', label: 'Ver Tickets',  icon: '👁️', to: <TablaTickets/>},
  { id: 'task',        label: 'Tareas',       icon: '✅', to: <TareasPage/> },
  { id: 'formatos',    label: 'Formatos',     icon: '📄', to: <Formatos/> },
  {
    id: 'acciones', label: 'Acciones', icon: '🛠️', children: [
      {
        id: 'siesa', label: 'Siesa', icon: '📂', children: [
          // ⚠️ Para Cajeros POS no usamos `to` aquí porque requiere inyectar servicios
          { id: 'cajpos', label: 'Cajeros POS', icon: '🧾' },
        ]
      },
      {
        id: 'cesar', label: 'Cesar', icon: '', children: [
          { id: 'facturas', label: 'Facturas', icon: '🧾', to: <NuevaFactura/>},
          { id: 'compras', label: 'Compras', icon: '💰', to: <ComprasPage/>},
        ]
      },
    ]
  },
];

const NAVS_TECNICO: MenuItem[] = [
  { id: 'home',        label: 'Home',         icon: '🏠', to: <Home/> },
  { id: 'ticketform',  label: 'Nuevo Ticket', icon: '➕', to: <NuevoTicketForm/> },
  { id: 'ticketTable', label: 'Ver Tickets',  icon: '👁️', to: <TablaTickets/>},
  { id: 'task',        label: 'Tareas',       icon: '✅', to: <TareasPage/> },
  {
    id: 'acciones', label: 'Acciones', icon: '🛠️', children: [
      {
        id: 'siesa', label: 'Siesa', icon: '📂', children: [
          { id: 'cajpos', label: 'Cajeros POS', icon: '🧾' },
        ]
      },

    ]
  },
];

const NAVS_USUARIO: MenuItem[] = [
  { id: 'home',        label: 'Home',         icon: '🏠', to: <Home/> },
  { id: 'ticketTable', label: 'Ver Tickets',  icon: '👁️', to: <TablaTickets/>},
];

function getNavsForRole(role: Role | string) {
  switch (role) {
    case 'Administrador': return NAVS_ADMIN as readonly MenuItem[];
    case 'Tecnico':       return NAVS_TECNICO as readonly MenuItem[];
    case 'Técnico':       return NAVS_TECNICO as readonly MenuItem[];
    default:              return NAVS_USUARIO as readonly MenuItem[];
  }
}

/* -------- Helpers para menú anidado -------- */
function forEachItem(
  nodes: readonly MenuItem[],
  fn: (n: MenuItem, path: string[]) => void,
  path: string[] = []
) {
  nodes.forEach(n => {
    const p = [...path, n.id];
    fn(n, p);
    if (n.children?.length) forEachItem(n.children, fn, p);
  });
}

function hasNavDeep(navs: readonly MenuItem[], id: string) {
  let found = false;
  forEachItem(navs, (n) => { if (n.id === id) found = true; });
  return found;
}

function hasNav(navs: readonly MenuItem[], key: string) {
  return hasNavDeep(navs, key);
}

function findItemById(navs: readonly MenuItem[], id: string): MenuItem | undefined {
  let out: MenuItem | undefined;
  forEachItem(navs, (n) => { if (n.id === id) out = n; });
  return out;
}

/* Devuelve la primera hoja (descendiendo por los primeros hijos) */
function firstLeafId(navs: readonly MenuItem[]): string {
  if (!navs.length) return '';
  const pick = (n: MenuItem): string => n.children?.length ? pick(n.children[0]) : n.id;
  return pick(navs[0]);
}

/* ---------------------- UI: Header ---------------------- */
function HeaderBar(props: {
  user: User;
  role: string; // "Administrador" | "Técnico" | "Usuario"
  onPrimaryAction?: { label: string; onClick: () => void; disabled?: boolean } | null;
}) {
  const { user, role, onPrimaryAction } = props;
  const isLogged = Boolean(user);
  return (
    <div className="headerRow">
      <div className="brand"><h1>Helpdesk EDM</h1></div>
      <div className="userCluster">
        <div className="avatar">{user?.displayName ? user.displayName[0] : '?'}</div>
        <div className="userInfo">
          <div className="userName">{isLogged ? user?.displayName : 'Invitado'}</div>
          <div className="userMail">{isLogged ? role : '–'}</div>
        </div>
        {onPrimaryAction && (
          <button
            className="btn-logout"
            onClick={onPrimaryAction.onClick}
            disabled={onPrimaryAction.disabled}
            aria-busy={onPrimaryAction.disabled}
          >
            ⎋ {onPrimaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------- UI: Sidebar (anidado) ---------------------- */
function Sidebar(props: {
  navs: readonly MenuItem[];
  selected: string;
  onSelect: (k: string) => void;
}) {
  const { navs, selected, onSelect } = props;
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  // abre la rama que contiene el seleccionado
  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    forEachItem(navs, (n, path) => {
      if (n.id === selected) path.slice(0, -1).forEach(id => next[id] = true);
    });
    setOpen(prev => ({ ...prev, ...next }));
  }, [selected, navs]);

  const toggle = (id: string) => setOpen(s => ({ ...s, [id]: !s[id] }));

  const renderTree = (nodes: readonly MenuItem[], depth = 0) => (
    <ul className="sb-ul">
      {nodes.map(n => {
        const hasChildren = !!n.children?.length;
        const expanded = !!open[n.id];
        const pad = 10 + depth * 14;

        if (hasChildren) {
          return (
            <li key={n.id} className="sb-li">
              <button
                className="sideItem sideItem--folder"
                style={{ paddingLeft: pad }}
                onClick={() => toggle(n.id)}
                aria-expanded={expanded}
              >
                <span className={`caret ${expanded ? 'rot' : ''}`}>▸</span>
                <span className="sideItem__icon" aria-hidden="true">{n.icon ?? '•'}</span>
                <span className="sideItem__label">{n.label}</span>
              </button>
              {expanded && renderTree(n.children!, depth + 1)}
            </li>
          );
        }

        const active = selected === n.id;
        return (
          <li key={n.id} className="sb-li">
            <button
              className={`sideItem sideItem--leaf ${active ? 'sideItem--active' : ''}`}
              style={{ paddingLeft: pad + 18 }}
              onClick={() => onSelect(n.id)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="sideItem__icon" aria-hidden="true">{n.icon ?? '•'}</span>
              <span className="sideItem__label">{n.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__header">Menú</div>
      <nav className="sidebar__nav" role="navigation">
        {renderTree(navs)}
      </nav>
      <div className="sidebar__footer"><small>Estudio de moda</small></div>
    </aside>
  );
}

/* ---------------------- Shell (usa Auth) ---------------------- */
function Shell() {
  const { ready, account, signIn, signOut } = useAuth();
  const [loadingAuth, setLoadingAuth] = React.useState(false);

  // Mapear la cuenta MSAL a tu tipo User (para el Header)
  const user: User = account
    ? {
        displayName: account.name ?? account.username ?? 'Usuario',
        mail: account.username ?? '',
        jobTitle: '',
      }
    : null;

  const isLogged = Boolean(account);

  const handleAuthClick = async () => {
    if (!ready || loadingAuth) return;
    setLoadingAuth(true);
    try {
      if (isLogged) await signOut();
      else await signIn('popup');
    } finally {
      setLoadingAuth(false);
    }
  };

  const actionLabel = !ready
    ? 'Cargando…'
    : loadingAuth
    ? (isLogged ? 'Cerrando…' : 'Abriendo Microsoft…')
    : (isLogged ? 'Cerrar sesión' : 'Iniciar sesión');

  // NO LOGUEADO: solo header con botón
  if (!ready || !isLogged) {
    return (
      <div className="page layout">
        <HeaderBar
          user={user}
          role={'Usuario'}
          onPrimaryAction={{
            label: actionLabel,
            onClick: handleAuthClick,
            disabled: !ready || loadingAuth,
          }}
        />
      </div>
    );
  }

  // LOGUEADO
  return (
    <LoggedApp
      user={user as User}
      actionLabel={actionLabel}
      onAuthClick={handleAuthClick}
    />
  );
}

/* ---------------------- LoggedApp: nav por rol ---------------------- */
function LoggedApp({
  user,
  actionLabel,
  onAuthClick,
}: {
  user: User;
  actionLabel: string;
  onAuthClick: () => void;
}) {
  const { role } = useUserRoleFromSP(user!.mail); // 'Administrador' | 'Técnico' | 'Usuario'
  const navs = getNavsForRole(role);

  // ❗️Servicios Graph aquí (ya estamos dentro de GraphServicesProvider)
  const services = useGraphServices() as {
    Tickets: TicketsService;
    Usuarios: UsuariosSPService;
    Logs: LogService;
  };

  // selecciona la primera hoja del menú por rol
  const [selected, setSelected] = React.useState<string>(firstLeafId(navs));

  // si cambia rol/menú y el seleccionado ya no existe, caer en la primera hoja
  React.useEffect(() => {
    if (!hasNav(navs, selected)) setSelected(firstLeafId(navs));
  }, [role, navs, selected]);

  const selectedItem = React.useMemo(() => findItemById(navs, selected), [navs, selected]);

  return (
    <div className="page layout layout--withSidebar">
      {/* Sidebar SIEMPRE visible */}
      <Sidebar navs={navs} selected={selected} onSelect={setSelected} />

      <HeaderBar
        user={user}
        role={role}
        onPrimaryAction={{ label: actionLabel, onClick: onAuthClick, disabled: false }}
      />

      <main className="content content--withSidebar">
        {/* Render genérico cuando la hoja ya trae `to` */}
        {selectedItem?.to ?? (
          <>
            {/* Fallbacks por id, útil para hojas que requieren inyectar servicios */}
            {selected === 'cajpos' && (
              services?.Usuarios
                ? <CajerosPOSForm services={{ Tickets: services.Tickets, Logs: services.Logs }} />
                : <div>Cargando servicios…</div>
            )}

            {/* (Opcionales) Otros renders explícitos si quieres soportar ambos esquemas */}
            {selected === 'home' && <Home />}
            {selected === 'ticketform' && <NuevoTicketForm />}
            {selected === 'ticketTable' && <TablaTickets />}
            {selected === 'task' && <TareasPage />}
            {selected === 'formatos' && <Formatos />}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------------------- App Root ---------------------- */
export default function App() {
  return (
    <AuthProvider>
      <GraphServicesGate>
        <Shell />
      </GraphServicesGate>
    </AuthProvider>
  );
}

/* Gate: provee GraphServices sólo si hay cuenta (evita pedir token antes de login) */
function GraphServicesGate({ children }: { children: React.ReactNode }) {
  const { ready, account } = useAuth();
  if (!ready || !account) return <>{children}</>;
  return <GraphServicesProvider>{children}</GraphServicesProvider>;
}
