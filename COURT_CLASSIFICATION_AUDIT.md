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
