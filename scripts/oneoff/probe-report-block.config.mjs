// Probe-only Vite config: exposes the report modal's own setter so a verification can open it
// on a REAL climber.
//
// The shared overlay scaffold already opens `reportUser`, but its payload is `CLIMBERS[0]` -- a
// seed climber with an integer id. That is right for the guards, which ask whether the modal
// mounts. It is useless here: `blockClimber` only writes to the database for a uuid, so a seed
// payload would exercise the local-state half and prove nothing about the write.
//
// THE ANCHOR IS A STATEMENT BOUNDARY, AND THE FIRST ONE WAS NOT. Injecting after
// `[reportUser,setReportUser]=useState(null)` looked obviously safe and was not: that
// declaration sits mid-way through a multi-declarator `const` on a 30,000-character line, so a
// `;` there TERMINATED the const and left `[resumeFor,setResumeFor]=useState(null)` as a bare
// destructuring assignment to variables nothing declares. The app crashed to its error boundary
// with `resumeFor is not defined`, and the verification then reported seven failures about the
// report modal -- describing a defect that did not exist, in code that was fine.
// `const blockClimber` is a real statement boundary. This is the dense-line hazard CLAUDE.md
// records, met from the tooling side rather than the app side.
//
// Never shipped -- passed with `vite --config`, exactly like the four configs in scripts/.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ANCHOR = "const blockClimber=function(c,opts)";

export default defineConfig({
  base: "/Climbing-App/",
  plugins: [
    {
      name: "probe-expose-report-setter",
      enforce: "pre",
      transform(code, id) {
        if (!id.endsWith("ClimbMatch.jsx")) return null;
        const n = code.split(ANCHOR).length - 1;
        // Exactly once, or the run dies rather than quietly walking an app it did not modify --
        // the ANCHOR LOST rule every guard in scripts/ follows.
        if (n !== 1) throw new Error(`ANCHOR LOST: expected 1 occurrence of ${JSON.stringify(ANCHOR)}, found ${n}`);
        return code.replace(ANCHOR, "window.__openReport=setReportUser;" + ANCHOR);
      },
    },
    react(),
  ],
});
