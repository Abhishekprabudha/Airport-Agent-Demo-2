import asyncio
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
TEXT_PATH = ROOT / "assets" / "audio" / "narration.txt"
OUT_PATH = ROOT / "assets" / "audio" / "airport-agent-narration.mp3"
VOICE = "en-US-GuyNeural"
RATE = "-2%"

async def main():
    text = TEXT_PATH.read_text(encoding="utf-8")
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(OUT_PATH))
    print(f"Narration written to {OUT_PATH}")

if __name__ == "__main__":
    asyncio.run(main())
