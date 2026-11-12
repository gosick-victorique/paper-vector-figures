import Scene from '../scene-factory.js';
import Commands from '../editor-commands.js';
import Patch from './patch-contract.js';
import Renderer from './render.cjs';
import {createHash} from 'node:crypto';
import Safety from './svg-safety.cjs';
export const evaluationCases=[
 {id:'pipeline',name:'三个模块与方向',paper:'This is a synthetic benchmark, not an experimental claim. Input is processed by Encoder, then Encoder sends its representation to Output. There are exactly these three modules and two forward connections.',request:'Draw a clear left-to-right method diagram with separate editable components labelled Input, Encoder, Output and bound connections Input → Encoder → Output. Do not add data or modules.',labels:['Input','Encoder','Output'],edges:[['Input','Encoder'],['Encoder','Output']]},
 {id:'branch',name:'双分支与融合',paper:'Synthetic benchmark: Image enters Vision; Text enters Language. Vision and Language both send their outputs to Fusion. Fusion sends the result to Prediction. No backward, training or supervision connections are specified.',request:'Draw all six labelled modules, separate editable text and five bound forward connections. Use two aligned branches merging into Fusion, followed by Prediction.',labels:['Image','Text','Vision','Language','Fusion','Prediction'],edges:[['Image','Vision'],['Text','Language'],['Vision','Fusion'],['Language','Fusion'],['Fusion','Prediction']]},
 {id:'chart',name:'原始数据保持',paper:'Synthetic benchmark data only, not research findings. Condition,Value\nA,12\nB,18\nC,15\nThe unit is ms. These are the only supplied values. No uncertainty, extra series or statistical significance is supplied.',request:'Use save_chart to draw an editable bar chart of the supplied values, with Condition labels A/B/C and a Value (ms) label. Preserve the three numerical values exactly. Do not invent error bars. Visibly label the data Synthetic benchmark.',chartText:'Condition,Value\nA,12\nB,18\nC,15'},
 {id:'local-edit',name:'局部修改与锁定保留',paper:'Synthetic editing benchmark. The left module is labelled Before. The right module says Locked and must remain unchanged.',request:'Only change the visible Before label to After using textOverride. Keep all shapes, positions, colors and the Locked module unchanged.',labels:['After','Locked'],edit:true}
];
export function evaluationTask(item){
 let state=Scene.blank();
 if(item.edit){for(const [id,label,x]of [['sample','Before',100],['fixed','Locked',650]])state=Commands.execute(state,{type:'create_component',id,parent:'custom',x,y:200,w:250,h:150,leaves:[{markup:'<rect width="250" height="150" rx="10" fill="#dfeaf0" stroke="#416f89"/>'},{kind:'text',markup:`<text x="50" y="80" font-size="28">${label}</text>`}]});state.nodes.fixed.locked=true;}
 const task={taskType:item.edit?'edit':'generate',editMode:item.edit?'redraw':'generate',executionMode:'autonomous',reviewPolicy:'independent',preserveLabels:false,scene:state.nodes,scope:[{id:item.edit?'sample':'custom'}],allComments:[],comments:[],palette:0,canvas:state.canvas,paper:'固定合成评测 · '+item.name,paperContent:item.paper,pendingSelectionNote:item.request,generationPrompt:item.edit?'':item.request,purpose:'可编辑的科研图示质量评测',autoApply:false,currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><g id="scene"/></svg>'};
 task.currentSvg=Renderer.render(task,state);task.baseRevision=createHash('sha256').update(Patch.revision(state)).digest('hex');return task;
}
export function evaluateResult(item,task,job){
 const checks=[];const add=(name,pass)=>checks.push({name,pass:!!pass});add('任务完成并提交',job.status==='completed'&&!!job.draft);if(job.status!=='completed'||!job.draft)return checks;
 const state={nodes:structuredClone(task.scene)};for(const c of job.draft.changes)if(c.node)state.nodes[c.id]=c.node;else delete state.nodes[c.id];
 const text=id=>{const n=state.nodes[id];if(n.type!=='leaf')return Object.values(state.nodes).filter(c=>c.parent===id).map(c=>text(c.id)).join(' ');if(n.textOverride!==undefined)return n.textOverride;const doc=Safety.parse('<svg xmlns="http://www.w3.org/2000/svg">'+(n.markup||'')+'</svg>');return Array.from(doc.getElementsByTagName('text')).map(t=>t.textContent).join(' ');};
 const all=Object.values(state.nodes).filter(n=>n.type==='leaf').map(n=>text(n.id)).join(' ');
 for(const label of item.labels||[])add('可见标签 '+label,all.split(/\s+/).includes(label));
 const components=Object.values(state.nodes).filter(n=>n.type==='component'),wires=Object.values(state.nodes).filter(n=>n.connection);
 for(const [from,to]of item.edges||[]){const a=components.filter(n=>text(n.id).trim()===from).map(n=>n.id),b=components.filter(n=>text(n.id).trim()===to).map(n=>n.id);add(`${from} → ${to} 绑定方向`,wires.some(n=>a.includes(n.connection.from.node)&&b.includes(n.connection.to.node)));}
 if(item.edges)add('绑定连线数量',wires.length===item.edges.length);
 if(item.chartText){const charts=components.filter(n=>n.chart);add('保留可编辑数据图表',charts.length===1);add('表格来源逐值核验',charts.length===1&&job.draft.dossier?.dataChecks?.results.some(r=>r.objectId===charts[0].id&&r.status==='matched'));add('原始数据完全一致',charts.length===1&&charts[0].chart.text.trim().replace(/\r/g,'')===item.chartText);add('无虚构误差列',charts.every(n=>n.chart.series.every(s=>s.error===undefined||s.error===-1)));}
 if(item.edit){add('仅修改目标文字',job.draft.changes.length===1&&job.draft.changes[0].id==='sample-e1'&&Patch.stable({...state.nodes['sample-e1'],textOverride:undefined})===Patch.stable({...task.scene['sample-e1'],textOverride:undefined}));add('锁定模块保留',Object.keys(task.scene).filter(id=>id.startsWith('fixed')).every(id=>Patch.stable(task.scene[id])===Patch.stable(state.nodes[id])));}
 add('当前版本独立评审通过',job.draft.dossier?.review.verdict==='pass'&&job.draft.dossier.review.revision===job.draft.revision);add('未出现规则错误或检查截断',!job.draft.checks.truncated&&!job.draft.checks.issues.some(i=>i.severity==='error'));
 return checks;
}
