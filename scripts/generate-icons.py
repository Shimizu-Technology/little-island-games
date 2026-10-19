"""Rasterize our original geometric island mark using only Python's standard library."""
from pathlib import Path
import math,struct,zlib
ROOT=Path(__file__).resolve().parent.parent

def make(size,path):
    pixels=bytearray(bytes.fromhex('246858')*(size*size))
    def span(y,x1,x2,color):
        if not 0<=y<size:return
        x1=max(0,int(x1));x2=min(size,int(x2)+1)
        if x2>x1:pixels[(y*size+x1)*3:(y*size+x2)*3]=bytes.fromhex(color)*(x2-x1)
    def ellipse(box,color):
        x1,y1,x2,y2=[n*size/1024 for n in box];cx=(x1+x2)/2;cy=(y1+y2)/2;rx=(x2-x1)/2;ry=(y2-y1)/2
        for y in range(int(y1),int(y2)+1):
            value=1-((y-cy)/ry)**2
            if value>=0:dx=rx*math.sqrt(value);span(y,cx-dx,cx+dx,color)
    def polygon(points,color):
        points=[(x*size/1024,y*size/1024) for x,y in points]
        for y in range(int(min(p[1] for p in points)),int(max(p[1] for p in points))+1):
            xs=[]
            for a,b in zip(points,points[1:]+points[:1]):
                if min(a[1],b[1])<=y<max(a[1],b[1]):xs.append(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))
            xs.sort()
            for i in range(0,len(xs)-1,2):span(y,xs[i],xs[i+1],color)
    ellipse((690,140,860,310),'E7BC62');ellipse((155,685,880,840),'94BDB0');ellipse((230,640,795,780),'ECD6A3')
    polygon([(454,698),(446,554),(465,399),(508,288),(542,296),(499,407),(480,554),(490,698)],'BB8D59')
    for shape in [[(519,315),(357,175),(217,261),(379,269),(499,345)],[(522,311),(525,126),(660,130),(580,217),(544,325)],[(526,322),(685,201),(843,286),(683,278),(551,348)],[(514,338),(336,286),(267,421),(400,348),(508,362)],[(542,340),(723,306),(810,449),(668,364),(540,365)]]:polygon(shape,'ABD0AD')
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    raw=b''.join(b'\0'+pixels[y*size*3:(y+1)*size*3] for y in range(size))
    Path(path).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))

for size,name in [(1024,'icon.png'),(512,'splash-icon.png'),(64,'favicon.png')]:make(size,ROOT/'assets'/name)
