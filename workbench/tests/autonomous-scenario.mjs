// Deterministic tool client used by browser/transport checks; no model quality claim.
export const chartConfig={type:'line',text:'Step,Value\n1,2\n2,4\n3,3',x:0,series:[{column:1,error:-1,name:'Measured',color:'#416f89'}],publication:true,widthMm:65,heightMm:40,fontPt:7,title:'Supplied values'};
export const drawingSteps=[
 ['get_scene',{}],
 ['search_assets',{query:'network',limit:3}],
 ['preview_asset',{assetId:'network'}],
 ['create_component',{requestId:'module-a',expectedRevision:0,id:'ai-input',parent:'custom',name:'Input',x:80,y:80,w:180,h:80,leaves:[{kind:'rect',markup:'<rect width="180" height="80" rx="8" fill="#dfeaf0" stroke="#416f89"/>',w:180,h:80},{kind:'text',markup:'<text x="20" y="45" font-size="8" fill="#23313c">Input</text>',w:150,h:50}]}],
 ['render_region',{}],
 ['check_figure',{}],
 ['apply_ops',{requestId:'readable-label',expectedRevision:1,operations:[{op:'update',id:'ai-input-e1',payload:JSON.stringify({markup:'<text x="20" y="45" font-size="24" fill="#23313c">Input</text>'})}]}],
 ['insert_asset',{requestId:'module-b',expectedRevision:2,id:'ai-network',parent:'custom',assetId:'network',x:380,y:80,options:{label:'Encoder'}}],
 ['connect_objects',{requestId:'wire',expectedRevision:3,id:'ai-wire',parent:'custom',connection:{from:{node:'ai-input',side:'right',offset:.5},to:{node:'ai-network',side:'left',offset:.5},route:'avoid',label:'',color:'#416f89',width:1.5}}],
 ['arrange_objects',{requestId:'align',expectedRevision:4,ids:['ai-input','ai-network'],action:'top'}],
 ['analyze_graph',{ids:['ai-input','ai-network']}],
 ['layout_graph',{requestId:'flow-layout',expectedRevision:5,ids:['ai-input','ai-network'],direction:'right',x:80,y:80,gap:100,laneGap:40}],
 ['checkpoint',{requestId:'checkpoint',expectedRevision:6,name:'Modules arranged'}],
 ['save_chart',{requestId:'chart',expectedRevision:6,id:'ai-chart',parent:'custom',x:80,y:300,config:chartConfig}],
 ['save_equation',{requestId:'equation',expectedRevision:7,id:'ai-formula',parent:'custom',x:650,y:320,config:{source:'y = f(x)',fontPt:12,color:'#23313c',display:true}}],
 ['measure_objects',{ids:['ai-formula','ai-input']}],
 ['render_region',{}],
 ['check_figure',{}],
 ['commit',{requestId:'finish',expectedRevision:8,summary:'已使用组件、绑定连线、可编辑图表与公式，并通过预览修正字号。',warnings:['测试绘图使用示例数据；公式字形和部分复杂背景不能由文字规则检查，需核对预览。']}]
];
export async function runDrawingScenario(draft){const outputs=[];for(const [name,args] of drawingSteps){const out=await draft.call(name,args);outputs.push({name,result:JSON.parse(out.content[0].text),images:out.content.filter(c=>c.type==='image').length});}return outputs;}
