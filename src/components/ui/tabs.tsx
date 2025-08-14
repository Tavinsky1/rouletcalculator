import React from "react";

export function Tabs({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) {
  return <div>{children}</div>;
}
export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return <button className="px-2 py-1">{children}</button>;
}
export function TabsContent({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export default Tabs;
