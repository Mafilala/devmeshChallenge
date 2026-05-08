import { SectionLabel } from "@/components/ui/SectionLabel";
import type { SessionStats } from "@/types";

interface Props {
  stats: SessionStats;
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="p-2 bg-bg border border-border">
      <div className="font-mono text-[9px] tracking-[2px] text-muted uppercase mb-1">{label}</div>
      <div className={`font-mono text-lg leading-none ${accent ? "text-accent" : "text-[#c8d4e0]"}`}>
        {value}
      </div>
    </div>
  );
}

export function StatsGrid({ stats }: Props) {
  return (
    <div>
      <SectionLabel>Session Stats</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Frames" value={stats.frames} accent />
        <Stat label="Faces" value={stats.faces} accent />
        <Stat label="FPS" value={stats.fps} />
        <Stat label="Detect %" value={`${stats.detectionRate}%`} />
      </div>
    </div>
  );
}
