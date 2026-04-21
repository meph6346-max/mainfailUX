# Mainfail UX — Codex 인수인계

**작성일**: 2026-04-21  
**베이스 파일**: `codex_fixed3_index.html.gz` (284.1KB)  
**전 작업자**: Claude Sonnet 4.6

---

## 1. 이번 세션에서 작업한 내용

Codex가 업로드한 `index.html.gz`를 분석하고, 다음을 수행했다.

### 버그 수정

| # | 버그 | 수정 |
|---|---|---|
| 1 | `mf_getViewerMode` mf_js + gv_js 이중 정의 (gv_js 버전이 자기 자신을 재귀 호출) | gv_js 버전 제거 |
| 2 | `--mf-accent` CSS 변수 미정의 (HTML에서 사용하나 `:root`에 없음) | CSS에 추가 + `mf_themeApply`에서 primary와 동기화 |
| 3 | `mf_gvLoadFile`: 같은 파일 이미 로드됐어도 재로드 (SD 재접근) | `gcLoaded && gcFile === path` 체크 추가 |
| 4 | `mf_gvAutoLoadPrintFile`: gcLoaded 체크 없이 SD 재접근 | `gcLoaded && gcFile === fullPath` 체크 추가 |
| 5 | `files_print 훅`: viewerMode가 gcodeviewer일 때만 G코드 로드 → 다른 탭에서 프린트 시작하면 미로드 | viewerMode 조건 제거, 프린트 시작 시 무조건 선제 로드 |
| 6 | `mf_switchTab gcode`: 탭 재진입 시 SD에서 파일 목록 재조회 (프린트 중 접근 시도) | gcLoaded 체크 → 캐시 즉시 렌더, 프린트 중 목록 갱신 차단 |
| 7 | `mf_gvRefreshFileList`: 프린트 중 SD 접근 시도 | SD 접근 차단, 캐시 목록으로 대체 |

### 신규 구현: Live Vertex (gcPlan 위 현재 위치 추적)

**개념 재정의**:
- 라이브패스(직접 선 긋기) 제거 — M114 샘플링 간격이 성기므로 실제 패스 표현 불가
- **Live Vertex**: M114 XYZ를 gcPlan 버텍스에 매칭 → 완료 구간 색상 변경

**구현 방식**:

```
파싱 시: mf_gvPushMove() → gcLayerMap[] 생성
  gcLayerMap = [{layerIdx, z, start, end}, ...]
  각 레이어의 gcPlan 버텍스 구간을 인덱스로 기록

렌더 시: mf_livePathFindSplit(pos)
  Step 1: pos.z → gcLayerMap 이진탐색 O(log L)
           → 해당 레이어 ±1 인접 레이어 후보
  Step 2: 후보 레이어 구간 내 XY nearest 탐색
           → extruding 버텍스만 대상
  안전장치: 15mm(225=15²) 초과 거리면 이전값 유지

렌더링:
  A. gcPlan 전체 → 회색 (오프스크린 캐시, 레이어/사이즈 변경 시만 갱신)
  B. splitIndex까지 → 레이어별 컬러 덮어쓰기 (완료 구간)
  C. 현재 pos → 빨간 점만 (선 없음)
  D. gcPlan 매칭 버텍스 → 주황 원 강조
```

---

## 2. G코드 뷰어 현재 아키텍처

### 모드 시스템

| 모드 | 진입 함수 | 동작 |
|---|---|---|
| `gcodeviewer` | `mf_openGcodeViewer()` | LivePath 자동 시작 + gcPlan 자동 로드 |
| `preview` | `mf_openGcodePreview(path)` | 파일 선택 로드만, LivePath 없음 |

`mf_openLivePath()`는 `gcodeviewer`와 동일 동작 — 정리 필요 (TODO)

### gcPlan 선제 로드 흐름

```
파일 탭에서 프린트 시작
  → files_print 훅 (패턴2)
      → 즉시 mf_gvLoadFile(fname)  ← viewerMode 무관
         → SD에서 G코드 다운로드 (스트리밍 XHR)
         → mf_gvParseChunk() 청크 비동기 파싱
         → Float32Array gcX/Y/Z 저장
         → gcLayerMap[] 생성
         → mf_livePath.gcLoaded = true
      → gcode 탭에 있을 때만 mf_livePathStart()

이후 탭 이동 → 다시 gcode 탭
  → gcLoaded && gcCount > 0 → 캐시 즉시 렌더
  → SD 재접근 없음
```

### gcPlan 자료구조 (Float32Array)

```javascript
mf_livePath.gcX      // Float32Array: x 좌표
mf_livePath.gcY      // Float32Array: y 좌표
mf_livePath.gcZ      // Float32Array: z 좌표
mf_livePath.gcFlags  // Uint8Array:   bit0 = extruding
mf_livePath.gcLayer  // Uint16Array:  레이어 인덱스
mf_livePath.gcCount  // 실제 저장된 버텍스 수
mf_livePath.gcLayerMap  // [{layerIdx, z, start, end}]

// 탐색 상태
mf_livePath.splitIndex  // 현재 매칭된 gcPlan 인덱스
```

메모리: 객체배열 대비 5.8배 절감 (11b/move vs 64b/move)

---

## 3. 파일 캐시 시스템

```javascript
// mf_js 전역
var mf_fileListCache = {
  gvOptions: [],    // G코드 뷰어 파일 셀렉트 옵션 캐시
  filesHtml: '',    // 파일 탭 목록 HTML 캐시
  updatedAt: 0
}
```

- 프린트 중 `files_fileList` DOM이 갱신되면 `mf_cacheFilesListHtml()` 자동 저장
- 프린트 중 파일 탭 진입 → `mf_updateFilesListBanner()` → 캐시 표시
- 프린트 중 gcode 탭 파일 목록 → `mf_gvApplyCachedOptions()`

---

## 4. 현재 코드 스냅샷

```
mf_js:  181,173b / 233개 함수
gv_js:   32,784b /  43개 함수
mf_css:  34,120b / CSS 변수 25개 (--mf-accent 추가됨)
gz:     290,955b (284.1KB)
```

### 30라운드 버그 테스트 결과

```
문법 4종:          OK
중복 함수:         OK (0개)
중복 HTML ID:     OK (0개)
div 밸런스:        OK (834/834)
Settings 서브탭:   OK (advanced -1은 측정 오탐, 단독 파서 11/11)
onclick 미정의:    OK (getElementById/reload/stopPropagation은 DOM/JS 내장)
CSS 변수 미정의:   OK (--mf-accent 수정 완료)
gcPlan 로직 7종:   OK
WiFi 로직 3종:     OK
SD/썸네일 2종:     OK
```

### mf_js 함수 전체 (233개)

```
mf_addCustomCard, mf_addEditControls, mf_applyLayout, mf_applyLayoutFromStorage,
mf_applyTheme, mf_applyViewerMenuVisibility, mf_applyViewerModeUI,
mf_buildEepromUI, mf_buildMacrosFromConfig, mf_cacheFilesListHtml,
mf_cacheRead, mf_cacheWrite, mf_cardEditorClose, mf_cardEditorInsert,
mf_cardEditorOpen, mf_cardEditorPreview, mf_cardEditorSave, mf_closeSidebar,
mf_configBackup, mf_configReset, mf_configRestore, mf_consoleAppend,
mf_consoleClear, mf_consoleFullKeyDown, mf_consoleFullSend, mf_consoleKeyUp,
mf_consoleSend, mf_cooldownAll, mf_createMacrosFolder, mf_debugSetEnabled,
mf_debugTogglePanel, mf_deleteCustomCard, mf_deleteMacroFromSD,
mf_eepromChanged, mf_enhanceFilesListPreviewButtons, mf_escapeHtml,
mf_extAdd, mf_extLoad, mf_extOnTabEnter, mf_extRemove, mf_extRenderList,
mf_extRenderNav, mf_extRenderPage, mf_extSave, mf_fanOff, mf_fanSliderCommit,
mf_fanSliderInput, mf_feedReset, mf_feedSliderCommit, mf_feedSliderInput,
mf_fetchThumbnail, mf_filesListLooksEmpty, mf_files_delete_failed,
mf_files_delete_success, mf_flowReset, mf_flowSliderCommit, mf_flowSliderInput,
mf_fmtDuration, mf_forceShellLayout, mf_getViewerMode, mf_gvApplyCachedOptions,
mf_gvCacheOptions, mf_gvOnFileSelect, mf_gvRefreshFileList,
mf_handleConsoleLine, mf_hdrUpdatePrint, mf_hdrUpdateTemp, mf_hexToRgb,
mf_histCancelPrint, mf_histClear, mf_histDeleteEntry, mf_histDuration,
mf_histFmt, mf_histLoad, mf_histLoadLocal, mf_histSaveSD, mf_histSetProgress,
mf_histShortName, mf_histUpdateBanner, mf_initDragDrop, mf_initTempCardIfNeeded,
mf_initTempChart, mf_interceptLine, mf_isPrintActive, mf_jogAxis,
mf_loadMacroList, mf_logPrintEnd, mf_logPrintStart, mf_macroAddNew,
mf_macroDeleteConfirm, mf_macroEditClose, mf_macroEditOpen, mf_macroEditSave,
mf_macroMoveDown, mf_macroMoveUp, mf_macroSaveCfg, mf_macroSendNext,
mf_macroSettingsOpen, mf_macroToggleVisible, mf_meshApplyProfile,
mf_meshLoadProfile, mf_meshSaveProfile, mf_meshSendNext, mf_moveToPosition,
mf_onDragEnd, mf_onDragOver, mf_onDragStart, mf_onDrop, mf_openGcodePreview,
mf_openGcodeViewer, mf_openLivePath, mf_openNewCardEditor, mf_openSidebar,
mf_parseBuildVolumeLine, mf_parseEepromLine, mf_parseM105, mf_parseM114,
mf_parseMeshLine, mf_parseThumbnail, mf_preloadThumbnail, mf_previewFileFromList,
mf_printCancel, mf_printPause, mf_printRequestStatus, mf_printResume,
mf_printStartPoll, mf_printStatusUpdate, mf_printStopPoll, mf_pscUpdateTemps,
mf_recoverPageStructure, mf_registerSensor, mf_removeEditControls,
mf_renderEeprom, mf_renderMacroButtons, mf_renderMacroSettings, mf_renderMesh,
mf_renderSensorRow, mf_renderViewerMenuSettings, mf_restoreCachedFilesList,
mf_runMacro, mf_saveConfig, mf_saveLayout, mf_saveMacroToSD, mf_saveTheme,
mf_sdFlushQueue, mf_sdLoadLayout, mf_sdRead, mf_sdSaveCard, mf_sdSaveLayout,
mf_sdWrite, mf_sdWriteDirect, mf_sendEepromLine, mf_sensorGetConfig,
mf_setListBadge, mf_setState, mf_setViewerMode, mf_settingPreviewName,
mf_settingSavePrinterName, mf_settingsLoadPrinterTab, mf_setupHooks,
mf_showAddCardDialog, mf_showOriginalTab, mf_showToast, mf_siLoadAll,
mf_siParseM119, mf_siParseM503, mf_siQueryM119, mf_siQueryM503,
mf_siRenderEndstops, mf_siRenderSensors, mf_siRestoreMachineInfo,
mf_siSaveMachineInfo, mf_siUpdateEndstopRange, mf_startEepromCapture,
mf_startMeshCapture, mf_startPolling, mf_startPositionPoll, mf_stopPolling,
mf_switchSettingsTab, mf_switchTab, mf_sysDom, mf_sysParseESP420,
mf_sysParseM115, mf_sysQueryInfo, mf_sysRefresh, mf_sysRender, mf_sysRestart,
mf_sysSetConnected, mf_sysSetIP, mf_sysStartUptimeClock, mf_sysUpdateFW,
mf_sysUpdateHeap, mf_tempSet, mf_thBindDistanceButtons, mf_thFeedChange,
mf_thGetDistance, mf_themeApply, mf_themeApplyPreset, mf_themeLayoutPreview,
mf_themeLoadSaved, mf_themePreview, mf_themeReset, mf_themeSave,
mf_themeToggleCompact, mf_toggleCard, mf_toggleEditMode, mf_toggleEepromSection,
mf_toggleGcodeViewerMenu, mf_updateBuildVolumeDisplay, mf_updateFilesListBanner,
mf_updateHistoryUI, mf_updatePositionDisplay, mf_updatePrintStatusCard,
mf_updateSensor, mf_updateStatusBadge, mf_updateToolheadUI,
mf_wifiApplyCurrentToForm, mf_wifiBannerDismiss, mf_wifiInit,
mf_wifiLoadCurrent, mf_wifiParseCurrentSettings, mf_wifiParseScanResult,
mf_wifiPollAfterRestart, mf_wifiReadFromConfigList, mf_wifiRestart, mf_wifiSave,
mf_wifiScan, mf_wifiSelectSSID, mf_wifiSetMode, mf_wifiShowFallbackBanner,
mf_zOffsetAdjust, mf_zOffsetClear, mf_zOffsetSave
```

### gv_js 함수 전체 (43개)

```
mf_gvAutoLoadPrintFile, mf_gvClearPreview, mf_gvEnsureCapacity,
mf_gvGetSdBase, mf_gvInvalidateCache, mf_gvLoadFile, mf_gvLoadFromConsole,
mf_gvLoadSelectedFile, mf_gvNormalizePath, mf_gvParse, mf_gvParseChunk,
mf_gvParseText, mf_gvPushMove, mf_gvReset, mf_gvResetPlan, mf_gvSelectFile,
mf_gvSetLayer, mf_gvToBrowserPath, mf_livePathAddPoint, mf_livePathBindCanvas,
mf_livePathClearTrace, mf_livePathFindSplit, mf_livePathFormatAge,
mf_livePathFormatDuration, mf_livePathHandleLine, mf_livePathInit,
mf_livePathMarkDirty, mf_livePathParseFileLine, mf_livePathParsePosition,
mf_livePathParseSD, mf_livePathPause, mf_livePathRender, mf_livePathReset,
mf_livePathSend, mf_livePathSetFile, mf_livePathSetState, mf_livePathStart,
mf_livePathStop, mf_livePathToggleTravel, mf_livePathUpdateUI,
mf_lpClass, mf_lpEl, mf_lpText
```

---

## 5. 핵심 원칙 (반드시 유지)

1. **`script[9]` (ESP3D 원본 JS 601KB) 절대 수정 불가**
2. **함수 추가 시 기존 정의 먼저 확인** — 중복 정의 즉시 버그로 이어짐
3. **`mf_interceptLine` 단일 파이프** — 콘솔 파싱은 이 함수만 통과
4. **SD 경로**: `/sd/cfg/` — localStorage 아님
5. **프린트 중 SD 접근 금지** — `mf_isPrintActive()` 체크 후 차단
6. **`SendGetHttp` / `SendFileHttp` 큐 사용** — 직접 XHR 금지 (`http_communication_locked` 우회됨)
7. **Override 체인 금지** — `var _orig = fn; fn = wrapper` 누적 금지, 직접 교체

---

## 6. 빌드 & 검증

```python
import base64, gzip, json, re, subprocess
from collections import Counter

with open('codex_fixed3_index.html') as f: html = f.read()
m = re.search(r'(<script id="mf-standard-assets"[^>]*>)(.*?)(</script>)', html, re.DOTALL)
tag_open, old_json, tag_close = m.group(1), m.group(2), m.group(3)
assets = json.loads(old_json)

# 디코딩
mf_js  = base64.b64decode(assets['mainfail_js']).decode('utf-8')
gv_js  = base64.b64decode(assets['gcode_viewer_js']).decode('utf-8')
mf_css = base64.b64decode(assets['mainfail_css']).decode('utf-8')

# ... 수정 ...

# 인코딩
assets['mainfail_js']     = base64.b64encode(mf_js.encode()).decode()
assets['gcode_viewer_js'] = base64.b64encode(gv_js.encode()).decode()
assets['mainfail_css']    = base64.b64encode(mf_css.encode()).decode()

# 빌드
new_json = json.dumps(assets, ensure_ascii=False, separators=(',',':'))
html_new = html.replace(m.group(0), tag_open + new_json + tag_close, 1)

# 필수 검증 4종
for name, code in [('mf_js', mf_js), ('gv_js', gv_js)]:
    r = subprocess.run(['node', '--check', ...], capture_output=True)
    assert r.returncode == 0

dups_fn = {k:v for k,v in Counter(re.findall(r'function\s+(mf_\w+)\s*\(', mf_js+gv_js)).items() if v>1}
assert not dups_fn

dup_ids = {k:v for k,v in Counter(re.findall(r'\bid=["\']([^"\']+)["\']', html_new)).items()
           if v>1 and not k.startswith('setting_')}
assert not dup_ids

# gz
with open('output.html.gz', 'wb') as f:
    f.write(gzip.compress(html_new.encode('utf-8'), compresslevel=9))
```

---

## 7. TODO / 미완성

| 항목 | 상태 | 설명 |
|---|---|---|
| `mf_openLivePath` | 정리 필요 | `mf_openGcodeViewer`와 동일 동작, 존재 이유 없음 |
| `mf_renderViewerMenuSettings` | stub | `function mf_renderViewerMenuSettings() { return; }` |
| `mf_toggleGcodeViewerMenu` | stub | `function mf_toggleGcodeViewerMenu(on) { return; }` |
| 언어팩 | 미구현 | 프레임워크만 있음 |
| G2/G3 원호 | 미지원 | gv_js 파서에서 미처리 |
| Menu Order | stub | Settings 탭만 있음 |
| `points[]` 배열 | 레거시 | 렌더링에서 미사용, splitIndex 방식으로 전환됨. 레이어 감지용으로만 유지 중 |

---

## 8. Live Vertex 알고리즘 상세

### mf_livePathFindSplit(pos)

```javascript
// 입력: pos = {x, y, z}  (M114 실시간 수신)
// 출력: gcPlan 인덱스 (0 ~ gcCount-1)

Step 1: gcLayerMap 이진탐색
  lo=0, hi=lm.length-1
  while(lo<=hi) { mid=(lo+hi)>>1; if(lm[mid].z <= pz) best=mid,lo=mid+1; else hi=mid-1; }
  candidates = [best, best-1, best+1]  // 인접 레이어 포함

Step 2: 후보 레이어 구간 XY nearest
  for each candidate layer:
    for i in [entry.start .. entry.end):
      if extruding: d = (gcX[i]-px)² + (gcY[i]-py)²
      if d < bestDist: bestDist=d, bestIdx=i

안전장치: bestDist > 225 (15mm²) → 이전 splitIndex 유지
```

### gcLayerMap 생성 (mf_gvPushMove)

```javascript
// 레이어 변화 감지 → gcLayerMap 업데이트
if (lmLen === 0 || lm[lmLen-1].layerIdx !== layer) {
  if (lmLen > 0) lm[lmLen-1].end = n;      // 이전 레이어 end 확정
  lm.push({layerIdx: layer, z: z, start: n, end: -1});  // 새 레이어
}
// 파싱 완료(onload) 시: lm[last].end = gcCount
```

### 렌더링 레이어 캐시 전략

```
오프스크린 캔버스 (mf_gvLayerCache):
  - 미완료 회색 gcPlan 전체를 한 번 그려서 저장
  - cacheKey = W + H + viewMax + gcCount + gcPlanLayerCount
  - splitIndex 변해도 캐시 유효 (완료 구간 컬러는 매 프레임 위에 덮어씀)
  - 파일 새 로드 / 레이어 변경 / resize → mf_gvInvalidateCache() 호출
```

---

*작성: Claude Sonnet 4.6 / 2026-04-21*
