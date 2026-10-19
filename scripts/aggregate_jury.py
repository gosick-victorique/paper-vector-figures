"""Aggregate independent figure reviews without replacing evidence-based decisions."""
import argparse,json,statistics
from pathlib import Path

JUDGES=('art_director','method_reviewer','production_editor','curious_reader')
DIMS=('aesthetics','professionalism','method_explanation','richness')
LABELS={'aesthetics':'美观','professionalism':'专业','method_explanation':'方法解释','richness':'丰富程度'}

def normalized_path(s):return str(s).replace('\\','/').rstrip('/').casefold()

def aggregate(folder,revision,image):
    reports=[]
    for jid in JUDGES:
        path=folder/(jid+'.json')
        if not path.exists():raise ValueError(f'缺少独立评委结果: {path}')
        r=json.loads(path.read_text(encoding='utf-8-sig'))
        if r.get('judge_id')!=jid or r.get('revision')!=revision:raise ValueError(f'评委/图稿版本不匹配: {path}')
        if normalized_path(r.get('viewed_image',''))!=normalized_path(image):raise ValueError(f'评审图片不匹配: {path}')
        for d in DIMS:
            item=r.get('dimensions',{}).get(d)
            if not isinstance(item,dict):raise ValueError(f'缺维度 {d}: {path}')
            score=item.get('score')
            if score is not None and (type(score) not in (int,float) or not 0<=score<=100):raise ValueError(f'非法分数 {d}: {path}')
            if not item.get('reason'):raise ValueError(f'缺评分依据 {d}: {path}')
        for issue in r.get('issues',[]):
            if issue.get('dimension') not in DIMS or issue.get('severity') not in ('critical','major','minor'):raise ValueError(f'非法问题维度/级别: {path}')
            for key in ('id','location','observation','suggestion','tradeoff'):
                if not issue.get(key):raise ValueError(f'问题缺{key}: {path}')
        if r.get('verdict') not in ('ready','revise','insufficient_evidence'):raise ValueError(f'非法verdict: {path}')
        reports.append(r)
    stats={}
    for d in DIMS:
        vals=[r['dimensions'][d]['score'] for r in reports]
        present=[v for v in vals if v is not None]
        stats[d]={'scores':dict(zip(JUDGES,vals)),'mean':statistics.mean(present) if len(present)==4 else None,
                  'median':statistics.median(present) if len(present)==4 else None,
                  'range':max(present)-min(present) if len(present)==4 else None,
                  'disagreement':len(present)==4 and max(present)-min(present)>=20}
    complete=all(r.get('evidence_read') and r.get('first_impression') and r['verdict']!='insufficient_evidence' and
                 all(r['dimensions'][d]['score'] is not None and r['dimensions'][d].get('evidence') for d in DIMS) for r in reports)
    critical=[{'judge_id':r['judge_id'],**i} for r in reports for i in r.get('issues',[]) if i['severity']=='critical']
    overall=statistics.mean([stats[d]['mean'] for d in DIMS]) if complete else None
    target=bool(complete and not critical and overall>=80 and all(stats[d]['mean']>=75 for d in DIMS) and stats['method_explanation']['mean']>=80)
    return {'revision':revision,'image':image,'weighting':'four judges equal; four dimensions equal (25% each)',
            'dimensions':stats,'overall_mean':overall,'evidence_complete':complete,'critical_issues':critical,
            'numeric_target_met':target,'human_synthesis_required':True,
            'status':'needs_synthesis' if complete else 'incomplete_evidence','reports':reports}

def markdown(a):
    fmt=lambda v:'缺证' if v is None else f'{v:.1f}'
    out=[f'# 四评委评分：{a["revision"]}','',
         '这是独立代理的设计判断，不代表用户认可；数字达标后仍需主代理综合证据。','',
         '| 评委 | 美观 | 专业 | 方法解释 | 丰富程度 | 等权均分 |','|---|---:|---:|---:|---:|---:|']
    for r in a['reports']:
        values=[r['dimensions'][d]['score'] for d in DIMS]
        avg=statistics.mean(values) if all(v is not None for v in values) else None
        out.append('| '+r['judge_id']+' | '+' | '.join(map(fmt,values+[avg]))+' |')
    out+=['| **均值** | '+' | '.join(fmt(a['dimensions'][d]['mean']) for d in DIMS)+' | **'+fmt(a['overall_mean'])+'** |',
          '| 中位数 | '+' | '.join(fmt(a['dimensions'][d]['median']) for d in DIMS)+' | — |',
          '| 极差 | '+' | '.join(fmt(a['dimensions'][d]['range']) for d in DIMS)+' | — |','',
          f'证据完整：{a["evidence_complete"]}；数值工作目标达到：{a["numeric_target_met"]}；未裁决critical：{len(a["critical_issues"])}。','',
          '## 分歧与原始意见','']
    disagreements=[LABELS[d] for d in DIMS if a['dimensions'][d]['disagreement']]
    out.append('极差≥20的维度：'+('、'.join(disagreements) if disagreements else '无')+'。')
    for r in a['reports']:
        out+=['',f'### {r["judge_id"]}','',r['first_impression'],'']
        for i in r.get('issues',[]):out.append(f'- **{i["id"]} / {i["severity"]} / {i["location"]}**：{i["observation"]} 建议：{i["suggestion"]} 代价：{i["tradeoff"]}')
    out+=['','主代理将采纳、部分采纳、不采纳及原因写入同目录 decision.md；本脚本不自动决定如何改图。','']
    return '\n'.join(out)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('round_dir',type=Path);p.add_argument('--revision',required=True);p.add_argument('--image',required=True)
    args=p.parse_args()
    try:a=aggregate(args.round_dir,args.revision,args.image)
    except (ValueError,KeyError,TypeError,json.JSONDecodeError) as exc:p.exit(2,str(exc)+'\n')
    (args.round_dir/'aggregate.json').write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8')
    (args.round_dir/'aggregate.md').write_text(markdown(a),encoding='utf-8')
    print(json.dumps({k:a[k] for k in ('revision','overall_mean','numeric_target_met','status')},ensure_ascii=False))
if __name__=='__main__':main()
