(() => {
 'use strict';
 const B=window.FigureBoard,P=window.FigurePatch,$=s=>document.querySelector(s);
 const entry=document.createElement('section');entry.className='agent-entry';
 entry.innerHTML='<p class="connection-status"><span class="agent-light"></span><span id="agent-connection">正在连接…</span></p>';
 $('.integration-note').replaceWith(entry);
 const dialog=document.createElement('dialog');dialog.id='agent-dialog';
 dialog.innerHTML=`<header><div><h2 id="agent-heading">生成图片</h2></div><div class="agent-header-actions"><button id="agent-settings">AI 设置</button><button id="agent-close" aria-label="关闭">×</button></div></header>
 <div class="agent-layout"><section class="agent-controls">
 <details id="agent-config"><summary>连接设置</summary>
 <label for="agent-url">API 地址</label><input id="agent-url" value="https://api.openai.com/v1" autocomplete="off">
 <label for="agent-key">API Key</label><input id="agent-key" type="password" placeholder="输入 API Key" autocomplete="off">
 <div class="agent-actions"><button id="agent-load-models">获取可用模型</button></div><p id="agent-model-message" class="agent-feedback" role="status"></p>
 <label for="agent-model">模型</label><input id="agent-model" placeholder="搜索或输入模型名" autocomplete="off">
 <select id="agent-model-list" size="5" aria-label="接口返回的模型列表" hidden></select>
 <label for="agent-reasoning">思考强度</label><select id="agent-reasoning"><option value="auto">模型默认</option><option value="minimal">极低 · minimal</option><option value="low">低 · low</option><option value="medium">中 · medium</option><option value="high">高 · high</option><option value="xhigh">很高 · xhigh</option><option value="max">最高 · max</option><option value="ultra">超高 · ultra</option></select><p class="agent-help" id="agent-reasoning-help" hidden></p>
 
 
 <div class="agent-actions"><button id="agent-connect">保存连接</button><button id="agent-disconnect">清除 Key</button></div><p id="agent-config-message" class="agent-feedback" role="status"></p></details>
 <label for="agent-task-type">任务</label><select id="agent-task-type"><option value="generate">生成图片</option><option value="edit">修改选区</option></select><p id="agent-scope" class="agent-meta"></p>
 <div id="agent-edit-options"><label for="agent-edit-mode">修改方式</label><select id="agent-edit-mode"><option value="redraw">局部重绘</option><option value="appearance">只改外观</option><option value="layout">重新排布</option></select><p id="agent-mode-help" class="agent-help">选区重绘</p><label><input id="agent-preserve-labels" type="checkbox" checked style="width:auto"> 保留文字</label></div><label for="agent-instruction" id="agent-instruction-label">提示词</label><textarea id="agent-instruction" rows="4" placeholder="输入修改意见"></textarea>
 <details id="agent-paper-details" open><summary>文档内容</summary><label for="agent-purpose">图片类型</label><input id="agent-purpose"><label for="agent-paper-title">标题（可选）</label><input id="agent-paper-title"><label for="agent-paper">正文</label><textarea id="agent-paper" rows="9" placeholder="粘贴论文正文或方法描述"></textarea><label for="agent-paper-file">导入 TXT / Markdown</label><input id="agent-paper-file" type="file" accept=".txt,.md"></details>
 <label><input id="agent-auto-apply" type="checkbox" checked style="width:auto"> 自动应用</label>
 <div class="agent-actions"><button id="agent-submit" class="primary">开始修改</button><button id="agent-cancel" disabled>取消任务</button></div>
 <a id="agent-service-link" class="agent-file-link" href="http://127.0.0.1:4318/" hidden>打开本地服务画板 ↗</a>
 </section><section><div id="agent-state" class="agent-alert" role="status">待提交</div><ol id="agent-events" class="agent-events"></ol><div id="agent-empty" class="agent-empty">预览</div><div id="agent-comparison" class="agent-comparison" hidden><figure><figcaption>修改前</figcaption><img id="agent-before" alt="修改前的完整图稿"></figure><figure><figcaption>修改后 · 点击放大</figcaption><img id="agent-after" alt="修改后的完整图稿"></figure></div><div id="agent-summary"></div><ul id="agent-warnings"></ul><p id="agent-review-note" class="agent-meta"></p><div class="agent-actions"><button id="agent-adopt" class="primary" disabled>应用</button><button id="agent-export" disabled>下载记录</button><button id="agent-refresh-scope">更新选区</button></div></section></div>`;
 document.body.appendChild(dialog);
 const settings=document.createElement('section');settings.id='agent-config';const oldConfig=$('#agent-config');for(const child of [...oldConfig.children])if(child.tagName!=='SUMMARY')settings.append(child);oldConfig.remove();entry.append(settings);
 const files=document.createElement('details');files.className='project-files';files.innerHTML='<summary>导入 / 导出</summary><button class="wide" id="agent-board-export">下载画板</button><label class="field-label">导入画板<input id="agent-board-import" type="file" accept=".json"></label>';$('.sidebar').append(files);
 const zoom=document.createElement('dialog');zoom.id='agent-zoom';zoom.innerHTML='<button aria-label="关闭大图">关闭</button><img alt="图稿大图">';document.body.appendChild(zoom);zoom.querySelector('button').onclick=()=>zoom.close();
 let token='',ready=false,job=null,submitted=null,pollTimer,urls=[],busy=false,refreshId=0;
 let availableModels=[],modelRequest=0,reasoningSupported=false;
 const storageKey='figure-agent-active-job-v2';
 const modeHelp={redraw:'选区重绘',appearance:'配色 · 线宽 · 透明度',layout:'位置 · 缩放'};
 $('#agent-edit-mode').onchange=()=>{$('#agent-mode-help').textContent=modeHelp[$('#agent-edit-mode').value];};
 const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const conciseStatus=message=>({'读取生成 skill 与准备图像':'准备图片…','读取 skill 与准备图像':'准备图片…','准备选区修改与图像':'准备修改…','Agent 已启动':'处理中…','Agent 正在读取任务材料':'读取文档…','Agent 正在分析与设计':'设计中…','校验修改范围、锁定状态与 SVG':'整理结果…','新版本已就绪，等待查看与采纳':'已完成','Agent 未作修改，请查看说明':'未作修改'}[message]||message);
 const status=(message,error=false)=>{$('#agent-state').textContent=conciseStatus(message);$('#agent-state').classList.toggle('error',error);};
 const active=()=>job&&['queued','running','validating'].includes(job.status);
 function buttons(){const running=active()||busy;$('#agent-task-type').disabled=!!running;$('#agent-submit').disabled=!ready||running;$('#agent-cancel').disabled=!active();$('#agent-adopt').disabled=!(job?.status==='completed'&&job.operations?.length&&submitted)||busy;$('#agent-export').disabled=job?.status!=='completed';}
 async function api(url,options={}){const res=await fetch(url,{...options,headers:{'Content-Type':'application/json','X-Workbench-Token':token,...options.headers}});if(!res.ok){let error;try{error=(await res.json()).error;}catch{}throw Error(error||`请求失败 ${res.status}`);}return res;}
 async function connection(){
  if(location.protocol==='file:'){$('#agent-connection').textContent='请连接本地服务';$('#agent-service-link').hidden=false;status('运行 start-agent.ps1 后打开本地服务');FigureWorkbench.showPanel('ai');buttons();return;}
  try{const res=await fetch('/api/session');if(!res.ok)throw Error('本地服务未启动');const c=await res.json();token=c.token;ready=c.ready;reasoningSupported=Array.isArray(c.reasoningEfforts);$('#agent-reasoning').value=c.reasoningEffort||'auto';$('#agent-reasoning-help').hidden=reasoningSupported;$('#agent-reasoning-help').textContent=reasoningSupported?'':'请重启服务以启用思考强度';$('#agent-url').value=c.baseUrl;$('#agent-model').value=c.model;$('#agent-key').placeholder=c.hasKey?'已保存，留空沿用':'输入 API Key';if(c.configWarning)$('#agent-config-message').textContent=c.configWarning;$('#agent-connection').textContent=ready?'已配置':'未配置';$('#agent-settings').textContent=ready?'AI 设置':'配置 AI';$('.agent-light').classList.toggle('connected',ready);buttons();}
  catch(e){ready=false;$('#agent-connection').textContent='未连接本地 Agent 服务';status(e.message,true);buttons();}
 }
 function taskType(){return $('#agent-task-type').value;}
 function showTaskMode(){const generate=taskType()==='generate';$('#agent-heading').textContent=generate?'生成图片':'修改选区';$('#agent-submit').textContent=generate?'生成图片':'开始修改';$('#agent-instruction-label').textContent=generate?'提示词':'修改意见';$('#agent-instruction').placeholder=generate?'输入绘图要求':'输入修改意见';$('#agent-edit-options').hidden=generate;$('#agent-paper-details').open=generate;$('#agent-refresh-scope').textContent=generate?'更新画板':'更新选区';}
 async function prepare(){const current=++refreshId;submitted=B.capture(taskType());submitted.baseRevision=await hash(P.revision(B.getState()));if(current!==refreshId)return;showTaskMode();$('#agent-scope').textContent=taskType()==='generate'?`结合当前画板 · ${Object.values(submitted.scene).filter(n=>n.type==='component').length} 个组件`:submitted.scope.map(s=>s.name).join(' ＋ ')||'未选择对象';$('#agent-instruction').value=submitted.pendingSelectionNote||submitted.comments.map(c=>c.text).join('\n');$('#agent-purpose').value=submitted.purpose;$('#agent-paper-title').value=submitted.paper;$('#agent-paper').value=submitted.paperContent||'';}
 function saveDocument(){const value={title:$('#agent-paper-title').value,content:$('#agent-paper').value};if(taskType()==='generate')value.prompt=$('#agent-instruction').value;B.setDocument(value);}
 for(const id of ['agent-paper-title','agent-paper','agent-instruction'])$('#'+id).addEventListener('input',saveDocument);
 async function open(settings=false,type){if(type&&!active()){job=null;try{localStorage.removeItem(storageKey);}catch{}clearPreviews();resetTaskFeedback();$('#agent-task-type').value=type;await prepare();}else if(!active()&&!job)await prepare();if(settings){FigureWorkbench.showPanel('ai');return;}if(!dialog.open)dialog.showModal();buttons();}
 $('#agent-task-type').onchange=async()=>{if(active())return;job=null;try{localStorage.removeItem(storageKey);}catch{}clearPreviews();resetTaskFeedback();await prepare();buttons();};
 $('#agent-settings').onclick=()=>{dialog.close();FigureWorkbench.showPanel('ai');};$('#agent-close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
 $('#make-task').textContent='生成图片';$('#make-task').onclick=()=>open(false,'generate');
 $('#agent-board-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(B.capture())],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='figure-board.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};
 $('#agent-board-import').onchange=async e=>{try{if(!token)throw Error('请先打开本地服务画板再导入');if(active())throw Error('请先等待或取消当前任务');const file=e.target.files[0];if(!file)return;if(file.size>18000000)throw Error('画板文件过大');const data=JSON.parse(await file.text());await api('/api/scene/validate',{method:'POST',body:JSON.stringify(data)});B.importTask(data);job=null;try{localStorage.removeItem(storageKey);}catch{}await prepare();buttons();}catch(err){B.toast(err.message);}finally{e.target.value='';}};
 // Do not let editor shortcuts mutate the board while typing in this modal.
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 function showModels(){const q=$('#agent-model').value.trim().toLowerCase(),matches=availableModels.filter(id=>id.toLowerCase().includes(q));const list=$('#agent-model-list');list.replaceChildren(...matches.map(id=>{const o=document.createElement('option');o.value=id;o.textContent=id;return o;}));list.hidden=!matches.length;list.selectedIndex=-1;if(availableModels.length)$('#agent-model-message').textContent=`已获取 ${availableModels.length} 个模型 · 当前匹配 ${matches.length} 个`;}
 function invalidateModels(){modelRequest++;availableModels=[];$('#agent-model-list').replaceChildren();$('#agent-model-list').hidden=true;$('#agent-model-message').textContent='连接信息已更改，请重新获取模型。';$('#agent-load-models').disabled=false;}
 $('#agent-url').addEventListener('input',invalidateModels);$('#agent-key').addEventListener('input',invalidateModels);
 $('#agent-model').addEventListener('input',showModels);
 $('#agent-model-list').onchange=()=>{if($('#agent-model-list').value)$('#agent-model').value=$('#agent-model-list').value;};
 $('#agent-load-models').onclick=async()=>{
  const request=++modelRequest;$('#agent-load-models').disabled=true;$('#agent-model-message').textContent='正在获取模型列表…';
  try{if(!token)throw Error('请先打开本地服务画板');const data=await(await api('/api/models',{method:'POST',body:JSON.stringify({baseUrl:$('#agent-url').value,apiKey:$('#agent-key').value})})).json();if(request!==modelRequest)return;availableModels=data.models;showModels();if(!availableModels.length)$('#agent-model-message').textContent='接口返回空列表，可手动输入模型名。';}
  catch(e){if(request===modelRequest){availableModels=[];$('#agent-model-list').hidden=true;$('#agent-model-message').textContent=e.message;}}
  finally{if(request===modelRequest)$('#agent-load-models').disabled=false;}
 };
 $('#agent-connect').onclick=async()=>{try{if(!reasoningSupported&&$('#agent-reasoning').value!=='auto')throw Error('请先重启本地服务，再保存思考强度');await api('/api/config',{method:'POST',body:JSON.stringify({apiKey:$('#agent-key').value,baseUrl:$('#agent-url').value,model:$('#agent-model').value,reasoningEffort:$('#agent-reasoning').value})});$('#agent-key').value='';$('#agent-config-message').textContent='已保存';await connection();}catch(e){$('#agent-config-message').textContent=e.message;}};
 $('#agent-disconnect').onclick=async()=>{try{await api('/api/config',{method:'DELETE'});$('#agent-key').value='';invalidateModels();$('#agent-config-message').textContent='已清除 Key';await connection();}catch(e){status(e.message,true);}};
 $('#agent-paper-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>2000000){status('正文请控制在 2 MB 内',true);return;}$('#agent-paper').value=await file.text();saveDocument();};
 function remember(){try{localStorage.setItem(storageKey,JSON.stringify({id:job?.id,submitted}));}catch{status('任务已提交，但本地存储不足；请保持页面打开以便采纳结果。',true);}}
 function resetTaskFeedback(){$('#agent-events').replaceChildren();status('待提交');}
 function clearPreviews(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];$('#agent-comparison').hidden=true;$('#agent-empty').hidden=false;$('#agent-summary').textContent='';$('#agent-warnings').replaceChildren();$('#agent-review-note').textContent='';}
 $('#agent-refresh-scope').onclick=async()=>{if(active()){status('任务运行中，先等待或取消再更新选区');return;}job=null;try{localStorage.removeItem(storageKey);}catch{}clearPreviews();await prepare();status('选区已更新');buttons();};
 $('#agent-submit').onclick=async()=>{
  busy=true;buttons();try{
   if(!submitted?.scope.length)throw Error('请先选择对象');
   if(await hash(P.revision(B.getState()))!==submitted.baseRevision)throw Error('画板已变化，请点击“更新选区”后重新提交');
   const instruction=$('#agent-instruction').value.trim();if(!instruction&&taskType()==='edit')throw Error('请填写修改意见');if(taskType()==='generate'&&!$('#agent-paper').value.trim())throw Error('请输入文档内容');saveDocument();
   submitted={...submitted,pendingSelectionNote:instruction,generationPrompt:taskType()==='generate'?instruction:submitted.generationPrompt,paperContent:$('#agent-paper').value,paper:$('#agent-paper-title').value,purpose:$('#agent-purpose').value,reviewMode:'quick_local',taskType:taskType(),editMode:taskType()==='generate'?'generate':$('#agent-edit-mode').value,preserveLabels:taskType()==='edit'&&$('#agent-preserve-labels').checked,stage:'submitted',autoApply:$('#agent-auto-apply').checked};
   clearPreviews();resetTaskFeedback();job=await(await api('/api/jobs',{method:'POST',body:JSON.stringify(submitted)})).json();remember();status('正在准备图稿…');schedule();
  }catch(e){status(e.message,true);}finally{busy=false;buttons();}
 };
 $('#agent-cancel').onclick=async()=>{try{job=await(await api(`/api/jobs/${job.id}/cancel`,{method:'POST',body:'{}'})).json();status(job.message);clearTimeout(pollTimer);buttons();}catch(e){status(e.message,true);}};
 function schedule(){clearTimeout(pollTimer);pollTimer=setTimeout(poll,1600);}
 async function poll(){
  try{job=await(await api(`/api/jobs/${job.id}`)).json();status(job.message,['failed','interrupted'].includes(job.status));$('#agent-events').replaceChildren(...(job.events||[]).map(e=>{const li=document.createElement('li');li.textContent=conciseStatus(e.message);return li;}));buttons();if(active())schedule();else if(job.status==='completed')await result();}
  catch(e){status('读取任务状态失败：'+e.message+'。刷新页面可重新连接。',true);}
 }
 async function result(){
  clearPreviews();$('#agent-summary').textContent=job.summary||'';
  $('#agent-warnings').replaceChildren(...(job.warnings||[]).map(w=>{const li=document.createElement('li');li.textContent=w;return li;}));
  $('#agent-review-note').textContent=`${job.operations?.length||0} 项修改`;
  for(const name of ['before','after']){const blob=await(await api(`/api/jobs/${job.id}/${name}.svg`)).blob();const u=URL.createObjectURL(blob);urls.push(u);$('#agent-'+name).src=u;}
  $('#agent-comparison').hidden=false;$('#agent-empty').hidden=true;
  if(submitted&&await hash(P.revision(B.getState()))!==submitted.baseRevision){status('画板已变化，请更新选区后重试。结果可预览或下载。',true);$('#agent-adopt').disabled=true;}
  else if(submitted?.autoApply&&job.operations?.length){await adoptToBoard();dialog.close();B.toast('图片已应用');}
 }
 for(const name of ['before','after'])$('#agent-'+name).onclick=()=>{zoom.querySelector('img').src=$('#agent-'+name).src;zoom.showModal();};
 async function adoptToBoard(){
  busy=true;buttons();try{if(await hash(P.revision(B.getState()))!==submitted.baseRevision)throw Error('画板已变化，请更新选区后重试');B.adopt({...job,baseRevision:submitted.baseRevision},submitted);status('已应用');job.status='adopted';try{localStorage.removeItem(storageKey);}catch{}}
  catch(e){status(e.message,true);}finally{busy=false;buttons();}
 }
 $('#agent-adopt').onclick=async()=>{await adoptToBoard();if(job.status==='adopted')dialog.close();};
 $('#agent-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(job,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`figure-edit-${job.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const questions=FigureQuestions.mount({board:B,api,ready:()=>ready,settings:()=>FigureWorkbench.showPanel('ai')});
 window.FigureAgent={isBusy:()=>!!(active()||busy),ask:()=>questions.open(),edit:type=>open(false,type||'edit')};
 window.addEventListener('figure-board-change',()=>{refreshId++;job=null;submitted=null;clearTimeout(pollTimer);clearPreviews();try{localStorage.removeItem(storageKey);}catch{}buttons();});
 connection().then(async()=>{if(!token)return;try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved?.id&&saved.submitted){submitted=saved.submitted;$('#agent-task-type').value=submitted.taskType||'edit';showTaskMode();$('#agent-edit-mode').value=submitted.editMode==='generate'?'redraw':submitted.editMode||'redraw';$('#agent-preserve-labels').checked=submitted.taskType==='generate'?true:submitted.preserveLabels??true;$('#agent-auto-apply').checked=submitted.autoApply??true;$('#agent-edit-mode').onchange();job={id:saved.id,status:'queued'};$('#agent-scope').textContent=submitted.taskType==='generate'?'结合当前画板':submitted.scope.map(s=>s.name).join(' ＋ ');$('#agent-instruction').value=submitted.pendingSelectionNote||'';$('#agent-paper').value=submitted.paperContent||'';$('#agent-paper-title').value=submitted.paper||'';$('#agent-purpose').value=submitted.purpose||'';await poll();}}catch{}});
})();
