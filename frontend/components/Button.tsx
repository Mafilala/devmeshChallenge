import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost";
}

const variants = {
  primary: "border-accent text-accent bg-accent/5 hover:bg-accent/12",
  danger: "border-danger text-danger bg-danger/5 hover:bg-danger/12",
  ghost: "border-border text-muted hover:border-accent hover:text-accent",
};

export function Button({ variant = "ghost", className = "", children, ...props }: Props) {
  return (
    <button
      className={[
        "font-mono text-[11px] tracking-[2px] uppercase px-4 py-2",
        "border transition-all duration-150",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
