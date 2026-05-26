import asyncio
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
TEXT_PATH = ROOT / "assets" / "audio" / "narration.txt"
OUT_PATH = ROOT / "assets" / "audio" / "airport-agent-narration.mp3"
VOICE = "en-US-GuyNeural"
RATE = "-2%"
MAX_ATTEMPTS = 3


async def synthesize(text: str) -> None:
    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
            await communicate.save(str(OUT_PATH))
            return
        except Exception as exc:  # noqa: BLE001 - network / provider failures should not fail render
            last_error = exc
            print(f"Attempt {attempt}/{MAX_ATTEMPTS} failed: {exc}")
            if attempt < MAX_ATTEMPTS:
                await asyncio.sleep(attempt)
    raise RuntimeError("Unable to generate narration with edge_tts") from last_error


async def main() -> None:
    text = TEXT_PATH.read_text(encoding="utf-8")
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        await synthesize(text)
        print(f"Narration written to {OUT_PATH}")
    except Exception as exc:  # noqa: BLE001 - this is an optional artifact
        if OUT_PATH.exists():
            OUT_PATH.unlink()
        print("Warning: Narration generation failed; continuing without voiceover.")
        print(f"Reason: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
