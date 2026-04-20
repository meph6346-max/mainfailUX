# Mainfail UX Deployment Package

## Target Architecture

Mainfail UX now uses the release-Marlin + ESP32 single-file WebUI model.

```text
Release Marlin
  printer motion, temperature, SD print jobs, G-code commands

ESP32 WebUI upload
  one Mainfail index.html.gz package
```

The printer SD card and a separate LittleFS asset upload are not required for serving Mainfail JavaScript, CSS, language packs, or themes.

## Recommended Upload

Upload one file from the ESP3D start screen:

```text
dist/standard/index.html.gz
```

This file contains the ESP3D shell plus the Mainfail CSS, JavaScript, config, languages, theme, and Live Path view.

For repeated testing, open this helper file locally while connected to the printer AP:

```text
dist/uploader/mainfail-webui-uploader.html
```

It posts `index.html.gz` to the board upload endpoint using the same ESP3D form fields.

## File Size Snapshot

Current WebUI package size:

```text
SPIFFS/index.html raw: about 1.1 MB
dist/standard/index.html.gz: about 276 KB
SPIFFS/index.html.gz: about 276 KB
```

`dist/standard/index.html.gz` includes the original ESP3D JavaScript plus the embedded Mainfail UI. It is the correct file for one-file installation.

## Build

Regenerate deployable gzip files after editing `SPIFFS/index.html`:

```powershell
node tools\build-webui.js
```

Validate before upload:

```powershell
node tools\validate-webui.js 30
```

## Notes

- G-code files remain Marlin/ESP3D-managed printer files.
- Mainfail WebUI assets are embedded in the one uploaded `index.html.gz`.
- NVS is reserved for small firmware/system key-value settings, not WebUI files.
- Mainfail UI settings are saved in browser storage.
- A future custom firmware branch may add direct SD file APIs, but this package does not depend on that.
