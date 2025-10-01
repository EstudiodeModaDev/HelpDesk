// src/App.tsx
import * as React from 'react';
import './App.css';

import Home from './components/Home/Home';
import NuevoTicketForm from './components/NuevoTicket/NuevoTicketForm';
import TablaTickets from './components/Tickets/Tickets';
import TareasPage from './components/Tareas/Tareas';
import Formatos from './components/Formatos/Formatos';

import type { User } from './Models/User';
import { GraphServicesProvider } from './graph/GrapServicesContext';

import { AuthProvider, useAuth } from './auth/authContext';
import { useUserRoleFromSP } from './Funcionalidades/Usuarios';

/* ---------------------- ROLES & NAVS ---------------------- */

//Roles de la aplicación
type Role = 'Administrador' | 'Técnico' | 'Usuario';

type NavItem<K extends string> = { key: K; label: string; icon?: string };

type AdminKey   = 'home' | 'ticketform' | 'ticketTable' | 'task' | 'formatos' | 'reportes' | 'Inventario' | 'Administración' | 'Informacion';
type TecnicoKey = 'home' | 'ticketTable' | 'task' | 'reportes' | 'Inventario' | 'Administración' | 'Informacion' | 'ticketform';
type UsuarioKey = 'home' | 'ticketTable';

export type NavKey = AdminKey | TecnicoKey | UsuarioKey;

const NAVS_ADMIN: NavItem<AdminKey>[] = [
  { key: 'home',        label: 'Home',         icon: '🏠' },
  { key: 'ticketform',  label: 'Nuevo Ticket', icon: '➕' },
  { key: 'ticketTable', label: 'Ver Tickets',  icon: '👁️' },
  { key: 'task',        label: 'Tareas',       icon: '✅' },
  { key: 'formatos',    label: 'Formatos',     icon: '👥' },
  { key: 'reportes',    label: 'Reportes',     icon: '📊' },
];

const NAVS_TECNICO: NavItem<TecnicoKey>[] = [
  { key: 'home',        label: 'Home',     icon: '🏠' },
  { key: 'ticketform', label: 'Nuevo Ticket',  icon: '➕' },
  { key: 'ticketTable', label: 'Tickets',  icon: '👁️' },
  { key: 'task',        label: 'Tareas',   icon: '✅' },
  { key: 'reportes',    label: 'Reportes', icon: '📊' },
];

const NAVS_USUARIO: NavItem<UsuarioKey>[] = [
  { key: 'home',        label: 'Home',         icon: '🏠' },
  { key: 'ticketTable', label: 'Mis Tickets',  icon: '👁️' },
];

function getNavsForRole(role: Role | string) {
  switch (role) {
    case 'Administrador': return NAVS_ADMIN as readonly NavItem<NavKey>[];
    case 'Tecnico':       return NAVS_TECNICO as readonly NavItem<NavKey>[];
    case 'Usuario':
    default:              return NAVS_USUARIO as readonly NavItem<NavKey>[];
  }
}

function hasNav(navs: readonly NavItem<NavKey>[], key: NavKey) {
  return navs.some(n => n.key === key);
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

/* ---------------------- UI: Sidebar ---------------------- */
function Sidebar(props: {
  navs: readonly NavItem<NavKey>[];
  selected: NavKey;
  onSelect: (k: NavKey) => void;
}) {
  const { navs, selected, onSelect } = props;
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__header">Menú</div>
      <nav className="sidebar__nav" role="navigation">
        {navs.map((nav) => (
          <button
            key={nav.key}
            className={`sideItem ${selected === nav.key ? 'sideItem--active' : ''}`}
            onClick={() => onSelect(nav.key)}
            aria-current={selected === nav.key ? 'page' : undefined}
          >
            <span className="sideItem__icon" aria-hidden="true">{nav.icon ?? '•'}</span>
            <span className="sideItem__label">{nav.label}</span>
          </button>
        ))}
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
  const [selected, setSelected] = React.useState<NavKey>(navs[0].key);

  // Si cambia el rol y el tab actual ya no existe, cae al primero del menú del rol
  React.useEffect(() => {
    if (!hasNav(navs, selected)) setSelected(navs[0].key);
  }, [role, navs, selected]);

  const allow = (key: NavKey) => hasNav(navs, key);

  return (
    <div className="page layout layout--withSidebar">
      {/* Sidebar SIEMPRE visible */}
      <Sidebar navs={navs} selected={selected} onSelect={(k) => setSelected(k)} />

      <HeaderBar
        user={user}
        role={role}
        onPrimaryAction={{ label: actionLabel, onClick: onAuthClick, disabled: false }}
      />

      <main className="content content--withSidebar">
        {selected === 'home' && <Home />}

        {allow('ticketform' as NavKey) && selected === 'ticketform' && <NuevoTicketForm />}

        {allow('ticketTable' as NavKey) && selected === 'ticketTable' && <TablaTickets/>}

        {allow('task' as NavKey) && selected === 'task' && <TareasPage />}

        {allow('formatos' as NavKey) && selected === 'formatos' && <Formatos />}

        {allow('reportes' as NavKey) && selected === 'reportes' && <div>Reportes (WIP)</div>}
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
