'use strict';
// A court auction lot may have several land/building/address rows.
// Preserve all distinct components, but do not infer a winning price/date.
function componentOf(item){
 return {address:item.address,largeCode:item.largeCode,mediumCode:item.mediumCode,smallCode:item.smallCode};
}
function mergeCourtLots(rows){
 const map=new Map(),unsafe=new Set(),reasons={},stats={componentRows:rows.length,distinctComponents:0,multiComponentLots:0};
 for(const item of rows){
  const previous=map.get(item.id);
  if(!previous){map.set(item.id,{...item,components:[componentOf(item)]});continue;}
  // A lot's amount and sale date must agree across source rows.
  const conflicts=['region','courtCode','caseNo','itemNo','appraisalWon','minimumWon','saleDate']
    .filter(k=>previous[k]!==item[k]);
  if(conflicts.length){
   unsafe.add(item.id);
   for(const field of conflicts)reasons[field]=(reasons[field]||0)+1;
   continue;
  }
  const component=componentOf(item);
  if(!previous.components.some(x=>x.address===component.address&&x.largeCode===component.largeCode
   &&x.mediumCode===component.mediumCode&&x.smallCode===component.smallCode))
   previous.components.push(component);
 }
 const lots=[];
 for(const item of map.values()){
  if(unsafe.has(item.id))continue;
  if(item.components.length>1){
   stats.multiComponentLots++;
   // A single arbitrary smallCode would cause false type filters.
   item.largeCode=null;item.mediumCode=null;item.smallCode=null;
  }
  stats.distinctComponents+=item.components.length;
  lots.push(item);
 }
 return {items:lots,unsafeIds:[...unsafe],conflictFieldCounts:reasons,stats};
}
module.exports={mergeCourtLots,componentOf};
