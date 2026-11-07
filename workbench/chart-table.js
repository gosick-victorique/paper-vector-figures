/* Small spreadsheet editor. The CSV import remains available for larger datasets. */
window.FigureChartTable={mount(host,onChange){
 const C=FigureCharts,rowsPerPage=30;let data=null,page=0,active={r:0,c:0};
 host.innerHTML='<div class="chart-table-tools"><button type="button" data-op="row">＋ 行</button><button type="button" data-op="col">＋ 列</button><button type="button" data-op="removeRow">删行</button><button type="button" data-op="removeCol">删列</button></div><div class="chart-grid-scroll"></div><div class="chart-table-pages"><button type="button" data-op="prev">上一页</button><span></span><button type="button" data-op="next">下一页</button></div>';
 const box=host.querySelector('.chart-grid-scroll'),status=host.querySelector('.chart-table-pages span');
 function draw(){
  if(!data){box.innerHTML='<div class="chart-table-empty">粘贴表格或导入 CSV</div>';status.textContent='';return;}
  page=Math.min(page,Math.max(0,Math.ceil(data.rows.length/rowsPerPage)-1));const start=page*rowsPerPage;
  const cells=(row,r)=>row.map((v,c)=>`<td><input data-r="${r}" data-c="${c}" aria-label="${r<0?'列名':`第 ${r+1} 行`}，第 ${c+1} 列" value="${C.escape(v)}" spellcheck="false"></td>`).join('');
  box.innerHTML=`<table><thead><tr><th></th>${cells(data.headers,-1)}</tr></thead><tbody>${data.rows.slice(start,start+rowsPerPage).map((r,i)=>`<tr><th>${start+i+1}</th>${cells(r,start+i)}</tr>`).join('')}</tbody></table>`;
  status.textContent=`${start+1}–${Math.min(start+rowsPerPage,data.rows.length)} / ${data.rows.length}`;
  host.querySelector('[data-op="prev"]').disabled=page===0;host.querySelector('[data-op="next"]').disabled=start+rowsPerPage>=data.rows.length;
 }
 function emit(){onChange(JSON.parse(JSON.stringify(data)));}
 function focus(r,c){box.querySelector(`[data-r="${r}"][data-c="${c}"]`)?.focus();}
 box.addEventListener('focusin',e=>{if(e.target.dataset.r!==undefined)active={r:Number(e.target.dataset.r),c:Number(e.target.dataset.c)};});
 box.addEventListener('input',e=>{if(e.target.dataset.r===undefined)return;const r=Number(e.target.dataset.r),c=Number(e.target.dataset.c);(r<0?data.headers:data.rows[r])[c]=e.target.value;emit();});
 box.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const r=Number(e.target.dataset.r)+1,c=Number(e.target.dataset.c);if(r<data.rows.length){page=Math.floor(r/rowsPerPage);draw();focus(r,c);}}});
 box.addEventListener('paste',e=>{
  const raw=e.clipboardData.getData('text/plain');if(!raw.includes('\t')&&!raw.includes('\n'))return;e.preventDefault();
  const block=raw.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(r=>r.split('\t')),r0=Number(e.target.dataset.r),c0=Number(e.target.dataset.c),cols=c0+Math.max(...block.map(r=>r.length)),end=r0+block.length;
  if(cols>30||end>2000){FigureBoard.toast('最多 2000 行、30 列');return;}
  while(data.headers.length<cols){data.headers.push('列 '+(data.headers.length+1));data.rows.forEach(r=>r.push(''));}
  while(data.rows.length<end)data.rows.push(data.headers.map(()=>''));
  block.forEach((row,i)=>row.forEach((value,j)=>{(r0+i<0?data.headers:data.rows[r0+i])[c0+j]=value;}));draw();emit();focus(r0,c0);
 });
 host.addEventListener('click',e=>{const op=e.target.dataset.op;if(!op)return;
  if(op==='prev'||op==='next'){page+=op==='prev'?-1:1;draw();return;}
  if(!data)data={headers:['X','Y'],rows:[['','']]};
  if(op==='row'&&data.rows.length<2000){data.rows.push(data.headers.map(()=>''));page=Math.floor((data.rows.length-1)/rowsPerPage);}
  if(op==='col'&&data.headers.length<30){data.headers.push('列 '+(data.headers.length+1));data.rows.forEach(r=>r.push(''));}
  if(op==='removeRow'&&active.r>=0&&data.rows.length>1)data.rows.splice(Math.min(active.r,data.rows.length-1),1);
  if(op==='removeCol'&&data.headers.length>2){const c=Math.min(active.c,data.headers.length-1);data.headers.splice(c,1);data.rows.forEach(r=>r.splice(c,1));onChange(JSON.parse(JSON.stringify(data)),{removedColumn:c});draw();return;}
  draw();emit();
 });
 draw();return{set(value){data=value?JSON.parse(JSON.stringify(value)):null;page=0;draw();}};
}};
