# 법원경매 용도 분류코드 검증 기록 (2026-11-09)

## 원칙
- **법원 사이트 용도 대분류 → 중분류 → 소분류**를 앱의 기준 분류로 사용한다.
- 법원 자료에서 확인되지 않은 분류는 앱의 임의 코드로 생성하지 않는다.
- 기존 앱에 존재하지 않는 항목을 **'기타'로 자동 치환하지 않는다.**
- 법원이 반환한 원문 이름과 코드가 있다면 보존하며, 법원 검색용 코드와 앱 UI 표시명을 구별한다.
- 분류 체계가 바뀌더라도 기존 사용자 등록 사건은 자동 재분류/삭제하지 않는다.

## 실제 소스 확인
2026-05-08 PGJ151F00 초기 요청 `POST /pgj/pgj002/selectLclLst.on`, `{dsignUsgDvsCd:""}`의 공개 캡처 자료.

출처: https://github.com/NomaDamas/k-skill/blob/main/packages/court-auction-notice-search/test/fixtures/lcl-codes-raw.json

| 대분류 코드 | 원문 이름 |
|---|---|
| 10000 | 토지 |
| 20000 | 건물 |
| 30000 | 차량및운송장비 |
| 40000 | 기타 |

공개 샘플 데이터에서 확인된 **일부** 중·소분류 코드:
- `20000 → 21100 단독주택 → 21101 단독주택(소분류)`
- `20000 → 21200 공동주택 → 21201 아파트`

출처: https://github.com/NomaDamas/k-skill/blob/main/packages/court-auction-notice-search/src/codetables/usage-codes.json

**주의:** 위 하위 코드 4개는 공개 개발 사례의 *샘플/부분 표*이며 공식 전체 코드표가 아니다. 실제 법원 중·소분류 전체 목록을 아직 검증하지 못했다.

## 이번 검증 작업
- `.github/workflows/court-usage-audit.yml`에 법원 대분류 단일 조회 프로브 추가.
- GitHub Actions에서 실행 후 코드·명칭의 일치를 검사하고, 기존 코드 이외의 추가 대분류를 검출하도록 설계.
- 직접 배포 중인 Cloudflare Worker, GitHub Pages PWA의 v0.5.8과 로컬 데이터는 **미변경**.
- 다음 검증은 법원의 계층형 선택 UI가 실제 사용하는 중·소분류 목록 조회 경로를 포착한 다음 수행한다. 엔드포인트를 추측해 대량 호출하지 않는다.

## 미완료
- 현재 운영 법원 사이트의 중분류·소분류 전체 코드표
- 각 대분류의 실제 자식 분류/부모관계 원문 응답 검증
- Cloudflare Worker 원문 분류 반환 기능 운영 배포
- iPhone 3단계 선택 화면 전체 회귀 검증

## 2026-11-09 후속 조사: 중·소분류 조회 경로 발견
공개 프로젝트 `Jaemnani/auction`의 `docs/api_recon.md`에 다음 조회 경로가 기록됨.
- 대분류: `POST /pgj/pgj002/selectLclLst.on`
- 중분류: `POST /pgj/pgj002/selectMclLst.on`, 상위코드 인자 `lclDspslGdsLstUsgCd`
- 소분류: `POST /pgj/pgj002/selectSclLst.on`, 상위코드 인자 `mclDspslGdsLstUsgCd`

원문: https://github.com/Jaemnani/auction/blob/main/docs/api_recon.md

GitHub `backend/court-worker.js`에 `GET /taxonomy?level=large|medium|small&parentCode=...` 소스 추가. 부모 코드 없는 중·소분류 요청은 거부하며 법원 원본의 5자리 코드와 이름만 반환. 분류를 만들어내지 않고, 알 수 없는 응답 구조는 오류 처리한다.

`.github/workflows/court-usage-audit.yml`에 중분류 `20000`, 소분류 `21200` 검증 요청을 각각 1회 추가함. **현재 실제 실행 결과 및 정확한 응답 키는 아직 미확인.** 이 코드도 아직 Cloudflare에 배포하지 않았으며 GitHub Pages 앱 화면 v0.5.8은 변경하지 않았다.

조회가 성공하면 실제 응답 키에 맞춰 Worker를 보완한 뒤, 앱의 중·소분류 선택을 원격 연동한다. 다수 조회로 차단을 유도하거나 접근 제한을 우회하지 않는다.

## 2026-11-09 실행 결과 (확인됨)
- GitHub Actions 실행 [42600690180](https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42600690180): `completed/success`, **하지만 부분 검증에 결함 발견**.
- 대분류 조회 HTTP 200, `usgLclLst` 4개 반환, 기존 4개 코드와 일치.
- 건물 `20000`의 중분류 `selectMclLst.on`: HTTP 200 / API 200, 응답 키 `usgMclLst`, 실제 항목 0개.
- 공동주택 `21200`의 소분류 `selectSclLst.on`: HTTP 200 / API 200, 응답 키 `usgSclLst`, 실제 항목 0개.
- 비어 있는 배열이므로 현재 요청으로는 분류표를 수집할 수 없음. `completed/success`는 **정상 수집 성공을 의미하지 않는다**.
- 검사 기준을 `0개 → 실패`로 수정했으며, Worker 역시 중·소분류가 0개이면 오류 반환하도록 변경. 응답 조건을 확인할 때까지 앱 v0.5.8에 미연결.

## 2026-11-09 추가 검증: 중·소분류 빈 목록 원인 범위 축소
- 검증 실행 [42601334650](https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42601334650): 건물 중분류 및 공동주택 소분류 HTTP 200 / API 200. `message="중분류 목록 조회가 완료되었습니다."`, `usgMclLst=[]`, `usgSclLst=[]`. `ipcheck` 키는 반환되지 않음.
- 실험 실행 [42601424519](https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42601424519): 기존 상위 분류 필드 이외에 대분류 조회에서 사용한 `dsignUsgDvsCd:""`를 함께 보내도 두 계층 모두 결과 0개.
- 따라서 확인한 두 요청 모양으로는 하위 코드표 전체 수집 불가. 해당 엔드포인트 존재 및 성공 메시지만으로 항목 조회 성공이라고 판단하지 않음.
- 다음: 실제 법원 WebSquare UI에서 중·소분류를 선택하는 **정확한 요청 본문과 요청 헤더 및 응답 샘플**을 얻은 후 1회 재검증. 더 많은 페이로드 추측 호출을 하지 않는다.
- 기존 v0.5.8 앱 및 운영 Cloudflare Worker는 변경되지 않았음. GitHub Worker `/taxonomy` 소스는 아직 운영 배포 전이며 배열이 비면 오류를 반환하도록 유지.

## 2026-11-09 최종 해결: 실제 요청 본문 확인 및 전체 계층 수집
- 법원 `/pgj/cm/js/pgj.js`의 `getUsgMclLst(usgLslCd)`와 `getUsgSclLst(usgMclCd)`는 둘 다 요청 JSON을 `{code:상위코드}`로 생성함을 실제 라이브 스크립트에서 확인.
- 이전 시도에서 `lclDspslGdsLstUsgCd`, `mclDspslGdsLstUsgCd`를 요청 키로 사용한 것은 잘못됐음.
- 라이브 검증 [42601860508](https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42601860508), [42601956149](https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42601956149), [42602041767](https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42602041767).
- 실서버 반환 항목: 대 4개, 중 12개, 소 82개 = 총 **98개**. 각 상위코드의 모든 자식 분류 목록을 순회 조회한 2026-11-09 스냅샷.
- 정확한 원본 코드·이름·부모 관계는 저장소 `court-usage-codes.json`에 보존. 앱 UI는 이 스냅샷을 기반으로 동작.
- 과거 `21100 단독주택`, `21200 공동주택`, `21201 아파트` 같은 샘플 코드 정보는 운영 법원 응답과 불일치, 폐기. 올바른 코드: `21100 상업용및업무용`, `20100 주거용건물`, `20104 아파트`.
- 미완료: 운영 Cloudflare Worker 새 버전 배포 및 실제 3단계 UI 아이폰 검증. 분류표 변경 가능성은 추후 주기적 점검.
