# Mainfail UX

ESP3D WebUI mod for release Marlin machines, now organized around a single-file WebUI package:

- **Marlin + ESP3D** keeps printer control, G-code upload, G-code listing, and print commands.
- **Mainfail WebUI** is shipped as one `index.html.gz` upload package.
- **Browser storage** keeps Mainfail UI preferences that cannot be written back into the one uploaded HTML file.

Mainfail UX does not require SD-card web serving or a separate LittleFS asset upload for normal use. This is intentional: release Marlin setups commonly expose SD files through printer commands or ESP3D upload/list APIs, not as static web assets.

## Project Direction

The old SD-based WebUI strategy has been retired.

Mainfail now uses one recommended deployment track:

```text
Standard install
  dist/standard/index.html.gz
  Upload this one file from the ESP3D start screen.
```

The canonical source is:

```text
SPIFFS/index.html
  full single-file Mainfail WebUI source

dist/standard/index.html.gz
  recommended upload file

Printer SD card, if present
  G-code files managed by Marlin / ESP3D
```

That keeps the UI portable across release Marlin environments while still leaving a future path for custom firmware with direct SD APIs.

For normal users, `dist/standard/index.html.gz` is the recommended path. It embeds the Mainfail CSS, JavaScript, language data, theme, config, and Live Path code into one gzip file so ESP3D can install it the same way as a regular WebUI.

## Why This Exists

Mainfail UX modernizes ESP3D WebUI for Marlin-based 3D printers without requiring Klipper, a Raspberry Pi, or a Linux SBC.

The goal is a Mainsail-like workflow on a small ESP32-class controller:

- dashboard-first layout
- dark theme
- cleaner navigation
- printer status cards
- EEPROM helper views
- bed mesh visualization
- Live Path motion trace
- macro and UI settings

The original ESP3D backend behavior is preserved as much as possible. Mainfail wraps and extends the existing UI contract instead of replacing the printer communication stack.

## Storage Rules

Use the right storage for the right job.

```text
NVS
  firmware/system key-value settings
  WiFi and ESP3D-level preferences

Browser storage
  per-device UI state
  Mainfail UI preferences
  temporary viewer state

Printer SD
  large G-code files
  Marlin print jobs
```

NVS is not used as a file store. Large G-code files are not stored in LittleFS.

## Repository Structure

```text
SPIFFS/
  index.html       canonical single-file WebUI source
  index.html.gz    gzip build from the canonical source

LITTLEFS/
  webui/           legacy/reference split assets, not required for normal upload

dist/
  standard/
    index.html.gz  recommended single-file upload
    manifest.json  generated bundle details
  uploader/
    mainfail-webui-uploader.html  local helper page for replacing index.html.gz

tools/
  build-webui.js      regenerates deployable gzip files
  validate-webui.js   checks structure, script syntax, and required runtime hooks
```

`dist/standard/index.html.gz` is the easiest file to upload through the ESP3D start screen. `SPIFFS/index.html.gz` is kept as the same WebUI package in the firmware-style source folder.

## Runtime Model

Standard install:

```text
Browser
  -> ESP3D dist/standard/index.html.gz
  -> Marlin/ESP3D commands for printer control
```

The Live Path view is loaded only when needed:

```text
single-file mode: bundled Live Path code
```

Live Path is not a full G-code preview. It uses Marlin-reported position and SD progress lines such as `M154`, `M114`, and `M27` output to draw the current and past motion trace.

## Current Status

Mainfail UX is in active development.

The current architecture is optimized for:

- release Marlin compatibility
- ESP32 LittleFS deployment
- no dependency on SD-card static web serving
- future migration path to custom firmware SD APIs

## Build Notes

After editing `SPIFFS/index.html`, regenerate deployable files:

```powershell
node tools\build-webui.js
```

Then upload:

- Recommended: `dist/standard/index.html.gz`

Mainfail user settings are saved in browser storage because one uploaded HTML gzip file cannot rewrite itself. Printer control and G-code file jobs still use Marlin / ESP3D.

Before uploading a build, run:

```powershell
node tools\validate-webui.js 30
```

For faster WebUI replacement while connected to the printer AP, open `dist/uploader/mainfail-webui-uploader.html` in a browser and select `dist/standard/index.html.gz`.
