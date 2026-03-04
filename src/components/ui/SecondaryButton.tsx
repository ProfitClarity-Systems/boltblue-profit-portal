import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  active?: boolean;
  size?: "md" | "sm";
};

export function SecondaryButton({
  children,
  style,
  active = false,
  size = "md",
  className,
  ...props
}: Props) {
  const isSmall = size === "sm";

  return (
    <>
      <button
        {...props}
        data-active={active ? "true" : "false"}
        className={`pp-secondary-btn ${className ?? ""}`}
        style={style}
      >
        {children}
      </button>

      <style jsx>{`
        .pp-secondary-btn {
          height: ${isSmall ? "34px" : "44px"};
          padding: 0 ${isSmall ? "14px" : "18px"};
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: transparent;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 800;
          font-size: ${isSmall ? "13px" : "14px"};
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: border-color 140ms ease, color 140ms ease,
            background-color 140ms ease;
          outline: none;
          white-space: nowrap;
        }

        .pp-secondary-btn:hover {
          border-color: var(--lime);
          color: var(--lime);
        }

        .pp-secondary-btn[data-active="true"] {
          border-color: var(--lime);
          color: var(--lime);
        }

        .pp-secondary-btn:focus-visible {
          border-color: var(--lime);
          color: var(--lime);
        }

        .pp-secondary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}