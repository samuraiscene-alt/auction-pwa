'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf('function auctionPriceAnalysis(');
const end=app.indexOf('function auctionBidCalculator(',start);
assert(start>=0&&end>start,'price analysis functions unavailable');
const functions=Function('prettyPrice','escapeHtml',app.slice(start,end)+
 ';return {auctionPriceAnalysis,auctionBidCompare};')(
 n=>Number(n).toLocaleString('ko-KR')+'원',s=>String(s));
const {auctionPriceAnalysis,auctionBidCompare}=functions;
assert(auctionPriceAnalysis(500000000,300000000,'test').includes('60%'));
assert(auctionPriceAnalysis(500000000,300000000,'test').includes('200,000,000원 낮음'));
assert(auctionPriceAnalysis(300000000,360000000,'test').includes('120%'));
assert(auctionPriceAnalysis(300000000,360000000,'test').includes('60,000,000원 높음'));
assert(auctionPriceAnalysis(300000000,300000000,'test').includes('동일'));
for(const [appraisal,minimum] of [[null,300000000],[0,300000000],[100000000,null],[NaN,200000000]])
 assert(auctionPriceAnalysis(appraisal,minimum,'test').includes('자료가 충분하지 않아'));
assert(auctionBidCompare('31000',300000000).includes('10,000,000원 높습니다'));
assert(auctionBidCompare('30000',300000000).includes('같습니다'));
assert(auctionBidCompare('29000',300000000).includes('10,000,000원 낮습니다'));
assert(auctionBidCompare('500',null).includes('미확인'));
for(const input of ['', '0','-2','1.5','abc','1000000000'])
 assert(auctionBidCompare(input,300000000).includes('정수'));
console.log('PASS: appraisal ratio/difference and proposed bid comparisons remain arithmetic-only');
