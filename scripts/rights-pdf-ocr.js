'use strict';
// On-device OCR fallback for PDFs without usable text. Never transmits the PDF itself.
async function readScannedCourtPdf(pdf,report){
 const pages=[],max=Math.min(3,pdf.numPages);
 let worker=null;
 try{
  const module=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
  const create=module.createWorker||module.default?.createWorker;
  if(typeof create!=='function')throw Error('OCR 모듈을 불러오지 못했어요.');
  report?.('한국어 문자 인식 준비 중…');
  worker=await create('kor+eng');
  for(let i=1;i<=max;i++){
   report?.('이미지 PDF 글자 인식 중 · '+i+'/'+max+'쪽');
   const page=await pdf.getPage(i),base=page.getViewport({scale:1});
   const scale=Math.min(1.9,Math.max(1.1,1500/base.width));
   const viewport=page.getViewport({scale});
   const canvas=document.createElement('canvas');
   try{
    canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport,canvas}).promise;
    const ocr=await worker.recognize(canvas);
    pages.push(String(ocr?.data?.text||''));
   }finally{
    canvas.width=0;canvas.height=0;page.cleanup();
   }
  }
  return {pages,readPages:max,usedOcr:true};
 }finally{if(worker)await worker.terminate();}
}
const RightsPdfOcr={readScannedCourtPdf};
if(typeof window!=='undefined')window.RightsPdfOcr=RightsPdfOcr;
if(typeof module!=='undefined'&&module.exports)module.exports=RightsPdfOcr;
