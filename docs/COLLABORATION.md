# Mainfail UX — Collaboration Log

A shared changelog for all agents working on this repo (Codex, Claude, and human maintainers). Keep entries short and factual; every change to the canonical source (`SPIFFS/index.html`) or the build/validation tooling belongs here.

## How we collaborate

- **Canonical source**: `SPIFFS/index.html` is the single source of truth for the WebUI.
- **Build**: `node tools/build-webui.js` regenerates both `SPIFFS/index.html.gz` and `dist/standard/index.html.gz`. Never edit the gzipped files by hand.
- **Validation**: `node tools/validate-webui.js 30` must pass before commit. 30 rounds is the default smoke check; bump it higher if you touch script-heavy areas.
- **Language of comments and non-translatable UI copy**: English. User-visible strings that go through the `translate` attribute remain keys; localized text lives in the `lang_en` / `lang_ko` bundle assets.
- **Risky inline comments**: never wedge `/* ... */` between executable statements on the same line. Put the comment on its own line above the statement.

## Entry format

Use one block per change set. Keep it scannable.

```
### YYYY-MM-DD — <author> (<model or name>)

**Scope**: files or areas touched
**Summary**: one sentence on what changed and why
**Verification**: commands you ran (build, validate, manual test)
**Notes / follow-ups**: anything the next agent should know
```

## Log

### 2026-04-22 — Claude (Opus 4.7)

**Scope**: `SPIFFS/index.html`, `SPIFFS/index.html.gz`, `dist/standard/index.html.gz`, `dist/standard/manifest.json`

**Summary**: Normalized all in-source comments to English and removed the hard-coded Korean UI strings that were not going through the translation system. Split one inline block comment (`mf_saveConfig`) onto its own line so the comment can no longer visually swallow following code.

**Details**:
- CSS, HTML, and JS comments in `SPIFFS/index.html` were translated from Korean to English (approximately 70 comments).
- Two hard-coded Korean UI strings (`이름 저장 → ESP32 재시작 후 활성화`, debug logger hint text) replaced with English copy. Language-switching users still get Korean via the `lang_ko` bundled asset.
- `function mf_saveConfig(d,cb){/* ... */if(!d){...}}` → comment moved to a dedicated line above the function to eliminate the "comment-eats-code" hazard.
- `tools/build-webui.js` was run to regenerate the gzip + manifest artifacts from the updated source; gzip size changed from previous build to 296,292 bytes.

**Verification**:
- `node tools/build-webui.js` — built SPIFFS and standard gzip outputs.
- `node tools/validate-webui.js 30` — 30 rounds passed (structure, script syntax, bundled assets, runtime functions).

**Notes / follow-ups**:
- `README_KO.md` and `docs/CODEX_HANDOVER.md` remain Korean on purpose (they are localized documentation, not code).
- Lang bundle assets (`lang_ko`) were NOT edited; the Korean localization pipeline is untouched.
- Next agent: if you add a new comment, write it in English. If you need Korean-only context, add it to a doc under `docs/` rather than inline.
