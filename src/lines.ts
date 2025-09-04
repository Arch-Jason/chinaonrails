import { lines_1865 } from "./data/lines/1865";
import { lines_1870 } from "./data/lines/1870";
import { lines_1880 } from "./data/lines/1880";
import { lines_1890 } from "./data/lines/1890";
import { Line } from "./types";

export const lines: { [key: number]: Line[] } = {
  1865: lines_1865,
  1870: lines_1870,
  1880: lines_1880,
  1890: lines_1890,
};
