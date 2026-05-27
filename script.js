let scenes = [];
let startTime = null;
let raf = null;
let isPlaying = false;
let voiceOn = true;
const totalDuration = 180;
const videoBase = 'assets/videos/';
const narrationAudioPath = 'assets/audio/airport-agent-narration.mp3';
const narrationAudio = new Audio(narrationAudioPath);
narrationAudio.preload = 'auto';
narrationAudio.crossOrigin = 'anonymous';

const els = {
  video: document.getElementById('bgVideo'),
  section: document.getElementById('section'),
  headline: document.getElementById('headline'),
  caption: document.getElementById('caption'),
  agents: document.getElementById('agents'),
  kpis: document.getElementById('kpis'),
  progress: document.getElementById('progress'),
  playBtn: document.getElementById('playBtn'),
  muteBtn: document.getElementById('muteBtn'),
  resetBtn: document.getElementById('resetBtn'),
  throughputGraph: document.getElementById('throughputGraph'),
  queueGraph: document.getElementById('queueGraph'),
  telemetryFeed: document.getElementById('telemetryFeed')
};

const telemetryProfiles = {
  opening: { throughput: 42, queue: 22, feed: ['Control mesh online', 'Data buses synced', 'Narration bootstrapped'] },
  landside: { throughput: 68, queue: 78, feed: ['Arrival surge classifier active', 'Curbside dispatch rebalanced', 'Queue diversion issued'] },
  terminal: { throughput: 72, queue: 58, feed: ['Terminal twin refreshed', 'Asset trilateration locked', 'Mobility SLA safeguarded'] },
  baggage: { throughput: 76, queue: 64, feed: ['Belt stream correlated', 'Mismatch risk dropped', 'Carousel reassigned'] },
  boarding: { throughput: 74, queue: 52, feed: ['Boarding groups resequenced', 'Jet-bridge density normal', 'Pushback timeline protected'] },
  airside: { throughput: 81, queue: 40, feed: ['Turnaround clocks converging', 'GSE dispatch accelerated', 'Safety geofence enforced'] },
  bms: { throughput: 64, queue: 31, feed: ['HVAC load optimized', 'Lift traffic smoothed', 'Energy envelope stabilized'] },
  weather: { throughput: 88, queue: 55, feed: ['Weather model confidence rising', 'De-ice slots pre-built', 'Crew swaps validated'] },
  close: { throughput: 60, queue: 27, feed: ['Executive outcomes compiled', 'Cross-domain risks cleared', 'Run complete'] }
};

function sceneTelemetry(sceneId) {
  if (sceneId.startsWith('landside')) return telemetryProfiles.landside;
  if (sceneId.startsWith('terminal')) return telemetryProfiles.terminal;
  if (sceneId.startsWith('baggage')) return telemetryProfiles.baggage;
  if (sceneId.startsWith('boarding')) return telemetryProfiles.boarding;
  if (sceneId.includes('airside') || sceneId.includes('runway')) return telemetryProfiles.airside;
  if (sceneId.includes('bms')) return telemetryProfiles.bms;
  if (sceneId.includes('weather')) return telemetryProfiles.weather;
  if (sceneId.includes('close')) return telemetryProfiles.close;
  return telemetryProfiles.opening;
}

function buildSpark(svg, baseline, variance, t, isQueue = false) {
  const width = 260;
  const height = 72;
  const points = 26;
  const values = Array.from({ length: points }, (_, i) => {
    const phase = (i / points) * Math.PI * 2 + t * 0.9;
    const wobble = Math.sin(phase) * variance + Math.cos(phase * 0.5) * (variance * 0.45);
    return Math.max(8, Math.min(95, baseline + wobble));
  });
  const step = width / (points - 1);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - (v / 100) * height}`).join(' ');
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  svg.innerHTML = `
    <line class="grid" x1="0" y1="18" x2="260" y2="18"></line>
    <line class="grid" x1="0" y1="36" x2="260" y2="36"></line>
    <line class="grid" x1="0" y1="54" x2="260" y2="54"></line>
    <path class="fill" d="${fillPath}"></path>
    <path class="line" d="${path}"></path>
  `;
  svg.classList.toggle('queue', isQueue);
}

function renderTelemetry(scene, elapsed) {
  const p = sceneTelemetry(scene.id);
  const intra = (elapsed - scene.start) / Math.max(1, scene.end - scene.start);
  buildSpark(els.throughputGraph, p.throughput + intra * 4, 8, elapsed, false);
  buildSpark(els.queueGraph, p.queue - intra * 6, 11, elapsed + 0.8, true);
  const hh = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const mm = String(Math.floor(elapsed % 60)).padStart(2, '0');
  els.telemetryFeed.innerHTML = p.feed.map((line, i) => `
    <div class="feed-row">
      <span class="feed-tag">T+${hh}:${mm}.${i + 1}</span>
      <span class="feed-value">${line}</span>
    </div>
  `).join('');
}

function currentScene(t) { return scenes.find(s => t >= s.start && t < s.end) || scenes[scenes.length - 1]; }
function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92; u.pitch = 0.92; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /Google UK English Male|Microsoft David|Daniel|Google US English/i.test(v.name));
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

function playNarrationTrack() {
  narrationAudio.currentTime = 0;
  narrationAudio.muted = !voiceOn;
  narrationAudio.play().catch(() => {
    // Fallback to in-browser voice if MP3 is unavailable or blocked.
    const scene = currentScene(0);
    if (scene) speak(`${scene.headline}. ${scene.caption}`);
  });
}

let lastSceneId = null;
function renderScene(scene, elapsed) {
  if (!scene) return;
  if (lastSceneId !== scene.id) {
    els.video.src = videoBase + scene.video;
    els.video.play().catch(()=>{});
    els.section.textContent = scene.section;
    els.headline.textContent = scene.headline;
    els.caption.textContent = scene.caption;
    els.agents.innerHTML = scene.agents.map(a => `<div class="agent">${a}</div>`).join('');
    els.kpis.innerHTML = Object.entries(scene.kpis).map(([k,v]) => `<div class="kpi"><div class="label">${k}</div><div class="value">${v}</div></div>`).join('');
    lastSceneId = scene.id;
  }
  els.progress.style.width = `${Math.min(100, elapsed / totalDuration * 100)}%`;
  renderTelemetry(scene, elapsed);
}
function tick(now) {
  if (!startTime) startTime = now;
  const elapsed = Math.min(totalDuration, (now - startTime) / 1000);
  renderScene(currentScene(elapsed), elapsed);
  if (elapsed < totalDuration && isPlaying) {
    raf = requestAnimationFrame(tick);
  } else {
    isPlaying = false;
    narrationAudio.pause();
  }
}
function startDemo() {
  if (isPlaying) return;
  isPlaying = true;
  startTime = null;
  lastSceneId = null;
  els.playBtn.textContent = '▶ Playing';
  playNarrationTrack();
  raf = requestAnimationFrame(tick);
}
function resetDemo() {
  cancelAnimationFrame(raf);
  window.speechSynthesis?.cancel();
  narrationAudio.pause();
  narrationAudio.currentTime = 0;
  isPlaying = false;
  startTime = null;
  lastSceneId = null;
  renderScene(scenes[0], 0);
  els.progress.style.width = '0%';
  els.playBtn.textContent = '▶ Start narrated demo';
}

fetch('data/scenes.json').then(r => r.json()).then(json => { scenes = json; renderScene(scenes[0], 0); });
els.playBtn.addEventListener('click', startDemo);
els.resetBtn.addEventListener('click', resetDemo);
els.muteBtn.addEventListener('click', () => {
  voiceOn = !voiceOn;
  els.muteBtn.textContent = `Voice: ${voiceOn ? 'On' : 'Off'}`;
  narrationAudio.muted = !voiceOn;
  if (!voiceOn) window.speechSynthesis?.cancel();
});
