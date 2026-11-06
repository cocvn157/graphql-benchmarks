#!/usr/bin/env node
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { writeMetricsDataFiles } from "./analyze/dataFileWriter";
import {
  createDirectoryIfNotExists,
  moveFile,
  readFileContent,
} from "./analyze/fileUtils";
import {
  generateGnuplotScript,
  writeGnuplotScript,
} from "./analyze/gnuplotGenerator";
import {
  parseBenchmarkFiles,
  parseReadmeServerLinks,
} from "./analyze/parser";
import { formatResults, writeResults } from "./analyze/resultsFormatter";
import { BenchmarkFileInput } from "./analyze/types";

const resultFiles: string[] = process.argv.slice(2);

const fileInputs: BenchmarkFileInput[] = resultFiles.map((filePath) => ({
  filePath,
  content: readFileContent(filePath),
}));

const { bench: whichBench, servers, serverMetrics } =
  parseBenchmarkFiles(fileInputs);

writeMetricsDataFiles(serverMetrics, servers);

const reqSecMax =
  Math.max(0, ...servers.map((server) => serverMetrics[server].reqSec)) * 1.2;
const latencyMax =
  Math.max(0, ...servers.map((server) => serverMetrics[server].latency)) * 1.2;

const gnuplotScript = generateGnuplotScript(whichBench, reqSecMax, latencyMax);
const gnuplotScriptPath = writeGnuplotScript(gnuplotScript);

try {
  execSync(`gnuplot "${gnuplotScriptPath}"`, { stdio: "inherit" });
} catch (error) {
  console.error("Error executing gnuplot:", (error as Error).message);
}

const assetsDir = path.resolve(process.cwd(), "assets");
createDirectoryIfNotExists(assetsDir);

moveFile(
  `req_sec_histogram${whichBench}.png`,
  path.join(assetsDir, `req_sec_histogram${whichBench}.png`)
);
moveFile(
  `latency_histogram${whichBench}.png`,
  path.join(assetsDir, `latency_histogram${whichBench}.png`)
);

const readmeContent = fs.existsSync("README.md")
  ? readFileContent("README.md")
  : "";
const displayNames = parseReadmeServerLinks(readmeContent, servers);

const resultsTable = formatResults(serverMetrics, displayNames, whichBench);
writeResults(resultsTable, whichBench);

for (const file of resultFiles) {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch (error) {
    console.error(`Error deleting file ${file}: ${(error as Error).message}`);
  }
}
