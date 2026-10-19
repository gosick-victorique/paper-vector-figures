"""Build a local visual comparison from actual aggregate_jury outputs."""
from pathlib import Path
from html import escape
import argparse,json,os

def build(round_dirs,output,title,selected=None):
    output=Path(output)
    def link(path):return os.path.relpath(Path(path),output.parent).replace('\\','/')
    data=[]
    for folder in map(Path,round_dirs):
        a=json.loads((folder/'aggregate.json').read_text(encoding='utf-8'))
        # Never infer scores or reviewer completion from image existence.
        a['image_link']=link(a['image'])
        a['svg_link']=link(Path(a['image']).with_suffix('.svg'))
        a['detail_link']=link(folder/'aggregate.md')
        a['decision_link']=link(folder/'decision.md') if (folder/'decision.md').exists() else None
        for r in a['reports']:r['raw_link']=link(folder/(r['judge_id']+'.json'))
        data.append(a)
    if not data:raise ValueError('At least one completed aggregate is required')
    if selected and selected not in {a['revision'] for a in data}:raise ValueError('Selected revision not reviewed')
    page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>__TITLE__</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f0f4f5;color:#273f4d;font:16px/1.7 system-ui}main{max-width:1540px;margin:auto;padding:28px}h1{margin-bottom:6px}h2{font-size:21px}section,details{background:white;padding:20px;border:1px solid #e0e7e9;border-radius:9px;margin:18px 0}.muted{color:#617b85}a{color:#24768d}button{font:inherit;padding:8px 16px;border:1px solid #c5d1d7;border-radius:6px;background:white;cursor:pointer}button.active{color:white;background:#294b59}.controls{display:flex;gap:10px;flex-wrap:wrap}.images{display:grid;grid-template-columns:1fr;gap:18px}.images.pair{grid-template-columns:1fr 1fr}img{width:100%;display:block}figure{margin:0}table{border-collapse:collapse;width:100%}td,th{padding:9px 12px;border-bottom:1px solid #e1e8eb;text-align:left}.scroll{overflow:auto}summary{cursor:pointer;font-weight:650}@media(max-width:850px){main{padding:14px}.images.pair{grid-template-columns:1fr}} </style>
<main><h1>__TITLE__</h1><p class="muted">每版四位独立上下文评委；四维与评委均等权。分数是代理判断，不等于用户审美认可，微小差异不作统计显著解释。</p>
<section><h2>各版四维均分</h2><div class="scroll"><table><thead><tr><th>图稿</th><th>美观</th><th>专业</th><th>方法解释</th><th>丰富</th><th>总分</th><th>完整记录</th></tr></thead><tbody id="scores"></tbody></table></div></section>
<section><h2>图稿与取舍</h2><div id="versions" class="controls"></div><p><button id="compare">并排看上一版</button> · <a id="svg">可编辑矢量图</a> · <a id="decision">综合决定与剩余问题</a></p><div class="images" id="images"></div></section>
<section><h2>当前版评委意见</h2><div id="judges"></div></section></main>
<script>const data=__DATA__,chosen=__SELECTED__;const dims=['aesthetics','professionalism','method_explanation','richness'],labs=['美观','专业','方法解释','丰富'],roles={art_director:'挑剔的视觉总监',method_reviewer:'严谨的领域审稿人',production_editor:'务实的论文图编辑',curious_reader:'好奇的跨领域读者'};const $=id=>document.getElementById(id),fmt=x=>x==null?'缺证':x.toFixed(2);let current=data.findIndex(d=>d.revision===chosen),pair=false;if(current<0)current=data.length-1;function el(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
for(const d of data){const row=el('tr');row.append(el('td',d.revision));for(const k of dims)row.append(el('td',fmt(d.dimensions[k].mean)));row.append(el('td',fmt(d.overall_mean)));const cell=el('td'),a=el('a','评分与证据');a.href=d.detail_link;cell.append(a);row.append(cell);$('scores').append(row);}
function show(){const d=data[current];$('svg').href=d.svg_link;$('decision').hidden=!d.decision_link;if(d.decision_link)$('decision').href=d.decision_link;for(const b of $('versions').children)b.classList.toggle('active',Number(b.dataset.i)===current);$('images').replaceChildren();$('images').classList.toggle('pair',pair&&current>0);for(const i of pair&&current>0?[current-1,current]:[current]){const v=data[i],fig=el('figure');fig.append(el('p',v.revision));const a=el('a');a.href=v.svg_link;const im=el('img');im.src=v.image_link;im.alt=v.revision;a.append(im);fig.append(a);$('images').append(fig);}$('judges').replaceChildren();for(const r of d.reports){const box=el('details');box.append(el('summary',roles[r.judge_id]+' · '+dims.map((k,i)=>labs[i]+' '+fmt(r.dimensions[k].score)).join(' / ')+' · '+r.verdict));box.append(el('p',r.first_impression));for(const issue of r.issues){box.append(el('p',issue.severity+' · '+issue.location+'：'+issue.observation+' 建议：'+issue.suggestion+' 代价：'+issue.tradeoff));}const a=el('a','原始评审');a.href=r.raw_link;box.append(a);$('judges').append(box);}}
data.forEach((d,i)=>{const b=el('button',d.revision);b.dataset.i=i;b.onclick=()=>{current=i;show()};$('versions').append(b)});$('compare').onclick=()=>{pair=!pair;$('compare').textContent=pair?'仅看当前版':'并排看上一版';show()};show();</script></html>'''
    page=page.replace('__TITLE__',escape(title)).replace('__DATA__',json.dumps(data,ensure_ascii=False).replace('</','<\\/')).replace('__SELECTED__',json.dumps(selected))
    output.write_text(page,encoding='utf-8')
    return output

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('round_dirs',nargs='+',type=Path)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--title',default='论文图：独立评审与修订')
    p.add_argument('--selected')
    a=p.parse_args()
    print(build(a.round_dirs,a.output,a.title,a.selected))
