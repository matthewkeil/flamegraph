import path from "path";
import {openSync} from "fs";
import {spawn} from "child_process";

const DATA_EXTENSION = ".data";
const PERF_EXTENSION = ".perf";
const FOLDED_EXTENSION = ".folded";

interface PerfSettings {
  output: string;
  pid: string;
  timeInSec: number;
}

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

function runPerf(pid: number, freq: number, rawDataPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // return `perf record -g -p ${pid} -F ${freq} -o ${outPath}`;
    const stacks = spawn("sudo", ["perf", "record", "-g", `-p ${pid}`, `-F ${freq}`, "-o", rawDataPath], {
      stdio: ["ignore", "inherit", "inherit", "ignore", "ignore", "pipe"],
    });
    stacks.on("error", reject);
    stacks.on("exit", resolve);
  });
}

// Filtering out Node.js internal functions
function filterInternalFunctions(rawDataPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const sed = spawn(
      "sudo",
      [
        "sed",
        "-i",
        "-e",
        "/( __libc_start| LazyCompile | v8::internal::| Builtin:| Stub:| LoadIC:|[unknown]| LoadPolymorphicIC:)/d",
        "-e",
        "s/ LazyCompile:[*~]?/ /",
        rawDataPath,
      ],
      {
        stdio: ["ignore", "inherit", "inherit", "ignore", "ignore", "pipe"],
      }
    );

    sed.on("error", reject);
    sed.on("exit", function (code) {
      if (code !== null && code !== 0) {
        reject(new Error("`sed` subprocess error, code: " + code));
      }
      resolve();
    });
  });
}

function generateOutput(rawDataPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const perfOutputPath = rawDataPath.replace(DATA_EXTENSION, PERF_EXTENSION);
    const stacks = spawn("sudo", ["perf", "script", "-i", rawDataPath], {
      stdio: ["ignore", openSync(perfOutputPath, "w"), "ignore"],
    });
    stacks.on("error", reject);
    stacks.on("exit", () => resolve(perfOutputPath));
  });
}

function foldOutput(perfOutputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const foldedOutputPath = perfOutputPath.replace(PERF_EXTENSION, FOLDED_EXTENSION);
    const fold = spawn(
      path.resolve(__dirname, "..", "submodules", "FlameGraph", "stackcollapse-perf.pl"),
      [perfOutputPath],
      {
        stdio: ["ignore", openSync(foldedOutputPath, "w"), "ignore"],
      }
    );
    fold.on("error", reject);
    fold.on("exit", () => resolve(foldedOutputPath));
  });
}

function generateSvg(foldedOutputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgOutputPath = foldedOutputPath.replace(FOLDED_EXTENSION, ".svg");
    const fold = spawn(path.resolve(__dirname, "..", "submodules", "FlameGraph", "flamegraph.pl"), [foldedOutputPath], {
      stdio: ["ignore", openSync(svgOutputPath, "w"), "ignore"],
    });
    fold.on("error", reject);
    fold.on("exit", () => resolve(svgOutputPath));
  });
}

export async function generateFlamegraph(pid: number): Promise<string> {
  const rawDataPath = `/tmp/perf-${Date.now()}${DATA_EXTENSION}`;
  await runPerf(pid, 99, rawDataPath);
  await filterInternalFunctions(rawDataPath);
  return generateOutput(rawDataPath)
    .then(() => foldOutput(rawDataPath))
    .then(generateSvg);
}
