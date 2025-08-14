import React from "react";

export function Button({ children, onClick, size, variant = "default", className = "", title, disabled }: { children?: React.ReactNode; onClick?: () => void; size?: string; variant?: string; className?: string; title?: string; disabled?: boolean }) {
  const base = "px-3 py-1 rounded-md bg-emerald-600 hover:brightness-105 text-white";
  return (
    <button title={title} onClick={onClick} disabled={disabled} className={[base, className].join(" ")}>{children}</button>
  );
}
export default Button;
