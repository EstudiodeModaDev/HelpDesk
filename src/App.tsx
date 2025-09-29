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

/* ---------------------- NAV ---------------------- */
const NAVS_ADMIN = [
  { key: 'home',        label: 'Home',         icon: '🏠' },
  { key: 'ticketform',  label: 'Nuevo Ticket', icon: '➕' },
  { key: 'ticketTable', label: 'Ver Tickets',  icon: '👁️' },
  { key: 'task',        label: 'Tareas',       icon: '✅' },
  { key: 'formatos',    label: 'Formatos',     icon: '👥' },
  { key: 'reportes',    label: 'Reportes',     icon: '📊' },
] as const;

export type AdminNavKey = typeof NAVS_ADMIN[number]['key'];
export type NavKey = AdminNavKey;

/* ---------------------- UI: Header ---------------------- */
function HeaderBar(props: {
  user: User;
  role: string; // texto de visualización ("Administrador" | "Técnico" | "Usuario")
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
function Sidebar(props: { selected: NavKey; onSelect: (k: NavKey) => void; }) {
  const { selected, onSelect } = props;
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__header">Menú</div>
      <nav className="sidebar__nav" role="navigation">
        {NAVS_ADMIN.map((nav) => (
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

  /* === NO LOGUEADO: solo header con botón “Iniciar sesión” === */
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

  /* === LOGUEADO: delega en LoggedApp (aquí sí usamos GraphServices y el hook del rol) === */
  return (
    <LoggedApp
      user={user as User}
      actionLabel={actionLabel}
      onAuthClick={handleAuthClick}
    />
  );
}

/* ---------------------- LoggedApp: solo se renderiza si hay sesión ---------------------- */
function LoggedApp({
  user,
  actionLabel,
  onAuthClick,
}: {
  user: User;
  actionLabel: string;
  onAuthClick: () => void;
}) {
  const [selected, setSelected] = React.useState<NavKey>('home');

  // Hook que consulta SharePoint por correo => 'admin' | 'tecnico' | 'usuario'
  const { role } = useUserRoleFromSP(user!.mail);

  // lógica
  const isAdmin = role === 'Administrador';


  return (
    <div className={`page layout ${isAdmin ? 'layout--withSidebar' : ''}`}>
      {isAdmin && (
        <Sidebar selected={selected} onSelect={(k) => setSelected(k)} />
      )}

      <HeaderBar
        user={user}
        role={role}
        onPrimaryAction={{ label: actionLabel, onClick: onAuthClick, disabled: false }}
      />

      <main className={`content ${isAdmin ? 'content--withSidebar' : ''}`}>
        
          <>
            {selected === 'home' && <Home />}
            {selected === 'ticketform' && <NuevoTicketForm />}
            {selected === 'ticketTable' && <TablaTickets />}
            {selected === 'task' && <TareasPage />}
            {selected === 'formatos' && <Formatos />}
            {/* {selected === 'reportes' && <Reportes />} */}
          </>
        {/* )} */}
      </main>
    </div>
  );
}

/* ---------------------- App Root ---------------------- */
export default function App() {
  return (
    <AuthProvider>
      {/* Monta GraphServices SOLO cuando hay sesión */}
      <GraphServicesGate>
        <Shell />
      </GraphServicesGate>
    </AuthProvider>
  );
}

/* Gate: provee GraphServices sólo si hay cuenta (evita pedir token antes de login) */
function GraphServicesGate({ children }: { children: React.ReactNode }) {
  const { ready, account } = useAuth();
  if (!ready || !account) return <>{children}</>; // sin provider cuando no hay sesión
  return <GraphServicesProvider>{children}</GraphServicesProvider>;
}
