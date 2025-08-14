import React from "react";

export function Toggle({ children, pressed, onPressedChange }: { children?: React.ReactNode; pressed: boolean; onPressedChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onPressedChange(!pressed)} className={`px-3 py-1 rounded-md ${pressed ? 'bg-emerald-700 text-white' : 'bg-white/10 text-white'}`}>
      {children}
    </button>
  );
}

export default Toggle;
