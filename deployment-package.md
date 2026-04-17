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

## Upload Layout

### ESP3D entrypoint

Upload this file as the ESP3D WebUI entrypoint:

```text
SPIFFS/index.html.gz
```

### Mainfail LittleFS assets

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
LITTLEFS/webui raw total: about 72 KB
LITTLEFS/webui gzip total: about 20 KB
```

`SPIFFS/index.html.gz` contains the ESP3D-compatible shell and loader.

## Build

Regenerate the deployable gzip after editing `SPIFFS/index.html`:

```powershell
node -e "const fs=require('fs'),zlib=require('zlib');fs.writeFileSync('SPIFFS/index.html.gz',zlib.gzipSync(fs.readFileSync('SPIFFS/index.html'),{level:9}));"
```

## Notes

- G-code files remain Marlin/ESP3D-managed printer files.
- Mainfail WebUI assets live in LittleFS, not on the printer SD card.
- NVS is reserved for small firmware/system key-value settings, not WebUI files.
- A future custom firmware branch may add direct SD file APIs, but this package does not depend on that.

