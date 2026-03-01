import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function Card({ children, className, style }: Props) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}