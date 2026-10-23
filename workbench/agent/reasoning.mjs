// These levels are accepted by the installed SDK; provider/model support can differ.
export const reasoningEfforts=['auto','minimal','low','medium','high','xhigh','max','ultra'];
export function normalizeReasoning(value='auto'){
 if(!reasoningEfforts.includes(value))throw Error('思考强度无效，请选择默认、minimal、low、medium、high、xhigh、max 或 ultra');
 return value;
}
export function reasoningOptions(config){
 const effort=normalizeReasoning(config.reasoningEffort??'auto');
 return effort==='auto'?{}:{modelReasoningEffort:effort};
}
