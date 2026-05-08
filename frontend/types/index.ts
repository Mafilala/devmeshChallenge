export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface IngestMessage {
  session_id: string;
  frame_number: number;
  roi: ROI | null;
}

export interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: "ok" | "err" | "info" | "default";
}

export interface SessionStats {
  frames: number;
  faces: number;
  fps: number;
  detectionRate: number;
}

export type ConnectionState = "offline" | "active" | "error";
