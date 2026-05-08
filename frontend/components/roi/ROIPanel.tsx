"use client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { ROI } from "@/types";

interface Props {
  roi: ROI | null;
}

function Field({ label, value }: { label: string; value: string | number }) {
  const hasValue = value !== "—";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-mono text-[9px] tracking-[2px] text-muted uppercase">{label}</div>
      <div className={`font-mono text-sm leading-none ${hasValue ? "text-accent" : "text-muted"}`}>
        {value}
      </div>
    </div>
  );
}

export function ROIPanel({ roi }: Props) {
  const confidence = roi ? Math.round(roi.confidence * 100) : 0;

  return (
    <div>
      <SectionLabel>ROI Detection</SectionLabel>

      <div className={`border p-3 transition-colors duration-300 ${roi ? "border-accent/30 bg-accent/[0.02]" : "border-dim"}`}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="X Pos" value={roi ? Math.round(roi.x) : "—"} />
          <Field label="Y Pos" value={roi ? Math.round(roi.y) : "—"} />
          <Field label="Width" value={roi ? Math.round(roi.width) : "—"} />
          <Field label="Height" value={roi ? Math.round(roi.height) : "—"} />
        </div>

        {/* Confidence bar */}
        <div className="mt-2">
          <div className="flex justify-between font-mono text-[9px] tracking-[2px] text-muted uppercase mb-1">
            <span>Confidence</span>
            <span className={roi ? "text-accent" : ""}>{roi ? `${confidence}%` : "—"}</span>
          </div>
          <div className="h-[3px] bg-dim">
            <div
              className="h-full bg-accent transition-all duration-200"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
