"""Structural SVG checks. Does not certify layout, semantics, or editability."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET


def inspect(path, require_pure=False):
    errors, warnings = [], []
    root = ET.parse(path).getroot()
    local = lambda tag: tag.rsplit('}', 1)[-1]
    tags = Counter(local(e.tag) for e in root.iter())
    if local(root.tag) != 'svg':
        errors.append('Root element is not svg')
    ids = Counter(e.get('id') for e in root.iter() if e.get('id'))
    for name,count in ids.items():
        if count > 1: errors.append(f'Duplicate ID: {name}')
    for e in root.iter():
        for key,value in e.attrib.items():
            if local(key).lower().startswith('on'):
                errors.append('Event-handler attribute found')
            for match in re.findall(r'url\(\s*[\'"]?#([^\s)\'\"]+)', value):
                if match not in ids: errors.append(f'Missing reference: #{match}')
            if local(key) == 'href':
                if value.startswith('#') and value[1:] not in ids:
                    errors.append(f'Missing reference: {value}')
                elif not value.startswith(('#','data:')):
                    warnings.append(f'External resource: {value}')
    if tags['script']: errors.append('Script element found')
    for tag in ('image','foreignObject','filter'):
        if tags[tag]: warnings.append(f'{tags[tag]} {tag} element(s); inspect export behavior')
    if require_pure and (tags['image'] or tags['foreignObject']):
        errors.append('Pure-vector mode forbids image and foreignObject elements')
    if not root.get('viewBox'): warnings.append('No viewBox; check scaling')
    if not tags['text']: warnings.append('No editable text elements; labels may be outlines or absent')
    return dict(file=str(path), elements=dict(tags), errors=errors, warnings=warnings,
                note='Structural check only; render and visually inspect before delivery.')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('svg',type=Path)
    p.add_argument('--require-pure',action='store_true')
    args = p.parse_args()
    try:
        result = inspect(args.svg,args.require_pure)
    except (OSError,ET.ParseError) as exc:
        result = {'errors':[str(exc)]}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    raise SystemExit(1 if result['errors'] else 0)
