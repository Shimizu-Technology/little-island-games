import { Platform } from "react-native";
import Constants from "expo-constants";
import { writeTraceFile } from "./traceFile";

/** Local QA log for the probes in docs/ISLAND_HOME_3.md. Lab only, and it stays on the device. */
export type TraceEvent =
  | { type: "pick"; at: number; pointer: number; x: number; y: number; entity?: string }
  | { type: "ready" | "painted"; at: number; id: string; slot: number }
  | { type: "release"; at: number; id: string; kind: string; target?: string; finger: { x: number; y: number }; anchor: { x: number; y: number }; contact?: { x: number; y: number }; room?: string }
  | { type: "commit"; at: number; id: string; kind: string; target?: string; transaction: string }
  | { type: "frames" | "catalog-resolve"; at: number; samples: number; p50: number; p95: number; p99: number; max: number }
  /** HM-13: the frame callback stopped (nothing needs a frame) or restarted. */
  | { type: "frames-idle" | "frames-active"; at: number }
  | { type: "layout"; at: number; camera: { a: number; tx: number; ty: number }; offset: { x: number; y: number }; entities: { id: string; room: string; x: number; y: number; visual?: { x: number; y: number }; head?: { x: number; y: number } }[] };

const MAX_EVENTS = 6000;
export type HomeTrace = { record: (event: TraceEvent) => void; dispose: () => void };

/** Small rolling hash: identifies a save transaction in the log without storing the save. */
export function transactionId(revision: string): string {
  let hash = 2166136261;
  for (let i = 0; i < revision.length; i++) hash = Math.imul(hash ^ revision.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

export function createHomeTrace(): HomeTrace {
  const session = `${Date.now()}`;
  const lines: string[] = [JSON.stringify({
    type: "session",
    session,
    platform: Platform.OS,
    os: String(Platform.Version),
    device: Constants.deviceName ?? "unknown",
    version: Constants.expoConfig?.version,
    build: Constants.expoConfig?.ios?.buildNumber,
  })];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    writeTraceFile(`home-trace-${session}.jsonl`, lines.join("\n"));
  };
  return {
    record(event) {
      if (lines.length > MAX_EVENTS) return;
      lines.push(JSON.stringify(event));
      timer ??= setTimeout(flush, 400);
    },
    dispose() {
      if (timer) clearTimeout(timer);
      flush();
    },
  };
}
