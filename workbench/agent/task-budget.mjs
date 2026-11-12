export function taskBudget(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['minutes','toolCalls','reviewRounds'].includes(k)))throw Error('任务预算格式无效');
 const budget={minutes:15,toolCalls:160,reviewRounds:3,...value};
 for(const [key,min,max]of [['minutes',2,30],['toolCalls',20,400],['reviewRounds',1,3]])if(!Number.isInteger(budget[key])||budget[key]<min||budget[key]>max)throw Error(`任务预算 ${key} 须为 ${min}–${max}`);
 return budget;
}
