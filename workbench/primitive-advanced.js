/* Per-element properties. Edits are committed by the existing primitive transaction. */
window.FigurePrimitiveAdvanced={mount(panel,{current,change,position}){
 const root=document.createElement('details');root.className='primitive-advanced';root.innerHTML='<summary>高级属性</summary><div class="advanced-fields"></div>';panel.append(root);
 const fields=root.lastElementChild;let signature='',nodeKey='';
 const choices={
  'stroke-linejoin':[['round','圆角'],['miter','尖角'],['bevel','斜角']],
  'fill-rule':[['nonzero','非零'],['evenodd','奇偶']],
  'font-family':[['Arial, Microsoft YaHei, sans-serif','无衬线'],['Times New Roman, SimSun, serif','衬线'],['Consolas, monospace','等宽']],
  'text-decoration':[['none','无'],['underline','下划线'],['line-through','删除线']],
  'dominant-baseline':[['auto','基线'],['middle','居中'],['hanging','顶端']],
  'vector-effect':[['none','随图形缩放'],['non-scaling-stroke','保持线宽']]
 };
 function control(key,name,value,{min,max,step=.5,options,type='number'}={}){
  const label=document.createElement('label');label.textContent=name;const input=document.createElement(options?'select':'input');input.dataset.advanced=key;input.setAttribute('aria-label',name);
  if(options)for(const [v,text]of options){const opt=document.createElement('option');opt.value=v;opt.textContent=text;input.append(opt);}else{input.type=type;input.step=step;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;}
  if(options&&!options.some(o=>o[0]===String(value))){const opt=document.createElement('option');opt.value=value;opt.textContent=value||'默认';input.append(opt);}
  input.value=typeof value==='number'?Number(value.toFixed(3)):value;input.dataset.initial=input.value;label.append(input);fields.append(label);
 }
 function sync(){const t=current();if(!t)return;const key=t.id+'|'+t.index+'|'+t.el.outerHTML;
  if(key===signature)return;signature=key;fields.replaceChildren();const a=t.shape.a,tag=t.shape.tag,style=getComputedStyle(t.el),val=(k,f)=>a[k]??style.getPropertyValue(k)??f;
  const number=(k,f)=>{const n=parseFloat(val(k,f));return Number.isFinite(n)?n:f;};
  const geometry={rect:[['width','形状宽度'],['height','形状高度']],ellipse:[['cx','圆心 X'],['cy','圆心 Y']],circle:[['cx','圆心 X'],['cy','圆心 Y']],line:[['x1','起点 X'],['y1','起点 Y'],['x2','终点 X'],['y2','终点 Y']],image:[['width','图片宽度'],['height','图片高度']]};
  for(const[k,label]of geometry[tag]||[])control(k,label,number(k,0),{min:['width','height'].includes(k)?.1:undefined});
  if(t.shape.handles.length&&['path','polygon','polyline'].includes(tag)){
   if(!t.shape.handles.some(h=>h.key===nodeKey))nodeKey=t.shape.handles[0].key;
   control('node','节点 / 控制柄',nodeKey,{options:t.shape.handles.map(h=>[h.key,h.label])});const h=t.shape.handles.find(h=>h.key===nodeKey);
   control('node-x','节点 X',h.x);control('node-y','节点 Y',h.y);
  }
  if(tag==='text'){
   control('font-family','字体',val('font-family','Arial, Microsoft YaHei, sans-serif'),{options:choices['font-family']});
   control('font-size','文字大小',number('font-size',16),{min:1,max:300});
   control('data-line-height','行距倍数',Number(a['data-line-height']||1.2),{min:.5,max:5,step:.1});
   for(const k of ['text-decoration','dominant-baseline'])control(k,k==='text-decoration'?'文字装饰':'基线位置',val(k,k==='text-decoration'?'none':'auto'),{options:choices[k]});
  }else if(tag!=='image'){
   for(const[k,name]of [['fill','图元填充色'],['stroke','图元描边色']]){let color=val(k,'#416f89');const rgb=color.match(/^rgb\((\d+)[, ]+(\d+)[, ]+(\d+)/);if(rgb)color='#'+rgb.slice(1,4).map(n=>Number(n).toString(16).padStart(2,'0')).join('');if(/^#[0-9a-f]{6}$/i.test(color))control(k,name,color,{type:'color'});}
   control('stroke-linejoin','拐角样式',val('stroke-linejoin','round'),{options:choices['stroke-linejoin']});
   control('stroke-miterlimit','尖角限制',number('stroke-miterlimit',4),{min:1,max:100});
   control('stroke-dasharray','虚线节奏',val('stroke-dasharray','none')||'none',{type:'text'});
   control('stroke-dashoffset','虚线偏移',number('stroke-dashoffset',0));
   control('vector-effect','描边缩放',a['vector-effect']||'none',{options:choices['vector-effect']});
   control('fill-rule','填充规则',val('fill-rule','nonzero'),{options:choices['fill-rule']});
   control('fill-opacity','填充不透明度 %',number('fill-opacity',1)*100,{min:0,max:100,step:1});
   control('stroke-opacity','描边不透明度 %',number('stroke-opacity',1)*100,{min:0,max:100,step:1});
  }
  control('opacity','图元不透明度 %',number('opacity',1)*100,{min:0,max:100,step:1});
 }
 function submit(input){const key=input.dataset.advanced,t=current();if(!key||!t||input.value===input.dataset.initial)return;
  if(key==='node'){nodeKey=input.value;signature='';sync();position();return;}
  let value=input.value;if(input.type==='number'){if(!value.trim()||!Number.isFinite(Number(value))||(input.min!==''&&Number(value)<Number(input.min))||(input.max!==''&&Number(value)>Number(input.max))){signature='';sync();return;}value=Number(value);}
  let attrs;
  if(key==='node-x'||key==='node-y'){const h=t.shape.handles.find(h=>h.key===nodeKey);attrs=FigurePrimitiveGeometry.drag(t.shape,nodeKey,{x:key==='node-x'?value:h.x,y:key==='node-y'?value:h.y});}
  else if(key==='stroke-dasharray'){const parts=value.trim().split(/[ ,]+/).map(Number);if(value!=='none'&&(!value.trim()||parts.some(n=>!Number.isFinite(n)||n<0)||!parts.some(n=>n>0))){signature='';sync();return;}attrs={[key]:value};}
  else attrs={[key]:key.endsWith('opacity')?value/100:value};
  input.dataset.initial=input.value;if(attrs)change(attrs);signature='';sync();position();
 }
 fields.addEventListener('change',e=>submit(e.target));
 fields.addEventListener('focusout',e=>submit(e.target));
 const apply=document.createElement('button');apply.textContent='应用属性';apply.className='advanced-apply';apply.onclick=()=>{const pending=[...fields.querySelectorAll('[data-advanced]')].filter(e=>e.value!==e.dataset.initial);pending.forEach(submit);};root.append(apply);
 root.addEventListener('toggle',position);return{sync};
}};
