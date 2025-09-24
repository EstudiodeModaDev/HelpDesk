// src/App.tsx
import { useEffect, useState } from 'react';
import './App.css';
import Home from './components/Home/Home';
import NuevoTicketForm from './components/NuevoTicket/NuevoTicketForm';
import TablaTickets from './components/Tickets/Tickets';
import TareasPage from './components/Tareas/Tareas';

const NAVS_ADMIN = [
  { key: 'home', label: 'Home' },
  { key: 'ticketform', label: 'Nuevo Ticket' },
  { key: 'ticketTable', label: 'Tickets' },
  { key: 'task', label: 'Tareas' },
  { key: 'colaboradores', label: 'Colaboradores', icon: '👥' },
  { key: 'reportes', label: 'Reportes', icon: '📊' },
] as const;

type AdminNavKey = typeof NAVS_ADMIN[number]['key'];
type NavKey = AdminNavKey;

type User = {
  displayName?: string;
  mail?: string;
  jobTitle?: string;
} | null;

function HeaderBar(props: {
  user: User;
  role: 'admin' | 'usuario';
  onPrimaryAction?: { label: string; onClick: () => void } | null;
}) {
  const { user, role, onPrimaryAction } = props;
  const isLogged = Boolean(user);
  return (
    <div className="headerRow">
      {/* Hamburguesa ya no es necesaria si el sidebar es fijo */}
      <div className="brand"><h1>Helpdesk EDM</h1></div>
      <div className="userCluster">
        <div className="avatar">{user?.displayName ? user.displayName[0] : '?'}</div>
        <div className="userInfo">
          <div className="userName">{isLogged ? user?.displayName : 'Invitado'}</div>
          <div className="userMail">{isLogged ? role : '–'}</div>
        </div>
        {onPrimaryAction && (
          <button className="btn-logout" onClick={onPrimaryAction.onClick}>
            ⎋ {onPrimaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

function Sidebar(props: {
  selected: NavKey;
  onSelect: (k: NavKey) => void;
}) {
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
            <span className="sideItem__label">{nav.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar__footer"><small>Estudio de moda</small></div>
    </aside>
  );
}

function AppInner() {
  const [selected, setSelected] = useState<NavKey>('home');
  const [user, setUser] = useState<User>(null);
  const [userRole] = useState<'admin' | 'usuario'>('admin');

  useEffect(() => {
    const t = setTimeout(() => {
      setUser({
        displayName: 'Daniel Palacios',
        mail: 'practicantelisto@estudiodemoda.com.co',
        jobTitle: 'Desarrollador'
      });
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const isAdmin = userRole === 'admin';

  return (
    <div className={`page layout ${isAdmin ? 'layout--withSidebar' : ''}`}>
      {isAdmin && (
        <Sidebar
          selected={selected}
          onSelect={(k) => setSelected(k)}
        />
      )}

      <HeaderBar
        user={user}
        role={userRole}
        onPrimaryAction={{ label: 'Cerrar sesión', onClick: () => alert('Cerrar sesión') }}
      />

      <main className={`content ${isAdmin ? 'content--withSidebar' : ''}`}>
        {selected === 'home' && <Home />}
        {selected === 'ticketform' && <NuevoTicketForm />}
        {selected === 'ticketTable' && <TablaTickets />}
        {selected === 'task' && <TareasPage />}
      </main>
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
