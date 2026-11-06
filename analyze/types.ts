export type MetricName = "Requests/sec" | "Latency";

export interface BenchmarkMetrics {
  reqSec: number;
  latency: number;
}

export interface BenchmarkFileMetadata {
  bench: number;
  run: number;
  server: string;
}

export interface BenchmarkFileInput {
  filePath: string;
  content: string;
}

export type ServerMetricsMap = Record<string, BenchmarkMetrics>;
export type ServerDisplayNames = Record<string, string>;

export interface ParsedBenchmarkSuite {
  bench: number;
  servers: string[];
  serverMetrics: ServerMetricsMap;
}
