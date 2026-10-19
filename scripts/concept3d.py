"""Vector layers for abstract methods. Display depth is not a data coordinate.

Uses Figure from sibling vector3d.py. All visible faces share one oblique basis;
draw separated layers from low z to high z. Intersecting solids need splitting.
"""
from dataclasses import dataclass
from math import isfinite
from vector3d import shade

@dataclass(frozen=True)
class Oblique:
    ox: float
    oy: float
    dx: float = .42
    dy: float = -.48

    def point(self, xyz):
        u,v,z=xyz
        return self.ox+u+self.dx*v, self.oy+self.dy*v-z

def slab(fig, p, origin, size, color='#BDD6E8', opacity=1):
    """Draw a shallow prism; return projected top-surface coordinate function.

    size=(width, rearward_depth, thickness), all positive. This face order is
    for the default oblique direction (dx > 0, dy < 0), not arbitrary cameras.
    """
    if not all(isfinite(a) and a>0 for a in size): raise ValueError('Positive finite size required')
    if not 0<=opacity<=1: raise ValueError('Opacity must be in [0,1]')
    if not p.dx>0 or not p.dy<0: raise ValueError('Use a rightward, upward rear axis')
    x,y,z=origin;w,d,h=size
    def q(a,b,c):return p.point((x+a,y+b,z+c))
    fig.polygon([q(0,0,0),q(w,0,0),q(w,0,h),q(0,0,h)],fill=shade(color,.86),stroke=shade(color,.66),width=.7,opacity=opacity)
    fig.polygon([q(w,0,0),q(w,d,0),q(w,d,h),q(w,0,h)],fill=shade(color,.72),stroke=shade(color,.66),width=.7,opacity=opacity)
    fig.polygon([q(0,0,h),q(w,0,h),q(w,d,h),q(0,d,h)],fill=color,stroke=shade(color,.72),width=.8,opacity=opacity)
    return lambda u,v:q(u,v,h)

def surface_rect(fig, top, u,v,w,d, color, opacity=1):
    fig.polygon([top(u,v),top(u+w,v),top(u+w,v+d),top(u,v+d)],fill=color,stroke='none',opacity=opacity)

def document(fig,p,origin=(0,0,0),size=(90,100,3),color='#E5EFF5',accent='#5487AC',highlight=True):
    top=slab(fig,p,origin,size,color)
    w,d,_=size
    surface_rect(fig,top,9,d-23,w*.45,8,accent)
    for i,v in enumerate([d-40,d-53,d-66,d-79]):
        if v<7:continue
        if highlight and i==1:surface_rect(fig,top,8,v-3,w*.65,8,'#F5CD8C',.85)
        fig.line([top(10,v),top(w-(14 if i%2 else 25),v)],color=accent,width=1.4,opacity=.55)
    return top
