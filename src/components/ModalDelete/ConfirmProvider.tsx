import * as React from "react";
import "./Delete.css"

type ConfirmOptions = {
  title?: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type Ctx = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = React.createContext<Ctx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [opts, setOpts] = React.useState<ConfirmOptions>({});
  const resolver = React.useRef<(v: boolean) => void>(() => {});

  const confirm = React.useCallback<Ctx>((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    setOpen(false);
    resolver.current(value);
  };

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {open && (
        <div className="cd-backdrop" role="presentation" aria-hidden="true">
          <div
            className="cd-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cd-title"
            aria-describedby="cd-desc"
          >
            <h3 id="cd-title">{opts.title ?? "Confirmar acción"}</h3>
            <div id="cd-desc" className="cd-message">
              {opts.message ?? "¿Estás seguro?"}
            </div>
            <div className="cd-actions">
              <button
                type="button"
                className="cd-btn cd-cancel"
                onClick={() => close(false)}
              >
                {opts.cancelText ?? "Cancelar"}
              </button>
              <button
                type="button"
                className={`cd-btn ${opts.destructive ? "cd-danger" : "cd-primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {opts.confirmText ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
