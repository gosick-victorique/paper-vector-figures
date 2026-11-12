import {drawingSteps} from './autonomous-scenario.mjs';
export const paper='Input is passed to the Encoder; the mapping is y = f(x). Supplied measurements are Step,Value: 1,2; 2,4; 3,3. This is a schematic of the method, not a new experiment.\nStep,Value\n1,2\n2,4\n3,3';
export async function fixtureReviewer({role,snapshot}){
 const small=snapshot.scene['ai-network-e0']?.markup.includes('font-size="14"');
 return{report:{summary:role.name+'测试评审已完成',findings:role.id==='readability'&&small?[{severity:'blocker',objectIds:['ai-network'],sourceIds:[],message:'Encoder 标签在出版尺寸下过小。',suggestion:'增大编码器文字后重新渲染。'}]:[],limitations:['本报告由测试执行器生成，用于验证评审与修订流程。']},usage:{input_tokens:1,output_tokens:1},model:'fixture',threadId:'fixture-'+role.id};
}
export async function runReviewedScenario(draft){
 const call=async(name,args={})=>JSON.parse((await draft.call(name,args)).content[0].text);
 for(const [name,args]of drawingSteps.slice(0,-3))await call(name,args);
 let data=await call('get_evidence');const source=data.sources.find(s=>s.kind==='paper');
 const records=data.coverage.required.map(s=>({objectId:s.id,claim:s.kind==='relation'?'Input is passed to the Encoder':s.kind==='data'?'Supplied measurements: 1,2;2,4;3,3':s.kind==='equation'?'The mapping is y = f(x)':s.name,classification:'supported',rationale:'',citations:[{sourceId:source.id,quote:source.text}]}));
 for(const record of records)if(draft.getState().nodes[record.objectId]?.chart){const quote='Step,Value\n1,2\n2,4\n3,3';if(source.text.includes(quote)){record.citations.push({sourceId:source.id,quote});record.data={kind:'table',format:'csv',citationIndex:1};}else record.data={kind:'unstructured',reason:'当前测试输入只包含行内数据说明，未提供完整表格。'};}
 await call('bind_evidence',{requestId:'evidence',expectedRevision:draft.revision,bindings:records});await call('check_evidence');
 for(let round=0;round<2;round++){
  await call('render_region');await call('check_figure');let review=await call('review_figure',{requestId:'review-'+round,expectedRevision:draft.revision});
  while(review.status==='running')review=await call('get_review',{roundId:review.roundId,waitSeconds:1});
  if(review.verdict==='pass')break;if(round)throw Error('Fixture review did not pass');
  const n=draft.getState().nodes['ai-network-e0'];await call('apply_ops',{requestId:'review-fix',expectedRevision:draft.revision,operations:[{op:'update',id:n.id,payload:JSON.stringify({markup:n.markup.replace('font-size="14"','font-size="22"')})}]});
  await call('bind_evidence',{requestId:'evidence-fixed',expectedRevision:draft.revision,bindings:records});
 }
 await call('commit',{requestId:'reviewed-commit',expectedRevision:draft.revision,summary:'已按独立评审意见修正编码器文字，并绑定原文证据。',warnings:['测试评审使用脚本执行器；真实论文含义仍需核对。']});return{result:draft.result};
}
