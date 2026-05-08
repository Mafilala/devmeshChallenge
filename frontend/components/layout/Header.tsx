"use client";
import { useClock } from "@/hooks/useClock";
import { StatusDot } from "@/components/ui/StatusDot";
import type { ConnectionState } from "@/types";

interface Props {
  connState: ConnectionState;
}

export function Header({ connState }: Props) {
  const time = useClock();

  return (
    <header className="relative flex items-center justify-between px-5 h-12 bg-panel border-b border-border">
      {/* accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="font-mono text-base tracking-[4px] text-accent">
        FACE<span className="text-muted">//</span>NET
      </div>

      <StatusDot state={connState} />

      <div className="font-mono text-xs tracking-wide text-muted">{time}</div>
    </header>
  );
}
