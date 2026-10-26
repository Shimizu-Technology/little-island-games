"""Build-time neural speech. Models and Python environment stay outside the app.

Kokoro-82M v1.0 (Apache-2.0), kokoro-onnx (MIT). No child data or network
playback. Complete warm/calm banks must be published before a release.
Usage: <venv>/bin/python scripts/generate-neural-audio.py --model-dir <path>
"""
from pathlib import Path
import argparse, concurrent.futures, hashlib, json, os, re, subprocess, tempfile, time

ROOT = Path(__file__).resolve().parent.parent
VOICES = {'warm': 'af_heart', 'calm': 'af_bella'}
MODEL = None

def initialize(model_dir, data_dir):
    global MODEL
    import onnxruntime as rt
    from kokoro_onnx import Kokoro
    from kokoro_onnx.config import EspeakConfig
    options = rt.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = rt.InferenceSession(str(Path(model_dir)/'kokoro-v1.0.onnx'), options, providers=['CPUExecutionProvider'])
    MODEL = Kokoro.from_session(session, str(Path(model_dir)/'voices-v1.0.bin'), espeak_config=EspeakConfig(data_path=data_dir))

def spoken(text):
    for old,new in [(' × ', ' times '), (' + ', ' plus '), (' − ', ' minus '), (' = ', ' equals '), ('→', ' right '), ('←', ' left '), ('↓', ' down '), ('↑', ' up '), ('|', ' '), ('CHamoru', 'Chamorro')]:
        text = text.replace(old,new)
    return re.sub(r'(?<=[=+−×\d ])\?(?=[ =+−×\d])', 'blank', text)

def generate(item):
    import soundfile as sf
    import numpy as np
    voice,key,text,digest = item
    out = ROOT/'assets/audio'/('' if voice == 'warm' else 'calm')
    out.mkdir(parents=True, exist_ok=True)
    target = out/f'{key}.m4a'
    samples, rate = MODEL.create(spoken(text), voice=VOICES[voice], speed=0.95, lang='en-us')
    if len(samples) < rate * 0.08 or not np.isfinite(samples).all():
        raise RuntimeError(f'Invalid speech {key}')
    with tempfile.TemporaryDirectory(prefix='li-neural-') as temp:
        wav = Path(temp)/'voice.wav'; encoded = Path(temp)/'voice.m4a'
        sf.write(wav, samples, rate)
        # Loudness normalization and a true-peak ceiling avoid loud surprises.
        subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-3:LRA=7','-ar','24000','-ac','1','-c:a','aac','-b:a','48k',str(encoded)], check=True,timeout=45)
        encoded.replace(target)
    return voice,key,{'input':digest,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'seconds':round(len(samples)/rate,3)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-dir', required=True)
    parser.add_argument('--data-dir', required=True, help='Short physical path to espeak-ng-data (the library has a path-length limit)')
    parser.add_argument('--workers', type=int,default=2)
    parser.add_argument('--limit', type=int)
    args = parser.parse_args()
    speech = json.loads(subprocess.check_output([os.sys.executable,str(ROOT/'scripts/generate-audio.py'),'--manifest'],text=True))
    receipt = Path(args.model_dir)/'generated.json'
    records = json.loads(receipt.read_text()) if receipt.exists() else {}
    model_hash = hashlib.sha256((Path(args.model_dir)/'kokoro-v1.0.onnx').read_bytes()).hexdigest()
    items=[]
    for voice in VOICES:
        for key,text in sorted(speech.items()):
            digest=hashlib.sha256(json.dumps([text,VOICES[voice],0.95,model_hash,'loudnorm-20-3-7-v1'],ensure_ascii=False).encode()).hexdigest()
            target=ROOT/'assets/audio'/('' if voice=='warm' else 'calm')/f'{key}.m4a'
            old=records.get(voice,{}).get(key,{})
            if target.exists() and old.get('input')==digest and old.get('sha256')==hashlib.sha256(target.read_bytes()).hexdigest():continue
            items.append((voice,key,text,digest))
    if args.limit: items=items[:args.limit]
    print(f'PID {os.getpid()}: {len(items)} pending clips; {len(speech)} keys per voice',flush=True)
    started=time.time()
    with concurrent.futures.ProcessPoolExecutor(max_workers=max(1,min(args.workers,3)),initializer=initialize,initargs=(args.model_dir,args.data_dir)) as pool:
        for index,(voice,key,entry) in enumerate(pool.map(generate,items),1):
            records.setdefault(voice,{})[key]=entry
            if index%10==0 or index==len(items):
                tmp=receipt.with_suffix('.tmp');tmp.write_text(json.dumps(records,sort_keys=True));tmp.replace(receipt)
            if index%50==0:print(f'{index}/{len(items)} clips · {round(time.time()-started)} seconds',flush=True)
    if args.limit: return
    # A map is published only when every expected clip has the matching input hash.
    for voice in VOICES:
        if len(set(speech)-set(records.get(voice,{}))):raise RuntimeError(f'Incomplete {voice} bank')
    lines=['// Generated offline Kokoro voice banks; see docs/LEARNING_GROWTH.md.','export const voiceSources: Record<"warm" | "calm", Record<string, number>> = {']
    for voice in VOICES:
        lines.append(f'  {voice}: {{')
        for key in sorted(speech):
            target=f'../../assets/audio/{"" if voice=="warm" else "calm/"}{key}.m4a'
            lines.append(f'    {json.dumps(key)}: require({json.dumps(target)}),')
        lines.append('  },')
    lines.append('};\n')
    (ROOT/'src/content/neuralAudio.ts').write_text('\n'.join(lines))
    evidence={'engine':'Kokoro-82M v1.0','modelLicense':'Apache-2.0','runtime':'kokoro-onnx 0.6.1 / MIT','modelSHA256':model_hash,'voices':VOICES,'keysPerVoice':len(speech),'secondsByVoice':{v:round(sum(records[v][k]['seconds'] for k in speech),2) for v in VOICES},'networkPlayback':False,'normalization':'-20 LUFS, -3 dBTP, LRA7; 24kHz mono AAC48k','listeningAcceptance':'Operator assessment on family hardware remains separate.'}
    (ROOT/'docs/evidence/neural-audio.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print('Published both complete offline voice maps',flush=True)

if __name__=='__main__':main()
