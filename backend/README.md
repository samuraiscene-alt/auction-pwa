# 법원 조회 Worker — 개발·배포 상태

## 현재 적용 상태
- Cloudflare 운영 Worker: `https://joon-auction-court.samuraiscene.workers.dev`
- **배포 확인된 기능:** `GET /case` 사건번호 검증 (2023타경4869 성공)
- **GitHub 소스에만 추가된 기능:** `GET /item` 물건 상세 조회 (v0.5.5 후보)
- `/item`은 아직 Cloudflare에 재배포·실물 데이터 대조 전이므로 앱 자동입력에 연결하지 않는다.
- GitHub Pages 앱은 v0.5.4 유지. 사용자 기록은 변경하지 않는다.

## 엔드포인트
- `/case?courtCode=B000210&caseNo=2023타경4869`: 검증된 기존 기능
- `/item?courtCode=B000210&caseNo=2023타경4869&itemNo=1`: 신규 상세 조회, 미배포·미검증

`/item`은 법원 내부 /pgj/pgj15B/selectAuctnCsSrchRslt.on 호출을 사용하며, `dma_result.csBaseInfo` 및 `dspslGdsDxdyInfo` 응답에서 법원·사건·물건번호 일치를 모두 검사한다.

자동 제공 가능 후보: `address`(소재지 1개일 때), `appraisalWon`(감정가), `minimumWon`(최저가 한 개로 확정되는 경우), `saleDate`(유효한 YYYYMMDD), `itemNo`. 모호한 필드는 `null` 반환하고 추정하지 않는다. 여러 공고 최저가가 있으면 `priceAmbiguous: true` 및 최저가 null.

**주의:** `dspslGdsSeq`와 사건번호·법원 코드가 일치하더라도 최신 기일 및 매각 상태 변경 가능성이 있다. 실제 법원 화면과 대조 후 사용자 확인을 받아 빈칸에만 입력해야 한다. 상세 API 구조 변경/접속 제한 시 오류 안내하고 입력값을 보존한다. 로그에 원문 전체·개인명 출력 금지.

## 다음 작업 순서
1. Cloudflare Worker 편집기에서 GitHub `backend/court-worker.js` 통코드로 교체 후 Deploy (기존 `/case` 유지 검증)
2. `/item` 호출 결과를 실제 사건번호/물건번호 1로 검증. 접속 실패/불일치 시 Worker 코드 수정. **미검증 값을 앱에 연결 금지**
3. 반환한 가격·날짜를 법원 원문과 대조, 물건종류·복수 목적물 별도 검사
4. 검증되면 앱 v0.5.5에 명시적 물건번호 조회 버튼과 확인 후 빈칸 자동 입력 연결
5. GitHub Pages 배포와 iPhone 홈 화면 실기기 테스트, 백업·기존 기록 보존

## 참고 자료
- Courtauction 화면 로직: `/pgj/pgj15B/selectAuctnCsSrchRslt.on`, `dma_srchGdsDtlSrch`, `dma_result.dspslGdsDxdyInfo`.
- 이 경로는 공식 공개 API가 아니므로 계약/빈도 제한을 준수하고 차단을 우회하지 않는다.
