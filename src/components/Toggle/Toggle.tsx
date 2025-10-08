import "./Toggle.css"
export function Toggle({checked, onChange, label,}: {checked: boolean; onChange: (v: boolean) => void; label: string;}) {
  return (
    <label className="acta-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="acta-switch" aria-hidden />
      <span>{label}</span>
    </label>
  );
}