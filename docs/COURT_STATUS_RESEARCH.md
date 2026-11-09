# 공식 경매 사건·매각결과 조회 후보 검토 (2026-11-10)

## 현 상태
- 앱 v0.7.5까지 PGJ151M01 목록 기반 일부 물건 수집과 /item 가격·기일 재조회가 구현되어 있음.
- 매각·취하·정지·변경·기일변경 등 *법적 진행상태는 미확인*으로 유지해야 함.
- 확인되지 않은 응답 필드·코드값을 추측 매핑하거나 수집 목록의 소실만으로 매각·취하를 확정하지 말 것.
- 현재 작업 환경에서 법원 원 서버 직접 통신 성공 및 샘플 응답 검증을 완료하지 못했음.

## 공개 개발자료에서 찾은 후보 (아직 우리 앱에서 검증되지 않음)
- 사건 단건 조회: POST https://www.courtauction.go.kr/pgj/pgj15A/selectAuctnCsSrchRslt.on
- 매각결과 검색: POST https://www.courtauction.go.kr/pgj/pgjsearch/selectDspslSchdRsltSrch.on
- 매각공고/세부내역: POST /pgj/pgj143/selectRletDspslPbanc.on 및 /pgj/pgj143/selectRletDspslPbancDtl.on
- 검증 전까지 연동·정상 동작·상태코드 매핑이 확인됐다고 표시하지 말 것.

참조 자료(공식 문서가 아닌 제3자 개발 참고자료):
- https://github.com/NomaDamas/k-skill/blob/main/court-auction-notice-search/instruction.md
- https://github.com/Jaemnani/auction

## 상태 자동 판정을 허용하기 전 필수 통과 조건
1. 공식 서버에서 실제 성공 응답을 최소 1건 이상 수집하되 개인식별정보는 프로젝트에 보관하지 않음.
2. 입력 법원코드/사건번호/물건번호와 응답 신원을 정확히 대조. 같은 사건의 여러 물건번호를 혼동하지 않음.
3. 응답 필드명·실제 상태코드·원문 텍스트를 확인해 매각·취하·변경·정지를 각각 분리.
4. 예정기일과 기일 이력, 결과 발표일/확정 여부를 분리. 낙찰/매각허가/대금완납을 혼동하지 않음.
5. 응답 누락·복수/모순·만료·접속차단·HTTP 오류는 전부 미확인. 최근 수집목록에 없는 것만으로 상태 확정 금지.
6. 네트워크 호출 제한과 원 사이트 안내/접근정책을 준수. 무리한 반복·차단 우회 금지.
7. 테스트는 정상/취하/변경/매각/누락/불일치/복수물건·서버 오류 사례를 마련해 판정 오탐 0건 확인.
8. 실제 확인 이후 별도 단계에서 읽기 전용 연동. 사용자의 직접 등록/관심/노트/백업 데이터 절대 자동 수정 금지.

## 2026-11-10 추가 발견 및 진단 도구
- 공개 개발 참고자료에 PGJ151 계열 물건검색 응답 상태 후보 `mulStatcd`가 언급됨. **공식 코드 의미를 아직 확인하지 못함**. [개발 이슈 참고](https://github.com/NomaDamas/k-skill/issues/184).
- 공개 사례의 단건 요청 본문 후보: `{"dma_srchCsDtlInf":{"cortOfcCd":"B000210","csNo":"2026타경12345"}}`. 정확한 동작은 서버 응답이 있어야 검증 가능.
- `scripts/probe-court-case-status.cjs`: 사용자가 지정한 사건을 공식 사이트로 한 번만 POST, 12초 제한, 실패 시 재시도하지 않음. 원 응답 내용을 보관·공개하지 않고 JSON 섹션과 필드명만 출력, 서버 접근 제한은 즉시 중단. **물건번호는 요청 본문에 전달되지 않으므로 단건 응답을 특정 물건의 확정상태로 간주하면 안 됨.**
- 실행 예: `node scripts/probe-court-case-status.cjs 'court-B000210|2026타경12345|1'` (사건번호는 실제 확인된 것 사용).
- `tests/court-status-probe.cjs`: 상태코드 값과 개인정보가 출력되지 않는지, 차단 신호를 판별하는지 확인하는 오프라인 테스트.
- 프로브는 현재 앱/자동 수집/배포에 연결하지 않은 **진단 전용**. 실서버 응답 확인 전 자동 매각·취하 판정은 계속 금지.

## 2026-11-10 검증 후속
- 현재 실행 환경에서 공식 사이트 GET 시 DNS 확인 실패. 실서버 단건 응답의 구조와 상태코드를 **확정하지 못함**.
- 진단 도구는 `json.status=200` 및 실제 데이터 섹션이 있어야 응답 구조 후보로 인정. 빈 데이터·오류 상태는 성공으로 취급하지 않음.
- GitHub Actions `.github/workflows/court-status-probe-tests.yml`에 오프라인 구조 테스트 연결. 법원 서버를 자동 호출하지 않으므로 차단 위험을 늘리지 않음.
- 테스트 코드/배포된 앱에는 자동 매각·취하 판정 또는 상태코드 의미 매핑을 추가하지 않음. GitHub Actions 테스트 성공은 별도로 확인 필요.

## 2026-11-10 후속 검증: 신원 대조 강화
- 진단 코드에서 성공 상태와 비어 있지 않은 데이터 행을 동시에 요구. 빈 배열/빈 객체는 정상 조회로 간주하지 않음.
- `assessIdentity()`는 단일 응답 레코드 안에서 법원코드·사건번호를 먼저 확인하고, 같은 레코드의 물건번호까지 같을 때만 `lotIdentityMatched:true`로 구분.
- 사건번호만 맞거나 다른 물건번호만 확인된 경우 특정 물건의 상태로 오인하지 않음.
- 모든 신원 대조 결과는 `statusDecisionAllowed:false`로 고정. 매각·취하·기일 변경 상태코드는 아직 해석하지 않음.
- GitHub에서 가져온 실제 진단 스크립트 및 오프라인 테스트 코드를 JS 실행 환경에서 로드해 전체 테스트 통과. GitHub Actions 실행 성공과 실제 법원 서버 연결은 별도 미확인.

## 2026-11-10 GitHub Actions 실서버 단발 진단
- `.github/workflows/court-case-live-probe.yml` 별도 등록. 워크플로우 파일 신규 push 또는 수동 실행에서 동작하며 정기 반복하지 않음.
- 검증된 기존 스냅샷의 사건 `court-B000210|2008타경25092|1` 1건으로 **단일 POST** (재시도 없음/12초 제한). 원문 응답을 저장하지 않고 구조와 식별 일치 여부만 출력.
- 서버 연결/거절/빈 데이터 실패는 안전한 결과이며 사건 진행상태 미확인을 유지. 자동매각·취하 상태 변환 불허.
- Actions 실행 성공, 실제 응답 확보, 코드별 상태 뜻은 **아직 확인하지 못함**. 앱 v0.7.5·배포 자료 변경 없음.

## 2026-11-10 사건 신원 불일치 차단 (후속)
- 사건 조회 진단은 JSON 구조 정상만으로 성공 처리하지 않고 반환된 레코드에 요청 법원코드와 사건번호가 같은 레코드에서 존재해야 종료 성공(0). 불일치 시 종료 실패(1).
- 물건번호까지 일치하지 않으면 사건 단위 응답으로만 인정하며 **특정 물건의 진행상태는 미확인**으로 표시. 진단 출력의 `statusDecisionAllowed`는 항상 false.
- 현재 GitHub 저장소 진단 스크립트/테스트 코드를 오프라인 JavaScript 환경에서 직접 실행하여 통과 확인.
- GitHub 연결을 통해 라이브 Actions의 실행 로그 조회는 제공되지 않아, 실제 공식 서버 연결 성공이나 실서버 상태코드 매핑은 여전히 미확인. 원본 자료/앱 버전 수정 없음.

## 진단 로그 신뢰성 개선 (2026-11-10)
- 사건 신원 불일치가 확인되면 JSON 분석 내용 출력 **전** 종료 실패 처리. 타 사건 응답 필드가 정상 진단처럼 보이는 위험 차단.
- GitHub에 저장된 최신 진단 코드 및 오프라인 검증을 재실행해 통과.
- GitHub 연결의 커밋 상태 조회에 진단 실행 결과가 나타나지 않고 웹/컨테이너에서 공식 페이지 접근도 실패하여, 실제 GitHub Actions 실행 결과와 법원 서버 응답은 **확인되지 않음**.
- 실서버 확인 전까지 앱 버전(v0.7.5), 수집 데이터, 자동 매각·취하 판정은 변경하지 않음.

## 2026-11-10 실서버 진단 첫 결과 및 후속
- `data/court-case-probe-status.json` 최초 실제 생성 확인: `outcome=unverified`, `reason=identity_mismatch`, caseIdentityMatched=false, lotIdentityMatched=false, legalStatusVerified=false (한국시간 약 05:07).
- 진단 작업이 실제 기록 파일을 생성했다는 점은 확인되었지만, 법원 서버와의 HTTP 통신 자체/정확한 요청 스키마 성공 여부는 결과만으로 확정할 수 없음.
- 신원 불일치 원인 조사용으로 `scripts/probe-court-case-status.cjs`가 실패 시에도 원본 값 없이 구조/필드명만 stdout JSON으로 내보내며, 워크플로우는 필드명·행수만 제한하여 `responseShape`에 기록하도록 수정.
- 이 구조 진단용 후속 워크플로우의 실행 결과는 아직 미확인. 매각·취하 자동 판정·실사용 데이터 변경 없음.

## 2026-11-10 공식 응답 구조 확인 이후 수정
- 실제 `data/court-case-probe-status.json`에 `responseShape`가 기록됨. 법원 응답 구조에는 `dma_csBasInf` (cortOfcCd, csNo, csProgStatCd), `dlt_dspslGdsDspslObjctLst` (cortOfcCd, csNo, dspslGdsSeq, auctnGdsStatCd), `dlt_rletCsGdsDtsDxdyInf` (dspslGdsSeq, auctnDxdyRsltCd) 등이 확인됨. **코드값 자체 및 의미는 확인되지 않았음**.
- 기존 `assessIdentity()`가 `dspslGdsSeq`를 인식하지 못해 물건번호 불일치의 원인이 될 수 있었음. 해당 필드를 추가하고, 법원/사건번호가 같은 행일 때에만 물건번호가 일치한 것으로 인정하도록 수정.
- 사건번호 `csNo`가 화면용 사건번호인지 내부 숫자코드인지 알 수 없어, 값 자체를 출력하지 않고 `responseCaseFormat` 형식 분류만 결과에 저장하도록 수정. 임의 변환/매칭은 하지 않음.
- 결과 파일의 마지막 확인 항목은 여전히 `identity_mismatch`; 실서버 상태 신원 검증 실패 및 자동 상태 표시 비활성화 유지.
- 수정된 저장소 스크립트와 오프라인 테스트 실행 통과. GitHub Actions 최신 실행 결과와 법원 상태 코드 의미 검증은 별도 미확인.

## 2026-11-10 숫자형 내부 사건번호 확인과 비식별 힌트
- 실서버 후속 결과 `data/court-case-probe-status.json`: `responseCaseFormat=digits_only`, `reason=identity_mismatch`. 사건 기본정보 `dma_csBasInf.csNo`의 형식이 화면용 `2008타경…`와 다르다는 점 확인.
- 숫자형 내부 사건번호를 화면용 사건번호로 무리하게 변환하거나 신원 일치를 추정하지 않음.
- `assessIdentity`에 `baseCourtMatches`, `internalCaseYearMatches`, `internalCaseSerialSuffixMatches`, `relatedDisplayAliasMatched`, `internalLotRowFound`를 추가. 모두 진단용 불리언 정보로, `caseIdentityMatched`/`lotIdentityMatched`를 조작하지 않음.
- 워크플로우는 `identityHints`에 각 항목의 참/거짓만 기록하며 내부 사건번호 원문, 개인정보, 진행상태코드 값은 저장하지 않음.
- 최근 보고서에는 아직 새 `identityHints` 항목이 없으므로 실제 일치 여부는 **미확인**. 오프라인 회귀 테스트 통과, 앱/법적 상태 자동판정/수집목록 변경 없음.
