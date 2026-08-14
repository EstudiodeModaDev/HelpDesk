import * as React from "react";

type ModalShellProps = {
  ariaLabel: string;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function ModalShell({ ariaLabel, title, onClose, children }: ModalShellProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="modal-card">
        <div className="modal-head">
          {title ? <h3>{title}</h3> : null}
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
