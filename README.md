# AIonOS × SMART Airport Agent Demo

GitHub-ready codebase for a 3-minute narrated airport AI-agent demo.

This repository contains:

- A browser-based narrated command-centre demo using the uploaded airport video assets.
- A 180-second agent timeline covering landside, terminal, airside, runway safety and AI-BMS agents.
- A narration script in `assets/audio/narration.txt`.
- A render pipeline that generates `dist/airport-agent-demo-narrated.mp4`.
- A GitHub Actions workflow to create narration audio and render the MP4.

## Agent groups demonstrated

### Landside
- Passenger Flow Agent
- Smart Car Park Ops Agent
- Ground Transport Dispatch Agent
- Passenger Location Intelligence
- Queue Prediction Agent
- Wayfinding Recommendation Agent

### Terminal
- Terminal Asset Tracking Agent
- Wheelchair Dispatch Agent
- Retail & F&B Intelligence Agent
- Passenger Dwell Analytics Agent
- Baggage Intelligence Agent
- RFID Tracking Agent
- Carousel Allocation Agent
- Gate & Boarding Ops Agent

### Airside
- GSE Asset Tracking Agent
- Aircraft Turnaround Agent
- Airside Geofencing Agent
- Maintenance Crew Response Agent
- FOD & Runway Safety Agent
- AI Camera Detection Agent

### AI-BMS
- AI HVAC & Climate Agent
- Intelligent Lighting Agent
- Fire & Safety AI Agent
- Energy & ESG Agent
- Vertical Transport Agent
- Unified AI Ops Centre

## Run locally

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Click **Start narrated demo**. The browser version uses built-in SpeechSynthesis for narration.

## Run diagnostics for MP4 workflow

```bash
python3 scripts/diagnostics.py
```

This checks both **local** and **GitHub Actions** readiness. It validates workflow files, scene/video integrity, and reports whether local tools are installed. It also verifies the render workflow installs `ffmpeg`, fonts, dependencies, and runs the render script, so you can tell whether any local blocker also blocks GitHub render.

## Generate narration MP3

This uses Microsoft Edge TTS through `edge-tts`.

```bash
pip install -r requirements.txt
python3 scripts/generate_narration.py
```

Output:

```text
assets/audio/airport-agent-narration.mp3
```

## Render final MP4

Requires `ffmpeg`.

```bash
python3 scripts/render_mp4.py
```

Output:

```text
dist/airport-agent-demo-narrated.mp4
```

The render script now generates the narration MP3 first (via `scripts/generate_narration.py`) and aborts if narration cannot be produced, preventing silent MP4 outputs.

## GitHub upload steps

1. Create a new GitHub repository.
2. Upload all files from this folder.
3. Go to **Settings → Pages**.
4. Set source to **Deploy from branch**.
5. Select `main` branch and `/root` folder.
6. Open the GitHub Pages URL to play the browser demo.
7. Go to **Actions → Render narrated airport demo MP4 → Run workflow** to generate the final MP4.
8. Download the rendered artifact from the workflow run.

## Edit the storyline

Change the sequence in:

```text
data/scenes.json
```

Change the spoken narration in:

```text
assets/audio/narration.txt
```

