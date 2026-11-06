import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAverage,
  parseBenchmarkFileName,
  parseBenchmarkFiles,
  parseBenchmarkOutput,
  parseMetric,
  parseReadmeServerLinks,
} from "./parser";
import { formatNumber, formatResults, updateReadmeContent } from "./resultsFormatter";

const SAMPLE_WRK_OUTPUT = `Running 10s test @ http://localhost:8000/graphql
  4 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     4.30ms    1.12ms  18.50ms   78.20%
    Req/Sec     5.72k   320.10     6.40k    69.50%
  228050 requests in 10.00s, 45.12MB read
Requests/sec:  22805.00
Transfer/sec:      4.51MB
`;

test("parseMetric and parseBenchmarkOutput extract Requests/sec and Latency in ms", () => {
  assert.equal(parseMetric(SAMPLE_WRK_OUTPUT, "Requests/sec"), 22805);
  assert.equal(parseMetric(SAMPLE_WRK_OUTPUT, "Latency"), 4.3);
  assert.deepEqual(parseBenchmarkOutput(SAMPLE_WRK_OUTPUT), {
    reqSec: 22805,
    latency: 4.3,
  });
});

test("parseMetric converts us and s latency values to ms", () => {
  const usOutput = "  Latency   850.00us   10.00us\nRequests/sec: 50000.00\n";
  const sOutput = "  Latency     1.25s    0.10s\nRequests/sec: 80.00\n";
  assert.equal(parseMetric(usOutput, "Latency"), 0.85);
  assert.equal(parseMetric(sOutput, "Latency"), 1250);
});

test("parseBenchmarkFileName extracts benchmark index, run number, and server name", () => {
  assert.deepEqual(
    parseBenchmarkFileName("bench2_result3_graphql_apollo_server_run.sh.txt"),
    {
      bench: 2,
      run: 3,
      server: "apollo_server",
    }
  );
  assert.equal(parseBenchmarkFileName("invalid.txt"), null);
});

test("parseBenchmarkFiles aggregates runs per server without hardcoded server lists", () => {
  const suite = parseBenchmarkFiles([
    {
      filePath: "bench1_result1_graphql_tailcall_run.sh.txt",
      content: "Latency 4.00ms\nRequests/sec: 20000.00",
    },
    {
      filePath: "bench1_result2_graphql_tailcall_run.sh.txt",
      content: "Latency 5.00ms\nRequests/sec: 22000.00",
    },
    {
      filePath: "bench1_result1_graphql_apollo_server_run.sh.txt",
      content: "Latency 500.00ms\nRequests/sec: 200.00",
    },
  ]);

  assert.equal(suite.bench, 1);
  assert.deepEqual(suite.servers, ["tailcall", "apollo_server"]);
  assert.deepEqual(suite.serverMetrics.tailcall, {
    reqSec: 21000,
    latency: 4.5,
  });
  assert.deepEqual(suite.serverMetrics.apollo_server, {
    reqSec: 200,
    latency: 500,
  });
  assert.equal(calculateAverage([]), 0);
});

test("parseReadmeServerLinks and formatResults build markdown rows sorted by RPS", () => {
  const readme = [
    "[Tailcall]: https://github.com/tailcallhq/tailcall",
    "[Apollo GraphQL]: https://github.com/apollographql/apollo-server",
    "[Netflix DGS]: https://github.com/netflix/dgs-framework",
  ].join("\n");

  const displayNames = parseReadmeServerLinks(readme, [
    "tailcall",
    "apollo_server",
    "netflix_dgs",
  ]);
  assert.deepEqual(displayNames, {
    tailcall: "Tailcall",
    apollo_server: "Apollo GraphQL",
    netflix_dgs: "Netflix DGS",
  });

  const table = formatResults(
    {
      apollo_server: { reqSec: 200, latency: 500 },
      tailcall: { reqSec: 20000, latency: 4.5 },
    },
    displayNames,
    1
  );

  assert.equal(formatNumber(22805), "22,805.00");
  assert.ok(table.includes("|| [Tailcall] | `20,000.00` | `4.50` | `100.00x` |"));
  assert.ok(table.includes("|| [Apollo GraphQL] | `200.00` | `500.00` | `1.00x` |"));

  const updated = updateReadmeContent(
    "Header\n<!-- PERFORMANCE_RESULTS_START -->\nold\n<!-- PERFORMANCE_RESULTS_END -->\nFooter",
    "<!-- PERFORMANCE_RESULTS_START -->\nnew\n<!-- PERFORMANCE_RESULTS_END -->"
  );
  assert.ok(updated.includes("\nnew\n"));
});
