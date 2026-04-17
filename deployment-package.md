# Mainfail UX Deployment Package

## Target Architecture

Mainfail UX now uses the release-Marlin + ESP32 LittleFS two-track model.

```text
Release Marlin
  printer motion, temperature, SD print jobs, G-code commands

ESP32 LittleFS
  Mainfail WebUI assets and small Mainfail data
```

The printer SD card is not required for serving Mainfail JavaScript, CSS, language packs, or themes.

## Recommended Upload

For normal users, upload one file from the ESP3D start screen:

```text
dist/standard/index.html.gz
```

This file contains the ESP3D shell plus the Mainfail CSS, JavaScript, config, languages, theme, and G-code viewer.

## Advanced Split Upload

Use this only when you want to keep editable Mainfail files in ESP32 LittleFS.

Upload this file as the ESP3D WebUI entrypoint:

```text
SPIFFS/index.html.gz
```

Upload the `LITTLEFS/webui/` folder to ESP32 LittleFS so the board serves:

```text
/webui/mainfail.js
/webui/mainfail.css
/webui/mainfail.cfg
/webui/js/gcode-viewer.js
/webui/lang/en.json
/webui/lang/ko.json
/webui/theme/default.json
/webui/macros/*.gcode
```

## File Size Snapshot

Current WebUI asset size is small enough for typical ESP32 LittleFS partitions:

```text
LITTLEFS/webui raw total: about 63 KB
dist/standard/index.html.gz: about 191 KB
SPIFFS/index.html.gz: about 166 KB
```

`dist/standard/index.html.gz` includes the original ESP3D JavaScript plus the embedded Mainfail asset bundle. It is the correct file for one-file installation.

## Build

Regenerate deployable gzip files after editing `SPIFFS/index.html` or `LITTLEFS/webui/`:

```powershell
node tools\build-webui.js
```

## Notes

- G-code files remain Marlin/ESP3D-managed printer files.
- Mainfail WebUI assets live in LittleFS, not on the printer SD card.
- NVS is reserved for small firmware/system key-value settings, not WebUI files.
- Standard single-file mode saves Mainfail UI settings in browser storage.
- A future custom firmware branch may add direct SD file APIs, but this package does not depend on that.
