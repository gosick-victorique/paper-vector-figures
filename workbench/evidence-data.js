/* Checks exact cited tables against editable chart data, not scientific entailment. */
(function(root,factory){const api=factory(typeof module==='object'?require('./data-charts.js'):root.FigureCharts);if(typeof module==='object')module.exports=api;else root.FigureEvidenceData=api;})(globalThis,function(Charts){
 'use strict';
 function table(text,format){
  if(format==='csv'||format==='tsv'){if(!text.split(/\r?\n/)[0].includes(format==='tsv'?'\t':','))throw Error('引用须包含完整表头和数据行');return Charts.parse(text);}
  if(format!=='markdown')throw Error('数据来源格式须为 csv、tsv 或 markdown');
  const lines=text.trim().split(/\r?\n/).map(line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(cell=>cell.trim()));
  if(lines.length<3||lines[0].length<2||!lines[1].every(cell=>/^:?-{3,}:?$/.test(cell))||lines.some(row=>row.length!==lines[0].length))throw Error('Markdown 引用须包含完整表头、分隔行和数据行');
  return Charts.parse(Charts.toCSV({headers:lines[0],rows:lines.slice(2)}));
 }
 function normalize(data,citations){
  if(!data||Array.isArray(data)||typeof data!=='object')throw Error('数据核验映射无效');
  if(data.kind==='unstructured'){if(Object.keys(data).some(k=>!['kind','reason'].includes(k))||typeof data.reason!=='string'||!data.reason.trim()||data.reason.length>1000)throw Error('非结构化来源须说明无法逐值核验的原因');return{kind:'unstructured',reason:data.reason.trim()};}
  if(data.kind!=='table'||Object.keys(data).some(k=>!['kind','format','citationIndex','rows','columns'].includes(k))||!Number.isInteger(data.citationIndex)||!citations[data.citationIndex])throw Error('表格核验须指定有效 citationIndex');
  const source=table(citations[data.citationIndex].quote,data.format),selection=(value,count,name)=>{const ids=value===undefined?Array.from({length:count},(_,i)=>i):value;if(!Array.isArray(ids)||!ids.length||ids.length>count||new Set(ids).size!==ids.length||ids.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error(name+'索引无效或重复');return [...ids];};
  return{kind:'table',format:data.format,citationIndex:data.citationIndex,rows:selection(data.rows,source.rows.length,'行'),columns:selection(data.columns,source.headers.length,'列')};
 }
 // Decimal normalization avoids rounding away differences in large or precise values.
 function decimal(value){const m=String(value).trim().match(/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);if(!m||!m[2]&&!m[3])return null;let digits=(m[2]+(m[3]||'')).replace(/^0+/,''),exponent=Number(m[4]||0)-(m[3]||'').length;if(!Number.isSafeInteger(exponent))return null;if(!digits)return'0';while(digits.endsWith('0')){digits=digits.slice(0,-1);exponent++;}return(m[1]==='-'?'-':'')+digits+'e'+exponent;}
 function compare(chart,data,citations){
  const mapping=normalize(data,citations);if(mapping.kind!=='table')return{status:'unverified',reason:mapping.reason};
  const source=table(citations[mapping.citationIndex].quote,mapping.format),actual=Charts.parse(chart.text),expected={headers:mapping.columns.map(c=>source.headers[c]),rows:mapping.rows.map(r=>mapping.columns.map(c=>source.rows[r][c]))},mismatches=[];let mismatchCount=0;
  const mismatch=value=>{mismatchCount++;if(mismatches.length<20)mismatches.push(value);};
  if(actual.headers.length!==expected.headers.length||actual.rows.length!==expected.rows.length)mismatch({reason:'行列数不符',expected:[expected.rows.length,expected.headers.length],actual:[actual.rows.length,actual.headers.length]});
  const numeric=new Set((chart.series||[]).flatMap(s=>[s.column,...(s.error>=0?[s.error]:[])]));if(chart.type!=='bar')numeric.add(chart.x);
  for(let c=0;c<expected.headers.length;c++)if(actual.headers[c]!==expected.headers[c])mismatch({column:c,reason:'列名或单位不符',expected:expected.headers[c],actual:actual.headers[c]??null});
  for(let r=0;r<expected.rows.length;r++)for(let c=0;c<expected.headers.length;c++){
   const expectedValue=expected.rows[r][c],actualValue=actual.rows[r]?.[c],a=numeric.has(c)?decimal(actualValue):null,b=numeric.has(c)?decimal(expectedValue):null;
   if(actualValue!==expectedValue&&!(a!==null&&b!==null&&a===b))mismatch({row:r,column:c,sourceRow:mapping.rows[r],sourceColumn:mapping.columns[c],reason:'数据值不符',expected:expectedValue,actual:actualValue??null});
  }
  return{status:mismatchCount?'mismatch':'matched',rows:expected.rows.length,columns:expected.headers.length,cells:expected.rows.length*expected.headers.length,mismatchCount,mismatches,sourceId:citations[mapping.citationIndex].sourceId,citationIndex:mapping.citationIndex,sourceRows:mapping.rows,sourceColumns:mapping.columns};
 }
 function check(state,subjects,bindings){
  const results=[],issues=[];
  for(const subject of subjects){const chart=state.nodes[subject.id]?.chart,binding=bindings[subject.id];if(!chart||!binding)continue;
   let result;if(!binding.data)result={status:binding.classification==='supported'?'missing':'unverified',reason:binding.classification==='supported'?'有依据的图表缺少数据映射；请指定 table 或明确 unstructured 原因':'示意或待确认数据未逐值核验'};
   else try{result=compare(chart,binding.data,binding.citations);}catch(error){result={status:'invalid',reason:error.message};}
   results.push({objectId:subject.id,...result});if(result.status!=='matched')issues.push({objectId:subject.id,severity:['missing','invalid','mismatch'].includes(result.status)?'error':'warning',message:result.reason||'图表数据与引用表格不一致'});
  }
  return{results,issues,matched:results.filter(r=>r.status==='matched').length,total:results.length,limitations:['逐值核验针对可编辑数据及表头，不证明来源可信、语义解释、坐标轴别名或渲染图形与数据一致；这些仍需评审。']};
 }
 return{table,normalize,compare,check};
});
