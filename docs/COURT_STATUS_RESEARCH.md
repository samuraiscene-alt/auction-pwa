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

## 2026-11-10 내부 사건 행 정합성 검사 추가
- 실서버 identityHints 확인: baseCourtMatches=true, internalCaseYearMatches=true, internalCaseSerialSuffixMatches=true, internalLotRowFound=true, relatedDisplayAliasMatched=false. 내부 사건과 물건의 관계를 뒷받침하지만 화면용 사건번호의 직접 일치는 아직 미확인. statusDecisionAllowed=false 유지.
- 진단 코드에서 모든 물건 행의 법원/내부사건번호 일치(internalCaseRowsConsistent) 및 목표 물건번호의 단일 행 여부(matchingLotRowUnique)를 구분. 중복/혼합 사건 오판 방지 오프라인 테스트 통과.
- 두 신규 항목의 실서버 진단은 별도 확인이 필요. 매각·취하·기일변경 상태 자동판정은 활성화하지 않음.

## 2026-11-10 연결 진단의 원인 세분화
- 실제 확인한 보고서(2026-11-09T22:00:51.620Z): `responseCaseFormat=digits_only`, `baseCourtMatches=true`, `internalCaseYearMatches=true`, `internalCaseSerialSuffixMatches=true`, `internalLotRowFound=true`, `internalCaseRowsConsistent=true`, `matchingLotRowUnique=true`; 화면 표시번호 직접 일치는 여전히 실패.
- 이 조합은 타 사건 조회임을 뜻하는 것이 아니라, 법원 내부 숫자 사건번호를 화면용 타경번호로 공식적으로 대조하지 못한 경우에 해당할 수 있음. 따라서 후속 진단은 `internal_case_id_unmapped`와 일반 `identity_mismatch`를 분리해 기록하도록 수정.
- 현재 연도/뒤 숫자만 맞는 것으로 사건을 확정하지 않고 `caseIdentityMatched=false`, `legalStatusVerified=false` 유지. 공식 연계 규칙과 실제 상태코드 의미가 검증되기 전까지 앱에는 자동 표시 금지.
- 안전 진단 코드 오프라인 테스트 전체 통과. 다음 Actions 실행에서 새 분류의 실서버 결과 확인 필요.

## 2026-11-10 화면용 사건번호 직접 대조 진단
- 공식 법원 UI 공개 XML에는 `srnSaNo`가 사용자용 사건번호이며 상세 조회 `csNo`와 별도의 식별 필드로 존재함. 참고: https://gist.github.com/wiggleji/e091fc7827d7032ce638a162777c0602
- 상세 응답 `dma_csBasInf.expCsNo`는 구조상 존재하지만 화면용 사건번호와 동일한 필드인지 **공식 검증 전**. 원문을 기록하지 않고 `baseExpCaseExact`와 `baseExpCaseFormat`만 진단하도록 추가.
- 직접 일치하더라도 상태 자동판정 허용은 계속 false. 내부 숫자 사건번호를 연도/꼬리숫자로 추정 변환하지 않음.
- 저장소 오프라인 테스트 통과. 후속 실서버 결과의 새 진단 힌트는 아직 확인되지 않음.

## 2026-11-10 목록 행 직접 연결 진단 추가
- 기존 상세조회 응답은 `csNo`가 숫자형이며 `srnSaNo`(화면용 사건번호)와 확정적으로 대조되지 않았음.
- 새 `scripts/probe-court-case-list-bridge.cjs`는 기존 목록 API를 **한 번만** 조회해 법원코드(`boCd`), 표시사건번호(`srnSaNo`), 물건번호(`maemulSer`)가 모두 같은 **단일 행**에 내부 `csNo`가 존재하는지 검사. 없거나 여러 행이면 검증 실패. 원본 번호값과 개인정보는 결과에 남기지 않음.
- `scripts/validate-court-case-bridge.cjs` 및 `tests/court-case-bridge.cjs`로 일치/누락/다른 사건/다른 물건/중복 등 회귀 테스트를 실제 소스 기준으로 통과.
- `.github/workflows/court-case-list-bridge.yml`에서 단발 조회 후 `data/court-case-list-bridge-status.json`에 비식별 요약 기록 예정. 아직 실제 실행/결과 파일 확인 전.
- **주의:** 목록 한 행에 두 번호가 들어온다 해도 그 내부 `csNo`가 상세조회 `csNo`와 동일한지 교차 비교하지 않았음. `detailCaseCrossChecked=false`, `legalStatusVerified=false`; 매각·취하 상태 확정 금지.

## 2026-11-10 목록·상세 교차검증 실서버 결과
- 목록 조회의 정확한 법원/표시사건/물건 행 수: 1. 해당 목록 행에는 `csNo` 필드 없음, `docid` 필드 있음.
- 새 진단은 목록 1회+상세 1회 조회. 같은 실행 메모리에서 상세의 `dma_csBasInf.csNo`와 목록 `docid`/`csNo`가 완전히 같은 값인지 교차 대조하고 원본값은 전혀 보관하지 않음.
- 결과 `data/court-case-list-bridge-status.json` (2026-11-09T22:10:09.757Z): `exactDisplayLotRows=1`, `detailInternalCaseConsistent=true`, `detailLotRowUnique=true`, `docidFormat=other`, `docidExactlyMatches=false`, `listCsNoExactlyMatches=false`, `detailCaseCrossChecked=false`, `legalStatusVerified=false`.
- **목록 `docid`를 내부 사건번호로 바로 쓸 수 없음.** 값에 임의 파싱/접두·접미 처리나 변환을 적용해 신원을 확정하지 말 것.
- 브리지 테스트 중 두 후보값이 동시에 있던 가상 테스트 케이스를 분리하여 전체 오프라인 회귀 통과. 불충분한 매핑 및 상태코드 확정은 계속 금지.

## 2026-11-10 목록의 saNo·printCsNo 직접 대조 시도
- 공개 개발 이슈에는 물건 목록 응답 후보 필드 `saNo`(사건번호), `printCsNo`(표시번호)가 언급됨: https://github.com/NomaDamas/k-skill/issues/184 . 이 정보는 **제3자 참고자료**이며 공식 의미를 검증하지 못함.
- 목록/상세 교차검증 코드에서 목록의 `saNo`와 상세 `dma_csBasInf.csNo`가 정확히 일치하는지, 동일한 목록행 `printCsNo`와 화면용 사건번호가 정확히 일치하는지 동시에 검사. 한쪽만 일치/누락/중복이면 연결 실패. 추정 파싱 금지.
- 불리언 진단 필드: `saNoFieldPresent`, `printCsNoFieldPresent`, `listSaNoExactlyMatches`, `printCsNoMatchesDisplay`. 원본 번호 값은 출력·저장하지 않음.
- 저장소 소스로 오프라인 테스트 전체 통과. 마지막 확인한 실서버 보고서(2026-11-09T22:12:20.760Z)에는 신규 필드가 아직 없고 `detailCaseCrossChecked=false`; 실서버 매핑 성공 주장 금지.
- 앱 v0.7.5와 기존 목록, 개인 저장자료, 매각·취하 미확인 표시 유지.

## 2026-11-10 목록/상세 연결 규칙 수정
- 실제 목록/상세 조회에서 `listSaNoExactlyMatches=true`, `printCsNoMatchesDisplay=false`, 상세 내부 사건/물건 일치와 유일성=true로 기록됨. 목록의 `srnSaNo`가 이미 화면용 사건번호와 같은 행에서 일치하므로 `printCsNo`까지 요구하는 것은 과도한 조건일 수 있음.
- `assessCrossBridge`는 유일한 목록 행에 대해 `srnSaNo`(표시 사건번호) + `saNo`(상세 csNo와 정확 일치) + 동일 법원/물건의 상세 행을 요구. `docid` 단독 매핑 금지, `csNo`가 목록 행에 존재할 경우 충돌도 거부.
- 저장소에서 최신 브리지 회귀 테스트 직접 실행 통과. 다만 진단 결과 파일의 최근 기록은 `offline_test_failed`로, 실제 Actions 환경의 최신 완전 통과는 아직 확인하지 못함. 부정확한 법적 상태 판정 방지 위해 앱 상태 자동판정은 활성화하지 않음.

## 2026-11-10 공식 목록/상세 연결 검증 실제 통과
- 실서버 진단 파일 `data/court-case-list-bridge-status.json` (2026-11-09T22:38:57.728Z)에서 `detailCaseCrossChecked=true`, `exactDisplayLotRows=1`, `listSaNoExactlyMatches=true`, `detailInternalCaseConsistent=true`, `detailLotRowUnique=true` 확인. 법원/화면사건/물건의 동일 목록 행과 상세 내부 `csNo`의 **정확한 연결**을 표본 한 건에서 검증.
- `printCsNoMatchesDisplay=false`, `docidExactlyMatches=false`; 이 두 필드로 판정하면 안 됨. 다른 사건/법원/중복 행은 계속 fail-closed.
- 두 공식 조회에 하나의 12초 제한을 공유하던 진단 도구를 각 요청 개별 12초 제한으로 수정. 조회 실패시 list/detail 단계를 비식별 `failedStage`로 기록. 재시도 및 우회접속 없음.
- 사건 **신원 교차검증 성공은 법적 상태 해석과 별개**. `legalStatusVerified=false` 유지. 법원 공식 상태코드 의미 대응표 확보 전까지 매각/취하/변경 상태 자동 판정 금지.
- 참고 공개 기술자료: https://github.com/NomaDamas/k-skill/blob/main/court-auction-notice-search/instruction.md (서드파티 필드 매핑 기술자료, 공식 법원 코드표 아님). 법원 사건구분 안내 https://www.scourt.go.kr/portal/information/event/guide/index3.html 의 '013=타경'는 사건구분코드이며 매각/취하 상태코드가 아님.

## 2026-11-10 실서버 상태 원시코드 채증 성공 (자동 해석 금지)
- 단건 목록·상세의 사건/물건 신원 교차검증 `detailCaseCrossChecked=true`를 전제로 `scripts/extract-court-status-evidence.cjs`와 `tests/court-status-evidence.cjs` 추가. 타 물건 코드, 상태 의미 추정, 당사자정보/원본 응답 저장을 차단하고, 짧은 영숫자 코드와 날짜만 남김. 저장소 기준 오프라인 회귀 통과.
- `data/court-case-list-bridge-status.json` 2026-11-09T22:42:52.023Z 실서버 결과: `statusEvidence.identityVerified=true`, `caseProgressCode=0002100001`, `caseSuspensionCode=03`, `lotStatusCode=01`, `lotProgressFlag=Y`, `listStatusCode=01`, 기일 20261015 `resultCode=002`/`kindCode=01`. **각 코드의 법적 뜻은 확인되지 않았으므로 `legalStatusVerified=false`로 유지.**
- 공개 웹 탐색에서 법원 내부 `auctnDxdyRsltCd`, `auctnGdsStatCd`에 대해 신뢰할 수 있는 공식 의미 대응표 확보 실패. 여러 민간 제공처가 진행상태 API를 제공하지만 당사 API 정의와 법원 코드표가 일치하는지 미확인(예: https://hyphen.im/product/view?seq=207, https://apick.app/dev_guide/court_auction). 민간 코드표를 공식 기준으로 대체하지 않음.
- 해당 증거는 표본 단 한 물건에 대한 원시 데이터 채증이며, 매각/유찰/취하/정지/변경 상태를 나타낸다는 뜻이 아님. 현재 앱 `v0.7.5`, 자동 상태 확정 비활성화, 개인자료 및 목록 불변.

## 2026-11-10 수도권 세 지역 실서버 표본 확장
- 더 이상 2008년 사건 한 건에 의존하지 않고, 기존 `data/capital-court-pilot.json`에서 실제 확보한 **2025년 사건**을 각 지역 1건씩 선택하여 공식 목록 1회 + 상세 1회, 지역별 최대 2회만 조회하도록 `.github/workflows/court-three-region-probe.yml` 신설. 샘플: 서울 `court-B000210|2025타경663|1`, 경기 `court-B000214|2025타경2098|1`, 인천 `court-B000240|2025타경39|1`. 정기 실행/재시도 없음, 기존 앱 목록/사용자 데이터 불변.
- 결과 `data/court-three-region-probe-status.json` (2026-11-09T22:59:14.501Z): `allIdentitiesLinked=true`로 **3/3건 목록·상세 신원 교차검증 통과**, 3건 모두 `statusEvidenceAvailable=true`.
- 3건 모두 `lotStatusCode=01`, `caseProgressCode=0002100001`; `caseSuspensionCode`는 서울/인천 `00`, 경기 `04`. **코드 의미는 공식 검증 전이므로 정지·취하 등 법적 상태로 해석하지 않는다.**
- 최근 기일 결과코드는 3건에서 `null`(검증된 기일 결과코드 없음)이며, 이는 매각/유찰/변경을 의미하지 않음. 기일 코드 반환 순서를 최신순으로 오인하지 않도록 날짜 기준 정렬 적용.
- 지역마다 1건씩이므로 법원별 스키마의 다른 기일/상태 사례까지 대표하지 않음. `legalStatusVerified=false` 및 자동분류 차단 계속 유지.

## 2026-11-10 법원 원문 코드명 변환 경로 확인 및 판정 게이트
- 공개된 법원 UI 원본 자료(https://gist.github.com/wiggleji/e091fc7827d7032ce638a162777c0602)의 매각기일 결과 렌더링 코드에 `pgjUtil.getSTGcodeSystemNm('LJH', 'AUCTN_DXDY_RSLT_CD', gdsDspslDxdyLst[i].auctnDxdyRsltCd)`가 확인됨. 종류는 `PGJ/AUCTN_DXDY_KND_CD`를 별도로 사용함. 이것은 **코드 그룹 식별**의 근거이며, 예를 들어 `002`가 매각/유찰/취하 중 무엇인지를 보여주는 코드표는 아님.
- `scripts/court-status-meaning-gate.cjs`, `tests/court-status-meaning-gate.cjs` 추가. 공식 화면의 같은 법원·사건·물건·기일 결과임을 사람이 실제로 확인한 비교증거만 수용 대상으로 제한하고, 민간 사이트/다른 코드 그룹/다른 물건·기일/중복 행을 거부. 현재는 비교 일치하더라도 항상 `verified:false` 및 `label:null`로 자동 상태 표시를 차단.
- 회귀검증 통과. 공식 코드표/공식 UI의 동일 사례 결과를 아직 직접 읽어 확정하지 못했으므로 원시코드 `01`/`002` 등의 뜻은 **미확인**. 매각·유찰·취하·변경 자동판정 미구현.

## 2026-11-10 목록 표시문구 직접 대조 진단
- 공식 법원 화면 소스에서 매각기일 결과를 `pgjUtil.getSTGcodeSystemNm('LJH','AUCTN_DXDY_RSLT_CD',code)`로 표시한다는 사실 재확인. 이는 코드 **이름 조회 방식**이며 원시 `002` 등의 법적 의미를 확정하는 값 대응표는 아님. 참고: https://gist.github.com/wiggleji/e091fc7827d7032ce638a162777c0602
- 한편 검색 목록의 `userStPrint`, `userLstPrint`, `mulStatNm`, `maemulStatNm`에 화면 표시 문구가 있을 수 있는지 확인하는 **진단만** 추가. 공식 목록과 상세의 사건·물건 신원이 완전히 일치하는 경우에만 처리.
- 반환 문구가 `진행/매각/유찰/취하/변경/연기/정지/취소/종국/미종국/신건` 가운데 하나와 정확히 같을 때만 `exactDisplayLabel`로 기록. HTML·주소·기타 문구는 null 처리하고 원문 및 당사자정보를 저장하지 않음. 목록 표시 텍스트는 개별 매각기일 결과와 다를 수 있으므로 원시 `auctnDxdyRsltCd`와 자동 매핑하거나 법적 확정 상태로 사용하지 않음.
- 오프라인 회귀 테스트 통과. 새 보고서의 `listingDisplayEvidence` 필드 실서버 결과 확인 전까지 표시문구 확보 성공 주장 금지. 앱 v0.7.5/805건 기존 스냅샷 및 개인 저장자료 불변.

## 2026-11-10 목록 상태필드 범위 축소 및 안전검증
- 최신 공식 목록 실서버 결과에 실제로 존재하는 상태 관련 필드명 `jinstatCd`, `mulStatcd`, `mulJinYn` 확인. 광범위한 `*Nm` 검색은 `buldNm`(건물명), `carNm`(차량명), `jiwonNm`(법원명) 등 무관한 값을 끌어오는 문제가 있어 제외.
- `scripts/extract-court-status-evidence.cjs`는 세 필드만 이름으로 진단하고, `listProgressCode`(`jinstatCd`) 및 `listProgressFlag`(`mulJinYn`)를 안전한 문자형 원시코드로만 기록. 기존 `listStatusCode`(`mulStatcd`) 유지. 코드 의미는 절대 추정하지 않음.
- `.github/workflows/court-case-list-bridge.yml`의 결과 저장도 3개 필드 화이트리스트로 제한. 기존 무관한 이름 필드 기록은 중단.
- 기존 브리지/원시코드 추출 테스트를 실제 GitHub 저장소 소스로 다시 실행하여 모두 통과. 신규 진단 이후 Actions 실서버 결과의 성공 여부는 별도 확인 필요하며, 앱 v0.7.5·805건 목록·개인정보와 자동 매각/취하 판정은 변경하지 않음.

## 2026-11-10 기일 결과 이력 순서·충돌 안전장치
- 법원 기일 이력 `dlt_rletCsGdsDtsDxdyInf`의 행 순서가 최신순임을 가정하지 않도록 `dxdyYmd` 날짜 내림차순 정렬 후 최대 20개만 기록. 기존 코드는 처음 20개를 선택하여 최신 기일이 뒤쪽에 있으면 누락될 가능성이 있었음.
- 동일 물건의 같은 날짜·기일종류에 서로 다른 `auctnDxdyRsltCd`가 존재하면 `scheduleConflictDetected=true`로 표시하고 해당 기일 결과 전체를 빈 배열로 처리. 동일 코드 중복은 단일 항목으로 정리. 결과 개수가 20건을 넘는지는 `scheduleEvidenceTruncated`로 별도 표시.
- `tests/court-status-evidence.cjs`의 최신순 정렬/충돌/중복 회귀 테스트 통과. `.github/workflows/court-case-list-bridge.yml`에도 안전장치 플래그 저장 및 충돌 시 결과 봉쇄 적용.
- 공식 기일 결과코드 `002`의 정확한 법적 의미는 여전히 미확인. 앱 v0.7.5 및 기존 805건 목록, 개인 저장자료·화면 변경 없음.

## 2026-11-10 기일 날짜 실제 달력 검증
- 공개 법원 화면 소스 `PGJ15BM01.xml`에서 `AUCTN_DXDY_RSLT_CD` 그룹을 이름으로 변환하는 호출만 확인됨. 값 `002`의 의미를 공식적으로 확정할 수 있는 코드/이름표는 미확보: https://gist.github.com/wiggleji/e091fc7827d7032ce638a162777c0602
- `scripts/extract-court-status-evidence.cjs`의 `safeDay`를 YYYYMMDD 정규식 통과만으로 수용하던 방식에서 **그레고리력 일자(월 범위·월별 최대일수·윤년)** 실제 검증으로 강화. `20261399`, `20260229` 거부, `20240229` 허용.
- `tests/court-status-evidence.cjs` 회귀 사례 추가; 기존 신원 검증 테스트와 함께 모두 통과. 실서버 보고서 `data/court-case-list-bridge-status.json` (2026-11-09T23:40:04.049Z)에서 사건 연결 성공, 결과 기일 `20261015` 정상, 법적 상태 미검증.
- 앱 버전 v0.7.5, 805건 시범 목록, 사용자의 직접 등록/저장 자료 불변. 결과코드와 최종 법적 상태를 연결하는 자동 기능은 미적용.

## 2026-11-10 법원 결과코드의 기일 종류 혼동 차단
- 법원 공개 화면 `PGJ15BM01.xml`에서 **기일 결과명**은 `LJH/AUCTN_DXDY_RSLT_CD`, **기일 종류명**은 `PGJ/AUCTN_DXDY_KND_CD`로 별도 조회함. 그룹은 다르며 코드값 숫자가 같아도 의미가 같다는 뜻이 아님. 출처: https://gist.github.com/wiggleji/e091fc7827d7032ce638a162777c0602
- `scripts/court-status-meaning-gate.cjs`는 공식 화면 대조를 기록하기 전 사건 물건 신원 확인에 더해 **같은 날짜, 같은 결과코드, 같은 기일종류 코드**의 단일 행만 허용. 다른 기일종류의 결과코드와 오인 연결 차단.
- `scheduleConflictDetected=true`, `scheduleEvidenceTruncated=true`, `historyBounded=false`인 경우 아예 비교를 거부. 코드 뜻을 추측하거나 자동 앱 상태를 확정하지 않는 기존 방침 유지(`verified:false`, `label:null`).
- `tests/court-status-meaning-gate.cjs` 회귀 테스트 통과. `.github/workflows/court-case-list-bridge.yml`에도 실행 연결. 공식 코드값 `002`의 이름은 아직 미확인. 앱 v0.7.5/805건 스냅샷/개인자료 무변경.

## 2026-11-10 법원 매각결과검색 전용 화면 진단
- 제3자 공개 기술조사 `Jaemnani/auction`의 `docs/api_recon.md`에서 매각결과검색 화면 `PGJ158M00/01` 및 API 후보 `/pgj/pgjsearch/selectDspslSchdRsltSrch.on` 단서를 확인. 타인 분석자료이므로 공식 동작/요청형식 확정 근거로 취급하지 않음.
- `scripts/probe-court-sale-result-screen.cjs` 추가: 법원 공식 `/pgj/ui/pgj100/PGJ158M01.xml`을 **단 1회 읽기 전용** GET하여 API 경로/화면 참조/제출항목 이름만 정규식으로 추출. 개인정보·응답 원문·코드값 저장하지 않음. 별도 `.github/workflows/court-sale-result-screen-probe.yml`에서 단발 실행 및 비식별 `data/court-sale-screen-status.json` 기록.
- 첫 실서버 보고(2026-11-09T23:53:51.498Z): `observed=true`로 공식 화면 XML 조회 성공. 하지만 `officialApiPaths=[]`, `dataMapIds=[]`, `saleResultSearchEndpointPresent=false`; **API 경로는 이 화면 텍스트에서 직접 확인되지 않음.** 부재가 API 존재하지 않음을 뜻하지는 않음. 화면 참조/제출 태그 추가 진단 결과는 후속 보고를 확인해야 함.
- 민간 웹페이지에서 `002`를 유찰 횟수와 함께 표기하는 사례를 찾았으나, 법원이 해당 코드의 이름을 공식적으로 직접 확정한 값 대응표가 아니므로 `002=유찰`을 제품에 반영하지 않음. 예: https://auction-seven-omega.vercel.app/p/B2508262024013006910033
- **안전:** 앱 v0.7.5, 805건 목록, 사용자 저장자료, 법적 상태 자동판정 모두 불변.

## 2026-11-10 공식 매각결과검색 화면 PGJ158M02 직접 확인
- 법원 공식 `/pgj/ui/pgj100/PGJ158M01.xml`에서 하위 화면 `PGJ158M02` 참조 확인. 해당 하위 화면 `/pgj/ui/pgj100/PGJ158M02.xml`도 실제 조회 성공.
- `data/court-sale-screen-status.json` (2026-11-09T23:55:21.524Z) 실서버 결과: `observed=true`, `saleResultSearchEndpointPresent=true`, `officialApiPaths=['/pgj/pgjsearch/selectDspslSchdRsltSrch.on']`, `dataMapIds=['dma_srchGdsDtlSrchInfo','dma_pageInfo','dlt_srchResult']`. 이 세 필드명과 API 호출 **경로의 존재**는 공식 화면 정의에서 직접 검증됨.
- API의 **요청 필드 실제 값, 응답 결과, 기일 결과 코드↔표시명 대응표는 아직 미검증**. 운영 앱에 매각/유찰/취하를 적용할 단계가 아님. 읽기 전용 화면 XML 진단 결과만 저장. 앱 v0.7.5/805건 기존 목록/개인자료 모두 불변.

## 2026-11-10 매각결과검색 API 직접 조회 1차
- 법원 공식 `PGJ158M02.xml`에서 확인된 `POST /pgj/pgjsearch/selectDspslSchdRsltSrch.on`에 대해 고정 표본 `court-B000210|2008타경25092|1`을 대상으로 **단발, 읽기 전용** 조회 진단 추가: `scripts/probe-court-sale-result-search.cjs`, `scripts/validate-court-sale-result-search.cjs`, `tests/court-sale-result-search.cjs`, `.github/workflows/court-sale-result-search.yml`.
- 응답에서 법원코드(`boCd`), 표시사건번호(`srnSaNo`), 물건번호(`maemulSer`/`mokmulSer`)가 **동일한 단일 행**에서 모두 일치해야만 해당 행의 제한된 코드/표시문구를 기록. 개인정보·원문 응답·주소 저장 금지. 상태확정은 언제나 false.
- 로컬 저장소 소스 기반 테스트 및 진단 스크립트 문법 확인 통과. 초기 실서버 결과 `network_error`가 발생해 단계별 네트워크 실패 분류 보강. 이어서 실서버 `data/court-sale-result-status.json` 2026-11-10T00:02:41.228Z에서는 `observed=true`, `reason=processed`, `rowCount=0`, `identityMatched=false`. **공식 검색 API 응답을 받았지만 대상 사건 결과가 반환됐다는 뜻은 아님.**
- 현재 요청은 기존 물건검색의 필드 집합을 결과검색 API에 적용한 첫 진단용 구성. 결과검색 화면의 검색조건/기간 필터가 다를 수 있으므로 `0건`을 매각·취하 등으로 해석하지 않음. `002`의 공식 의미 및 결과명 확인도 아직 실패.
- 앱 v0.7.5, 기존 805건 목록, 사용자 저장자료, 자동 법적상태 표시 전부 불변.

## 2026-11-10 매각결과검색 공식 입력필드 확보 및 0건 재검증
- 실서버 `PGJ158M02.xml`에서 실제 검색조건 이름을 비식별 진단으로 확인. `auctnGdsStatCd`, `dspslAmtMin/Max`, `cortOfcCd`, `csNo`, `pgmId` 등 23개가 확인되며, `getJSON`/`set`/`setJSON`은 자료필드가 아닌 스크립트 메서드로 제외. `data/court-sale-screen-status.json` 2026-11-10T00:04:30.946Z 참고.
- `scripts/probe-court-sale-result-search.cjs`를 기존 물건검색 PGJ151M01용 47필드 요청 대신 **공식 매각결과검색 화면에서 관찰된 필드로만 구성**하도록 수정. 임의로 넣던 `mvprpRletDvsCd`, `cortAuctnSrchCondCd`, `notifyLoc`도 제거. `pgmId=PGJ158M02`, 검증된 고정 법원·사건번호로 단발 읽기 전용 조회.
- 수정 후 `data/court-sale-result-status.json` 2026-11-10T00:05:05.852Z: `observed=true`, `reason=processed`, `rowCount=0`, `identityMatched=false`. **검색조건 필드 정정만으로는 0건이 해결되지 않았음.**
- 현재 시범 목록 `data/capital-court-pilot.json`의 805건 중 `saleDate <= 2026-11-09`인 기록은 **0건**. 따라서 시범 목록에서 과거 매각결과 교차검증용으로 이미 끝난 사건을 자동 선별할 수 없음.
- 0건의 이유는 검색범위/필수 기본값/대상 사건 수록 여부 등이 아직 미확인. 매각/취하/유찰 상태로 해석 금지. 공식 UI의 검색조건 기본값과 최근 기일이 지난 사건의 **동일사건 표본**을 먼저 확인해야 함.
- 사용자 앱 v0.7.5, 개인자료, 기존 805건 목록은 불변. 실서버 진단 로직만 수정.

## 2026-11-10 매각결과 제공기간을 고려한 조회 대상 변경
- 법원경매정보 사용 안내를 인용한 외부 자료에는 매각결과를 매각기일 다음날부터 7일간 제공한다는 설명이 있음(https://eziro.com/info/%EB%8C%80%EB%B2%95%EC%9B%90-%EB%B2%95%EC%9B%90%EA%B2%BD%EB%A7%A4%EC%A0%95%EB%B3%B4-%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80). 공식 최신 원문으로 확인한 정책은 아니므로 **진단용 보수적 1~7일 범위 가정**으로만 활용하며 법원 서비스의 보장기간이라고 주장하지 않음.
- 기존 2008년 사건의 최종 확인 기일은 2026-10-15로 11월 10일 기준 26일 경과. 매각결과검색 0건 원인 중 제공기간 경과 가능성을 인정하고, 이 사건으로 매각결과검색을 반복하지 않도록 변경.
- 현재 시범 스냅샷에서 실제 존재하는 `court-B000210|2025타경953|1`, 수집 당시 매각기일 2026-11-10을 **진단 대상으로 교체**. 이 기일 역시 법원 사정에 따라 변경될 수 있어 스냅샷은 유효한 현재 상태라는 뜻이 아님.
- `scripts/court-result-window.cjs`와 `tests/court-result-window.cjs`로 날짜 유효성/윤년/당일·다음날/7일 이후 검사를 추가. 진단은 오늘이 기일+1일~기일+7일 범위일 때만 요청하며, 범위 밖인 경우 **조회하지 않고 안전한 사유**를 남김. 실제 결과가 존재한다는 증명이나 매각·취하 자동 판정은 전혀 하지 않음.
- `data/court-sale-result-status.json` (2026-11-10T00:07:44.795Z) 최신 결과: `reason=before_result_publication_window`, `observed=false`, `legalStatusVerified=false`. 조회가 실패한 것이 아니라 진단 기간 밖이어서 요청을 실행하지 않은 것. GitHub 소스 기준 진단/기간 테스트 통과.
- 앱 v0.7.5·805건 목록·사용자 데이터 및 법적 상태 자동판정 불변. **다음 적합한 조회 시점은 2026-11-11 KST 이후**이나 기일 변경과 공식 제공정책 재확인 필요.

## 2026-11-10 11월 11일 매각결과검증 단발 예약
- `.github/workflows/court-sale-result-search.yml`에 GitHub Actions cron `30 0 11 11 *` 추가: 명목상 **2026-11-11 09:30 KST** 실행 의도(00:30 UTC). GitHub Actions의 스케줄 실행은 지연되거나 누락될 수 있어 결과 보장으로 간주하지 않음.
- GitHub cron은 연도를 지원하지 않아 매년 같은 날짜에 워크플로우가 깨어날 수 있으므로, `github.event_name=schedule`에서는 KST 날짜가 **정확히 `2026-11-11`인 경우에만** 법원 POST 실행하도록 두 번째 날짜 조건을 추가. 다른 해/다른 날짜에는 `outside_one_time_scheduled_date` 비조회 사유만 기록. `workflow_dispatch`와 코드 수정 시 push 동작은 기존대로 유지되지만 조회 스크립트는 여전히 매각기일+1~7일 조건을 검사.
- 진단 대상 `court-B000210|2025타경953|1`, 스냅샷상 매각기일 2026-11-10. 실제 기일 변경 여부는 별도로 검증되지 않았으므로 결과 0건/신원불일치/네트워크 오류를 매각·취하·유찰로 판단 금지.
- 저장소 최신 테스트 `tests/court-sale-result-search.cjs`, `tests/court-result-window.cjs` 모두 통과; cron·KST 가드·기존 테스트 명령과 조회 명령 확인. **11월 11일 실제 Actions 실행 성공 여부/법원 응답은 아직 미확인.** 앱 v0.7.5/805건/개인자료 변경 없음.

## 2026-11-10 매각결과검색 응답구조 비식별 진단 강화
- 내일(2026-11-11 KST) 09:30에 예약된 단발 진단에서 `0건`, `결과행은 있지만 사건번호가 불일치`, `동일 사건·물건 일치 1건`을 구분하도록 `scripts/validate-court-sale-result-search.cjs` 수정. `reason=empty_result` / `identity_not_unique_or_not_found` / `processed`를 분리.
- 법원 공식 결과검색 응답 필드 구성이 목록과 다를 가능성에 대비하여 최대 3개 응답 행에서 **허용된 상태·신원 관련 필드의 이름만** 모아 `responseIdentityFieldNames`, `responseCandidateFieldNames`로 기록. 행 내용(사건번호, 주소, 당사자 성명, 법원 내부 ID)은 기록하지 않음. 실제 개별 코드값·표시문구는 `boCd+srnSaNo+maemulSer`가 정확히 일치한 단일 행에 대해서만 기존 제한 규칙으로 기록.
- `tests/court-sale-result-search.cjs`에 비어 있는 목록/잘못된 사건번호/다른 필드명 응답/개인정보 차단 사례를 추가해 통과. `.github/workflows/court-sale-result-search.yml` 보고서 필드에도 이중 화이트리스트 적용.
- 현재(2026-11-10) 매각기일 당일이므로 `before_result_publication_window`로 조회를 건너뜀. **11월 11일 Actions 실제 실행·응답 검증은 아직 수행되지 않았고, 예약은 최선 노력이며 성공 보장이 아님.** 앱 v0.7.5/805건 시범 목록/개인자료/법적 자동판정 불변.

## 2026-11-10 매각결과검색 ↔ 사건 상세조회 교차검증 연결
- `scripts/compare-court-sale-result-detail.cjs` 및 `tests/court-sale-result-detail.cjs` 추가. 매각결과검색 `dlt_srchResult`의 **동일 법원/표시 사건번호/물건번호 단일 행**을 상세 응답 `dma_csBasInf`의 내부 사건번호와 결과 행 `saNo`의 정확한 일치로 검증. 상세 물건 목록의 법원/내부 사건번호 전체 일관성 및 물건번호 단일 매칭도 요구.
- 결과검색 행의 유효한 매각기일(`dxdyYmd` 또는 `maeGiil`)이 상세의 동일 물건 이력에서 정확히 1건이어야 하고, `auctnDxdyRsltCd`의 원시값까지 일치해야만 `crossChecked:true`를 반환. 중복/다른 물건/다른 기일/불완전 내부 사건번호/결과코드 충돌 사례는 전부 차단.
- `scripts/probe-court-sale-result-search.cjs`는 **검색 결과 물건 신원이 정확히 1건 일치했을 때만** 추가로 법원 사건 상세조회 POST를 1회 수행(기존 매각결과검색 1회 + 상세조회 최대 1회, 재시도 없음). `.github/workflows/court-sale-result-search.yml`은 교차검증 관련 회귀 테스트를 실행하고, 사건/물건/기일/코드가 교차검증된 경우에만 원시 코드 및 허용된 짧은 결과 텍스트를 보고서에 남기도록 제한.
- `tests/court-sale-result-detail.cjs`, 기존 `tests/court-sale-result-search.cjs`, `tests/court-result-window.cjs` 모두 통과. **법적 상태는 교차검증 성공이어도 `legalStatusVerified:false`를 유지**. 코드 `002`의 뜻을 공식 대응표 없이 추론하지 않음.
- 아직 11월 11일 예약 실행 전이므로 **실제 매각결과 API와 상세정보 교차검증 실서버 성공은 미확인**. 현재 앱 v0.7.5, 기존 805건과 사용자 데이터는 변경하지 않음.

## 2026-11-10 법원 매각결과검색의 상충 신원·날짜 필드 차단
- `scripts/validate-court-sale-result-search.cjs`에서 결과행의 `maemulSer`/`mokmulSer`가 동시에 존재하고 값이 다르거나, `boCd`/`cortOfcCd`가 다르거나, `csNo`가 표시 형식의 다른 사건번호인 경우 **검색 결과 일치 거부**. 내부 숫자 사건번호는 별도 상세 검증 절차에 맡김.
- `scripts/compare-court-sale-result-detail.cjs`에도 동일한 신원 필드 불일치 거부 적용. 특히 `dxdyYmd`와 `maeGiil`이 모두 존재할 때 서로 다른 날짜이거나 한쪽이 실제 달력상 불가능한 날짜라면 `contradictory_result_dates`로 차단. 임의로 한 값을 선택해 결론 내리지 않음.
- `tests/court-sale-result-search.cjs`, `tests/court-sale-result-detail.cjs`에 다른 법원·사건·물건번호와 충돌 날짜 회귀 사례 추가. 기존 기간 테스트 포함 **3종 전부 통과**.
- 결과 표본이 실제로 존재하거나 매각/유찰/취하가 확정됐다는 뜻은 아님. 예약된 2026-11-11 KST 결과검색 조회 전에 검증 조건만 강화. `legalStatusVerified:false` 및 앱 v0.7.5, 기존 805건, 개인자료 불변.

## 2026-11-10 예약 검증 전 요청 시간제한 분리
- `scripts/probe-court-sale-result-search.cjs`에서 매각결과검색 POST와 사건 상세검증 POST가 하나의 `AbortController` / **12초 공동 시간제한**을 공유하던 문제를 발견. 첫 요청이 느리면 두 번째 상세검증 요청이 정상적이어도 중도 취소될 수 있었음.
- `timedPost`로 각 요청의 네트워크 응답 대기 시점에 **별도 12초 제한**을 적용. 기존 최대 검색 1회+상세 1회, 무재시도 방침 유지. 네트워크 응답 본문 JSON 파싱까지 이 타이머가 보장하지는 않으며 workflow `timeout-minutes: 3`이 전체 실행 상한.
- 진단 스크립트 최신 소스 문법 검사 및 `tests/court-sale-result-search.cjs`, `tests/court-sale-result-detail.cjs`, `tests/court-result-window.cjs` 3종 회귀검증 통과.
- 표본 `court-B000210|2025타경953|1`이 기존 `data/capital-court-pilot.json`에 있고 `saleDate=2026-11-10`으로 수록됐음을 재확인. 이 기록은 수집 당시 스냅샷으로 실제 현재 기일 보장이 아님. 2026-11-11 예약실행 성공 여부도 아직 미확인.
- 운영 앱 v0.7.5, 805건 시범 물건, 개인 저장자료 및 매각/유찰/취하 자동분류 기능 불변.

## 2026-11-10 예약 매각결과검색의 공식 기일 재확인 사전검사
- `scripts/validate-court-sale-preflight.cjs`와 `tests/court-sale-preflight.cjs` 추가. 결과검색 전에 현재 법원 사건 상세 `dma_csBasInf` 및 `dlt_dspslGdsDspslObjctLst`에서 법원 내부 사건번호/대상 물건번호를 엄격하게 검사하고, `dlt_rletCsGdsDtsDxdyInf`의 **대상 물건 최신 기일**이 시범 목록에서 읽은 날짜(2026-11-10)와 같은지 검증. 상세 기일 누락, 변경, 중복, 비정상 날짜, 신원 불일치 시 결과검색 요청을 실행하지 않음. 기일 불일치는 매각·취하의 증거가 아님.
- `scripts/probe-court-sale-result-search.cjs` 순서를 **법원 상세 1회 → 정확한 일정 확인 시 매각결과검색 1회 → 확보해 둔 상세 원본으로 결과 교차검증**으로 변경. 조회는 최대 2회, 재시도 없음, 응답 원문·개인정보 저장 없음. 이전 '결과검색 후 일치할 때만 상세 조회' 구조보다 기일 변경 후 결과검색의 부정확한 0건 기록 가능성을 줄임.
- `.github/workflows/court-sale-result-search.yml`에 사전검사 테스트를 추가하고 `schedulePreflightConfirmed`만 비식별 보고서에 기록. 매각결과코드는 결과검색과 상세정보가 정확히 일치한 때만 기존대로 기록하고 법적 상태는 항상 미확인 유지.
- 공식 기일 검사/결과검색/상세 교차검증/기간 검사 **4종 회귀 테스트 및 진단 스크립트 문법 점검 모두 통과**. 11월 11일 예약실행의 실서버 결과는 아직 미확인. 운영 앱 v0.7.5, 시범 목록 805건, 디자인·개인 저장자료 변경 없음.

## 2026-11-10 매각결과검색의 과거 기일 오판 차단
- 기존 `scripts/compare-court-sale-result-detail.cjs`는 매각결과검색이 같은 사건·물건의 **과거 기일** 결과를 반환해도 그 과거 날짜가 상세 이력과 일치하면 `crossChecked:true`가 될 수 있었음. 최신 기일 사전검사만으로는 결과검색 행이 과거 기일인 문제를 차단하지 못함.
- 교차검증 함수에 목표 기일 `expectedDate` 필수 조건 추가. 결과검색 날짜(`dxdyYmd`/`maeGiil`)가 대상 스냅샷 매각기일과 **정확히 같은 날짜**인 경우만 나머지 상세 교차검증 진행. 목표 날짜 미지정/달력 오류/과거 날짜 모두 `result_schedule_not_target_date`로 거부.
- 실서버 진단 `scripts/probe-court-sale-result-search.cjs`에서 `snapshotSaleDate`를 해당 함수에 명시적으로 전달. workflow에서 거부 사유를 비식별 코드로만 기록. 테스트 `tests/court-sale-result-detail.cjs`의 올바른 기일/옛 기일/목표 날짜 미지정/불가능 날짜 사례 통과.
- 확인 대상은 기존 스냅샷의 2026-11-10 매각기일 1건이며, 다음날 예정된 실제 결과검색의 실행·매각 여부는 아직 미확인. 앱 v0.7.6/기존 805건/개인자료 변경 없음.

## 2026-11-10 법원 결과검색 실패 단계 표시 수정
- 예약 매각결과조회 스크립트는 이미 `detail_preflight`(법원 상세정보·기일 사전조회)와 `sale_search`(결과검색) 단계를 구분했으나, `.github/workflows/court-sale-result-search.yml`의 요약 필드 허용 목록에 두 단계가 빠져 오류 시 `failedStage:none`으로 기록될 수 있었음.
- 요약의 비식별 허용 목록에 두 단계를 추가. 네트워크 오류가 발생한 위치만 기록하고 사건·개인정보·원문은 저장하지 않음. `legalStatusVerified:false` 유지.
- 공개 GitHub Pages와 실제 GitHub Actions 실행 기록은 현재 접근이 제한돼 직접 확인되지 않았으며, **실서버 조회 성공이나 배포 성공을 주장하지 않음**. 예약일 2026-11-11 KST, 앱 v0.7.6, 805건 유지.
