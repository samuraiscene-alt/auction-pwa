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
