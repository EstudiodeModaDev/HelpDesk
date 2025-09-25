import * as React from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import { initMSAL, ensureLogin, getAccessToken, logout, getActiveAccount} from './msal';

type AuthCtx = {
  ready: boolean;
  account: AccountInfo | null;
  getToken: (scopes?: string[]) => Promise<string>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = React.createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = React.useState(false);
  const [account, setAccount] = React.useState<AccountInfo | null>(null);

  // 1) Inicializa MSAL y rehidrata sesión si existe
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await initMSAL();
        if (cancel) return;

        // Rehidrata cuenta activa si ya hay sesión (silent)
        const acc = getActiveAccount?.() ?? null;
        setAccount(acc);
      } catch (err) {
        console.error('[AuthProvider] init error:', err);
      } finally {
        if (!cancel) setReady(true); // 2) ready=true tras inicializar
      }
    })();

    return () => { cancel = true; };
  }, []);

  const signIn = React.useCallback(async () => {
    const acc = await ensureLogin(); // hace silent->popup según definas
    setAccount(acc);
    setReady(true);
  }, []);

  const signOut = React.useCallback(async () => {
    await logout();
    setAccount(null);
    setReady(true);
  }, []);

  const getToken = React.useCallback(async (scopes?: string[]) => {
    return getAccessToken(scopes); // 3) scopes opcionales
  }, []);

  const value = React.useMemo<AuthCtx>(() => ({
    ready,
    account,
    getToken,
    signIn,
    signOut,
  }), [ready, account, getToken, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
