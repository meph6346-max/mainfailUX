# Mainfail UX

ESP3D WebUI mod for release Marlin machines, designed around a two-track storage model:

- **Marlin + ESP3D** keeps printer control, G-code upload, G-code listing, and print commands.
- **ESP32 LittleFS** serves the Mainfail WebUI assets and small Mainfail user data.

Mainfail UX does not require SD-card web serving. This is intentional: release Marlin setups commonly expose SD files through printer commands or ESP3D upload/list APIs, not as static web assets.

## Project Direction

The old SD-based WebUI strategy has been retired.

Mainfail now has two deployment tracks:

```text
Standard install
  dist/standard/index.html.gz
  Upload this one file from the ESP3D start screen.

Developer / advanced install
  SPIFFS/index.html.gz
  LITTLEFS/webui/*
  Use this when you want editable split files in LittleFS.
```

The source layout remains:

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

For normal users, the standard bundle is the recommended path. It embeds the Mainfail CSS, JavaScript, language files, theme, config, and G-code viewer into one gzip file so ESP3D can install it the same way as a regular WebUI.

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
  index.html.gz    split-mode ESP3D entrypoint

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

dist/
  standard/
    index.html.gz  recommended single-file upload
    manifest.json  generated bundle details

tools/
  build-webui.js   regenerates deployable gzip files
```

`dist/standard/index.html.gz` is the easiest file to upload through the ESP3D start screen. `SPIFFS/index.html.gz` is kept for split LittleFS development and loads Mainfail assets from `/webui/...`.

## Runtime Model

Standard install:

```text
Browser
  -> ESP3D dist/standard/index.html.gz
  -> bundled Mainfail CSS / JS / config / language / theme / G-code viewer
  -> Marlin/ESP3D commands for printer control
```

Split LittleFS install:

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
standard mode: bundled gcode-viewer.js
split mode:    /webui/js/gcode-viewer.js
```

## Current Status

Mainfail UX is in active development.

The current architecture is optimized for:

- release Marlin compatibility
- ESP32 LittleFS deployment
- no dependency on SD-card static web serving
- future migration path to custom firmware SD APIs

## Build Notes

After editing `SPIFFS/index.html` or anything in `LITTLEFS/webui/`, regenerate deployable files:

```powershell
node tools\build-webui.js
```

Then upload one of these:

- Recommended: `dist/standard/index.html.gz`
- Advanced split mode: `SPIFFS/index.html.gz` plus `LITTLEFS/webui/` into `/webui/`

In standard mode, Mainfail user settings are saved in browser storage because one uploaded HTML gzip file cannot rewrite itself. Printer control and G-code file jobs still use Marlin / ESP3D.
