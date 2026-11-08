#!/usr/bin/env python3
"""Independent verifier: full rays + str.find; imports no production scanning code.
Reads {grids:[{id,cells,listed}],terms:[...]} on stdin; JSON on stdout, nonzero on hits.
Private inputs and hashes stay in the build workspace, never in a puzzle asset.
"""
import hashlib,json,sys,unicodedata

def folded(s):
    return ''.join(c for c in unicodedata.normalize('NFD',s) if not unicodedata.combining(c) and c not in "'’ -\t\n").upper()

def verify(data):
    hits=[]
    terms=[folded(term) for term in data['terms']]
    for board in data['grids']:
        rows=board['cells']; height=len(rows); width=len(rows[0])
        assert height and width and all(len(row)==width for row in rows)
        allowances=[set(tuple(p) for p in e['cells']) for e in board.get('listed',[])]
        seen=set()
        for row in range(height):
            for col in range(width):
                for dy,dx in ((-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)):
                    if rows[row][col]=='#': continue
                    before_y,before_x=row-dy,col-dx
                    if 0<=before_y<height and 0<=before_x<width and rows[before_y][before_x]!='#': continue
                    ray=''; positions=[]; y,x=row,col
                    while 0<=y<height and 0<=x<width:
                        if rows[y][x]=='#': break
                        token=folded(rows[y][x]); ray+=token;positions.extend([(y,x)]*len(token));y+=dy;x+=dx
                    for word in terms:
                        start=0
                        while True:
                            at=ray.find(word,start)
                            if at<0: break
                            cells=set(positions[at:at+len(word)])
                            key=(board['id'],word,tuple(sorted(cells)))
                            if key not in seen and not any(cells<=allowed for allowed in allowances):
                                hits.append({'gridId':board['id'],'term':word,'cells':sorted(cells)})
                                seen.add(key)
                            start=at+1
    return {'implementation':'python-rays-v1','implementationSha256':hashlib.sha256(open(__file__,'rb').read()).hexdigest(),'grids':len(data['grids']),'hits':hits,'passed':not hits}

if __name__=='__main__':
    try:
        result=verify(json.load(sys.stdin));print(json.dumps(result));sys.exit(0 if result['passed'] else 1)
    except Exception as error:
        print(json.dumps({'passed':False,'error':str(error)}));sys.exit(2)
