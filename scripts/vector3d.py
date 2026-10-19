"""Small vector scene builder for paper diagrams; SVG is dependency-free.

Coordinates are in canvas units with y down. Optional PDF export uses reportlab.
This is a drawing helper, not a paper parser, renderer for arbitrary 3D meshes,
or general SVG-to-PDF converter. Run --demo for an original component example.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager, nullcontext
from dataclasses import dataclass
from math import cos, sin, pi, hypot, isfinite
from pathlib import Path
import xml.etree.ElementTree as ET

SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)


@dataclass(frozen=True)
class Iso:
    ox: float
    oy: float
    scale: float = 32

    def point(self, xyz):
        x, y, z = xyz
        return (self.ox + self.scale * cos(pi / 6) * (x - y),
                self.oy + self.scale * (0.5 * (x + y) - z))


def shade(color, factor):
    """Mix a #RRGGBB color with white (factor > 1) or black (factor < 1)."""
    rgb = [int(color[i:i+2], 16) for i in (1, 3, 5)]
    if factor > 1:
        rgb = [v + (255-v) * min(factor-1, 1) for v in rgb]
    else:
        rgb = [v * max(factor, 0) for v in rgb]
    return '#' + ''.join(f'{round(v):02x}' for v in rgb)


class Figure:
    def __init__(self, width, height, width_mm=180, title='Vector diagram'):
        if not all(isfinite(v) and v > 0 for v in (width, height, width_mm)):
            raise ValueError('Canvas and physical width must be positive and finite')
        self.width, self.height, self.width_mm = width, height, width_mm
        self.title, self.nodes, self.stack = title, [], []
        self._counter = 0

    def _add(self, kind, **data):
        self._counter += 1
        node = dict(kind=kind, id=f'{kind}-{self._counter}', **data)
        (self.stack[-1]['children'] if self.stack else self.nodes).append(node)
        return node

    @contextmanager
    def group(self, name):
        node = self._add('g', name=name, children=[])
        self.stack.append(node)
        try:
            yield
        finally:
            self.stack.pop()

    def polygon(self, points, fill='#FFFFFF', stroke='#52657B', width=0.8, opacity=1):
        self._add('polygon', points=list(points), fill=fill, stroke=stroke,
                  width=width, opacity=opacity)

    def line(self, points, color='#52657B', width=0.8, dash=None, opacity=1):
        self._add('polyline', points=list(points), fill='none', stroke=color,
                  width=width, dash=dash, opacity=opacity)

    def arrow(self, start, end, color='#33465B', width=1.3, head=6, dash=None):
        dx, dy = end[0]-start[0], end[1]-start[1]
        length = hypot(dx, dy)
        if length == 0:
            raise ValueError('Arrow endpoints must differ')
        ux, uy = dx/length, dy/length
        h = min(head, length*0.4)
        base = (end[0]-ux*h, end[1]-uy*h)
        self.line([start, base], color=color, width=width, dash=dash)
        self.polygon([end, (base[0]-uy*h*0.45, base[1]+ux*h*0.45),
                      (base[0]+uy*h*0.45, base[1]-ux*h*0.45)],
                     fill=color, stroke='none')

    def ellipse(self, center, rx, ry, fill='#79B7A8', stroke='none', width=0.8,
                opacity=1, angle=0):
        if rx <= 0 or ry <= 0:
            raise ValueError('Ellipse radii must be positive')
        self._add('ellipse', center=center, rx=rx, ry=ry, fill=fill,
                  stroke=stroke, width=width, opacity=opacity, angle=angle)

    def text(self, x, y, value, size=12, fill='#243649', anchor='start', bold=False):
        if anchor not in ('start', 'middle', 'end'):
            raise ValueError('Invalid text anchor')
        self._add('text', x=x, y=y, value=str(value), size=size, fill=fill,
                  anchor=anchor, bold=bold)

    def plane(self, iso, origin, u, v, color='#6C9CCB', grid=(4, 4), opacity=1):
        """Draw a parallelogram with basis vectors u,v in 3D; grid=(nu,nv)."""
        nu, nv = grid
        if not all(isinstance(n, int) and n > 0 for n in grid):
            raise ValueError('Grid counts must be positive integers')
        def p(a, b):
            return iso.point(tuple(origin[i]+a*u[i]+b*v[i] for i in range(3)))
        self.polygon([p(0, 0), p(1, 0), p(1, 1), p(0, 1)], fill=color,
                     stroke=shade(color, 0.72), opacity=opacity)
        for i in range(1, nu):
            self.line([p(i/nu, 0), p(i/nu, 1)], color='#FFFFFF', opacity=0.9)
        for i in range(1, nv):
            self.line([p(0, i/nv), p(1, i/nv)], color='#FFFFFF', opacity=0.9)

    def box(self, iso, origin, size, color='#6C9CCB', grid=(3, 3, 3), name=None):
        """Opaque axis-aligned box, three visible faces; no hidden interior."""
        x, y, z = origin
        a, b, c = size
        nx, ny, nz = grid
        if min(size) <= 0:
            raise ValueError('Box dimensions must be positive')
        with self.group(name) if name else nullcontext():
            self.plane(iso, (x+a, y, z), (0, b, 0), (0, 0, c),
                       shade(color, .85), (ny, nz))
            self.plane(iso, (x, y+b, z), (a, 0, 0), (0, 0, c),
                       color, (nx, nz))
            self.plane(iso, (x, y, z+c), (a, 0, 0), (0, b, 0),
                       shade(color, 1.35), (nx, ny))

    def wirebox(self, iso, origin, size, color='#8BA4BD', dash=(3, 3)):
        """Draw all twelve edges; caller decides foreground/background order."""
        for axis in range(3):
            other = [a for a in range(3) if a != axis]
            for i in (0, 1):
                for j in (0, 1):
                    a = list(origin)
                    a[other[0]] += i*size[other[0]]
                    a[other[1]] += j*size[other[1]]
                    b = list(a)
                    b[axis] += size[axis]
                    self.line([iso.point(a), iso.point(b)], color=color, dash=dash)

    def voxel_volume(self, iso, shape=(3,3,2), origin=(0,0,0), selected=(),
                     color='#729DC7', context_opacity=.04, grid_opacity=.26):
        """Sparse translucent voxel schematic with a legible outer cage.

        selected: iterable of {index:(i,j,k), color:'#RRGGBB', opacity:0..1}.
        Indices are relative to origin. Render only three faces of each selected
        cell, sorted globally for the fixed Iso view. This is a schematic, not
        volume ray tracing; opacity is stylistic unless the caller defines data.
        """
        if len(shape)!=3 or not all(isinstance(n,int) and n>0 for n in shape):
            raise ValueError('shape must contain three positive integers')
        if not all(0<=v<=1 for v in (context_opacity,grid_opacity)):
            raise ValueError('Opacity must be between 0 and 1')
        def face(axis,side):
            other=[a for a in range(3) if a!=axis]
            out=[]
            for u,v in [(0,0),(1,0),(1,1),(0,1)]:
                p=list(origin);p[axis]+=side*shape[axis]
                p[other[0]]+=u*shape[other[0]];p[other[1]]+=v*shape[other[1]]
                out.append(tuple(p))
            return out
        # Far surfaces provide context without painting every interior cell.
        for axis in range(3):
            self.polygon([iso.point(p) for p in face(axis,0)],fill=color,
                         stroke='none',opacity=context_opacity)
        def grid(side,alpha):
            segments=set()
            for axis in range(3):
                other=[a for a in range(3) if a!=axis]
                for along in other:
                    across=next(a for a in other if a!=along)
                    for k in range(shape[across]+1):
                        a=list(origin);a[axis]+=side*shape[axis];a[across]+=k
                        b=a.copy();b[along]+=shape[along]
                        segments.add(tuple(sorted((tuple(a),tuple(b)))))
            for a,b in sorted(segments):
                self.line([iso.point(a),iso.point(b)],color=color,width=.65,opacity=alpha)
        grid(0,grid_opacity*.55)
        patches=[];seen=set()
        for item in selected:
            idx=tuple(item['index'])
            if len(idx)!=3 or any(not isinstance(i,int) or i<0 or i>=shape[a] for a,i in enumerate(idx)):
                raise ValueError(f'Cell outside volume: {idx}')
            if idx in seen:raise ValueError(f'Duplicate selected cell: {idx}')
            seen.add(idx)
            c=item.get('color',color);alpha=item.get('opacity',.4)
            if not 0<=alpha<=1:raise ValueError('Opacity must be between 0 and 1')
            base=tuple(origin[a]+idx[a] for a in range(3))
            for axis in range(3):
                other=[a for a in range(3) if a!=axis];points=[]
                for u,v in [(0,0),(1,0),(1,1),(0,1)]:
                    p=list(base);p[axis]+=1;p[other[0]]+=u;p[other[1]]+=v
                    points.append(tuple(p))
                tint=shade(c,[.87,1,1.3][axis])
                patches.append((sum(sum(p) for p in points)/4,points,tint,alpha))
        for _,points,c,alpha in sorted(patches,key=lambda v:v[0]):
            self.polygon([iso.point(p) for p in points],fill=c,stroke=shade(c,.8),
                         width=.45,opacity=alpha)
        grid(1,grid_opacity)

    def triplane(self, iso, extent=(1.6,1.6,1.2), cells=4, opacity=1):
        """Three orthogonal planes, split at intersections for this Iso view.

        extent gives positive half-lengths. An even cell count places a split
        on each coordinate axis. This sorting is specific to these planes.
        """
        if cells < 2 or cells % 2 or min(extent) <= 0 or not 0<=opacity<=1:
            raise ValueError('Use positive extents and an even cell count >= 2')
        patches = []
        for axes, color in [((0,1),'#B8DACC'),((0,2),'#B9D3E9'),((1,2),'#E5C5B8')]:
            a,b = axes
            def xyz(u,v):
                p = [0,0,0]
                p[a],p[b] = u*extent[a],v*extent[b]
                return tuple(p)
            for i in range(cells):
                for j in range(cells):
                    u,v = -1+2*i/cells,-1+2*j/cells
                    d = 2/cells
                    vertices = [xyz(u,v),xyz(u+d,v),xyz(u+d,v+d),xyz(u,v+d)]
                    depth = sum(sum(p) for p in vertices)/4
                    patches.append((depth,vertices,color))
        for _,vertices,color in sorted(patches,key=lambda item:item[0]):
            self.polygon([iso.point(p) for p in vertices],fill=color,stroke='#FFFFFF',width=.7,opacity=opacity)

    def save_svg(self, path):
        def el(parent, tag, attrs):
            return ET.SubElement(parent, f'{{{SVG}}}{tag}', {k:str(v) for k,v in attrs.items()})
        root = ET.Element(f'{{{SVG}}}svg', {'width':f'{self.width_mm}mm',
            'height':f'{self.width_mm*self.height/self.width}mm',
            'viewBox':f'0 0 {self.width} {self.height}', 'version':'1.1'})
        el(root, 'title', {}).text = self.title
        def write(nodes, parent):
            for n in nodes:
                attrs = {'id':n.get('name') or n['id']}
                kind = n['kind']
                if kind == 'g':
                    write(n['children'], el(parent, 'g', attrs))
                    continue
                if kind == 'text':
                    attrs.update(x=n['x'], y=n['y'], fill=n['fill'])
                    attrs.update({'font-family':'Arial, Helvetica, sans-serif',
                                  'font-size':n['size'], 'text-anchor':n['anchor'],
                                  'font-weight':'bold' if n['bold'] else 'normal'})
                    el(parent, 'text', attrs).text = n['value']
                    continue
                attrs.update(fill=n['fill'], stroke=n['stroke'], opacity=n['opacity'])
                attrs.update({'stroke-width':n['width'], 'stroke-linejoin':'round'})
                if n.get('dash'):
                    attrs['stroke-dasharray'] = ' '.join(map(str, n['dash']))
                if kind in ('polygon', 'polyline'):
                    attrs['points'] = ' '.join(f'{x:.4f},{y:.4f}' for x,y in n['points'])
                elif kind == 'ellipse':
                    x,y = n['center']
                    attrs.update(cx=x, cy=y, rx=n['rx'], ry=n['ry'])
                    attrs['transform'] = f"rotate({n['angle']} {x} {y})"
                el(parent, kind, attrs)
        write(self.nodes, root)
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        ET.ElementTree(root).write(path, encoding='utf-8', xml_declaration=True)

    def save_pdf(self, path, font_path=None):
        """Export this scene as vector PDF. Optional TTF for non-Latin text."""
        from reportlab.pdfgen.canvas import Canvas
        from reportlab.lib.colors import HexColor
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        def flatten(nodes):
            for n in nodes:
                if n['kind'] == 'g':
                    yield from flatten(n['children'])
                else:
                    yield n
        nodes = list(flatten(self.nodes))
        font = 'Helvetica'
        if font_path:
            font = 'DiagramFont'
            pdfmetrics.registerFont(TTFont(font, str(font_path)))
            supported = pdfmetrics.getFont(font).face.charWidths
            missing = {c for n in nodes if n['kind']=='text' for c in n['value'] if ord(c) not in supported}
            if missing:
                raise ValueError(f'Font lacks glyphs: {sorted(missing)}')
        else:
            for n in nodes:
                if n['kind'] == 'text':
                    try:
                        n['value'].encode('cp1252')
                    except UnicodeEncodeError as exc:
                        raise ValueError('PDF needs font_path for this text; SVG remains usable') from exc
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        scale = self.width_mm * 72 / 25.4 / self.width
        canvas = Canvas(str(path), pagesize=(self.width*scale, self.height*scale))
        canvas.setTitle(self.title)
        canvas.scale(scale, scale)
        for n in nodes:
            canvas.saveState()
            kind = n['kind']
            if kind == 'text':
                canvas.setFillColor(HexColor(n['fill']))
                canvas.setFont(font if font_path or not n['bold'] else 'Helvetica-Bold', n['size'])
                draw = {'start':canvas.drawString, 'middle':canvas.drawCentredString,
                        'end':canvas.drawRightString}[n['anchor']]
                draw(n['x'], self.height-n['y'], n['value'])
            else:
                fill = n['fill'] != 'none'
                stroke = n['stroke'] != 'none'
                if fill: canvas.setFillColor(HexColor(n['fill']))
                if stroke: canvas.setStrokeColor(HexColor(n['stroke']))
                canvas.setLineWidth(n['width'])
                canvas.setLineJoin(1)
                canvas.setFillAlpha(n['opacity'])
                canvas.setStrokeAlpha(n['opacity'])
                if n.get('dash'): canvas.setDash(n['dash'])
                if kind == 'ellipse':
                    x,y = n['center']
                    canvas.translate(x, self.height-y)
                    canvas.rotate(-n['angle'])
                    canvas.ellipse(-n['rx'], -n['ry'], n['rx'], n['ry'], stroke=stroke, fill=fill)
                else:
                    p = canvas.beginPath()
                    for i,(x,y) in enumerate(n['points']):
                        (p.moveTo if i == 0 else p.lineTo)(x, self.height-y)
                    if kind == 'polygon': p.close()
                    canvas.drawPath(p, stroke=stroke, fill=fill)
            canvas.restoreState()
        canvas.showPage()
        canvas.save()


def demo():
    f = Figure(1000, 610, width_mm=180, title='Vector components for spatial paper diagrams')
    f.text(30, 34, 'Spatial representations', size=23, bold=True)
    f.text(30, 60, 'Original component study / synthetic schematic', size=14, fill='#64748B')
    f.line([(30, 78), (970, 78)], color='#DCE3EA')
    f.text(30, 112, '(a) Volume to plane', size=17, bold=True)
    with f.group('volume-to-plane'):
        f.box(Iso(145, 195, 32), (0, 0, 0), (3, 3, 2.2), grid=(3,3,3), color='#6C9CCB', name='spatial-volume')
        f.arrow((245, 210), (315, 210))
        f.text(280, 192, 'pool z', anchor='middle', size=14)
        f.box(Iso(405, 195, 26), (0,0,0), (3,3,.35), grid=(3,3,1), color='#79B7A8', name='bev-plane')
        f.text(145, 310, '3D features', anchor='middle', size=15)
        f.text(405, 310, 'BEV features', anchor='middle', size=15)
    f.text(535, 112, '(b) Triplane query', size=17, bold=True)
    with f.group('triplane-query'):
        p = Iso(720, 228, 39)
        f.triplane(p)
        q = (1.0,.75,1.1)
        for target in [(1,.75,0),(1,0,1.1),(0,.75,1.1)]:
            f.line([p.point(q),p.point(target)], color='#344E67', dash=(3,3))
            f.ellipse(p.point(target), 2.5, 2.5, fill='#344E67')
        f.ellipse(p.point(q), 4, 4, fill='#C65B59')
        x,y = p.point(q)
        f.text(x+10,y-8,'q',size=15,bold=True)
        f.text(617, 184, 'XZ', size=14, fill='#4D7499')
        f.text(830, 184, 'YZ', size=14, fill='#AE7461')
        f.text(825, 285, 'XY', size=14, fill='#548978')
        f.text(720, 330, 'Project q onto three orthogonal planes', anchor='middle', size=14)
    f.line([(30,350),(970,350)],color='#DCE3EA')
    f.text(30,385,'(c) Sparse spatial updates',size=17,bold=True)
    with f.group('sparse-updates'):
        colors = ['#6C9CCB','#79B7A8','#AE9BCB','#DCA06C']
        for ox, label, shift in [(210,'State at t',0),(700,'State at t+1',.28)]:
            p = Iso(ox,460,31)
            f.wirebox(p,(0,0,0),(3,2.4,2.0),dash=(3,4))
            for i, xyz in enumerate([(0.6,.8,.7),(1.5,.5,1.3),(2.3,1.7,.6),(1.2,1.8,1.6)]):
                center = p.point((xyz[0]+shift,xyz[1],xyz[2]))
                f.ellipse(center,15,8,fill=colors[i],opacity=.7,angle=(-25+20*i))
                f.ellipse(center,2,2,fill='#344E67')
            f.text(ox,575,label,anchor='middle',size=15)
        f.arrow((345,475),(565,475))
        f.text(455,454,'update positions',anchor='middle',size=14)
        f.text(455,503,'schematic Gaussians',anchor='middle',size=13,fill='#64748B')
    return f


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--demo', action='store_true', required=True)
    parser.add_argument('--out', type=Path, required=True, help='Output stem without extension')
    parser.add_argument('--pdf', action='store_true', help='Also export vector PDF using reportlab')
    args = parser.parse_args()
    fig = demo()
    fig.save_svg(args.out.with_suffix('.svg'))
    print(args.out.with_suffix('.svg'))
    if args.pdf:
        fig.save_pdf(args.out.with_suffix('.pdf'))
        print(args.out.with_suffix('.pdf'))
