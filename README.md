# Mainfail UX

ESP3D WebUI mod for release Marlin machines, designed around a two-track storage model:

- **Marlin + ESP3D** keeps printer control, G-code upload, G-code listing, and print commands.
- **ESP32 LittleFS** serves the Mainfail WebUI assets and small Mainfail user data.

Mainfail UX does not require SD-card web serving. This is intentional: release Marlin setups commonly expose SD files through printer commands or ESP3D upload/list APIs, not as static web assets.

## Project Direction

The old SD-based WebUI strategy has been retired.

Mainfail now assumes:

```text
ESP32 LittleFS
  /index.html.gz
  /webui/mainfail.js
  /webui/mainfail.css
  /webui/js/gcode-viewer.js
  /webui/lang/*.json
  /webui/theme/*.json
  /webui/macros/*.gcode
  /webui/mainfail.cfg

Printer SD card, if present
  G-code files managed by Marlin / ESP3D
```

That split keeps the UI portable across release Marlin environments while still leaving a future path for custom firmware with direct SD APIs.

## Why This Exists

Mainfail UX modernizes ESP3D WebUI for Marlin-based 3D printers without requiring Klipper, a Raspberry Pi, or a Linux SBC.

The goal is a Mainsail-like workflow on a small ESP32-class controller:

- dashboard-first layout
- dark theme
- cleaner navigation
- printer status cards
- EEPROM helper views
- bed mesh visualization
- G-code preview tools
- macro and UI settings

The original ESP3D backend behavior is preserved as much as possible. Mainfail wraps and extends the existing UI contract instead of replacing the printer communication stack.

## Storage Rules

Use the right storage for the right job.

```text
LittleFS
  Mainfail UI assets
  language packs
  themes
  macros
  small JSON settings
  G-code viewer code

NVS
  firmware/system key-value settings
  WiFi and ESP3D-level preferences

Browser storage
  per-device UI state
  temporary viewer state

Printer SD
  large G-code files
  Marlin print jobs
```

NVS is not used as a file store. Large G-code files are not stored in LittleFS.

## Repository Structure

```text
SPIFFS/
  index.html       source HTML shell
  index.html.gz    deployable ESP3D entrypoint

LITTLEFS/
  webui/
    mainfail.js
    mainfail.css
    mainfail.cfg
    js/gcode-viewer.js
    lang/en.json
    lang/ko.json
    theme/default.json
    macros/*.gcode
    mesh/default.json
    history.json
```

`SPIFFS/index.html.gz` is still the entrypoint ESP3D serves as the main page. It then loads Mainfail assets from `/webui/...` on LittleFS.

## Runtime Model

```text
Browser
  -> ESP3D index.html.gz
  -> /webui/mainfail.css
  -> /webui/mainfail.js
  -> /webui/mainfail.cfg
  -> Marlin/ESP3D commands for printer control
```

The G-code viewer is loaded only when needed:

```text
/webui/js/gcode-viewer.js
```

## Current Status

Mainfail UX is in active development.

The current architecture is optimized for:

- release Marlin compatibility
- ESP32 LittleFS deployment
- no dependency on SD-card static web serving
- future migration path to custom firmware SD APIs

## Build Notes

After editing `SPIFFS/index.html`, regenerate:

```powershell
node -e "const fs=require('fs'),zlib=require('zlib');fs.writeFileSync('SPIFFS/index.html.gz',zlib.gzipSync(fs.readFileSync('SPIFFS/index.html'),{level:9}));"
```

Then upload:

- `SPIFFS/index.html.gz` as the ESP3D entrypoint.
- `LITTLEFS/webui/` into ESP32 LittleFS at `/webui/`.

