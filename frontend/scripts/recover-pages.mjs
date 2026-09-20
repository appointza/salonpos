import fs from "node:fs";
import path from "node:path";

const transcripts = [
  "C:/Users/aravi/.cursor/projects/d-aravindan-project-freelancer-salonpos/agent-transcripts/0d370da5-d690-4fce-9eca-b70d7899a423/0d370da5-d690-4fce-9eca-b70d7899a423.jsonl",
  "C:/Users/aravi/.cursor/projects/d-aravindan-project-freelancer-salonpos/agent-transcripts/e98c76d3-125f-4bd1-8df6-a41351d1a8e2/e98c76d3-125f-4bd1-8df6-a41351d1a8e2.jsonl",
];
const outDir = path.resolve("src/pages");

function extractFromWrite(fileSuffix, outFolder, componentRename) {
  for (const transcript of transcripts) {
  const lines = fs.readFileSync(transcript, "utf8").split("\n");
  for (const line of lines) {
    if (!line.includes(fileSuffix) || !line.includes('"Write"')) continue;
    try {
      const j = JSON.parse(line);
      for (const part of j.message?.content ?? []) {
        const p = part.input?.path ?? "";
        if (!p.includes(fileSuffix)) continue;
        let src = part.input.contents;
        src = src.replace(/^import \{ createFileRoute[^]*?export const Route = createFileRoute[\s\S]*?\}\);\s*/m, "");
        src = src.replace(/^const title =[\s\S]*?;\s*const description =[\s\S]*?;\s*/m, "");
        if (componentRename) {
          src = src.replace(/function (\w+)\(\)/, `export function ${componentRename}()`);
        } else {
          src = src.replace(/^function (\w+)\(\)/m, "export function $1()");
        }
        const dir = path.join(outDir, outFolder);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${outFolder}.tsx`), src.trim() + "\n");
        console.log("recovered", outFolder, "from", path.basename(transcript));
        return;
      }
    } catch {
      /* skip */
    }
  }
  }
  console.warn("missing", fileSuffix);
}

extractFromWrite("prize-wheel.tsx", "PrizeWheel", "PrizeWheelPage");
extractFromWrite("scratch-card.tsx", "ScratchCard", "ScratchCardPage");
extractFromWrite("walk-in.tsx", "WalkIn", "Page");
extractFromWrite("growth.tsx", "Growth", "GrowthGuidePage");
extractFromWrite("reports.tsx", "Reports", "Page");
extractFromWrite("setup.tsx", "Setup", "Page");
