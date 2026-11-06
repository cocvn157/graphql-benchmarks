import * as fs from "fs";
import { ServerDisplayNames, ServerMetricsMap } from "./types";

const BENCH_QUERIES: Record<number, string> = {
  1: "{ posts { id userId title user { id name email }}}",
  2: "{ posts { title }}",
  3: "{ greet }",
};

export function formatNumber(value: number): string {
  const fixed = value.toFixed(2);
  const [integerPart, decimalPart] = fixed.split(".");
  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${decimalPart}`;
}

export function formatResults(
  serverMetrics: ServerMetricsMap,
  displayNames: ServerDisplayNames,
  whichBench: number
): string {
  const sortedServers = Object.keys(serverMetrics).sort(
    (a, b) => serverMetrics[b].reqSec - serverMetrics[a].reqSec
  );

  if (sortedServers.length === 0) {
    return "";
  }

  const lastServer = sortedServers[sortedServers.length - 1];
  const lastServerReqSecs = serverMetrics[lastServer].reqSec;
  const queryText = BENCH_QUERIES[whichBench] ?? "";

  let resultsTable = `\n| ${whichBench} | \`${queryText}\` |`;

  for (const server of sortedServers) {
    const formattedReqSecs = formatNumber(serverMetrics[server].reqSec);
    const formattedLatencies = formatNumber(serverMetrics[server].latency);
    const relativeRatio =
      lastServerReqSecs > 0
        ? (serverMetrics[server].reqSec / lastServerReqSecs).toFixed(2)
        : "1.00";
    const label = displayNames[server] ?? server;

    resultsTable += `\n|| [${label}] | \`${formattedReqSecs}\` | \`${formattedLatencies}\` | \`${relativeRatio}x\` |`;
  }

  return resultsTable;
}

export function updateReadmeContent(
  readmeContent: string,
  finalResults: string
): string {
  const performanceResultsRegex =
    /<!-- PERFORMANCE_RESULTS_START -->[\s\S]*<!-- PERFORMANCE_RESULTS_END -->/;
  if (performanceResultsRegex.test(readmeContent)) {
    return readmeContent.replace(performanceResultsRegex, finalResults);
  }
  return `${readmeContent}\n${finalResults}`;
}

export function writeResults(
  resultsTable: string,
  whichBench: number,
  resultsFile = "results.md",
  readmePath = "README.md"
): void {
  try {
    if (
      !fs.existsSync(resultsFile) ||
      fs.readFileSync(resultsFile, "utf-8").trim() === ""
    ) {
      fs.writeFileSync(
        resultsFile,
        `<!-- PERFORMANCE_RESULTS_START -->\n\n| Query | Server | Requests/sec | Latency (ms) | Relative |\n|-------:|--------:|--------------:|--------------:|---------:|`,
        "utf-8"
      );
    }

    fs.appendFileSync(resultsFile, resultsTable, "utf-8");

    if (whichBench === 3) {
      fs.appendFileSync(
        resultsFile,
        "\n\n<!-- PERFORMANCE_RESULTS_END -->",
        "utf-8"
      );
      const finalResults = fs
        .readFileSync(resultsFile, "utf-8")
        .replace(/\\/g, "");
      if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, "utf-8");
        const updatedReadme = updateReadmeContent(readmeContent, finalResults);
        fs.writeFileSync(readmePath, updatedReadme, "utf-8");
      }
    }
  } catch (error) {
    console.error(`Error writing results: ${(error as Error).message}`);
  }
}
