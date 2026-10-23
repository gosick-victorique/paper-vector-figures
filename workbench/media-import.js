(() => {
 const B=FigureBoard,viewport=document.querySelector('#canvas-scroll'),input=document.createElement('input');input.type='file';input.accept='.png,.jpg,.jpeg,.webp,.svg';input.multiple=true;input.hidden=true;input.id='media-file-input';document.body.append(input);
 const button=document.createElement('button');button.id='import-media';button.textContent='导入图片 / SVG';document.querySelector('#new-board').after(button);
 const note=document.createElement('div');note.className='media-drop-hint';note.dataset.canvasUi='true';note.textContent='拖入图片或 SVG';note.hidden=true;viewport.append(note);
 let busy=false,depth=0;
 button.onclick=()=>input.click();input.onchange=()=>{const files=[...input.files];input.value='';void importFiles(files);};
 function toBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('无法读取文件'));reader.readAsDataURL(file);});}
 async function importFiles(files,point){if(busy){B.toast('正在导入，请稍候');return;}if(!files.length)return;if(files.length>12){B.toast('一次最多导入 12 个文件');return;}const boardId=B.capture().boardId;busy=true;button.disabled=true;let count=0,resized=false;const errors=[];
  try{const session=await(await fetch('/api/session')).json();for(const file of files){try{
   if(!/\.(png|jpe?g|webp|svg)$/i.test(file.name))throw Error('支持 PNG、JPEG、WebP 和 SVG');if(file.size>10*1024*1024)throw Error('文件不能超过 10 MB');
   const res=await fetch('/api/media/import',{method:'POST',headers:{'Content-Type':'application/json','X-Workbench-Token':session.token},body:JSON.stringify({name:file.name,type:file.type,data:await toBase64(file)})});const data=await res.json();if(!res.ok)throw Error(data.error||'导入失败');
   if(B.capture().boardId!==boardId)throw Error('画板已切换，请在目标画板重新导入');B.importMedia({...data,name:file.name.replace(/\.[^.]+$/,''),point:point?{x:point.x+count*24,y:point.y+count*24}:files.length>1?{x:330+(count%2)*540,y:230+Math.floor(count/2)*240}:undefined});count++;resized=resized||data.resized;
  }catch(e){errors.push(file.name+'：'+e.message);}}
  }catch{errors.push('请通过本地服务打开工作台后导入');}finally{busy=false;button.disabled=false;}
  if(errors.length){const dialog=document.createElement('dialog');dialog.className='media-errors';const title=document.createElement('h2');title.textContent=count?`已导入 ${count} 个文件`:'导入未完成';const text=document.createElement('p');text.textContent=errors.join('\n');const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>dialog.close();dialog.append(title,text,close);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();}else B.toast(`已导入 ${count} 个文件${resized?' · 大图已缩小至 2048 像素以内':''}，可编辑或撤销`);
 }
 const files=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
 viewport.addEventListener('dragenter',e=>{if(!files(e))return;e.preventDefault();depth++;note.hidden=false;});viewport.addEventListener('dragover',e=>{if(!files(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});viewport.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)note.hidden=true;});
 viewport.addEventListener('drop',e=>{if(!files(e))return;e.preventDefault();depth=0;note.hidden=true;const svg=document.querySelector('#stage>svg'),point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());void importFiles([...e.dataTransfer.files],point);});
 window.addEventListener('dragover',e=>{if(files(e))e.preventDefault();});window.addEventListener('drop',e=>{if(files(e))e.preventDefault();});
})();
