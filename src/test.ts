import {resolve} from "path";
import {processRawData} from "./index";

const outData = resolve(__dirname, "..", "data", "out.filtered");
processRawData(outData, false).catch((err) => console.error(err));
