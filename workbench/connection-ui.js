(() => {
 const B=FigureBoard,C=FigureConnections,$=s=>document.querySelector(s),esc=FigureTemplates.escape;
 const panel=document.createElement('section');panel.id='connections-panel';
 const sideOptions='<option value="left">左侧</option><option value="right">右侧</option><option value="top">顶部</option><option value="bottom">底部</option>';
 panel.innerHTML=`<div><label>起点模块<select id="link-from" aria-label="起点模块"></select></label><div class="geometry"><label>接口侧<select id="link-from-side">${sideOptions}</select></label><label>位置 %<input id="link-from-offset" type="number" min="0" max="100" value="50"></label></div><label>终点模块<select id="link-to" aria-label="终点模块"></select></label><div class="geometry"><label>接口侧<select id="link-to-side">${sideOptions}</select></label><label>位置 %<input id="link-to-offset" type="number" min="0" max="100" value="50"></label></div><label>连线备注<input id="link-label" maxlength="120" placeholder="如：投影特征 → K/V"></label><label>走线<select id="link-route"><option value="elbow">直角折线</option><option value="straight">直线</option><option value="avoid">自动避障</option></select></label><label class="connection-toggle"><input id="link-avoid-wires" type="checkbox">自动避障时避让其他连线</label><button id="link-save" class="wide">添加绑定连线</button><button id="link-remove" class="wide" hidden>删除绑定连线</button><hr><label class="connection-toggle"><input id="link-repair-ports" type="checkbox">允许调整端口侧和位置</label><button id="link-repair" class="wide" disabled>尝试修复所选连线</button><p id="link-repair-status" role="status"></p></div>`;
 $('#inspector-connections').append(panel);
 let current=null,lastSelection='',modules='',repairing=false;
 function selectedWires(){const s=B.getState();return [...new Set(s.selection.flatMap(id=>[id,...FigureModel.descendants(s,id)]))].filter(id=>s.nodes[id]?.connection);}
 function refresh(){const s=B.getState(),ids=s.selection,n=ids.length===1?s.nodes[ids[0]]:null,leaf=n?.connection?n:n?.type==='component'?Object.values(s.nodes).find(x=>x.parent===n.id&&x.connection):null;
  const options=Object.values(s.nodes).filter(n=>C.isModule(s.nodes,n.id)).map(n=>`<option value="${esc(n.id)}">${esc(n.name)}</option>`).join('');
  if(options!==modules){for(const q of ['#link-from','#link-to']){const v=$(q).value;$(q).innerHTML=options;if(s.nodes[v])$(q).value=v;}modules=options;}
  const key=ids.join('|');if(key!==lastSelection||leaf){current=leaf?.id||null;const c=leaf?.connection;
   if(c){for(const end of ['from','to']){$('#link-'+end).value=c[end].node;$('#link-'+end+'-side').value=c[end].side;$('#link-'+end+'-offset').value=c[end].offset*100;}$('#link-label').value=c.label;$('#link-route').value=c.route;$('#link-avoid-wires').checked=!!c.avoidConnections;}
   else if(n&&C.isModule(s.nodes,n.id)){$('#link-from').value=n.id;$('#link-from-side').value='right';$('#link-to-side').value='left';if($('#link-to').value===n.id)$('#link-to').value=Object.values(s.nodes).find(x=>C.isModule(s.nodes,x.id)&&x.id!==n.id)?.id||'';}
   lastSelection=key;
  }
  $('#link-save').textContent=current?'更新接口与连线':'添加绑定连线';$('#link-remove').hidden=!current;
  const wires=selectedWires();$('#link-repair').disabled=repairing||!wires.length||wires.length>12||wires.some(id=>FigureModel.locked(s,id));
 }
 $('#link-save').onclick=()=>{const c={label:$('#link-label').value.trim(),route:$('#link-route').value,avoidConnections:$('#link-avoid-wires').checked};for(const end of ['from','to'])c[end]={node:$('#link-'+end).value,side:$('#link-'+end+'-side').value,offset:Number($('#link-'+end+'-offset').value)/100};try{B.editConnection(current,c);B.toast('已绑定');}catch(e){B.toast(e.message);}};
 $('#link-remove').onclick=()=>{try{B.editConnection(current,null);B.toast('已删除');}catch(e){B.toast(e.message);}};
 $('#link-repair').onclick=async()=>{repairing=true;refresh();$('#link-repair-status').textContent='正在比较路径并复查图稿…';try{const report=await B.repairConnections({ids:selectedWires(),adjustPorts:$('#link-repair-ports').checked});$('#link-repair-status').textContent=report.status==='improved'?`已调整 ${report.changed.length} 条连线，连线提示 ${report.before.issues.length} → ${report.after.issues.length}；可撤销。`:report.reason;}catch(e){$('#link-repair-status').textContent=e.message;}finally{repairing=false;refresh();}};
 window.addEventListener('figure-selection-change',refresh);refresh();
})();
