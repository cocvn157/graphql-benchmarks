import * as path from "path";
import {
  BenchmarkFileInput,
  BenchmarkFileMetadata,
  BenchmarkMetrics,
  MetricName,
  ParsedBenchmarkSuite,
  ServerDisplayNames,
  ServerMetricsMap,
} from "./types";

function parseLatencyMs(rawValue: string): number | null {
  const match = rawValue.trim().match(/^([\d.]+)\s*(us|ms|s)?$/i);
  if (!match) {
    const fallback = rawValue.trim().match(/([\d.]+)/);
    return fallback ? parseFloat(fallback[1]) : null;
  }
  const numeric = parseFloat(match[1]);
  if (Number.isNaN(numeric)) return null;
  const unit = (match[2] ?? "ms").toLowerCase();
  if (unit === "us") return numeric / 1000;
  if (unit === "s") return numeric * 1000;
  return numeric;
}

export function parseMetric(input: string, metric: MetricName): number | null {
  const lines = input.split(/\r?\n/);
  const metricLine = lines.find((line) => line.trim().startsWith(metric));
  if (!metricLine) return null;

  const tokens = metricLine.trim().split(/\s+/);
  if (tokens.length < 2) return null;

  if (metric === "Latency") {
    return parseLatencyMs(tokens[1]);
  }

  const parsed = parseFloat(tokens[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseBenchmarkOutput(input: string): BenchmarkMetrics {
  const reqSec = parseMetric(input, "Requests/sec") ?? 0;
  const latency = parseMetric(input, "Latency") ?? 0;
  return { reqSec, latency };
}

export function calculateAverage(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

export function parseBenchmarkFileName(
  filePath: string
): BenchmarkFileMetadata | null {
  const baseName = path.basename(filePath);
  const match = baseName.match(
    /^bench(\d+)_result(\d+)_graphql_(.+?)_run\.sh\.txt$/
  );
  if (!match) return null;

  return {
    bench: parseInt(match[1], 10),
    run: parseInt(match[2], 10),
    server: match[3],
  };
}

export function parseBenchmarkFiles(
  files: readonly BenchmarkFileInput[]
): ParsedBenchmarkSuite {
  let detectedBench = 1;
  const servers: string[] = [];
  const groupedReqSecs: Record<string, number[]> = {};
  const groupedLatencies: Record<string, number[]> = {};

  files.forEach((file, index) => {
    const meta = parseBenchmarkFileName(file.filePath);
    const baseName = path.basename(file.filePath);

    if (index === 0) {
      if (meta) {
        detectedBench = meta.bench;
      } else if (baseName.startsWith("bench2")) {
        detectedBench = 2;
      } else if (baseName.startsWith("bench3")) {
        detectedBench = 3;
      }
    }

    const server = meta ? meta.server : `server_${Math.floor(index / 3) + 1}`;
    if (!groupedReqSecs[server]) {
      servers.push(server);
      groupedReqSecs[server] = [];
      groupedLatencies[server] = [];
    }

    const reqSec = parseMetric(file.content, "Requests/sec");
    const latency = parseMetric(file.content, "Latency");

    if (reqSec !== null) groupedReqSecs[server].push(reqSec);
    if (latency !== null) groupedLatencies[server].push(latency);
  });

  const serverMetrics: ServerMetricsMap = {};
  for (const server of servers) {
    serverMetrics[server] = {
      reqSec: calculateAverage(groupedReqSecs[server]),
      latency: calculateAverage(groupedLatencies[server]),
    };
  }

  return {
    bench: detectedBench,
    servers,
    serverMetrics,
  };
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseReadmeServerLinks(
  readmeContent: string,
  servers: readonly string[]
): ServerDisplayNames {
  const linkEntries: Array<{ label: string; normLabel: string; normUrl: string }> =
    [];
  const lines = readmeContent.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\[([^\]]+)\]:\s*(\S+)/);
    if (match) {
      const label = match[1];
      const url = match[2];
      linkEntries.push({
        label,
        normLabel: normalizeToken(label),
        normUrl: normalizeToken(url),
      });
    }
  }

  const displayNames: ServerDisplayNames = {};
  for (const server of servers) {
    const normServer = normalizeToken(server);
    const strippedServer = normalizeToken(server.replace(/_server$/i, ""));

    const matched = linkEntries.find(
      (entry) =>
        entry.normLabel === normServer ||
        entry.normLabel === strippedServer ||
        entry.normLabel.startsWith(strippedServer) ||
        entry.normUrl.endsWith(normServer)
    );

    displayNames[server] = matched ? matched.label : server;
  }

  return displayNames;
}
