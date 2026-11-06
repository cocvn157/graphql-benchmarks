import * as os from "os";
import * as path from "path";
import { LATENCY_DATA_FILE, REQ_SEC_DATA_FILE } from "./dataFileWriter";
import { writeDataFile } from "./fileUtils";

export const GNUPLOT_SCRIPT_FILE = path.join(os.tmpdir(), "gnuplot_script.gp");

export function generateGnuplotScript(
  whichBench: number,
  reqSecMax: number,
  latencyMax: number
): string {
  const reqSecHistogramFile = `req_sec_histogram${whichBench}.png`;
  const latencyHistogramFile = `latency_histogram${whichBench}.png`;
  const reqSecPath = REQ_SEC_DATA_FILE.replace(/\\/g, "/");
  const latencyPath = LATENCY_DATA_FILE.replace(/\\/g, "/");

  return `
set term pngcairo size 1280,720 enhanced font 'Courier,12'
set output '${reqSecHistogramFile}'
set style data histograms
set style histogram cluster gap 1
set style fill solid border -1
set xtics rotate by -45
set boxwidth 0.9
set title 'Requests/Sec'
set yrange [0:${reqSecMax}]
set key outside right top
plot '${reqSecPath}' using 2:xtic(1) title 'Req/Sec'

set output '${latencyHistogramFile}'
set title 'Latency (in ms)'
set yrange [0:${latencyMax}]
plot '${latencyPath}' using 2:xtic(1) title 'Latency'
`;
}

export function writeGnuplotScript(script: string): string {
  writeDataFile(GNUPLOT_SCRIPT_FILE, script);
  return GNUPLOT_SCRIPT_FILE;
}
