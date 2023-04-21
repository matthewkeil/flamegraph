import path from "path";
import {openSync} from "fs";
import {exec} from "../lib/exec";
import {spawn} from "child_process";

const stackCollapsePerlScript = path.resolve(__dirname, "..", "submodules", "FlameGraph", "stackcollapse-perf.pl");
const svgPerlScript = path.resolve(__dirname, "..", "submodules", "FlameGraph", "flamegraph.pl");

const DATA_EXTENSION = ".data";
const FILTERED_EXTENSION = ".filtered";
const FOLDED_EXTENSION = ".folded";

const INTERNAL_FUNCTIONS = [
  " __libc_start",
  " LazyCompile ",
  " v8::internal::",
  " Builtin:",
  " Stub:",
  " LoadIC:",
  "[unknown]",
  " LoadPolymorphicIC:",
].join("|");
const sedDeleteInternals = `-e '/(${INTERNAL_FUNCTIONS})/d'`;
const sedReplaceLazyCompile = `-e 's/ LazyCompile:[*~]?/ /'`;
const baseSedCommand = `sed ${sedDeleteInternals} ${sedReplaceLazyCompile}`;

/**
 * https://nodejs.org/en/docs/guides/diagnostics-flamegraph#filtering-out-nodejs-internal-functions
 *
 * sed -i -r \
 * -e "/( __libc_start| LazyCompile | v8::internal::| Builtin:| Stub:| LoadIC:|\[unknown\]| LoadPolymorphicIC:)/d" \
 * -e 's/ LazyCompile:[*~]?/ /' \
 * perfs.out
 */
export async function filterInternalFunctions(inputPath: string): Promise<string> {
  const inputExtension = path.extname(inputPath);
  const outputPath = inputPath.replace(inputExtension, FILTERED_EXTENSION);
  const sedCommand = `sed -r -e "/( __libc_start| LazyCompile | v8::internal::| Builtin:| Stub:| LoadIC:|\\[unknown\\]| LoadPolymorphicIC:)/d" -e 's/ LazyCompile:[*~]?/ /' ${inputPath} > ${outputPath}`;
  // const sedCommand = `${baseSedCommand} ${inputPath} > ${outputPath}`;
  await exec(sedCommand, false);
  return outputPath;
}

async function stackCollapse(inputPath: string): Promise<string> {
  const inputExtension = path.extname(inputPath);
  const outputPath = inputPath.replace(inputExtension, FOLDED_EXTENSION);
  await exec(`${stackCollapsePerlScript} ${inputPath} > ${outputPath}`, false);
  return outputPath;
}

async function generateSvg(inputPath: string, filterInternals: boolean): Promise<string> {
  const inputExtension = path.extname(inputPath);
  const svgExtension = filterInternals ? ".filtered.svg" : "unfiltered.svg";
  const outputPath = inputPath.replace(inputExtension, svgExtension);
  await exec(`${svgPerlScript} ${inputPath} > ${outputPath}`, false);
  return outputPath;
}

export async function renderWithFlameGraph(inputPath: string, filterInternals = true): Promise<string> {
  return stackCollapse(inputPath).then((p) => generateSvg(p, filterInternals));
}

export async function renderWithStackvis(inputPath: string, filterInternals: boolean): Promise<string> {
  const inputDir = path.dirname(inputPath);
  const outputName = filterInternals ? "index.filtered.html" : "index.unfiltered.html";
  const outputPath = path.resolve(inputDir, outputName);
  await exec(`stackvis perf < ${inputPath} > ${outputPath}`, false);
  return outputPath;
}

type Renderer = "flamegraph" | "stackvis";

export async function processRawData(inputPath: string, renderer: Renderer, filterInternals = true): Promise<string> {
  const processed = filterInternals ? filterInternalFunctions(inputPath) : Promise.resolve(inputPath);
  const _renderer = renderer === "flamegraph" ? renderWithFlameGraph : renderWithStackvis;
  return processed.then((p) => _renderer(p, filterInternals));
}

// interface PerfSettings {
//   output: string;
//   pid: string;
//   timeInSec: number;
// }

// function buildOsxCommand({pid, output, timeInSec}: PerfSettings): string {
//   return [
//     "xctrace",
//     "record",
//     "--output",
//     `${output}`,
//     '--template "Time Profiler"',
//     `--time-limit ${timeInSec}s`,
//     `--attach ${pid}`,
//   ].join(" ");
// }

// export function runPerf(pid: number, freq: number, rawDataPath: string): Promise<void> {
//   return new Promise((resolve, reject) => {
//     // return `perf record -g -p ${pid} -F ${freq} -o ${outPath}`;
//     const stacks = spawn("sudo", ["perf", "record", "-g", `-p ${pid}`, `-F ${freq}`, "-o", rawDataPath], {
//       stdio: ["ignore", "inherit", "inherit", "ignore", "ignore", "pipe"],
//     });
//     stacks.on("error", reject);
//     stacks.on("exit", resolve);
//   });
// }

// export function generateOutput(rawDataPath: string): Promise<string> {
//   return exec(`sudo perf script -i ${rawDataPath}`, false);
// }

// export function generateOutput2(rawDataPath: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const perfOutputPath = rawDataPath.replace(DATA_EXTENSION, PERF_EXTENSION);
//     const stacks = spawn("sudo", ["perf", "script", "-i", rawDataPath], {
//       stdio: ["ignore", openSync(perfOutputPath, "w"), "ignore"],
//     });
//     stacks.on("error", reject);
//     stacks.on("exit", () => resolve(perfOutputPath));
//   });
// }

/**
 *
 *
 *
 *
 *
 *
 *
 *
 */

// export function generateSvg2(foldedOutputPath: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const svgOutputPath = foldedOutputPath.replace(FOLDED_EXTENSION, ".svg");
//     const fold = spawn(path.resolve(__dirname, "..", "submodules", "FlameGraph", "flamegraph.pl"), [foldedOutputPath], {
//       stdio: ["ignore", openSync(svgOutputPath, "w"), "ignore"],
//     });
//     fold.on("error", reject);
//     fold.on("exit", () => resolve(svgOutputPath));
//   });
// }
