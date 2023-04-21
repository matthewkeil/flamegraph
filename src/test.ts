import {resolve} from "path";
import {processRawData} from "./index";

const outData = resolve(__dirname, "..", "data", "out.data");
processRawData(outData, "flamegraph", true).catch((err) => console.error(err));
