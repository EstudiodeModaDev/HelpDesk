// src/components/auth/LoginButton.tsx
import * as React from 'react';
import { useAuth } from '../../auth/authContext';

type Props = {
  fullWidth?: boolean;
  label?: string;
  className?: string;
};

export default function LoginButton({ fullWidth = false, label = 'Iniciar sesión', className = '' }: Props) {
  const { signIn, ready } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (!ready || loading) return;
    try {
      setLoading(true);
      await signIn(); // dispara loginPopup (y fallback a redirect si está bloqueado)
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready || loading}
      className={
        className ||
        `inline-flex items-center justify-center ${fullWidth ? 'w-full' : ''}
         px-4 py-2 rounded-xl border border-[#1f3a8a] 
         hover:bg-[#1f3a8a] hover:text-white transition
         disabled:opacity-60 disabled:cursor-not-allowed`
      }
      aria-busy={loading}
    >
      {loading ? 'Abriendo Microsoft…' : label}
    </button>
  );
}
