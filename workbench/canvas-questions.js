window.FigureQuestions={mount({board,api,ready,settings}){
 const dialog=document.createElement('dialog');dialog.id='figure-questions';
 dialog.innerHTML=`<header><h2>向 AI 提问</h2><div><button data-question-settings>AI 设置</button><button data-question-close aria-label="关闭问答">×</button></div></header>
 <div class="question-layout"><aside><img class="question-preview" alt="画板预览"><strong>选区</strong><p class="question-scope"></p><span class="question-paper"></span></aside><section><div class="question-messages" role="log" aria-label="问答记录"></div><div class="question-suggestions"><button>改进建议</button><button>突出重点</button><button>核对方法</button></div><textarea aria-label="向 AI 提问" rows="3" maxlength="12000" placeholder="输入问题"></textarea><div class="question-footer"><span role="status"></span><button data-question-cancel hidden>停止</button><button data-question-send class="primary">发送</button></div></section></div>`;
 document.body.append(dialog);const q=s=>dialog.querySelector(s);let snapshot=null,history=[],controller=null,previewUrl='',signature='';
 function message(role,content){const el=document.createElement('div');el.className='question-message '+role;const label=document.createElement('strong');label.textContent=role==='user'?'你':'AI';const body=document.createElement('div');body.textContent=content;el.append(label,body);q('.question-messages').append(el);el.scrollIntoView({block:'nearest'});return el;}
 function buttons(running){q('[data-question-send]').disabled=running;q('[data-question-cancel]').hidden=!running;q('textarea').disabled=running;q('.question-suggestions').hidden=history.length>0||running;}
 async function send(){const question=q('textarea').value.trim();if(!question||controller)return;if(!ready()){q('[role=status]').textContent='请先在 AI 设置中配置连接';return;}
  controller=new AbortController();const request=controller;buttons(true);q('[role=status]').textContent='正在分析…';const pending=message('user',question);
  try{const response=await(await api('/api/ask',{method:'POST',signal:request.signal,body:JSON.stringify({...snapshot,question,history:history.slice(-12)})})).json();history.push({role:'user',content:question},{role:'assistant',content:response.answer});message('assistant',response.answer);q('textarea').value='';q('[role=status]').textContent='';}
  catch(e){pending.remove();q('[role=status]').textContent=request.signal.aborted?'已停止':e.message;}
  finally{controller=null;buttons(false);if(dialog.open)q('textarea').focus();}
 }
 q('[data-question-send]').onclick=send;q('[data-question-cancel]').onclick=()=>controller?.abort();q('[data-question-close]').onclick=()=>dialog.close();q('[data-question-settings]').onclick=()=>{dialog.close();settings();};
 q('.question-suggestions').onclick=e=>{if(e.target.tagName==='BUTTON'){q('textarea').value=e.target.textContent;q('textarea').focus();}};
 dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
 dialog.addEventListener('close',()=>controller?.abort());
 return{open(){if(controller){if(!dialog.open)dialog.showModal();return;}const next=board.capture('edit'),key=JSON.stringify([next.boardId,next.scope,next.scene,next.paperContent,next.comments]);snapshot=next;if(signature!==key){signature=key;history=[];q('.question-messages').replaceChildren();q('textarea').value='';}q('[role=status]').textContent=ready()?'':'请先在 AI 设置中配置连接';buttons(false);
  q('.question-scope').textContent=next.scope.map(s=>s.name).join(' ＋ ')||'整个画板';q('.question-paper').textContent=next.paperContent?'文档已附加':'';
  const doc=new DOMParser().parseFromString(next.currentSvg,'image/svg+xml');for(const item of next.scope){const b=item.bounds;if(!b?.w||!b?.h)continue;const rect=doc.createElementNS('http://www.w3.org/2000/svg','rect');for(const[k,v]of Object.entries({x:b.x,y:b.y,width:b.w,height:b.h,fill:'none',stroke:'#247fa3','stroke-width':3,'stroke-dasharray':'8 5'}))rect.setAttribute(k,v);doc.documentElement.append(rect);}
  if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)],{type:'image/svg+xml'}));q('img').src=previewUrl;
  if(!dialog.open)dialog.showModal();q('textarea').focus();
 }};
}};
