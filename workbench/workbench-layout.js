(() => {
 const names=['properties','assets','connections','ai'];
 function showPanel(name){if(!names.includes(name))return;for(const key of names){document.querySelector('#inspector-'+key).hidden=key!==name;document.querySelector('#inspector-tab-'+key).setAttribute('aria-selected',String(key===name));}}
 document.querySelector('.inspector-nav').addEventListener('click',e=>{const b=e.target.closest('[data-inspector]');if(b)showPanel(b.dataset.inspector);});
 document.querySelector('.inspector-nav').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const current=names.indexOf(e.target.dataset.inspector);if(current<0)return;e.preventDefault();const i=e.key==='Home'?0:e.key==='End'?names.length-1:(current+(e.key==='ArrowRight'?1:-1)+names.length)%names.length;showPanel(names[i]);document.querySelector('#inspector-tab-'+names[i]).focus();});
 window.FigureWorkbench={showPanel};
})();
