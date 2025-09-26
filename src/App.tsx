// src/App.tsx
import * as React from 'react';
import { AuthProvider, useAuth } from './auth/authContext';

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { ready, account, signIn, signOut } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleAuthClick = async () => {
    if (!ready || loading) return;
    setLoading(true);
    try {
      if (account) {
        await signOut(); // hay sesión -> cerrar
      } else {
        await signIn();  // no hay sesión -> iniciar
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = !ready
    ? 'Cargando…'
    : loading
    ? (account ? 'Cerrando…' : 'Abriendo Microsoft…')
    : (account ? 'Cerrar sesión' : 'Iniciar sesión');

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          gap: 12,
        }}
      >
        <strong style={{ fontSize: 18 }}>Mi App</strong>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {ready && account && (
            <>
              <div
                title={account.username}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#1f3a8a',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {account.name?.slice(0, 1).toUpperCase() ?? 'U'}
              </div>
              <span style={{ fontSize: 14 }}>{account.name ?? account.username}</span>
            </>
          )}

          {/* ÚNICO botón que alterna iniciar/cerrar */}
          <button
            type="button"
            onClick={() => void handleAuthClick()}
            disabled={!ready || loading}
            aria-busy={loading}
            style={btnStyle({ variant: account ? 'danger' : 'primary', disabled: !ready || loading })}
          >
            {buttonLabel}
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: 16 }}>
        {!ready ? (
          <p>Preparando autenticación…</p>
        ) : account ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Bienvenido, {account.name ?? account.username}</h2>
            <p>Tu contenido privado va aquí.</p>
          </div>
        ) : (
          <div
            style={{
              minHeight: '50vh',
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              color: '#334155',
            }}
          >
            <div style={{ maxWidth: 460 }}>
              <h2 style={{ marginTop: 0 }}>Necesitas iniciar sesión</h2>
              <p>Usa el botón “Iniciar sesión” arriba a la derecha para continuar.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function btnStyle(opts: { variant: 'primary' | 'danger'; disabled?: boolean }): React.CSSProperties {
  const palette =
    opts.variant === 'primary'
      ? { fg: '#1f3a8a', bg: '#ffffff', hoverBg: '#1f3a8a', hoverFg: '#ffffff', border: '#1f3a8a' }
      : { fg: '#b91c1c', bg: '#ffffff', hoverBg: '#b91c1c', hoverFg: '#ffffff', border: '#b91c1c' };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.fg,
    fontWeight: 500,
    cursor: opts.disabled ? 'not-allowed' : 'pointer',
    opacity: opts.disabled ? 0.6 : 1,
    transition: 'background-color 180ms ease, color 180ms ease, border-color 180ms ease, opacity 120ms ease',
  };
}
