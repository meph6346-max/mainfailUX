# Mainfail OS v3.0 — Deployment Package

## Installation

### Step 1: SPIFFS (ESP32 Flash)
Upload `SPIFFS/index.html.gz` to ESP32 SPIFFS.
- Via ESP3D web interface: System > SPIFFS > Upload
- Or via esptool/PlatformIO

### Step 2: SD Card
Copy the entire `SD_CARD/webui/` folder to your SD card root.
Result: `/webui/mainfail.css`, `/webui/mainfail.js`, etc.

## File Structure

```
SPIFFS (ESP32 Flash):
  index.html.gz      155,628 bytes — Boot shell + original ESP3D JS

SD Card (/webui/):
  mainfail.css       27,146 bytes — Dark theme
  mainfail.js        21,568 bytes — Custom features
  mainfail.cfg       1,362 bytes — Config
  js/gcode-viewer.js 8,000 bytes — G-code viewer
  lang/en.json       — English
  lang/ko.json       — Korean
  theme/default.json — Default theme colors
  macros/*.gcode     — Macro files
  mesh/default.json  — Bed mesh data (auto-populated)
  history.json       — Print history (auto-populated)
```

## Architecture
- Original ESP3D JS: ZERO modifications (601KB preserved)
- STUB refactoring: 119 duplicate IDs → 1 (original ESP3D bug)
- Hook-based extension (Monitor_output_Update, files_print)
- State Machine: idle/printing/paused/error/disconnected
- Write-Behind Cache: RAM → dirty flag → flush on idle
- Safe Mode: falls back if SD unavailable

## Version
v3.0 — 2026-04-17
