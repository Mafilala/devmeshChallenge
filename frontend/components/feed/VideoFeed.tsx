"use client";
import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface Props {
  isStreaming: boolean;
  onStart: (onFrame: (blob: Blob) => void) => void;
  onStop: () => void;
}

export function VideoFeed({ isStreaming, onStart, onStop }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const noSignalRef = useRef<HTMLDivElement>(null);
  const prevUrlRef = useRef<string | null>(null);

  const handleFrame = useCallback((blob: Blob) => {
    if (!imgRef.current) return;
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    const url = URL.createObjectURL(blob);
    imgRef.current.src = url;
    imgRef.current.style.display = "block";
    prevUrlRef.current = url;
    if (noSignalRef.current) noSignalRef.current.style.display = "none";
  }, []);

  const handleStart = useCallback(() => {
    onStart(handleFrame);
  }, [onStart, handleFrame]);

  const handleStop = useCallback(() => {
    if (imgRef.current) imgRef.current.style.display = "none";
    if (noSignalRef.current) noSignalRef.current.style.display = "flex";
    if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null; }
    onStop();
  }, [onStop]);

  const handleSnapshot = useCallback(() => {
    if (!imgRef.current?.src) return;
    const a = document.createElement("a");
    a.href = imgRef.current.src;
    a.download = `snapshot_${Date.now()}.jpg`;
    a.click();
  }, []);

  return (
    <div className="flex flex-col flex-1 p-4 gap-3 border-r border-border">
      <SectionLabel>Live Feed</SectionLabel>

      {/* Video frame */}
      <div className="relative flex-1 bg-black border border-border overflow-hidden flex items-center justify-center group">
        {/* corner brackets */}
        <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-accent pointer-events-none z-10" />
        <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-accent pointer-events-none z-10" />

        {/* scanline overlay */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)"
          }}
        />

        {/* no signal placeholder */}
        <div
          ref={noSignalRef}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{
            background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.015) 2px,rgba(255,255,255,0.015) 4px)"
          }}
        >
          <div className="text-3xl opacity-20 animate-flicker">⬛</div>
          <div className="font-mono text-[11px] tracking-[4px] text-muted">NO SIGNAL</div>
        </div>

        {/* live frame */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          alt="live feed"
          className="w-full h-full object-contain hidden"
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button variant="primary" onClick={handleStart} disabled={isStreaming}>
          ▶ Start
        </Button>
        <Button variant="danger" onClick={handleStop} disabled={!isStreaming}>
          ■ Stop
        </Button>
        <Button variant="ghost" onClick={handleSnapshot} disabled={!isStreaming}>
          ⬡ Snapshot
        </Button>
      </div>
    </div>
  );
}
