# Mainfail UX

**ESP3D WebUI Mod for Marlin**  
*Mainsail-style ESP3D WebUI mod for Marlin-based 3D printers.*

> Screenshots coming soon.

---

## What is this?

Mainfail UX is a frontend overhaul for **ESP3D WebUI v2.1** running on **Marlin-based 3D printers**.

It rewrites the interface layer of ESP3D WebUI without touching the original backend logic.  
The original **601KB JavaScript bundle remains untouched**. Only the HTML and CSS are reworked, while additional features are loaded from the SD card.

This is not a firmware fork.  
It is not a clean-room rewrite either.  
It is a compatibility-heavy UI mod built on top of ESP3D WebUI.

---

## Wait, what’s FEMTO?

**FEMTO** is an ultra-budget DIY printer competition hosted by the [DCInside 3D Printing Minor Gallery](https://gall.dcinside.com/mgallery/board/lists/?id=3dprinting) in Korea.

At one point, a very cheap printer was sold locally under the name **Sondori Pico** — basically a rebranded Easythreed machine. It became a bit of a meme because of how toy-like it felt. In the community, when someone mentioned a dirt-cheap printer, the joke was often: **“Well... at least it’s better than a Pico.”**

FEMTO is an homage to that.

The idea was simple:

**Build something even cheaper than a Pico — but make it actually work.**

The name comes from SI prefixes.  
If **Pico** is 10⁻¹², then **Femto** is 10⁻¹⁵. Smaller, cheaper, more ridiculous, and somehow still functional.

### FEMTO Family

Mainfail UX was developed as part of the FEMTO ecosystem, but each module is intended to work independently.

| Project | Description | Platform | Status |
|---|---|---|---|
| **FEMTO Nano XY** | Ultra-budget DIY 3D printer for the competition | Marlin | In development |
| **[FEMTOCAM](https://github.com/meph6346-max/FEMTOCAM)** | Streaming and timelapse camera module | ESP32-CAM | Released |
| **FEMTO Shaper** | Standalone input shaping module | ESP32-C3 + ADXL345 | In development |
| **Mainfail UX** | ESP3D WebUI mod (this repo) | ESP32 + SD | In development |

---

## Why this exists

The whole point of FEMTO is to build an extremely cheap printer.

Using **Klipper** would mean adding an SBC such as a Raspberry Pi, and that alone would blow the budget. So the printer stack stayed with **Marlin**: one controller board, no SBC, no Linux box attached.

But Marlin + ESP3D has a problem.

The web UI works, but it feels frozen in an older era: Bootstrap 3, gray panels, tab-heavy layout, functional but uncomfortable. Nothing is fundamentally broken. It just feels hard to use.

Klipper users have **Mainsail**.  
Clean layout, dark theme, card-based dashboard, modern UX.

I wanted something in that direction for a Marlin + ESP3D machine.

So the approach became:

1. **Keep the original JS intact**  
   Preserve the 601KB bundle, the WebSocket logic, and the original ESP3D behavior.

2. **Replace the HTML/CSS shell**  
   Sidebar navigation, card-based dashboard, dark theme, cleaner structure.

3. **Load extra features from the SD card**  
   EEPROM viewer, bed mesh visualization, G-code viewer, print history, language files, theme config.

I wanted something like Mainsail.  
What I got was a sail bolted onto ESP3D WebUI, and the sail was broken.

So: **Mainfail**.

---

## What changed

### Layout
- Sidebar navigation with 9 fixed sections
- Card-based dashboard with collapsible panels
- Mainsail-style dark theme
- Cleaner visual hierarchy for embedded hardware UI

### Additional features
- Print status card using parsed `SD printing byte` console output
- EEPROM viewer/editor using parsed `M503` responses
- Bed mesh visualization using parsed `G29` output
- 2D G-code viewer rendered in Canvas
- Print history
- Korean / English language support
- Theme customization

### Internal architecture
- State machine for `idle / printing / paused / error / disconnected`
- Write-behind cache to avoid unsafe SD writes during printing
- Hook-based extension model that wraps original functions
- Safe Mode with warning banner and fallback behavior when SD content is unavailable

---

## What did **not** change

- ESP3D firmware
- Marlin firmware
- The original 601KB ESP3D JavaScript bundle
- WebSocket and HTTP communication logic
- The original DOM contract expected by ESP3D

The original JS relies on a large number of hardcoded DOM lookups.  
Those elements must still exist where ESP3D expects them. If even one critical piece goes missing, things start breaking.

That is why this project is less about “redesign” and more about **compatibility engineering**.

---

## Structure

```text
ESP32 SPIFFS
  └─ index.html.gz
       ├─ HTML shell (Mainfail layout + compatibility DOM)
       ├─ original ESP3D JS bundle (untouched)
       ├─ SD loader (CSS → JS → Config → Lang → Theme)
       └─ shell stub functions to prevent pre-load crashes

SD Card (/webui/)
  ├─ mainfail.css         dark theme
  ├─ mainfail.js          custom features
  ├─ js/gcode-viewer.js   G-code viewer
  ├─ mainfail.cfg         config
  ├─ lang/en.json         English
  ├─ lang/ko.json         Korean
  ├─ theme/default.json   theme colors
  ├─ macros/*.gcode       macros
  ├─ mesh/default.json    bed mesh data
  └─ history.json         print history