# mainfailUX — Claude Agent Notes

## SD 카드 경로 기준 (반드시 지킬 것)

ESP3D v2.1.x Marlin Direct SD 환경에서 `/upload` 엔드포인트에 파일을 쓰거나
읽을 때 실제 SD 파일시스템 경로를 사용해야 한다. `primary_sd` (보통 `/sd/`)는
ESP3D 웹UI 내부의 virtual path prefix일 뿐이며, 업로드/생성에 쓰면
`ERROR: File creation failed code:2` (ENOENT) + HTTP 500이 발생한다.

### 실제 경로 체계

- **SD 루트**: `/`
- **Mainfail 설정 루트**: `/cfg/`
  - `/cfg/mainfail.cfg` — 전역 설정
  - `/cfg/theme.cfg`    — 테마
  - `/cfg/layout.cfg`   — 대시보드 레이아웃
  - `/cfg/history.cfg`  — G-code 히스토리
  - `/cfg/extensions.cfg` — 익스텐션 목록
  - `/cfg/nav_order.cfg`  — 사이드바 순서
  - `/cfg/card_<id>.cfg`  — 커스텀 카드 HTML
- **하이트맵**: `/cfg/height/*.json`
- **매크로**: `/macros/*.gco`
- **G-code 파일**: `/*.gcode`, `/models/*.gcode` 등 SD 루트 또는 하위 폴더
- **파일 리스트/업로드 path 파라미터**: `/upload?path=/cfg/&action=list` 처럼
  실제 경로(`/`부터 시작) 사용

### 사용 금지 패턴

```js
// ❌ 틀림 — /sd/ 접두어 붙이면 ENOENT
var path = primary_sd + 'cfg/';            // "/sd/cfg/"
fd.append('path', primary_sd + 'macros/'); // "/sd/macros/"

// ❌ 기본값도 /sd/ 쓰지 말 것
var sdBase = primary_sd || '/sd/';
```

### 올바른 패턴

```js
// ✅ SD 루트 '/' 기준 고정 경로
function mf_getCfgPath()    { return '/cfg/'; }
function mf_getHeightPath() { return '/cfg/height/'; }

// ✅ upload FormData
var fullpath = '/cfg/' + filename;
fd.append('path', '/cfg/');
fd.append(fullpath + 'S', String(blob.size));
fd.append('myfile[]', file, fullpath);

// ✅ createdir
'/upload?path=' + encodeURIComponent('/') + '&action=createdir&filename=cfg'
```

### 신규 디렉토리 사용 시

처음 사용하는 폴더(`/cfg/`, `/macros/` 등)는 ESP3D가 인식하도록
`mf_ensureCfgFolder()` 같은 idempotent createdir을 부팅 시 호출해둔다.
이미 존재해도 createdir은 안전하다 (에러 콜백 와도 무시).

### SD 파일 읽기 (GET 다운로드) — 중요

업로드 경로와 다운로드 URL은 **다른 규칙**을 쓴다.

- **업로드** (`/upload` POST): 실제 SD 경로 (`/cfg/`, `/macros/`)
- **다운로드** (파일 GET): ESP3D의 `/SD/` alias endpoint 사용

파일 브라우저 코드 참고: `"/SD/" + files_currentPath + filename`

```js
// ✅ 올바른 다운로드 URL
'/SD/cfg/layout.cfg'
'/SD/macros/start.gco'
'/SD/cfg/height/bed1.json'

// ❌ 틀림 — 직접 GET은 ESP3D 라우팅에 안 맞아 404/HTML 반환
'/cfg/layout.cfg'
```

헬퍼: `mf_sdReadUrl(path)` — 실제 SD 경로 앞에 `/SD` 붙이고 `/` 중복 정규화.

### 디버깅 참고

- `CancelCurrentUpload`는 `xmlhttpupload` 전역에 의존 — raw XHR로 업로드하면
  `xmlhttpupload`가 미설정이라 WebSocket ERROR 수신 시 `abort()` 호출이
  throw한다. `mf_setupHooks()`에 safe wrapper를 걸어둬서 크래시 방지함.
- ESP3D는 업로드 실패 시 HTTP 500 응답 + WebSocket `ERROR:...code:N`을
  동시에 보낸다. `SendFileHttp` 사용 시 `CancelCurrentUpload`가 먼저 abort해서
  status=0이 오고, raw XHR 사용 시 실제 500 + 응답 본문을 볼 수 있다.

---

## 빌드 / 재인코딩

```bash
# mainfail_js (메인 JS) 재인코딩
python3 -c "
import base64, re
js = open('/tmp/mf_main_js.js','rb').read()
b64 = base64.b64encode(js).decode()
html = open('/home/user/mainfailUX/SPIFFS/index.html','r').read()
html2 = re.sub(r'(\"mainfail_js\":\s*\")[^\"]+\"', lambda m: m.group(1)+b64+'\"', html)
open('/home/user/mainfailUX/SPIFFS/index.html','w').write(html2)
"

# gcode_viewer_js 재인코딩
python3 -c "
import base64, re
js = open('/tmp/mf_gcode_viewer.js','rb').read()
b64 = base64.b64encode(js).decode()
html = open('/home/user/mainfailUX/SPIFFS/index.html','r').read()
html2 = re.sub(r'(\"gcode_viewer_js\":\s*\")[^\"]+\"', lambda m: m.group(1)+b64+'\"', html)
open('/home/user/mainfailUX/SPIFFS/index.html','w').write(html2)
"

# gzip 빌드
node tools/build-webui.js
```

## 브랜치 정책

- 직접 `main`에 커밋 & 푸시 (사용자 지시)
- PR 생성 정책 비활성 상태

## 사용자 언어

한국어로 응답
