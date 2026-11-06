import * as os from "os";
import * as path from "path";
import { writeDataFile } from "./fileUtils";
import { ServerMetricsMap } from "./types";

export const REQ_SEC_DATA_FILE = path.join(os.tmpdir(), "reqSec.dat");
export const LATENCY_DATA_FILE = path.join(os.tmpdir(), "latency.dat");

export function formatMetricsData(
  serverMetrics: ServerMetricsMap,
  servers: readonly string[],
  field: "reqSec" | "latency"
): string {
  const rows = servers.map(
    (server) => `${server} ${serverMetrics[server][field]}`
  );
  return ["Server Value", ...rows].join("\n");
}

export function writeMetricsDataFiles(
  serverMetrics: ServerMetricsMap,
  servers: readonly string[]
): void {
  writeDataFile(
    REQ_SEC_DATA_FILE,
    formatMetricsData(serverMetrics, servers, "reqSec")
  );
  writeDataFile(
    LATENCY_DATA_FILE,
    formatMetricsData(serverMetrics, servers, "latency")
  );
}
