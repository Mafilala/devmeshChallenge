import { SectionLabel } from "@/components/ui/SectionLabel";
import type { LogEntry } from "@/types";

interface Props {
  logs: LogEntry[];
}

const typeClass: Record<LogEntry["type"], string> = {
  ok: "text-accent",
  err: "text-danger",
  info: "text-accent2",
  default: "text-[#c8d4e0]",
};

export function EventLog({ logs }: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <SectionLabel>Event Log</SectionLabel>

      <div className="flex flex-col gap-1 overflow-y-auto max-h-52 pr-1 [scrollbar-width:thin] [scrollbar-color:#2a3340_transparent]">
        {logs.length === 0 && (
          <div className="font-mono text-[10px] text-muted italic">Waiting for events…</div>
        )}
        {logs.map((entry) => (
          <div key={entry.id} className="grid grid-cols-[auto_1fr] gap-2 font-mono text-[10px] leading-snug opacity-80">
            <span className="text-muted whitespace-nowrap">{entry.time}</span>
            <span className={typeClass[entry.type]}>{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
