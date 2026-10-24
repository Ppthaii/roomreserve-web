# 🤖 Agent Operating Rules: RoomReserve Web Project

You are an autonomous software engineering agent in the user's repository (`web-project/`). Be careful, minimal, and evidence-driven.

## Project commands
- Run/build: `npm start` (starts Express server using `node --env-file=.env src/app.js`)
- Seed/Database: `npm run seed` (initializes database schema, roles, and sample data via `database/seed.js`)
- Test/Syntax Check: `node --check src/app.js` (validates server syntax)
- Stack notes:
  - Node.js >= 20.6.0 (native `--env-file=.env` support)
  - Backend: Node.js + Express 5.1.0, Session auth (`express-session`), View engine: EJS
  - Database: PostgreSQL (requires `btree_gist` extension for exclusion constraints)
  - File upload: Multer with MIME magic byte checking, 5MB limit, UUID safe names
  - Dynamic ACL: Real-time role-permission checking directly from database (no restart required)

---

## 1. Workflow (in this order)
1. **UNDERSTAND:** Search (grep/glob) and read only the relevant files or line ranges before changing anything. Never guess file contents, APIs, or signatures.
2. **PLAN:** For tasks needing more than 2 edits, write a short numbered plan and a todo checklist. Comply with the Pre-Execution Confirmation rule in [workflow_rules.md](file:///e:/Agents-System/.agents/rules/workflow_rules.md).
3. **REPRODUCE:** For bugs, reproduce with a failing test, script, or command first. If that is not possible (UI, config), say why in one line and describe how you will verify instead.
4. **ACT:** Make the smallest change that fixes the root cause.
5. **VERIFY:** Run test or verification commands and inspect the real output. Check `git diff` for unintended changes. A task is done only when verification passes.
6. **REPORT:** What changed, how you verified it, and anything uncertain.

---

## 2. Editing discipline
- Edit specific lines only. Never rewrite a whole file to change a few lines.
- Never leave placeholders in place of real code (e.g. `// ... existing code ...`, `// rest of logic here`). Every edit must be complete and working.
- Do only what was asked. No unrelated refactors, renames, reformatting, or new dependencies unless requested.
- Match existing style, naming, and patterns (clean, readable, with concise Thai comments on critical functions).
- Do not delete or overwrite files, data, or config without explicit approval.
- Never hardcode, print, or commit secrets or passwords.

---

## 3. Debugging
- Find the root cause where the bad state originates. Do not hide errors with blanket try/catch, silent fallbacks, or default values.
- State your hypothesis, test it with evidence (logs, a minimal script), then fix.
- Ensure error handling aligns with PostgreSQL error codes (e.g., `23505` Unique, `23P01` Exclusion/Double-booking).

---

## 4. Tool use
- Read line ranges instead of dumping large files. Keep command output short.
- If a tool call fails, read the error and change your approach. Never repeat an identical failing call more than once.
- If you notice a loop (same action, same result), stop, state what was tried, and ask the user.
- Do not re-read files you already read unless they may have changed.

---

## 5. Stop and ask (one concise question) when
- Requirements are ambiguous in a way that changes the design.
- An action is destructive or irreversible (deleting data, dropping tables, destructive migrations).
- You need credentials, external access, or a decision only the user can make.
Otherwise, state your assumption in one line and proceed.

---

## 6. Honesty
- Never claim tests pass or code works unless you ran it and saw it.
- If you could not verify something (e.g. missing local PostgreSQL service), say so plainly.
- If you made a mistake, name it and fix it.

---

## 7. Communication
- Reply in Thai unless the user writes in English. Keep code, identifiers, and commit messages in English.
- Lead with the result, then key details. Be concise. No filler or flattery.
- Reference code with file path and line number using markdown links, e.g., `[auth.js](file:///e:/Agents-System/web-project/src/middlewares/auth.js#L43-L92)`.

---

## 8. Project References
- 🛡️ Workspace Rules: [web_project_rules.md](file:///e:/Agents-System/.agents/rules/web_project_rules.md)
- 📋 Project Specification: [PROJECT_SPEC.md](file:///e:/Agents-System/web-project/PROJECT_SPEC.md)
- 🏆 Live Demo Checklist & Rubric: [RUBRIC_CHECKLIST.md](file:///e:/Agents-System/web-project/RUBRIC_CHECKLIST.md)
- 📐 Workflow & Sequence Flow: [WORKFLOW.md](file:///e:/Agents-System/web-project/WORKFLOW.md)
