"use client";
import { useRef, useState, useCallback } from "react";
import type { ROI, IngestMessage, LogEntry, SessionStats, ConnectionState } from "@/types";

const BACKEND_WS = process.env.NEXT_PUBLIC_BACKEND_WS ?? "ws://localhost:8000";

let logIdCounter = 0;

export function useStream() {
  const [connState, setConnState] = useState<ConnectionState>("offline");
  const [currentROI, setCurrentROI] = useState<ROI | null>(null);
  const [stats, setStats] = useState<SessionStats>({ frames: 0, faces: 0, fps: 0, detectionRate: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const ingestWsRef = useRef<WebSocket | null>(null);
  const streamWsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // fps tracking
  const fpsFramesRef = useRef(0);
  const fpsLastRef = useRef(Date.now());
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // running totals (refs to avoid stale closures in setInterval)
  const frameCountRef = useRef(0);
  const faceCountRef = useRef(0);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "default") => {
    const time = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [{ id: logIdCounter++, time, message, type }, ...prev].slice(0, 60));
  }, []);

  const connectStreamWs = useCallback((onFrame: (blob: Blob) => void) => {
    const ws = new WebSocket(`${BACKEND_WS}/stream/ws`);
    ws.binaryType = "blob";
    ws.onmessage = (e) => { fpsFramesRef.current++; onFrame(e.data as Blob); };
    ws.onerror = () => addLog("Stream WS error", "err");
    ws.onclose = () => addLog("Stream WS closed", "err");
    streamWsRef.current = ws;
  }, [addLog]);

  const start = useCallback(async (onFrame: (blob: Blob) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      addLog("Camera acquired", "ok");
    } catch (e: unknown) {
      addLog("Camera error: " + (e instanceof Error ? e.message : String(e)), "err");
      setConnState("error");
      return;
    }

    // hidden canvas + video for frame capture
    const canvas = document.createElement("canvas");
    const video = document.createElement("video");
    video.srcObject = mediaStreamRef.current;
    video.play();
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };
    canvasRef.current = canvas;
    videoElRef.current = video;

    const ws = new WebSocket(`${BACKEND_WS}/ingest/ws`);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      addLog("Ingest WS connected", "ok");
      setConnState("active");
      setIsStreaming(true);
      connectStreamWs(onFrame);

      // FPS counter
      fpsIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const fps = Math.round(fpsFramesRef.current / ((now - fpsLastRef.current) / 1000));
        fpsFramesRef.current = 0;
        fpsLastRef.current = now;
        setStats((s) => ({ ...s, fps }));
      }, 1000);

      // capture at ~15fps
      captureIntervalRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN || !canvasRef.current || !videoElRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(videoElRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
          if (!blob) return;
          blob.arrayBuffer().then((buf) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(buf);
          });
        }, "image/jpeg", 0.8);
      }, 67);
    };

    ws.onmessage = (e) => {
      const data: IngestMessage = JSON.parse(e.data as string);
      frameCountRef.current = data.frame_number;
      if (data.roi) faceCountRef.current++;
      setCurrentROI(data.roi);
      const frames = frameCountRef.current;
      const faces = faceCountRef.current;
      setStats((s) => ({
        ...s,
        frames,
        faces,
        detectionRate: frames > 0 ? Math.round((faces / frames) * 100) : 0,
      }));
      if (data.roi) {
        addLog(`Frame ${frames}: face @ (${Math.round(data.roi.x)}, ${Math.round(data.roi.y)})`, "info");
      }
    };

    ws.onerror = () => { addLog("Ingest WS error", "err"); setConnState("error"); };
    ws.onclose = () => { addLog("Ingest WS closed"); setConnState("offline"); };
    ingestWsRef.current = ws;
  }, [addLog, connectStreamWs]);

  const stop = useCallback(() => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    ingestWsRef.current?.close();
    streamWsRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    ingestWsRef.current = streamWsRef.current = mediaStreamRef.current = null;
    frameCountRef.current = 0;
    faceCountRef.current = 0;
    fpsFramesRef.current = 0;
    setIsStreaming(false);
    setConnState("offline");
    setCurrentROI(null);
    setStats({ frames: 0, faces: 0, fps: 0, detectionRate: 0 });
    addLog("Session stopped");
  }, [addLog]);

  return { connState, currentROI, stats, logs, isStreaming, start, stop, addLog };
}
