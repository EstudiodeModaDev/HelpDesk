// msal.ts
import { PublicClientApplication, type AccountInfo, type SilentRequest, type PopupRequest } from '@azure/msal-browser';

let pca: PublicClientApplication | null = null;

export async function initMSAL() {
  if (pca) return;
  pca = new PublicClientApplication({
    auth: {
      clientId: '8d2f570b-7baa-4d6d-bb31-7ed206c06e11',
      authority: 'https://login.microsoftonline.com/cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c', // evita /common si es single-tenant
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false },
  });
  await pca.initialize();

  // Rehidrata cuenta si ya había sesión
  const accts = pca.getAllAccounts();
  if (accts[0]) pca.setActiveAccount(accts[0]);
}

// ✅ Exporta esta función (lo que te falta)
export function getActiveAccount(): AccountInfo | null {
  // Algunas versiones viejas no traen pca.getActiveAccount(); haz fallback
  const acc = (pca && (pca as any).getActiveAccount) ? (pca as any).getActiveAccount() : null;
  if (acc) return acc;
  const all = pca?.getAllAccounts() ?? [];
  return all[0] ?? null;
}

export async function ensureLogin(): Promise<AccountInfo> {
  if (!pca) throw new Error('MSAL not initialized');
  const active = getActiveAccount();
  if (active) return active;

  const res = await pca.loginPopup({
    scopes: ['User.Read', 'openid', 'profile', 'email'],
  } as PopupRequest);

  pca.setActiveAccount(res.account ?? null);
  return getActiveAccount()!;
}

export async function getAccessToken(scopes: string[] = ['User.Read']): Promise<string> {
  if (!pca) throw new Error('MSAL not initialized');
  const account = getActiveAccount();
  if (!account) throw new Error('No active account');

  const req: SilentRequest = { scopes, account };
  try {
    const res = await pca.acquireTokenSilent(req);
    return res.accessToken;
  } catch {
    const res = await pca.acquireTokenPopup(req as any);
    return res.accessToken;
  }
}

export async function logout(): Promise<void> {
  if (!pca) return;
  const acc = getActiveAccount();
  await pca.logoutPopup({ account: acc ?? undefined });
}
