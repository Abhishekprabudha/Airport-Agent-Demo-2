import json
import os
import shlex
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENES = json.loads((ROOT / "data" / "scenes.json").read_text(encoding="utf-8"))
VIDEOS = ROOT / "assets" / "videos"
AUDIO = ROOT / "assets" / "audio" / "airport-agent-narration.mp3"
OUT_DIR = ROOT / "dist"
TMP = ROOT / ".render_tmp"
OUT = OUT_DIR / "airport-agent-demo-narrated.mp4"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def run(cmd):
    print("+", " ".join(shlex.quote(str(c)) for c in cmd))
    subprocess.run(cmd, check=True)


def esc(text: str) -> str:
    return text.replace("%", " percent").replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def build_clip(scene, idx):
    dur = scene["end"] - scene["start"]
    src = VIDEOS / scene["video"]
    dst = TMP / f"{idx:02d}_{scene['id']}.mp4"
    agents = "  •  ".join(scene["agents"][:4])
    kpis = "  |  ".join([f"{k}: {v}" for k, v in scene["kpis"].items()])
    title = scene["headline"]
    section = scene["section"]
    cap = scene["caption"]
    # split caption into two visual lines to avoid overlong drawtext
    words = cap.split()
    mid = len(words)//2
    cap1 = " ".join(words[:mid])
    cap2 = " ".join(words[mid:])
    vf = (
        "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,"
        "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.28:t=fill,"
        "drawbox=x=45:y=45:w=800:h=250:color=black@0.56:t=fill,"
        f"drawtext=fontfile={FONT}:text='{esc(section)}':x=65:y=70:fontsize=24:fontcolor=0xFF6600,"
        f"drawtext=fontfile={FONT}:text='{esc(title)}':x=65:y=105:fontsize=38:fontcolor=white,"
        f"drawtext=fontfile={FONT}:text='{esc(cap1)}':x=65:y=168:fontsize=22:fontcolor=white@0.86,"
        f"drawtext=fontfile={FONT}:text='{esc(cap2)}':x=65:y=202:fontsize=22:fontcolor=white@0.86,"
        "drawbox=x=870:y=45:w=365:h=285:color=black@0.58:t=fill,"
        f"drawtext=fontfile={FONT}:text='ACTIVE AI AGENTS':x=890:y=70:fontsize=20:fontcolor=0xFF6600,"
        f"drawtext=fontfile={FONT}:text='{esc(agents)}':x=890:y=112:fontsize=18:fontcolor=white:line_spacing=14,"
        "drawbox=x=45:y=610:w=1190:h=80:color=black@0.62:t=fill,"
        f"drawtext=fontfile={FONT}:text='{esc(kpis)}':x=65:y=638:fontsize=24:fontcolor=white"
    )
    run([
        "ffmpeg", "-y", "-stream_loop", "-1", "-i", str(src),
        "-t", str(dur), "-vf", vf,
        "-an", "-r", "24", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p", str(dst)
    ])
    return dst


def main():
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg not found. Install ffmpeg first.")
    OUT_DIR.mkdir(exist_ok=True)
    if TMP.exists(): shutil.rmtree(TMP)
    TMP.mkdir()
    clips = [build_clip(scene, i) for i, scene in enumerate(SCENES)]
    concat = TMP / "concat.txt"
    concat.write_text("\n".join([f"file '{p.as_posix()}'" for p in clips]), encoding="utf-8")
    silent = TMP / "silent.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(silent)])
    if AUDIO.exists():
        run(["ffmpeg", "-y", "-i", str(silent), "-i", str(AUDIO), "-c:v", "copy", "-c:a", "aac", "-shortest", str(OUT)])
    else:
        run(["ffmpeg", "-y", "-i", str(silent), "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-c:v", "copy", "-c:a", "aac", "-shortest", str(OUT)])
    print(f"Rendered {OUT}")

if __name__ == "__main__":
    main()
