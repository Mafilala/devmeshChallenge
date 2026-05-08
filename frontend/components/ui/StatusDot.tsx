import type { ConnectionState } from "@/types";

interface Props {
  state: ConnectionState;
}

const labels: Record<ConnectionState, string> = {
  offline: "OFFLINE",
  active: "LIVE",
  error: "ERROR",
};

export function StatusDot({ state }: Props) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] tracking-[2px] text-muted uppercase">
      <span
        className={[
          "w-1.5 h-1.5 rounded-full transition-all duration-300",
          state === "active" && "bg-accent shadow-[0_0_6px_#00ff50] animate-pulse2",
          state === "error" && "bg-danger shadow-[0_0_6px_#ff3a3a]",
          state === "offline" && "bg-muted",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <span className={state === "active" ? "text-accent" : state === "error" ? "text-danger" : ""}>
        {labels[state]}
      </span>
    </div>
  );
}
