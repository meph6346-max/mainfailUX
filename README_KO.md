[README (ENG)](README.md) / [README (한국어)](README_KO.md)

# Mainfail UX

<p align="center">
  <img src="docs/screenshots/dashboard-printing.png" alt="Mainfail UX — Dashboard while printing" width="49%" />
  <img src="docs/screenshots/file-explorer.png" alt="Mainfail UX — File Explorer" width="49%" />
</p>
<p align="center">
  <img src="docs/screenshots/gcode-viewer-liv.png" alt="Mainfail UX — G-code Viewer with live tracking" width="49%" />
  <img src="docs/screenshots/heightmap.png" alt="Mainfail UX — Heightmap with editable mesh cells" width="49%" />
</p>
<p align="center">
  <img src="docs/screenshots/shaper.png" alt="Mainfail UX — FEMTO Shaper extension" width="49%" />
  <img src="docs/screenshots/add-macro.png" alt="Mainfail UX — MacroAddMenu" width="49%" />
</p>
<p align="center">
  <img src="docs/screenshots/add-card.png" alt="Mainfail UX — MacrocardMenu" width="49%" />
  <img src="docs/screenshots/add-card2.png" alt="Mainfail UX — MacrocardMenu2" width="49%" />
</p>
---

---

## Mainfail UX가 뭔가요?

MKS TinyBee (ESP32) + Marlin 환경에서 돌아가는 ESP3D WebUI v2.1용 프론트엔드 모드입니다.

원본 601 KB JavaScript는 **한 줄도 수정하지 않았습니다.** Mainfail 셸, 스타일, 뷰어 코드, 설정 번들, 언어팩, 테마는 **단일 `index.html.gz` 패키지** 안에 넣고, 런타임 설정과 프린터 쪽 데이터는 SD 카드에서 읽어옵니다. 결과적으로, 이미 익숙한 ESP3D WebSocket 백엔드 위에 Mainsail 느낌의 다크 UI를 얹은 셈입니다.

- **Dashboard** — 카드 기반 레이아웃, 드래그 앤 드롭, 카드별 표시/숨김, 커스텀 HTML 카드
- **G-code Viewer + Live Path** — SD 파일 미리보기 + M27 바이트 오프셋 기반 실시간 툴헤드 추적, 미래 경로 오버레이, 자동 팬
- **Print status** — 진행률, ETA, 썸네일 추출 (PrusaSlicer / OrcaSlicer / Cura / Creality)
- **Temperature chart** — Smoothie.js 기반 실시간 그래프, 센서별 색상
- **EEPROM editor** — M503 캡처, 인라인 편집, M500 저장
- **Heightmap** — G29 메쉬 시각화, Z 오프셋 셀 직접 편집, SD에 프로파일 저장/로드
- **Macro editor** — SD에서 생성, 수정, 정렬, 실행
- **WiFi settings** — STA/AP 전환, AP fallback 감지
- **Theme** — 3색 선택기(포인트 / 배경 / 텍스트), 나머지는 자동 계산, 5개 프리셋
- **Extensions** — SD에서 iframe 또는 HTML 기반 커스텀 탭 추가
- **Print history** — SD에 기록, 재부팅 후에도 유지
- **SD 쓰기 보호** — 출력 중 SD 쓰기를 차단 또는 대기열 처리해 카드 잠금 현상 방지

접속: `http://<printer-ip>/` 또는 `http://femto.local/` (mDNS 설정 시)

---

## 잠깐, FEMTO가 뭐죠?

**FEMTO**는 한국의 3D 프린팅 커뮤니티인 [디시인사이드 3D프린팅 마이너 갤러리](https://gall.dcinside.com/mgallery/board/lists/?id=3dprinting)에서 진행하는 초저가 3D 프린터 제작 대회입니다.

예전에 한국에 "손도리 피코"라는 이름으로 팔리던 프린터가 있었습니다 (Easythreed 리브랜딩). 품질이 너무 장난감 같아서 밈이 되어버렸죠. 누가 프린터를 싸구려라고 하면 커뮤니티에서는 "그래도 피코보단 낫다"라고 말하곤 했습니다.

FEMTO는 그 피코를 패러디한 이름입니다. 목표는 **피코보다 더 싸지만, 진짜로 쓸 수 있는 프린터**를 만드는 것. 이름도 SI 접두어에서 따왔습니다. Pico는 10⁻¹², Femto는 10⁻¹⁵. 더 작고, 더 싸고, 그래도 동작하는.

### FEMTO 패밀리

FEMTO 대회를 위해 개발됐지만, 각 모듈은 독립적으로도 다른 프로젝트에 붙여 쓸 수 있습니다.

| 프로젝트 | 설명 | 플랫폼 | 상태 |
|---------|-------------|----------|--------|
| **FEMTO Nano XY** | 초저가 DIY 3D 프린터 (대회 출품작) | Marlin | 개발 중 |
| **[FEMTOCAM](https://github.com/meph6346-max/FEMTOCAM)** | 스트리밍 & 타임랩스 카메라 모듈 | ESP32-CAM | 출시됨 |
| **FEMTO Shaper** | 독립형 Input Shaping 모듈 | ESP32-C3 + ADXL345 | 개발 중 |
| **Mainfail UX** | ESP3D WebUI 모드 (이 저장소) | ESP32 + SD | 개발 중 |

FEMTO Shaper는 SD에서 확장 탭으로 Mainfail UX 안에 임베드할 수 있습니다 — 별도 탭 없이 하나의 UI에서 모두 사용 가능합니다.

---

## 왜 이걸 만들었나?

FEMTO의 목표는 초저가 프린터입니다. Klipper를 쓰면 Raspberry Pi 같은 SBC가 필요하고, 그 자체로 이미 예산이 흔들립니다. 그래서 답은 자연스럽게 **Marlin**이었죠. 메인보드 하나, SBC 없음.

그런데 Marlin에는 빈틈이 있습니다. 웹 UI가 2015년에 멈춰 있어요.

Bootstrap 3, 회색 배경, 탭 기반 네비게이션. 동작은 합니다. 다만 매일 쓰기엔 불편하고, 2025년의 감각과는 거리가 멉니다.

Klipper 쪽으로 가면 [Mainsail](https://github.com/mainsail-crew/mainsail) 같은 깔끔한 다크 테마 카드형 대시보드를 쓸 수 있죠. Marlin도 그런 걸 가질 자격은 있다고 생각했습니다.

그래서 계획은 이렇게 정리됐습니다. **ESP3D 프론트엔드만 바꾸고, 백엔드는 그대로 둔다.**

백엔드, 그러니까 WebSocket, 인증, 프린터 통신 전부를 처리하는 601 KB짜리 JS를 갈아엎는 건 곧 영원한 포크를 떠안는 일입니다. 대신 Mainfail UX는:

1. **원본 JS를 그대로 유지했습니다** — WebSocket 통신, M-code 처리, 프린터 로직은 그대로
2. **셸 레이어를 교체했습니다** — 사이드바 네비게이션, 카드형 대시보드, 다크 테마
3. **훅으로 확장했습니다** — `Monitor_output_Update`, `files_print` 같은 핵심 함수를 감싸 새 동작을 추가하되 원본은 수정하지 않음
4. **프론트엔드를 단일 업로드 파일로 묶었습니다** — Mainfail CSS, JavaScript, 뷰어 코드, 설정, 언어 데이터, 테마를 `index.html.gz` 하나에 포함
5. **필요한 곳에서는 SD를 그대로 사용합니다** — 설정, 테마, 매크로, 확장 탭, 히스토리, G-code 파일은 `/cfg/`, `/macros/`, `/hmaps/`에서 런타임에 읽어옴

결과적으로, SBC 없이도 stock Marlin + ESP3D 환경에서 Mainsail 느낌의 UI를 쓸 수 있게 되었습니다.

---

## 대상 환경

| 항목 | 값 |
|------|-------|
| MCU | ESP32 (MKS TinyBee 등) |
| 펌웨어 | Marlin 2.x + ESP3D WebUI v2.1 |
| SPIFFS | 단일 `index.html.gz` (~328 KB) |
| SD 카드 | 전체 설정/히스토리/매크로/프리뷰 워크플로우에 필요 |
| 브라우저 | Chrome, Firefox, Safari |

---

## 설치

### 1단계: WebUI 패키지 업로드

`index.html.gz`를 ESP32 SPIFFS에 업로드합니다.

```text
dist/standard/index.html.gz
```

- ESP3D 시작 화면 업로드 방식 사용
- 또는 로컬 업로더 사용: `dist/uploader/mainfail-webui-uploader.html`
- 또는 esptool / PlatformIO

### 2단계: 첫 부팅

첫 부팅 시 번들된 기본값으로 시작하고, SD에 설정 디렉토리를 자동 생성합니다.

```
/cfg/mainfail.cfg       ← 메인 설정
/cfg/theme.cfg          ← 저장된 테마
/cfg/layout.cfg         ← 대시보드 카드 레이아웃
/cfg/history.cfg        ← 출력 히스토리
/cfg/extensions.cfg     ← 커스텀 사이드바 탭
/cfg/card_*.cfg         ← 커스텀 대시보드 카드
/macros/*.gco           ← 매크로 파일
/hmaps/*.json           ← 하이트맵 프로파일
```

---

## 아키텍처

```
index.html.gz  (단일 파일, ~328 KB gzip)
│
├── script[9]   ESP3D 원본 JS (601 KB, zero modifications)
├── script[11]  부트 체인 로더 (CSS inject → JS inject → SD config load → connect)
└── <script id="mf-standard-assets">
    ├── mainfail_js      메인 로직 + 훅
    ├── mainfail_css     스타일 + CSS 변수
    ├── gcode_viewer_js  G-code Viewer + LivePath v3.0 (TypedArray parser)
    ├── mainfail_cfg     기본 설정 번들
    ├── lang_en / lang_ko
    └── theme_default
```

### 부팅 순서

```
CSS inject (15%)
→ JS inject (30%)
→ GET /SD/cfg/theme.cfg (50%)
→ GET /SD/cfg/mainfail.cfg (70%)
→ machineInfo restore (80%)
→ extensions.cfg preload (95%)
→ ESP3D WebSocket connect
```

### 콘솔 파이프라인

```
ESP3D WebSocket
  → Monitor_output_Update [hooked]
      → mf_interceptLine (single parse pipe)
          ├─ EEPROM capture  → mf_parseEepromLine
          ├─ Mesh capture    → mf_parseMeshLine
          ├─ X:Y:Z position  → mf_parseM114
          ├─ SD progress     → mf_printStatusUpdate (M27 바이트 오프셋)
          ├─ Print complete  → mf_setState('idle') + SD flush queue
          └─ LivePath        → mf_livePathHandleLine
```

### G-code Viewer — 메모리 모델 (v3.0)

이전 빌드에서는 G-code move를 JS 객체 배열로 저장했습니다. move 하나당 약 64바이트, 600k moves 정도 되는 일반적인 2시간 출력이면 plan array만 36 MB가 됩니다.

v3.0에서는 TypedArray로 바꿨습니다.

```
Float32Array gcX, gcY, gcZ   ← coordinates
Uint8Array   gcFlags         ← bit 0: extruding
Uint16Array  gcLayer         ← layer index per vertex
```

move 하나당 64바이트 대신 11바이트. **약 5.8배 감소**입니다.

파싱은 4,000줄 단위로 `setTimeout(0)` 인터리빙해서 진행하므로 로딩 중에도 UI가 멈추지 않습니다. 완성된 plan은 offscreen canvas에 캐시되고, 매 프레임마다 다시 그려지는 건 live-path 포인트뿐입니다.

### G-code Viewer — 라이브 레이어 추적

초기에는 툴헤드 XY 위치를 G-code vertex에 최근접 매칭하는 방식을 시도했습니다. 퍼지 라인의 XY가 초기 레이어와 겹치다 보니 레이어가 1→2→2→30→46 식으로 튀는 문제가 발생했습니다.

현재는 **M27 SD 바이트 오프셋**을 추적 신호로 사용합니다.

```
splitIndex = Math.floor(gcProgress × gcCount)
```

`gcProgress`(`출력된 바이트 / 전체 바이트`)는 펌웨어에서 오는 단조증가 값으로 절대 뒤로 튀지 않습니다. `_plastZ = Infinity` 초기화(첫 번째 Z 이동에서 잘못된 레이어 증가 방지)와 함께 레이어 1부터 정확하게 추적됩니다.

### SD 쓰기 보호

출력 중 SD 카드에 쓰기 작업을 하면 SD 카드가 응답 불능 상태가 됩니다 — 물리적으로 뽑았다 다시 꽂아야 합니다.

Mainfail UX는 `mf_state === 'printing' || 'paused'` 상태에서 모든 SD 쓰기를 차단하거나 대기열에 넣습니다.

| 작업 | 동작 |
|------|------|
| 설정 파일 (`*.cfg`) | 대기열에 추가 → 출력 완료 후 자동 flush |
| 하이트맵 저장 / 삭제 | 차단 + 토스트 경고 |
| 매크로 저장 / 삭제 | 차단 + 토스트 경고 |

---

## 현재 한계

- **WiFi 복구**: STA 설정이 틀리면 ESP32가 WiFi에서 사라집니다. 복구는 시리얼로: `[ESP401]P=0 T=B V=2` → `[ESP444]RESTART`
- **ESP3D 버전**: ESP3D WebUI v2.1 기준으로 테스트됨. v3.x는 아키텍처가 달라서 그대로는 동작하지 않음
- **G2/G3 arcs**: G-code viewer에서 아직 지원하지 않음 (no-op 처리)
- **FAT 8.3 파일명**: 사용자가 입력하는 SD 파일명은 8자 기반 + 3자 확장자로 정규화됨 (대문자, 영숫자만)
- **대용량 파일**: 큰 파일도 로드할 수는 있지만, 20 MB를 넘기면 모바일 브라우저에서는 느릴 수 있음

---

## 비하인드

이 프로젝트는 비전공자가 **Claude AI와 vibe coding**으로 만든 프로젝트입니다.

아키텍처 설계, DOM 호환성 분석, 훅 주입, SD 모듈 설계, 버그 헌팅, 교차 검증까지 — 전부 AI와의 대화 속에서 진행됐습니다. 원본 ESP3D JS는 손댈 수 없는 블랙박스로 취급했고, 모든 기능은 그 한 줄도 건드리지 않는 방향으로 쌓아 올렸습니다.

버그는 있을 겁니다. 아직 안 밟은 엣지 케이스도 분명히 있을 거고요. 찾으면 이슈 열어주세요.

---

## 라이선스

GPL v3 — ESP3D-WEBUI의 라이선스를 따릅니다.

---

## 감사의 말

- [ESP3D](https://github.com/luc-github/ESP3D) / [ESP3D-WEBUI](https://github.com/luc-github/ESP3D-WEBUI) — luc-github
- [Mainsail](https://github.com/mainsail-crew/mainsail) — mainsail-crew
- 이름도 빌렸고, 디자인도 빌렸습니다. 죄송합니다.

---

*Mainfail UX는 [FEMTO 패밀리](https://gall.dcinside.com/mgallery/board/lists/?id=3dprinting)의 일부입니다 — DCinside 초저가 프린터 대회를 위해 만들어졌습니다.*  
*피코보다 싸고. 피코보다 작고. 그래도 돌아갑니다.*
