import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function PrimaryButton({ children, style, ...props }: Props) {
  return (
    <button
      {...props}
      style={{
        height: 44,
        padding: "0 18px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--lime)",
        background: "var(--lime)",
        color: "#0B0F10",
        fontWeight: 900,
        letterSpacing: 0.3,
        cursor: "pointer",
        transition: "all 120ms ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}