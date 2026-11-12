/* Load extensions only after the saved project has been restored. */
(async()=>{
 try{
  await window.FigureBoardReady;
  for(const file of ['media-import.js','chart-table.js','chart-editor.js','chart-layout.js','equation-renderer.js','equation-editor.js','connection-ui.js','canvas-questions.js','document-import.js','agent/client.js','project-files.js','canvas-settings.js','figure-review.js','evidence-review.js','toolbar-layout.js']){
   await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=file;script.onload=resolve;script.onerror=()=>reject(Error('无法加载 '+file));document.body.append(script);});
  }
  window.dispatchEvent(new Event('figure-ready'));
 }catch(error){const status=document.querySelector('#save-state');status.textContent='启动未完成 · 请刷新';status.title=error.message;console.error(error);}
})();
