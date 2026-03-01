import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function Container({ children, className, style }: Props) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: 1120,
        margin: "0 auto",
        padding: "0 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}