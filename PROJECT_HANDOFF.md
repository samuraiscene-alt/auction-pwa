## 2026-11-10 v0.7.31 최신 인수인계
- search()의 id=searchCourtResults 버튼은 실제 검색 입력칸의 값을 읽고 state.search 및 capitalQuery로 전달. 수도권 서울/경기/인천 지역만 함께 전달, 나머지는 '전체'로 처리.
- 이동 시 capitalFocusId, capitalReviewDate, capitalReviewStage를 비우고 capitalType='전체', capitalLimit=40으로 재설정. 가격·일반 카테고리 필터를 법원 검색에 부정확하게 적용하지 않음.
- 법원 수집목록은 여전히 일부 페이지만 수집한 독립 목록. 전체 법원 데이터·매각 결과 확인을 의미하지 않음. 일반 검색에는 직접 등록한 사건만 표시.
- v0.7.31 / SW cache auction-shell-v0731 / VERSION.txt. 문법·UI 정적 144개와 관심 기록 32개 조건 검사 통과. Pages 공개 배포 및 iPhone 실기기 확인 전.

## 2026-11-10 v0.7.30 최신 변경
- 일반 검색 matchingProperties()는 allProperties()가 아닌 registeredProperties()만 필터. 검색·상세검색 안내 문구도 직접 등록 물건 기준. 홈의 테스트 예시 카드 자동 출력 중단.
- settings()에서 data-page="demo" 버튼 제공; demo() 전용 페이지의 예시 3건을 통해 개발 테스트 가능. 원래 예시 properties 데이터는 그대로 보존; 기존 저장/복원 기록 삭제 없음.
- detail() '담당 법원' 및 '사건번호'를 별개 auction-detail-ident 행으로 출력. 스타일은 2열 격자, 번호/법원명 불필요한 단어 중간 줄바꿈 억제.
- v0.7.30 / SW auction-shell-v0730 / VERSION.txt. JS 문법·UI 137개·법원 관심 32개 검증 통과. GitHub Pages 실제 배포 및 iPhone 실기기 확인 전.

## 2026-11-10 v0.7.29 최신 인수인계
- 수도권 부분수집 사건별 카드: app.js renderCapitalProperty(x,caseHeader)로 사건 대표 항목을 전달. 사건카드의 주소/법원/사건번호는 유지하고, 펼친 물건 본문에서는 물건번호만 기본 표시.
- 개별 x.address가 caseHeader.address와 다르면 해당 물건의 상세 주소 표시. 15개 이상 물건도 고유 물건번호·구성정보 유지.
- 관련 CSS: capital-lot-label, capital-lot-address. v0.7.29 / SW auction-shell-v0729 / VERSION.txt 정합.
- 소스 JavaScript 구문, UI 회귀 128개 및 관심 관련 32개 검사 통과. 공개 Pages 배포 및 iPhone 실기기 점검은 별도 확인 필요.

## 2026-11-10 v0.7.29 최신 인수인계
- app.js capital()의 renderCapitalProperty(x,caseHeader)는 그룹 대표 물건을 전달받아 중복 사건 주소·법원·사건번호 표시를 생략. 모든 물건은 물건번호를 유지하고 x.address와 caseHeader.address가 다른 경우 독립 주소 출력.
- 사건 제목은 원래대로 유지하며 집중검색·관심물건·지도·가격·기일·재조회 기능 변경 없음. 세로 길이 축소 목적의 표시 정리만 수행.
- v0.7.29, SW cache auction-shell-v0729. JS 문법, UI 128조건, 법원 관심 32조건 통과. GitHub Pages 배포 및 아이폰 실기기 확인 필요.

## 2026-11-10 v0.7.28 최신 인수인계
- app.js state.capitalFocusId와 snapshot() 항목 추가. 법원 수집 관심 카드 및 일정 카드의 data-court-favorite-open → 정확한 court-법원코드|사건번호|물건번호 ID 기반 수도권 탐색. caseNo 검색 결과 여러 건을 잘못 선택하는 문제 해결.
- capital()에서 검증된 snapshot의 exact ID만 필터. 사건 details open 및 capital-focus-found 안내 제공. 미수집·검증실패·로딩을 구분, 잘못된 유사 물건 대체 없음.
- capitalFocusClear 버튼 또는 일반 필터/검색 진입으로 일반 목록 복귀. 기존 courtFavorites, 저장/백업/복원 자료 변경 없음.
- v0.7.28 / auction-shell-v0728. 정적 UI 122개 조건 + 법원 관심 32조건 검사 통과. GitHub Pages 실배포와 아이폰 실사용 확인 전.

## 2026-11-10 v0.7.27 최신 수정
- 달력에서 색상바 존재 날짜 숫자만 상향되는 문제 수정: style.css의 calendar-date-number를 전 날짜 top:2px, position:absolute로 통일. 기존 :has(.calendar-bars) 숫자 상단 별도 규칙은 삭제.
- 날짜 글자 17px, 기존 날짜 셀 46px 및 3색 누적 막대 유지. v0.7.27 / SW auction-shell-v0727, 정적 회귀 115개 통과. 실제 배포·아이폰 테스트 확인 전.

## 2026-11-10 v0.7.26 최신 변경
- 일정 달력: 날짜 글자 17px, 세로 누적 색상바 26x5px 최대 3줄. CSS의 calendar-date-number, calendar-bars, calendar-bar-* 및 :has(.calendar-bars)로 숫자와 막대 겹침 방지.
- 달력은 registeredProperties() 및 courtFavoriteCalendarItems()의 실제 기록만 표시. 예시 물건은 기존 앱에 남기되 달력에는 표시하지 않음.
- 파랑=직접 등록 비관심, 분홍=직접 등록 관심, 보라=법원 수집 관심. 선택 및 관심 전용 필터 유지.
- v0.7.26 / SW cache auction-shell-v0726 / VERSION.txt 일치. JS 문법, UI 113조건, 법원 관심 기록 32조건 점검 통과. Pages 배포 및 아이폰 실기기 결과 확인 전.

## 2026-11-10 v0.7.25 최신 변경
- 일정 화면: courtFavoriteCalendarMarkup의 법원 수집 관심 카드 상단 '법원 수집 · 저장 당시 기일' 배지, 한 줄 경고문. 기존 달력 데이터는 유지.
- calendar-day에서 ordinary/favorite와 court-source 일정 마커를 별도 생성. 법원 수집 관심은 CSS court-favorite-dot 보라 마름모, legend court-key. 여러 일정이 겹치면 복수 점 표시.
- 저장 법원 관심일정이 표시된 날에는 기존 중복 하단 경고문을 생략. 공식 법원 기일변경·취하·낙찰 검증 기능이 생긴 것은 아님.
- 버전 0.7.25 / 서비스워커 auction-shell-v0725. JS 문법·정적 105조건·관심물건 32조건 통과. Pages 원격 및 iPhone 실기기 확인 필요.

## 2026-11-10 v0.7.24 최신 인수인계
- app.js의 courtFavoriteCalendarItems(date), courtFavoriteCalendarMarkup(items)는 saved.courtFavorites의 저장 당시 입찰기일을 독립된 달력 항목으로 연결. 기존 직접 등록·예시 일정 유지.
- 법원 수집 카드의 data-court-favorite-date 버튼으로 날짜 이동. 달력 관심물건 전용 필터에도 포함.
- 법원 수집일정은 수집 당시 참고자료이며 기일 변경·취하·낙찰 공식 확인이 아님. 기일 미확인 물건은 달력 미표시.
- 버전 0.7.24 / 서비스워커 auction-shell-v0724. 정적 검사 99개, 관심물건 검사 32개 통과. 공개 Pages 배포 및 아이폰 테스트 미확인.

## 2026-11-10 v0.7.23 최신 인수인계
- app.js: COURT_FAVORITES_LIMIT=200; validCourtFavorite, courtFavorites, courtFavoriteFromLot, setCourtFavorite, courtFavoriteCards.
- 수도권 법원 부분수집 물건 카드에 data-court-favorite-toggle 버튼 연결; 관심 탭에서 data-court-favorite-open / data-court-favorite-remove 이벤트. 저장 즉시 기기 localStorage의 기존 saved JSON 아래 courtFavorites에 별도 보관. 구형 favorites·notes 배열 유지.
- 관심 카드에는 수집 당시 가격/기일과 법원 원문 확인 경고 표시; '해당 사건 찾기'는 수도권 수집목록의 사건번호 검색으로 이동. 8페이지 부분수집이므로 물건이 검색되지 않아도 낙찰/취하 의미 아님.
- 기존 백업 JSON v3의 data.courtFavorites 필드로 함께 백업. 복원 시 필드 없으면 구형 백업으로 허용, 있으면 최대 200건/중복ID/형식 검사 통과만 허용.
- 테스트 tests/court-favorites.cjs는 .github/workflows/pages.yml 배포 전 검사에 연결. 정적 UI 92조건 및 관심물건 새 테스트 22조건 통과(커넥터 소스 기반). 배포 실결과와 iPhone 테스트는 별도 확인 필요.
- v0.7.23 / cache auction-shell-v0723 / VERSION.txt 일치. 아이콘·데이터 수집과 서버 조회 정책은 변경 없음.

## 2026-11-10 v0.7.21 최신 변경
- app.js auctionFold(title,html,extraClass) 함수로 보조 영역을 독립형 details로 감쌈. 수도권 물건 카드는 지도/가격 분석/변동 이력/입찰보증금 계산기 각각 닫힘 기본. 주소·가격·기일·진행상태는 항상 표시.
- 직접 등록 물건 상세 개요는 지도/가격 분석/보증금 계산기를 아코디언으로 묶음. 기존 PDF 정보보완 및 관심 기능 유지.
- capitalPriceHistoryMarkup는 이제 내부 details 없이 일반 div를 반환해 중첩 접기 제거. style.css의 auction-fold 선택자는 외부 사건용 summary와 분리.
- 버전 APP_VERSION 0.7.21 / SW auction-shell-v0721 / VERSION.txt 정합, 82개 정적 회귀검사 통과. GitHub Pages 실배포 및 아이폰 실사용 검증은 별도 확인해야 함.

## 2026-11-10 v0.7.20 최신 인수인계
- 가격 이력 파일: data/capital-price-history.json. scripts/record-capital-price-history.cjs의 updateHistory(previous,current,existing)가 검증된 수도권 부분수집본 사이의 동일한 물건번호 최저가 변경만 관측 기록. 유찰 또는 낙찰 결과 판단 아님.
- .github/workflows/capital-court-pilot.yml에서 새 검증 수집본을 이전 수집본과 비교한 다음 기록을 함께 commit/push. 테스트 tests/capital-price-history.cjs는 수집과 Pages 배포 단계 모두에서 실행하도록 연결.
- 앱 capitalPriceHistoryMarkup 및 loadCapital에 안전한 기록 조회 추가. 기록 0건은 '변경 없음' 확증이 아니며 수집범위의 한계 안내. 기존 기록/아이콘/지도 유지.
- VERSION 0.7.20 / SW auction-shell-v0720. 동적 테스트 변경 1건, 중복 차단, 신규 변경 없음, 오래된 이력/미검증 자료 차단 통과. 실제 공개 배포 및 iPhone 점검은 별도 필요.

## 2026-11-10 v0.7.19 최신 인수인계
- capital-case-group의 summary / pseudo-element CSS는 반드시 직계 자식 선택자(>) 사용. 중첩 details의 화살표가 부모 열린 상태를 잘못 상속받지 않게 함.
- 수도권 물건의 진행상태 라인은 capital-status-note 블록으로 교체. 법적 상태 자동 확정 없음.
- v0.7.19 / auction-shell-v0719. 기능 회귀 70개 정적 검사 통과, 공개 배포/실기기 육안 확인 아직 별도 검증 필요.
## 2026-11-10 v0.7.18 최신 인수인계
- auctionPriceAnalysis(appraisalWon,minimumWon,source): 유효 가격 2개로만 최저가 비율과 차액 표시. 시세 할인율·유찰 증거 아님.
- auctionBidCompare(bidManwon,minWon): 기존 보증금 계산기의 입찰가 입력을 재사용하는 최저가 대비 차액 안내. 입찰 적격 확정 기능 아님.
- 직접 등록 상세 개요 및 수도권 시범 수집 카드 연결. 기존 개인자료 변경 없음.
- v0.7.18, auction-shell-v0718. tests/auction-price-analysis.cjs를 배포 검사에 연결. 코드 문법·계산 예시 검사 수행. Pages 실배포 및 아이폰 작동 별도 확인 필요.

## 2026-11-10 v0.7.17 최신 개발 기록
- app.js: auctionBidDepositWon, auctionBidCalculator, auctionPrebidChecklist 추가. 직접 등록된 사건 상세 '개요'와 수도권 수집사건의 상세 카드에 표시. 가정 입찰가(만원)×선택한 비율(10/20%)로 예상 보증금 산출. 비율 초기값 없음; 법원 공고 확인 필요.
- 입찰 전 확인사항은 안내용 목록이며 완료 여부를 저장하거나 법적 권리 검증을 수행하지 않음.
- v0.7.17 / auction-shell-v0717 / VERSION.txt 정합성. 소스 문법 및 계산 케이스 8개 검사 성공. GitHub Pages 배포 및 iPhone 화면 테스트는 확인 필요.
- 기존 사용자가 승인한 UI 아이콘 및 지도 연결, 개인 저장 기록 유지.

## 2026-11-10 v0.7.16 최신 변경
- 지도 버튼 발견 어려움 개선: 사용자 등록 물건 상세의 법원·사건번호 아래 및 수도권 물건의 주소 아래에 '지도·로드뷰 확인' 제목과 주소 검색 버튼을 배치. 지도 링크 정책은 변경 없음.
- 버전 0.7.16, SW cache auction-shell-v0716. 코드 문법 및 캐시 버전 정합성 검사 완료. 실배포 성공/기기 검증은 별도 확인 필요.
- 사용자 저장 기록 및 기존 디자인·아이콘 수정 없음.

## 2026-11-10 v0.7.15 인수인계
- KST D-day: app.js의 validAuctionCalendarDay / auctionTodayKst / auctionDday. 날짜 검증 실패 시 미확인, 지난 날짜는 경과 일수로 표기. 실제 매각 여부 판단 금지.
- 지도: usablePropertyAddress / auctionMapSearchLink / auctionMapControls. 카카오맵 공식 검색 URL 사용, 로드뷰 직접 URL은 좌표가 없어 미연결. 사용자 등록 물건 상세와 수도권 자동수집 목록에서만 실제 주소형 입력 연결. 시범 가상 물건 지도 미연결.
- 상세 개요에 법원·사건번호·물건번호 표시 강화. 권리·투자위험 자동판단 기능 신규 추가 없음.
- v0.7.15 (SW auction-shell-v0715). GitHub 소스 문법과 D-day 순수함수 KST/유효날짜/주소 차단 검사 통과. GitHub Pages 실배포 및 iPhone 실기기 테스트는 확인 필요.

## 2026-11-10 v0.7.14 업데이트 경로 수정
- 원인 확인: scripts/verify-pages-release.cjs의 기존 빠른 메뉴 아이콘 고정 문자열 검사가 v0.7.11 이상 동적 렌더러와 불일치. 검사를 동적 구조 기반으로 수정하고 회귀 테스트를 추가.
- 앱 버전 상태 UI: 서버 확인 실패 시 '최신' 단정 금지. 서비스워커 업데이트 실패와 VERSION.txt 서버 검사 분리.
- 업데이트 적용: 동일 경로 새로고침 대신 ?app_update=<version> 쿼리로 탐색 캐시 우회. 사용자 개인 저장 영역을 삭제하지 않음.
- 버전 v0.7.14; Service Worker auction-shell-v0714. GitHub Pages 배포 실행의 실제 성공 여부는 별도 확인 필요.

## 2026-11-10 v0.7.13 최신 인수인계
- '일정'의 법원 수집물건 검증 예정 카드: 날짜별 5단계 수치가 버튼으로 바뀜. 해당 물건 ID 집합을 수도권 목록에서 조회하고 기존 물건별 단건 수동 재조회로 연결.
- state: capitalReviewDate, capitalReviewStage. 부분수집 스냅샷 수집시각 및 건수 동시 검증; 불일치 시 검증 예정 항목 차단하고 '전체 수집목록 보기' 제공.
- 법원 자동 조회 추가 0회, 법적 결과판정 미개시. 아이콘·기존 개인저장 항목 유지.
- APP_VERSION 0.7.13 / service worker auction-shell-v0713 / VERSION.txt 일치. 2026-11-11 검증예정 96 ID 모두 기준 수집본에서 검색 가능. GitHub Pages 원격 배포와 iPhone 테스트는 별도 확인 필요.

## 2026-11-10 v0.7.12 후속 작업
- v0.7.11에서 분리된 localStorage 빠른 메뉴 설정(auction_quick_menu_v1)을 v0.7.12 새 백업 v3의 preferences.quickMenu에 포함.
- v1/v2 구형 백업은 기존 빠른 메뉴 설정을 보존하며 정상 복원 가능. 신규 백업은 유효한 메뉴 ID 배열만 수용.
- 빠른 메뉴 편집 목록은 실제 사용자가 지정한 순서로 렌더링. 원래 승인 아이콘 유지.
- app.js, sw.js, VERSION.txt 일치 및 코드 문법 검사 완료. 원격 배포 성공/실기기 정상 동작은 아직 별도 확인 필요.

## 2026-11-10 v0.7.11 최신 작업
- 홈 빠른 메뉴는 기본 5개 이미지 그대로 사용하며 편집 버튼으로 9개 후보 중 추가/숨김, 위아래 순서변경, 기본값 복원 가능. 저장 키 auction_quick_menu_v1은 별도 localStorage이며 현재 백업 파일에 포함되지 않음.
- 경매일정 화면에 data/court-verification-plan.json으로 선택 날짜 검증 예정 숫자 표시. 법원 실제 조회 아님. 데이터는 802건 부분수집 기준으로 작성되었고 변경될 수 있음. 11월 11일 법원 단일 사건 실조회 검증은 별도 진행.
- 배포 검사: tests/quick-menu-schedule-ui.cjs 및 tests/court-verification-plan.cjs를 pages.yml에 연결. GitHub Actions 및 iOS 실제 동작은 확인 필요.
- 앱 소스 버전 v0.7.11 / 서비스워커 auction-shell-v0711.

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

- 2026-11-10 UI v0.7.7: 사용자 승인으로 새로 생성한 5개 빠른 메뉴 그림을 `assets/auction-menu-v077.webp`에 묶고, 마지막 경매 망치·집 그림을 `auction-ios-icon-v077.png` 아이폰 홈 아이콘으로 적용. 홈 빠른 메뉴 `수도권 자동등록` 2줄 고정, 주소검색/사건번호 검색 진입 시 각각 입력 예시 구분. 앱/서비스워커/매니페스트 버전 0.7.7 일치; 기존 `auction_skeleton_v1` 로컬 저장 키는 불변. 법원 자동수집 스냅샷은 별도 갱신으로 2026-11-10 01:30 UTC 시점 802건(이전 805건, 이전 목록에서 미관측 29건·변경 0건)이며, 누락의 법적 상태는 미확인. `scripts/verify-pages-release.cjs`에서 이미지 파일 형식, 크기, 참조를 검사.

- 2026-11-10 UI v0.7.8: 홈 화면 하단 고정 탭 5개(홈·검색·일정·관심·공부방)를 승인된 파란색 이미지 시안에서 개별 추출한 투명 배경 스프라이트 `assets/auction-nav-v078.webp`로 변경. 선택 탭 파란색/비선택 탭 저채도, aria-current 및 최소 44px 터치 영역 보강. 기존 `data-page` 이동·저장소 키 `auction_skeleton_v1` 및 수도권 법원 자료는 변경하지 않음. 서비스워커 캐시 `auction-shell-v078`, 배포 검사에서 신규 이미지 확인.

- 2026-11-10 UI v0.7.9: 사용자가 첨부한 상세검색(문서/돋보기/물음표) 및 특수물건(초록 실에 감긴 집/₩) 원본 PNG 두 개를 투명 배경 `assets/auction-search-actions-v079.webp` 스프라이트로 조합하여 통합검색의 두 `secondary` 버튼에 적용. `detailFilters`→`advanced`, `specialFilters`→`special` 이동 그대로 유지. 버튼 가로 정렬/반응형 크기/최소 54px 터치 높이 및 키보드 포커스 보강. JS 저장 키와 법원 데이터 불변. SW CACHE v079, 버전 0.7.9, 배포 전 검증 자산 검사 추가.

- 2026-11-10 UI v0.7.10: 공부방 카테고리 4칸(권리분석·경매절차·세금·명도)에 사용자가 첨부한 이미지 원본을 조합한 `assets/auction-study-categories-v080.webp` 적용. 카드 아이콘 44px(소형 36px), 2열 카드/숫자/텍스트 정렬 보정. 카테고리 `data-study-category` 기능·노트 데이터·저장 키 `auction_skeleton_v1` 변경 없음. 서비스워커 캐시 `auction-shell-v0710`, 배포 자산 검사 추가.
