# 법원 매각결과 검증 — 소규모 단계 확대 계획

기준일: 2026-11-10 (Asia/Seoul). 기준 데이터: `data/capital-court-pilot.json` (2026-11-09T19:35:41.112Z 수집), 검증완료 부분수집 805건. **법원 공식 결과를 아직 검증하지 못했으므로 이 문서는 조회 계획이지 결과 확정이 아님.**

## 1. 검증 대상과 현재 상태

2026-11-10 매각기일로 *수집본에 기록된* 물건 95건: 서울 30 / 경기 46 / 인천 19. 각 1건의 매각기일은 법원 현재 정보와 다를 수 있음. 수집본은 전체 법원 경매물건을 포함하지 않음.

현재 유일하게 예약된 자동 점검 대상은 `court-B000210|2025타경953|1`, 스냅샷 매각기일 `2026-11-10`. 결과 확인 예약은 2026-11-11 09:30 KST, GitHub Actions 스케줄 지연·누락 가능. 실서버 조회 성공/법적 상태 확인 **미확인**.

## 2. 단계별 확대 (수동 승인 없는 새 요청 금지)

| 단계 | 조회 대상 | 다음 단계 진행 조건 |
|---|---|---|
| 0: 기존 예약 | 서울 B000210의 2025타경953 물건 1번 **1건** | `probeExecutionSucceeded=true`, `schedulePreflightConfirmed=true`, `identityMatched=true`, `detailCrossChecked=true`, `rawResultCodeMatched=true`, `scheduleDayMatched=true`가 모두 참 |
| 1: 지역별 대표 점검 | 서울에서 통과한 1건 + 경기 B000214 표본 1건 + 인천 B000240 표본 1건, 최대 **총 3건** | 각 법원 코드, 사건·물건번호, 그 기일의 원시 결과코드가 공식 목록과 상세 사이 일치. 실패 시 확대하지 않음 |
| 2: 제한 표본 | 각 지역에서 다른 사건번호 2건씩, **추가 6건 이하** | 성공률만으로 법적 의미 해석 금지. 일치/불일치 및 원시코드·출처만 비교 |
| 3: 확대 검토 | 별도 승인된 제한 범위만 진행 | 법원 공식 코드 의미의 신뢰할 수 있는 근거, 요청량 정책, 오류/누락/기일변경 처리 기준 확인 후 결정 |

1단계에서 검토할 **후보**는 경기 `court-B000214|2024타경2190|2`, 인천 `court-B000240|2023타경518123|1`이다. 둘 다 2026-11-10 기일로 수집본에 존재하지만, 현재 기일/결과는 별도로 재확인해야 한다. 이 후보들을 조회하는 워크플로우는 **아직 생성·활성화하지 않는다.**

## 2-1. 확대 판단 자동 차단기 (추가 조회 없음)

`scripts/check-court-rollout-gate.cjs`는 `data/court-sale-result-status.json`을 **읽기만** 하여 단계 1의 지역별 진단 확대를 *검토할 자격*을 판정한다. 법원 서버를 호출하거나 추가 사건을 자동 조회하지 않는다.

- 진단 시각이 2026-11-11 00:30 UTC(09:30 KST) 이후이고, 검사 시점보다 미래가 아니며 7일 이내여야 한다.
- `probeExecutionSucceeded`, `schedulePreflightConfirmed`, `identityMatched`, `detailCrossChecked`, `rawResultCodeMatched`, `scheduleDayMatched`가 모두 `true`, `observed=true`, `exactDisplayLotRows=1`, `detailCrossCheckReason=raw_code_cross_checked`여야 한다.
- `legalStatusVerified=false`, `rawResponseSaved=false` 유지. 결과가 완벽하게 일치하더라도 지역별 진단을 **자동으로 실행하지 않음**(`allowedNewRequests:0`).
- 본문에 GitHub Actions의 실제 `schedule` 이벤트 여부가 저장되어 있지 않으므로 **이 검사만으로 예약 실행 사실을 증명할 수 없다.** 담당자가 Actions의 실행일·이벤트와 기록을 별도로 대조해야 한다.
- 오프라인 단위 테스트 `tests/court-rollout-gate.cjs`: 정상 검토 후보 1개 및 누락/과거/부분 성공 등 거부 사례 16개 통과.

## 3. 중단 및 판정 금지 조건

- GitHub Actions 예약 미실행, 네트워크 오류, HTTP/JSON 실패, 법원 IP 차단, 비정상 응답, 기일 변경·중복·누락, 사건번호/물건번호/내부번호 불일치, 결과검색 0건 → **미확인**. 0건=매각/취하/유찰 아님.
- 원시코드가 일치하더라도 법원 공식 화면이나 제공 문서에서 해당 코드의 법적 의미가 검증되기 전까지 `legalStatusVerified=false` 유지. 결과를 기존 805건 전체로 확대 해석하지 않음.
- 사적인 사용자의 관심·노트·등록 사건은 저장소에 올리지 않음. 법원 응답 본문/개인정보/입찰관련 원문은 검사 보고서에 보관하지 않음.
- 법원 요청은 조회 전용, 제한된 호출 수·독립 타임아웃, 불필요한 반복 호출 금지. 법원 접근제한이나 이용정책을 우회하지 않음.

## 4. 내일 확인할 파일

`data/court-sale-result-status.json` — **예약 시각 이후**의 `attemptedAt`, `reason`, `probeExecutionSucceeded`, `schedulePreflightConfirmed`, `identityMatched`, `detailCrossChecked`, `rawResultCodeMatched`, `scheduleDayMatched`, `legalStatusVerified`.

`.github/workflows/court-sale-result-search.yml` 및 GitHub Actions 실제 실행 기록 — 예약이 실제로 실행됐는지, 과정이 실패했는지 확인. 기존 보고서가 2026-11-10에 생성된 경우에는 **내일 조회 성공의 증거가 아님**.

앱 v0.7.6, 기존 805건 수집 목록, UI/개인자료는 불변.

## 2026-11-10 예약 실행 출처 검증 보강
- 결과조회 워크플로우가 보고서에 `triggerEvent`를 기록하도록 변경. GitHub Actions 이벤트 중 `schedule`, `workflow_dispatch`, `push`를 구분하며 그 외 값은 `unknown`으로 저장.
- 확대 판단 안전장치는 `triggerEvent='schedule'`인 보고서만 승인 검토. 날짜만 맞는 수동 실행·코드 push 실행·이벤트 누락은 `scheduled_run_not_confirmed`로 거부. 예약 실행 여부를 보고서만으로 믿지 않고 GitHub Actions 로그와 대조할 수 있도록 함.
- 기존 17개 사례에 push·수동·이벤트 누락 3개를 더해 총 20개 거부 사례 검사 통과. 한 번에 추가 조회를 승인하지 않는 정책(`allowedNewRequests:0`)은 유지. 법원의 공식 결과 및 공개 사이트 배포는 아직 직접 확인하지 못함.
