# 부동산 경매 PWA — 다음 채팅 인수인계
- 2026-11-10: 실서버 매각결과 검증 **단계 확대 계획**을 `docs/COURT_RESULT_STAGED_ROLLOUT.md`에 저장. 기존 예약 1건이 기일/사건/물건/원시코드 교차검증까지 통과해야 서울·경기·인천 지역 대표 총 3건 점검을 검토. 11월 10일 기일 수집본 95건(서울 30, 경기 46, 인천 19), 지역 후보 명시. 새 실서버 요청·다건 조회는 아직 추가하지 않음. 앱 v0.7.6·805건 그대로.

## 최신 반영 (2026-11-10)
- 앱 소스 버전 **v0.7.6**: 수도권 수집 목록에 `data/court-sale-result-status.json`의 **단일 사건용 법적상태 진단시각/미확인 사유**를 별도 표시. 수집 성공·형식검사와 법적 상태 확정을 혼동하지 않음. 보고서가 없으면 미확인 표시. 원래 수집 목록 805건과 개인 저장 데이터 불변.
- 매각결과 단발 조사: `.github/workflows/court-sale-result-search.yml`, 예정 시간 **2026-11-11 09:30 KST** (GitHub 일정 지연/누락 가능). `scripts/validate-court-sale-preflight.cjs`가 사건 상세의 최신 기일을 확인한 뒤, 결과검색과 상세의 동일 법원·사건·물건·기일·원시코드를 교차 대조. 공식 코드 이름 미확보: `legalStatusVerified:false` 유지. 단일 표본 `court-B000210|2025타경953|1`의 기존 수집 기일은 2026-11-10으로 표시되나 법원 현재 변경 가능.
- GitHub에 소스 변경 반영은 확인; **GitHub Pages 배포 성공 여부는 따로 확인**. 결과조회 다음 작업은 `data/court-sale-result-status.json` 및 Actions 실행 기록 확인. 실서버 결과 검증 이전에 자동 낙찰/취하 표시 금지.


- GitHub 저장소: https://github.com/samuraiscene-alt/auction-pwa
- 메인 브랜치: main
- 앱 예정 주소: https://samuraiscene-alt.github.io/auction-pwa/
- 공식 진행상태 자동 연동 선행조건: docs/COURT_STATUS_RESEARCH.md 참고. 2026-11-10 공개 개발자료에서 사건 단건/매각결과 조회 경로 후보를 확인했으나 직접 응답·상태코드 검증 실패(환경 연결 불가). 매각·취하 상태 미확인 유지.
- 상태 확인 진단: scripts/probe-court-case-status.cjs (공식 사건 단건 POST 1회, 12초 제한, 값 저장 금지), tests/court-status-probe.cjs. 아직 실서버 응답 검증/자동 연결 안 됨. 법원 매각·취하 상태는 미확인 유지.

- 상태 진단 후속: probe-court-case-status.cjs는 빈 응답을 거부하고 법원/사건/물건번호를 동일 행에서 대조해 caseIdentityMatched, lotIdentityMatched 구분. 상태코드 판정 허용은 항상 false. tests/court-status-probe.cjs 오프라인 테스트를 실제 저장소 소스 기준으로 실행해 통과(2026-11-10). 공식 서버 조회 성공/Actions 배포는 확인되지 않음.
- 실서버 진단 상태 가시화: .github/workflows/court-case-live-probe.yml이 push 또는 수동 실행에서 단 1회 공식 사건을 조회하고, data/court-case-probe-status.json에 원문 없는 최소 상태(outcome/reason/신원 일치 여부/확정상태 검증 false)를 별도로 기록하도록 구성. 자동 실행·배포·실서버 응답 성공 여부는 아직 미확인. 기존 목록 data/capital-court-pilot.json 및 앱 코드는 건드리지 않음.
- 진단 결과 첫 파일 확인: data/court-case-probe-status.json 은 2026-11-10 KST 첫 조회에서 identity_mismatch, 사건/물건번호 불일치, 법적 상태 미검증으로 기록됨. 후속 조사 위해 응답 필드명만 제한 공개하는 responseShape 기록을 워크플로우에 추가; 새 실행 결과 미확인.
- 2026-11-10 실서버 responseShape 확보. dma_csBasInf.csNo/cortOfcCd, dlt_dspslGdsDspslObjctLst.dspslGdsSeq 및 사건·물건 상태필드 이름 확인. 진단 도구 dspslGdsSeq 인식 추가, 응답사건번호 형식 responseCaseFormat만 비식별 보고. 실제 identity_mismatch 지속; 코드 의미는 미확인. 앱 상태 자동판정 미적용.
- 실서버 새 진단 결과 responseCaseFormat=digits_only 확인. 내부 숫자 사건번호를 임의 변환하지 않고 연도/일련번호 꼬리/관련사건 표시번호/내부물건 행 여부만 비식별 identityHints로 조사하도록 개선. 아직 실서버 identityHints 미확인, 법적 상태 매핑 금지.
- 사건번호 연결 중요 진전(2026-11-10): data/court-case-list-bridge-status.json에서 실제 공식 검색 목록 saNo 와 상세 csNo 가 **정확히 일치**하고 대상 법원·사건·물건 행 유일성 확인(detailCaseCrossChecked=true, 2026-11-09T22:38:57.728Z). 이는 단 1건의 표본 성공으로 다른 법원/사건을 포괄하지 않음. printCsNo와 docid는 신원 연결 필수조건 아님. 실서버 교차검증 통과, 법적 상태 의미는 미검증(legalStatusVerified=false). 진단은 요청별 독립 12초 타임아웃과 실패 단계 식별로 변경. 앱 버전 및 기존 목록 불변.
- 원시코드 채증(2026-11-10): 검증된 단일 물건의 법원 원시 상태코드를 data/court-case-list-bridge-status.json 내 statusEvidence에 추출, 코드/기일 결과만 최소 저장. 출처/법적 의미 공식 매핑 미확보 → legalStatusVerified=false, 자동 매각·취하·변경 판단 미적용. scripts/extract-court-status-evidence.cjs 및 tests/court-status-evidence.cjs 회귀 테스트 통과.
- 수도권 3개 지역 표본 검증(2026-11-10): 신규 .github/workflows/court-three-region-probe.yml가 2025년 사례 서울/경기/인천 각 1건, 실서버 결과 data/court-three-region-probe-status.json에 3/3건 목록·상세 신원 연결 성공과 원시 상태코드 보관. 코드 의미 미검증(legalStatusVerified=false), 앱 매각·취하 자동판정 금지. 앱 버전/기존 목록/개인자료 불변.
- 상태코드 공식 변환 경로 조사(2026-11-10): 공개 법원 UI XML에서 매각기일 결과 이름 변환에 LJH/AUCTN_DXDY_RSLT_CD 그룹을 쓰는 것을 확인. 하지만 그룹 코드별 값→의미 공식표는 미확인. scripts/court-status-meaning-gate.cjs 와 tests/court-status-meaning-gate.cjs 추가, 실물건/기일/법원 공식 화면 대조 증거만 허용하고 현재 자동판정은 항상 비허용. 앱 무변경.
- 현재 버전: v0.7.5 (물건 재조회 확인시각·수집 성공표시 신뢰성 보강)
- v0.7.5: 물건 재조회 결과에 Asia/Seoul 확인시각 표시. 목록 수집시각보다 과거의 성공 status만 있으면 경고, 새 목록 V 성공 제스처는 status.outcome=success이고 status.attemptedAt>=snapshot.fetchedAt인 경우에만 표시. 매각·취하 상태 자동 확정은 미구현. 실제 Pages 배포 확인 및 iPhone 테스트 필요.
- v0.7.4: 법원 물건 재조회 가격·날짜가 비정상·누락이면 차이/일치로 오판하지 않고 미확인으로 처리. 날짜가 다르면 기일 차이 감지로만 표시하고 '변경' 상태로 확정하지 않음. 매각·취하·변경 상태는 계속 공식 확인 필요. GitHub Pages 배포 및 아이폰 테스트 별도 확인.
- v0.7.3: 수도권 목록 재조회 실패 시 단발 토스트 외에 상단 경고를 계속 표시. 마지막 검증된 메모리 목록을 보여주되 최신 정보로 오인하지 않도록 함. 개인 자료와 승인 디자인 구조는 변경하지 않음. 신규 배포 성공은 별도 확인 필요.
- v0.7.2: capital load는 validation.passed===true 및 validation.validatedItems===items.length 필수. 기록이 없거나 개수가 다르면 새 스냅샷을 거절하고 기존 메모리의 정상본만 유지. 805건 실제 수집 성공 상태는 확인했으나 Pages v0.7.2 배포 성공은 별도 확인 필요.
- v0.7.1: 법원 수집 시도 상태를 확인할 수 없을 때 수도권 목록에 경고 표시. 상태를 추측해 성공으로 처리하지 않음. 검증 스크립트는 같은/넓은 수집 페이지에서 지역별 물건 50% 초과 급감·페이지별 행수 초과·미래 수집시각을 차단. tests/capital-snapshot-safety.cjs 추가, 수집 Actions 시작 시 테스트 실행. 실제 Pages 성공 여부는 Actions 확인 필요.
- 현재 GitHub 코드: index.html, style.css, app.js, sw.js, manifest.webmanifest, icon.svg, README.md, DESIGN_SPEC.md, CHANGELOG.md, VERSION.txt, workflow
- 내비게이션: History API, 실시간 드래그 추종 5개 메인 탭 스와이프, 상세 화면 가장자리 스와이프, 상단 뒤로가기 버튼.
- 한글 입력: 검색창은 조합(composition) 중 DOM 갱신을 하지 않고 조합 종료 후 필터링하며 NFC 정규화 적용. iPhone 실기기 재검증 필요.
- iOS 한글 조합: 라이브 검색 DOM 갱신 금지. 검색 완료 키 또는 화면의 검색 버튼으로 결과 반영.
- 형광펜 2탭: splitNoteUnits()는 Intl.Segmenter(단어/글자)로 렌더할 선택 범위를 만들고, 형광펜 읽기 화면에서 시작·끝 두 번 터치해 선택. 기본 iOS long-press 선택 미사용. 기존 마크를 누르면 포스트잇. annotations 데이터 포맷 그대로.
- v0.6.7: 동일 물건번호의 서로 다른 토지/건물/주소 항목은 구성요소로 보관하는 스키마2, scripts/merge-capital-components.cjs 추가. 가격/날짜/지역 충돌은 그대로 차단. 앱 schema1/2 수용, schema2에서는 구성요소 펼치기 및 분류 검색. 예전 schema1은 구성요소 누락 가능 경고. 검증 스크립트 1/2 양식 지원. SW v067.
- v0.6.6: 최근 실패 reason을 스냅샷과 분리된 data/capital-court-status.json에 기록; connection_timeout/conflicting_records/validation_rejected. GitHub Actions UDP/TCP 환경에서 법원 엔드포인트 ConnectTimeout 확인됨. 수집기 누락 물건번호를 강제 1번으로 치환하지 않도록 변경. SW v066. 실제 법원 접속 정상화는 미확인.
- v0.6.5: data/capital-court-status.json에 마지막 수집 시도 성공/실패. 앱 화면에서 마지막 시도 실패가 snapshot 수집일보다 최신이면 경고. 검증 실패 시 데이터 파일은 불변. SW v065.
- v0.6.4: scripts/validate-capital-snapshot.cjs가 수집 결과를 배포 전에 검사. 이전 수집본과 변경/소실 비교, 잘못된 자료면 워크플로우 실패로 기존 스냅샷 유지. app.js는 30시간 이상 지난 데이터 경고·검증 여부·수집 시각을 표시. 직접 등록/관심 기록 불변. SW v064.
- v0.6.3: 수도권 자동목록에 <select id=capitalTypeFilter> 추가. 현재 지역에 실제 존재하는 법원 82개 소분류 코드만 옵션으로 표시. `state.capitalType` 코드로 개별 물건을 필터한 뒤 사건별 묶음 유지. 지역 변경 시 전체 분류 초기화. SW v063. Playwright 회귀검증.
- v0.6.2: 수도권 자동목록에서 법원코드+사건번호 그룹화하여 details 접기/펼치기. 물건번호마다 별도 가격/기일 보존, 40개 사건씩 더 보기. 기존 데이터 변경 없음. SW v062.
- v0.6.1: 수도권 법원 PGJ151M01 검색 결과를 scripts/capital-court-pilot.cjs로 최대 서울/경기/인천 각 3페이지씩 조회, data/capital-court-pilot.json 생성. .github/workflows/capital-court-pilot.yml은 매일 03:15 KST 실행하여 파일 git commit 후 Pages 배포. 앱 capital 화면은 별도 수집 스냅샷을 가져와 필터/검색/40개 pagination을 제공. 로컬 개인 데이터 수정 없음. 정보는 일부 페이지만 수집한 시범 목록이며 전국/수도권 전체를 뜻하지 않음. SW v061.
- v0.6.0: 직접 등록 목록 data-edit-real 및 상세 id=editRealDetail → nav('official',{editRealId:id}), 등록 폼은 state.editRealId로 사전값 로드. 법원/사건번호/물건번호 readOnly. 기존 type legacy 분류는 선택 공란 시 보존; 새로운 대중소분류 선택 시 코드 변경. 변경 저장은 동일 id 항목을 map 교체, enteredAt/관심물건/일정 유지. editedAt 추가, SW v060. iPhone 실기기 테스트 필요.
- v0.5.9: 법원 pgj.js getUsgMclLst/getUsgSclLst 실제 POST JSON 본문 {code:parent} 검증. 대 4/중 12/소 82개 실제 조회 성공. 전체 분류 snapshot court-usage-codes.json. 등록 화면 대/중/소 select로 부모 연동. 자동 채움은 명확한 공식 분류 계층 코드+이름만 반영. 기존 과거 기록은 그대로, SW v059. 법원 코드 추후 변경 가능; Cloudflare 소스 아직 따로 배포 필요.
- v0.5.8: COURT_USAGE_CATALOG=[대분류 10000 토지,20000 건물,30000 차량및운송장비,40000 기타; 중분류 21100 단독주택/20000,21200 공동주택/20000; 소분류 21101 단독주택(소분류)/21100,21201 아파트/21200] 2026-05-08 PGJ151F00 capture. 중/소분류 자유입력 datalist 부모 필터, 정확히 이름/부모 코드가 일치하면 code 저장, 아니면 null. 원문 분류 이름 그대로 보존. 전체 목록 확보 전엔 '전체 공식 분류'라고 주장 금지. SW v058.
- v0.5.7: COURT_USAGE_LARGE 4개 대분류코드 10000/20000/30000/40000. 신규 등록 폼 #officialUsageLarge, #officialUsageMedium, #officialType(소분류 실제 명칭) 도입. 저장 record.courtUsage={codes,names,source:'user-verified'}로 기존 type 필드 유지. 검색/관심/상세검색은 저장된 type을 필터에 추가. Worker가 courtUsage 원문 반환하도록 소스 준비(Cloudflare 미배포). 공식 전체 코드표 확보 전까지 중/소분류 코드는 null, 법원 원문 사용자가 직접 확인. SW v057. 기존 기록/백업 호환성 유지.
- v0.5.6: detail 최저입찰가 compactAuctionPrice()로 천단위 8,000원→8천원 표시, CSS word-break keep-all 및 반응형 글자크기. 신규 공식 사건 폼 #officialType 기본 '아파트' 제거하고 필수 미선택 상태. Worker /item 응답에 propertyType 후보 생성(법원 목적물 명시적 단일 분류명만), 확인 후 빈칸만 입력, 혼합·미확인 분류는 수동 선택. Worker GitHub 소스는 별도 Cloudflare 배포가 필요하며 실제 타입 필드는 미검증. 기존 등록 및 저장 포맷 변경 없음. SW v056.
- v0.5.5 물건정보: #fetchOfficialItem에서 Cloudflare /item?courtCode=B000210&caseNo=...&itemNo=... 조회. verified·courtCode·caseNo·courtName·itemNo 일치 검증 후 주소/감정가/최저가/매각기일 단일 명확한 값만 확인창 거쳐 빈 입력칸에 반영. 기존 입력은 절대 덮어쓰지 않음, 물건종류는 사용자 선택, 직접 사건 등록해야 저장. 아이폰 테스트 필요. APP_VERSION 0.5.5 SW v055.
- v0.5.4 사건번호 검증: 공식 사건 등록 화면 #verifyOfficialCase → Cloudflare Worker https://joon-auction-court.samuraiscene.workers.dev/case. 서울중앙지방법원 B000210만 지원, verified=true·법원명·법원코드·사건번호 일치 검증 후 상태문구 출력. 가격/기일 미수집, 조회 상태 및 데이터 미저장. 실패 시 입력값 보존, 12초 제한. SW v054 APP_VERSION 0.5.4. iPhone 실제 테스트 필요.
- v0.5.3 PDF 입력: extractCourtFields()는 고정 라벨·단일 값만 파싱하고 readAuctionPdfFields()로 PDF.js 최대 12MB 15페이지 분석. #officialPdfInput 신규 사건 등록 폼 자동 채움(빈 칸만), 상세 #detailPdfInput은 사건번호/법원 동일성 확인 후 미입력 가격/기일만 confirm 후 보완. OCR·공식 API·시세·권리 자동 판단 미지원, 원문 파일 별도 미저장. SW v053 / APP_VERSION 0.5.3.
- v0.5.2 직접 등록 UX: write() 직후 nav('detail',{detail:id,detailTab:'overview'}), showSavedCheck 유지. 감정가/최저가 빈 필드는 null, 과거 0도 상세/목록에서 미확인으로 표시. propertyPrice는 실제 가격 없으면 null 반환하며 필터/정렬 보정. 실시간 공식 사건 자동 채우기 아직 안 됨. SW v052, app v0.5.2.
- v0.5.1 공식 경매: official 화면, 공식 사이트 링크, 사용자 직접 등록 saved.realProperties (id real-court|case|itemNo), allProperties()로 홈/검색/관심/일정/상세 연동. userRegistered 배지 및 미검증 원문 안내. JSON 백업 포함, 복원 검증. 자동 법원 API 수집·실시간 연동은 아직 없음. cache v051 APP_VERSION 0.5.1.
- v0.5.0 홈 가로폭: 스크린샷에서 홈 전체 오른쪽 잘림(설정·빠른메뉴 4열·하단탭), CSS html/body/#app/#content max-width 및 min-width:0, 그리드 minmax(0,1fr), 탭 균등 정렬. v050/app 0.5.0. 실제 iPhone 재검증 필요.
- v0.4.9 PDF 읽기 위치: 일반 첨부 파일 open(file) 시 fileId별 localStorage 키 auction_pdf_last_page_v1: 조회. source open(file,n)는 명시적 출처 페이지 우선. pageChange, pickerDone, 검색 결과 선택, 닫기에서 페이지 업데이트. 페이지 수 초과 시 범위 제한. 백업에는 미포함, 다른 앱/기기 동기화 없음. SW v049 APP_VERSION 0.4.9.
- v0.4.8 PDF 검색: pdfSearchIndex()는 공백/줄바꿈/제로폭 문자 제거 및 NFKC 소문자 비교, 원문 위치 배열로 snippet 유지. 검색 패널을 닫거나 다시 열면 검색어/결과/상태 초기화·searchSeq 증가. SW v048 APP_VERSION 0.4.8.
- v0.4.7 상단 PDF UI: #attachmentSearchOpen은 돋보기 SVG 아이콘으로 42px 고정, 검색 기능은 그대로 유지. #attachmentViewerName은 flex min-width:0 ellipsis, 닫기 버튼도 42px 고정. SW v047 / app 0.4.7.
- v0.4.6 PDF 검색: #attachmentSearchOpen 버튼은 상단에, search panel overlay (하단 버튼 수직 크기 변경 없음). getTextContent로 각 페이지 문자열 검색, 최대 80 결과, 검색 결과 누르면 page 직접 이동. searchSeq로 이전 검색 무효화. 스캔 PDF OCR 미지원. v046/app 0.4.6.
- v0.4.5 PDF 페이지: input → button #attachmentPdfJump (키보드 없는 picker). #attachmentPagePicker bottom sheet, 44px scroll snap wheel, 1..numPages, 취소/이동, 기존 렌더 처리 재사용. cache v045, app v0.4.5.
- v0.4.4 PDF 조작바: .attachment-main-controls grid 37/63 비율로 가로폭 가득 배치; 페이지 input 최소 29px, 페이지칸 최소 64px, 버튼 40px 높이, 2줄 유지. APP_VERSION 0.4.4, SW v044.
- v0.4.3 PDF 하단 바: .attachment-main-controls(줌/페이지 한 줄), .attachment-secondary-controls(문장 선택/내보내기 한 줄). 기존 버튼 id 동일, 축소/맞춤/확대 순서, 페이지 입력 52px, 고정 100dvh/안전영역 유지. CSS 강제 no-wrap. 캐시 v043 APP_VERSION 0.4.3.
- v0.4.2 PDF 페이지 번호: #attachmentPdfJump input + #attachmentPdfGo 버튼, 숫자키 Enter 이동, 전체 페이지 표시/범위 검증 후 renderPdfPage() 호출. 데이터 형식 변경 없음. cache v042, version 0.4.2.
- v0.4.1 뷰어 위치: createAttachmentViewer()는 overlay를 열 때 document.body로 이동해 부모 카드 scroll/transform의 fixed clipping을 피하고 닫을 때 overlayHome에 복구. CSS 100dvh/safe-area, 콘텐츠만 스크롤, 하단 바 flex-shrink:0. SW v041, 앱 버전 0.4.1.
- PDF 렌더링: createAttachmentViewer()의 PDF 부분은 PDF.js getPage().render(canvas)로 현재 페이지를 직접 표시, 렌더 중 취소 및 화면 종료/변경에 대한 seq guard 구현. 페이지/총페이지·맞춤 확대·축소. 엔진 최초 로드에 인터넷 필요, 실패 시 iframe fallback. 원문 source.page를 정확히 초기 페이지에 반영. 캐시 v040 APP_VERSION 0.4.0.
- PDF 원문 링크: note.sources [{id,fileId,filename,page,quote}], normalizePdfSources()로 유효성 검증. 가져오기 시 파일 ID/페이지를 기록하고 노트 편집 상단에서 해당 첨부 PDF를 openById()로 다시 연다. 소스 링크 삭제는 문장/형광펜/첨부 유지. draft getData/setData에 sources 포함. 캐시 v039 / APP_VERSION 0.3.9.
- PDF 텍스트 추출: loadPdfTextEngine()은 PDF.js 5.4.149 CDN에서 ESM/worker를 동적으로 불러와 getTextContent로 현재 페이지 텍스트 추출. 두 번 터치 단어 범위, 선택 문장 노트 삽입, 출처 표기, 자동 yellow annotation과 포스트잇. 스캔 PDF는 OCR 불가. 최초 인터넷 연결과 iOS 실기기 검증 필요. cache v038 APP_VERSION 0.3.8.
- 첨부파일 뷰어: createAttachmentViewer()는 기존 data URL을 Blob으로 변환해 같은 앱 안 full-screen overlay에서 사진 또는 PDF iframe 미리보기. 사진 확대/핀치, PDF #page=N 요청, 파일 내보내기. iPhone PDF iframe 페이지 지원 및 파일 다운로드는 실기기 검증 필요. 캐시 v037, APP_VERSION 0.3.7.
- 노트 임시저장: DRAFT_PREFIX=auction_note_draft_v1: (new 또는 id), 저장 간격 650ms. captureNoteDraft()로 제목/본문/annotations/분류/topicId 저장, pagehide/visibilitychange/화면이탈 전에도 시도, 복구 시 confirm과 activeNoteEditor.setData(). 정식 저장 성공 후 clearDraft(). 사진/PDF 첨부 바이너리는 임시저장 대상 아님. 캐시 v036, APP_VERSION 0.3.6.
- 저장 확인 애니메이션: showSavedCheck()는 화면 중앙 큰 원형 파란 체크를 노트 write() 성공과 백업 복원 성공에만 표시. 실패 시 V 없음. 백업은 파일 요청이므로 성공 체크 미표시. 복원 전 기존 데이터/백업 데이터 개수 비교 및 노트 0개 백업 추가 경고. APP_VERSION 0.3.5, cache v035.
- 실제 iPhone 화면 녹화: 공유 시트 상단에는 오토바이 이미지, 홈 화면 추가 미리보기에는 기본 '경' 아이콘이 나온다. 원인 확정 아님. v0.3.4 RGB PNG auction-ios-icon-v034.png로 교체하고 Apple touch icon/manifest/OG/fav 경로 통일, manifest id를 안정적으로 /auction-pwa/로 고정. 앱 데이터 보호를 위해 기존 설치 제거 금지, 현장 재검증 필요.
- Safari 홈화면 아이콘: 새 파일 auction-icon-v033.png를 HTML apple-touch-icon/precomposed/favicon/og:image와 manifest에 모두 적용. manifest id와 start_url에 경매앱 고유값 명시, SW auction-shell-v033, APP_VERSION 0.3.3. GitHub Pages 같은 호스트에 다른 PWA가 존재할 수 있으므로 iOS 실제 추가 미리보기 필수.
- 홈 화면 아이콘 갱신: 새 경로 apple-touch-icon-v032.png를 index.html과 manifest에서 명시; 재설치 이전에 홈 화면 앱 자체에서 백업 필수. Cache auction-shell-v032, VERSION/APP_VERSION 0.3.2.
- 홈 화면 아이콘: 승인한 노랑 법봉·빨간 지붕 집 그림을 icon.svg와 apple-touch-icon.png(180x180)에 적용, manifest와 index.html 명시. 캐시 auction-shell-v031. iOS 기존 설치 아이콘 캐시는 기기에서 늦게 반영될 수 있음. 재설치 전 반드시 백업.
- PWA 안정화: APP_VERSION='0.3.0'과 VERSION.txt 비교. 설정에서 업데이트 확인/적용; online/visibility/pageshow 시 점검, 노트 편집 중이면 적용 금지. SW auction-shell-v030, 네트워크 우선/오프라인 캐시. Safari와 홈 화면 앱은 저장소 분리(서버 없는 동기화 불가능). 로컬 저장 검증, JSON 백업은 수동 이전. iPhone 실기기 확인 필요.
- 학습 항목 노트: note.topicId는 '권리분석:0' 같은 문자열. studyTopicOptions()와 normalizedStudyTopic()으로 검증. 선택 카테고리의 각 체크리스트 항목에 연결된 노트만 보여주고 직접 열기·작성 가능. 구버전 노트의 topicId 미존재는 빈 값으로 처리.
- 공부방 카테고리: STUDY_CATEGORIES 4개(권리분석/경매절차/세금/명도), state.studyCategory 필터(전체/미분류 가능), note.category 신규 선택/저장. 구버전 노트는 normalizedStudyCategory()로 미분류 취급. 가이드 체크리스트는 일반 학습 항목이며 판정 아님.
- 첨부파일: IndexedDB auction-note-files-v1/files 저장, 레코드 {id,noteId,name,type,size,data} (base64 data URL). 노트당 8개/개별 8MB. 첨부 저장 후 노트 localStorage 반영. 백업 JSON v2의 attachments 배열 및 v1 호환 복원. 파일 저장 실패 시 사용자에게 알리고 저장 중단.
- 노트 편집: 작성 textarea와 형광펜 읽기 모드 전환. 선택 문장을 4색으로 마킹해 노란 포스트잇을 연다. notes 항목에 annotations:[{id,start,end,color,memo}] 저장. 본문 변경 시 reconcileNoteMarks()로 유효 범위를 조정하고 불확실 표시 제거. 로컬 백업·복원은 saved 전체를 저장하여 신규 필드도 포함. 팝업 변경 후 반드시 파란 노트 저장 버튼을 눌러 최종 보관. iPhone 실제 선택 동작 검증 필요.
- 공부방 노트: noteQuery/noteSort 검색·정렬, 기존 notes 배열 id/title/body 유지. 수정된 노트에 updatedAt 추가. 편집·삭제 액션, 삭제 확인. 본문 검색은 조합 중 DOM 갱신 없음.
- 하트: 공통 CSS 변수 --heart-active, --heart-inactive를 사용. 저장 시 빨강 채운 ♥, 해제 시 회색 빈 ♡; 관심목록 해제는 220ms 빈 하트 피드백 후 카드 제거.
- 관심물건 화면: favoriteSort(최근/입찰일/최저가), favoriteType(전체/종류), 상세보기, 날짜 이동, 개별 관심 해제. 데이터 포맷 변경 없음.
- 달력: viewMonth는 YYYY-MM, selected는 YYYY-MM-DD, calendarFavoritesOnly로 샘플 경매일 필터. 오늘 이동/월 이동 지원. 실제 법원 날짜 미연동.
- 상세 화면: 개요/권리/시세/서류 4개 탭 UI; 후속 자료 연동 전에는 미확인 상태 표시.
- 가격 입력 UX: #advMin/#advMax의 data-won과 data-displayed를 이용해 포커스 아웃 시 한글 금액을 입력창 안에 표시, 재포커스 시 선택 단위의 숫자 편집. 검색 실행은 원 단위 값 사용. 한글 표시 문자열을 직접 숫자로 파싱하지 말 것.
- 가격: state.minPrice/maxPrice는 원 단위 숫자의 문자열; priceUnit은 입력 표시 단위(원/만원/억원). DEMO_PRICES 역시 원 단위. prettyPrice()가 한글 금액 표현 제공.
- 검색: 상세검색(지역·유형·최저입찰가·사건번호) UI가 예시 물건을 필터링. 특수물건은 안내 UI만 구현, 실제 권리 필터 미작동.
- 구현 화면: 홈, 검색, 일정, 관심, 공부방, 물건 상세, 권리분석, 공부 노트, 설정
- 실제 법원 경매 API, 자동 정보 업데이트, 사진, AI 분석은 아직 연결되지 않음. 경매 정보는 가상 데모.
- 개인 관심물건 및 공부노트는 현재 브라우저 localStorage 저장. GitHub에는 올라가지 않으며 Safari 데이터 제거 시 소실 위험. JSON 백업 기능 사용.
- GitHub Pages는 활성화되어 GitHub Actions로 자동 배포 중. 작업마다 해당 워크플로우 최종 성공 상태 확인 필수.
- 새 채팅에서는 이 파일 및 DESIGN_SPEC.md / CHANGELOG.md / VERSION.txt 확인, GitHub 최신 소스 읽기, 수정 후 main 업데이트와 Pages 실행 검증. 채팅별 GitHub 권한은 재확인 필요.
- 사용자가 승인한 애플 스타일 UI는 임의로 바꾸지 말고 화면 비교.

### v0.6.0 브라우저 자동 회귀검증 — 2026-11-09
- Playwright Chromium 테스트 `tests/manual-record-regression.cjs` 추가, GitHub workflow `.github/workflows/manual-record-regression.yml`(ubuntu-24.04).
- 성공 실행: https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42604714717
- 신규 사건 등록, 법원 분류 20104(아파트), 관심물건 지정, 최저가·매각기일 변경 저장, 고유 ID/등록일 유지, 새 매각기일 달력 반영, 이전 날짜 미표시 통과.
- 예전 타입 '토지' 기록(코드 없음) 수정 시 기존 분류/관심물건 유지 통과, 브라우저 스크립트 오류 없음.
- 실제 iPhone Safari/홈화면 PWA 저장소 간 연동과 법원 외부 서버 응답은 해당 자동 테스트에서 검증하지 않음.

### 수도권 자동목록 v0.6.1 검증 (2026-11-09)
- 법원 실서버 검색에서 서울 3,123 / 경기 7,962 / 인천 2,710건의 검색 총건수를 보고받음(2026-11-09 당시, 법원 사이트 응답이며 중복/진행상태 확인 전).
- 각 지역 3페이지 × 페이지당 50행 = 450행 조회. 중복 제거·검증 후 274개 고유 물건을 `data/capital-court-pilot.json`에 저장. `complete:false` 명시.
- 일일 실행 GitHub workflow: `.github/workflows/capital-court-pilot.yml`, 매일 오전 03:15 KST, 갱신 성공 시 JSON 갱신+Pages 배포, 실패 시 기존 목록 유지.
- Playwright Chromium 자동 회귀검증 성공: https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42608242171
- GitHub Pages v0.6.1 배포 성공: https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42608242236
- 완료 확인: 자동목록 40개 최초 표시·80개 더 보기·서울 지역 선택·사건번호 검색·직접 등록/관심물건 데이터 격리.
- 미완료: 법원에서 보고한 수도권 전체 사건 자동 수집과 실시간 매각상태 갱신, 아이폰 홈 화면 PWA 실기기 검증. 274건을 전체 경매물건으로 광고하지 않음.

## v0.6.8
서울/경기/인천 각 3→5페이지(최대 250행씩) 시범 수집으로 단계 확대. 기존 병합, 충돌 차단, 검증 실패 시 마지막 정상본 보존 유지. 수집 성공 후 실제 고유 건수로 업데이트 필요. 현재 데이터 전체 수집 주장 금지.

## v0.6.9
수도권 자동목록 각 물건에서 기존 Worker /item GET으로 읽기 전용 재조회, 법원·사건·물건번호 identity 검증 후 금액/기일 비교. 오류·미확인/복수 가격은 성공 표시하지 않음. 로컬 저장 데이터 수정하지 않음. SW v069. 2026-11-10 현재 5페이지 범위 유일 479건 확인.

## v0.7.0
수집기 각 지역 최대 8페이지(400행)까지 단계 확대. 원문 매각/취하/변경 현재 상태는 이 목록 API만으로 검증하지 않으며 각 물건 진행상태 '미확인' 표시. 검증/충돌 차단 및 이전 게시본 보존 유지. 최종 게시 결과는 Actions 및 JSON 확인 필요.

## v0.7.0 8페이지 실제 검증·배포 완료 (2026-11-10 KST)
- 각 지역 8페이지 × 페이지당 50행, 최대 원본 1,200행 조회. 고유 물건 805건: 서울 337, 경기 202, 인천 266.
- 이전 479건과 모두 겹침, 가격·기일 변경 0건, 새 표본에서 보이지 않는 기존 물건 0건.
- 데이터 `data/capital-court-pilot.json`: `schemaVersion:2`, `validation.passed:true`, `complete:false` (수도권 전체 아님).
- GitHub Actions 확대 수집+안전 게시 성공: https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42682855036
- Pages 앱 배포 성공: https://github.com/samuraiscene-alt/auction-pwa/actions/runs/42682855084
- 코드 `app.js` v0.7.0은 진행상태를 '미확인'으로 표시하며, 재조회로도 매각·취하 확정 판정을 하지 않음.
- 같은 GitHub 브랜치에 소스/자동 수집이 동시에 반영돼 생긴 status.json 충돌을 방지하도록, 워크플로우가 최신 커밋 위에 검증된 데이터 파일만 갱신하도록 수정함.

- 2026-11-10 UI v0.7.7: 사용자 승인으로 새로 생성한 5개 빠른 메뉴 그림을 `assets/auction-menu-v077.webp`에 묶고, 마지막 경매 망치·집 그림을 `auction-ios-icon-v077.png` 아이폰 홈 아이콘으로 적용. 홈 빠른 메뉴 `수도권 자동등록` 2줄 고정, 주소검색/사건번호 검색 진입 시 각각 입력 예시 구분. 앱/서비스워커/매니페스트 버전 0.7.7 일치; 기존 `auction_skeleton_v1` 로컬 저장 키·805건 경매자료 불변. `scripts/verify-pages-release.cjs`에서 이미지 파일 형식, 크기, 참조를 검사.
