// Renders coverage/coverage-summary.json as a Markdown table for the job summary.
import { readFileSync } from "node:fs";

const summary = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
const metrics = ["lines", "statements", "functions", "branches"];

const row = (name, entry) =>
    `| ${name} | ${metrics
        .map((m) => `${entry[m].pct}% (${entry[m].covered}/${entry[m].total})`)
        .join(" | ")} |`;

const lines = [
    "## Coverage",
    "",
    `| | ${metrics.join(" | ")} |`,
    `|---|${metrics.map(() => "---").join("|")}|`,
    row("**Total**", summary.total),
];

console.log(lines.join("\n"));
