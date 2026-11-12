(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureCanvasSize=api;})(typeof window==='object'?window:globalThis,function(){
 const unitsPerMm=1200/180;
 function fromMm(widthMm=180,heightMm=111){
  widthMm=Number(widthMm);heightMm=Number(heightMm);
  if(!Number.isFinite(widthMm)||!Number.isFinite(heightMm)||widthMm<40||widthMm>500||heightMm<30||heightMm>500)throw Error('画板宽度须为 40–500 mm，高度须为 30–500 mm');
  return{widthMm,heightMm,viewBox:[0,0,widthMm*unitsPerMm,heightMm*unitsPerMm]};
 }
 function read(value){
  const c=value?.canvas||value;if(!c||!('widthMm'in c)&&!('viewBox'in c))return fromMm();
  const result=fromMm(c.widthMm??c.viewBox?.[2]/unitsPerMm,c.heightMm??c.viewBox?.[3]/unitsPerMm);
  if(c.viewBox&&(!Array.isArray(c.viewBox)||c.viewBox.length!==4||c.viewBox.some((n,i)=>!Number.isFinite(n)||Math.abs(n-result.viewBox[i])>.001)))throw Error('画板物理尺寸与坐标范围不一致');
  return result;
 }
 return{unitsPerMm,fromMm,read};
});
