(()=>{
 const B=FigureBoard,$=s=>dialog.querySelector(s),dialog=document.createElement('dialog');dialog.id='document-import-dialog';
 dialog.innerHTML='<form><h2>导入论文正文</h2><p id="document-name"></p><div id="document-pages" class="geometry"><label>起始页<input id="document-from" type="number" min="1" value="1"></label><label>结束页<input id="document-to" type="number" min="1" placeholder="自动（最多 100 页）"></label><button id="document-extract" type="button">提取正文</button></div><p id="document-status" role="status"></p><label class="field-label">正文预览（可修改）<textarea id="document-text" rows="14"></textarea></label><label class="field-label">写入方式<select id="document-mode"><option value="replace">替换当前正文</option><option value="append">追加到当前正文</option></select></label><div class="dialog-actions"><button id="document-cancel" type="button">取消</button><button id="document-apply" type="submit" class="primary" disabled>写入正文</button></div></form>';
 document.body.append(dialog);let source,boardId,controller,extraction=0;
 dialog.addEventListener('keydown',e=>e.stopPropagation());$('#document-cancel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{controller?.abort();extraction++;source=null;});
 const data=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('无法读取文档'));reader.readAsDataURL(file);});
 async function extract(){
  const current=++extraction;controller?.abort();controller=new AbortController();const requestController=controller;$('#document-text').value='';$('#document-text').readOnly=true;$('#document-apply').disabled=true;$('#document-extract').disabled=true;$('#document-status').textContent='正在本地提取正文…';
  try{
   const session=await(await fetch('/api/session',{signal:requestController.signal})).json();if(current!==extraction)return;
   const response=await fetch('/api/document/import',{method:'POST',signal:requestController.signal,headers:{'Content-Type':'application/json','X-Workbench-Token':session.token},body:JSON.stringify({data:source.data,from:Number($('#document-from').value),to:$('#document-to').value?Number($('#document-to').value):undefined})});
   const result=await response.json();if(current!==extraction)return;if(!response.ok)throw Error(result.error||'导入失败');
   $('#document-name').textContent=source.name+' · 共 '+result.pageCount+' 页';$('#document-to').value=result.to;$('#document-from').max=result.pageCount;$('#document-to').max=result.pageCount;
   $('#document-text').value=result.hasText?result.text:'';$('#document-status').textContent=result.warnings.join('\n');$('#document-apply').disabled=!result.hasText;
  }catch(error){if(current===extraction)$('#document-status').textContent=error.name==='AbortError'?'已取消':error.message;}
  finally{if(current===extraction){$('#document-extract').disabled=false;$('#document-text').readOnly=false;}}
 }
 $('#document-extract').onclick=extract;
 $('#document-text').oninput=()=>$('#document-apply').disabled=!$('#document-text').value.trim();
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();try{if(B.capture().boardId!==boardId)throw Error('画板已切换，请重新导入');const text=$('#document-text').value;if(!text.trim())throw Error('没有可写入的正文');const old=B.getState().document;const content=$('#document-mode').value==='append'?[old?.content,text].filter(Boolean).join('\n\n'):text;B.importDocument(content);window.dispatchEvent(new Event('figure-document-change'));dialog.close();B.toast('正文已导入，可撤销');}catch(error){$('#document-status').textContent=error.message;}};
 window.FigureDocumentImport={async open(file){
  if(!file)return;try{
   const pdf=/\.pdf$/i.test(file.name);if(!pdf&&!/\.(txt|md|markdown)$/i.test(file.name))throw Error('支持 PDF、TXT 和 Markdown');if(file.size>(pdf?25*1024*1024:2*1024*1024))throw Error(pdf?'PDF 最大 25 MB':'正文最大 2 MB');
   boardId=B.capture().boardId;source={name:file.name,data:pdf?await data(file):null};$('#document-name').textContent=file.name;$('#document-pages').hidden=!pdf;$('#document-from').value=1;$('#document-to').value='';$('#document-mode').value='replace';$('#document-status').textContent='';$('#document-text').value='';$('#document-text').readOnly=false;$('#document-from').removeAttribute('max');$('#document-to').removeAttribute('max');$('#document-apply').disabled=true;dialog.showModal();
   if(pdf)await extract();else{$('#document-text').value=await file.text();$('#document-apply').disabled=!$('#document-text').value.trim();}
  }catch(error){B.toast(error.message);}
 }};
})();
