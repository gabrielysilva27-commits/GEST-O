import fs from "node:fs";
const path = "scripts/build-site.mjs";
let s = fs.readFileSync(path, "utf8");
s = s.replace("const SHARED_MEETING_SUBJECT_SEED_VERSION = 1;", "const SHARED_MEETING_SUBJECT_SEED_VERSION = 2;");
const start = s.indexOf("  async ensureMeetingSubjects() {");
const end = s.indexOf("  async session(request)", start);
if (start < 0 || end < 0) throw new Error("SharedStore meeting migration block not found");
const block = `  applyMeetingSubjects(data) {
    if (!data || !Array.isArray(data.meetings)) return false;
    let changed = false;
    for (const [title, subjects] of Object.entries(meetingSubjectSeed)) {
      const meeting = data.meetings.find((item) => String(item?.title || "") === title);
      if (!meeting) continue;
      const current = Array.isArray(meeting.subjects) ? meeting.subjects : [];
      const merged = Array.from(new Set([...current, ...subjects]));
      if (merged.length !== current.length) {
        meeting.subjects = merged;
        changed = true;
      }
    }
    return changed;
  }
  async ensureMeetingSubjects() {
    const data = (await this.state.storage.get("data")) || null;
    if (!this.applyMeetingSubjects(data)) return;
    await this.state.storage.put("data", data);
    await this.state.storage.put("meetingSubjectSeedVersion", meetingSubjectSeedVersion);
  }
`;
s = s.slice(0, start) + block + s.slice(end);
const fetchMarker = "  async fetch(request) {\n    await this.ready;\n    const path = new URL(request.url).pathname;";
if (!s.includes(fetchMarker)) throw new Error("SharedStore fetch marker not found");
s = s.replace(fetchMarker, "  async fetch(request) {\n    await this.ready;\n    await this.ensureMeetingSubjects();\n    const path = new URL(request.url).pathname;");
const putMarker = "      if (!body?.data || typeof body.data !== \"object\" || Array.isArray(body.data)) return Response.json({ error: \"Dados inválidos.\" }, { status: 400 });\n      await this.state.storage.put(\"data\", body.data);";
if (!s.includes(putMarker)) throw new Error("Shared data PUT marker not found");
s = s.replace(putMarker, "      if (!body?.data || typeof body.data !== \"object\" || Array.isArray(body.data)) return Response.json({ error: \"Dados inválidos.\" }, { status: 400 });\n      this.applyMeetingSubjects(body.data);\n      await this.state.storage.put(\"data\", body.data);");
fs.writeFileSync(path, s, "utf8");
fs.rmSync("scripts/enforce-shared-meeting-subjects-once.mjs", { force: true });
fs.rmSync(".github/workflows/enforce-shared-meeting-subjects-once.yml", { force: true });
console.log("Shared meeting subjects are now enforced on reads and writes.");
