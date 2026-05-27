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
  telemetryFeed: document.getElementById('telemetryFeed'),
  modelDetails: document.getElementById('modelDetails')
};
const excelChartFamilies = [
  'column', 'line', 'pie', 'doughnut', 'bar', 'area', 'scatter', 'bubble', 'radar', 'treemap',
  'sunburst', 'histogram', 'boxwhisker', 'waterfall', 'funnel', 'combo'
];
const chartSubtypes = {
  column: ['clustered', 'stacked'],
  line: ['markers', 'smoothed'],
  pie: ['3d', 'pie-of-pie'],
  doughnut: ['doughnut'],
  bar: ['clustered', '100%-stacked'],
  area: ['stacked', '100%-stacked'],
  scatter: ['markers', 'smooth-lines'],
  bubble: ['bubble', '3d-bubble'],
  radar: ['filled', 'markers'],
  treemap: ['hierarchical'],
  sunburst: ['ring'],
  histogram: ['histogram', 'pareto'],
  boxwhisker: ['distribution'],
  waterfall: ['bridge'],
  funnel: ['stage-drop'],
  combo: ['column-line']
};

const telemetryProfiles = {
  opening: { metricA: 'Inference Throughput', metricB: 'Queue Pressure', baseA: 42, baseB: 22, feed: ['Control mesh online', 'Data buses synced', 'Narration bootstrapped'] },
  landside: { metricA: 'Arrival Flow Velocity', metricB: 'Queue Pressure', baseA: 68, baseB: 78, feed: ['Arrival surge classifier active', 'Curbside dispatch rebalanced', 'Queue diversion issued'] },
  terminal: { metricA: 'Terminal Asset Coverage', metricB: 'Mobility SLA Confidence', baseA: 72, baseB: 58, feed: ['Terminal twin refreshed', 'Asset trilateration locked', 'Mobility SLA safeguarded'] },
  baggage: { metricA: 'Belt Throughput', metricB: 'Mismatch Risk Index', baseA: 76, baseB: 64, feed: ['Belt stream correlated', 'Mismatch risk dropped', 'Carousel reassigned'] },
  boarding: { metricA: 'Boarding Cadence', metricB: 'Gate Density Index', baseA: 74, baseB: 52, feed: ['Boarding groups resequenced', 'Jet-bridge density normal', 'Pushback timeline protected'] },
  airside: { metricA: 'Turnaround Task Completion', metricB: 'Dispatch Latency', baseA: 81, baseB: 40, feed: ['Turnaround clocks converging', 'GSE dispatch accelerated', 'Safety geofence enforced'] },
  bms: { metricA: 'HVAC Optimisation', metricB: 'Energy Envelope', baseA: 64, baseB: 31, feed: ['HVAC load optimized', 'Lift traffic smoothed', 'Energy envelope stabilized'] },
  weather: { metricA: 'Forecast Confidence', metricB: 'Recovery Readiness', baseA: 88, baseB: 55, feed: ['Weather model confidence rising', 'De-ice slots pre-built', 'Crew swaps validated'] },
  close: { metricA: 'Cross-domain Alignment', metricB: 'Risk Clearance', baseA: 60, baseB: 27, feed: ['Executive outcomes compiled', 'Cross-domain risks cleared', 'Run complete'] }
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

function chartTypeForScene(sceneId, offset = 0) {
  const idx = scenes.findIndex((s) => s.id === sceneId);
  const safeIdx = idx < 0 ? 0 : idx;
  const family = excelChartFamilies[(safeIdx + offset) % excelChartFamilies.length];
  const subtypePool = chartSubtypes[family] || ['standard'];
  const subtype = subtypePool[safeIdx % subtypePool.length];
  return `${family}:${subtype}`;
}

function buildSpark(svg, baseline, variance, t, chartType, isQueue = false) {
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
  const dots = values.map((v, i) => `<circle class=\"point\" cx=\"${i * step}\" cy=\"${height - (v / 100) * height}\" r=\"2.1\"></circle>`).join('');
  const bars = values.filter((_, i) => i % 2 === 0).map((v, i) => `<rect class="bar" x="${i * 20}" y="${height - (v / 100) * height}" width="14" height="${(v / 100) * height}"></rect>`).join('');
  const scatter = values.filter((_, i) => i % 2 === 0).map((v, i) => `<circle class="point" cx="${i * 20 + 8}" cy="${height - (v / 100) * height}" r="2.4"></circle>`).join('');
  const pie = `<g transform="translate(130,36) rotate(${t * 12})"><circle class="slice-a" r="24"></circle><path class="slice-b" d="M0 0 L24 0 A24 24 0 0 1 -4 24 Z"></path><path class="slice-c" d="M0 0 L-4 24 A24 24 0 0 1 -24 -6 Z"></path><circle fill="#081022" r="10"></circle></g>`;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q2 = sorted[Math.floor(sorted.length * 0.5)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const y = (v) => height - (v / 100) * height;
  const box = `<line class="whisker" x1="25" y1="${y(min)}" x2="235" y2="${y(min)}"></line>
    <line class="whisker" x1="25" y1="${y(max)}" x2="235" y2="${y(max)}"></line>
    <rect class="box" x="80" y="${y(q3)}" width="100" height="${Math.max(4, y(q1)-y(q3))}"></rect>
    <line class="median" x1="80" y1="${y(q2)}" x2="180" y2="${y(q2)}"></line>`;
  const [family] = chartType.split(':');
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const radar = `<polygon class="area-fill" points="130,8 200,24 220,52 130,66 40,52 60,24"></polygon>
    <polygon class="line" points="130,15 188,28 202,50 130,58 58,50 72,28"></polygon>`;
  const funnel = `<polygon class="bar" points="20,10 240,10 210,24 50,24"></polygon>
    <polygon class="bar" points="50,28 210,28 190,42 70,42"></polygon>
    <polygon class="bar" points="70,46 190,46 172,60 88,60"></polygon>`;
  const waterfall = values.slice(0, 8).map((v, i) => `<rect class="bar" x="${18 + i * 30}" y="${height - (v / 100) * height}" width="20" height="${(v / 100) * height}"></rect>`).join('') +
    values.slice(0, 7).map((_, i) => `<line class="line" x1="${38 + i * 30}" y1="${height - (values[i] / 100) * height}" x2="${48 + i * 30}" y2="${height - (values[i + 1] / 100) * height}"></line>`).join('');
  const bubble = values.slice(0, 10).map((v, i) => `<circle class="point" cx="${24 + i * 24}" cy="${height - (v / 100) * height}" r="${3 + (i % 4)}"></circle>`).join('');
  const treemap = `<rect class="bar" x="6" y="8" width="90" height="24"></rect><rect class="bar" x="98" y="8" width="70" height="24"></rect>
    <rect class="bar" x="170" y="8" width="84" height="24"></rect><rect class="bar" x="6" y="34" width="124" height="30"></rect>
    <rect class="bar" x="132" y="34" width="122" height="30"></rect>`;
  const sunburst = `<g transform="translate(130,36) rotate(${t * 8})"><circle class="slice-a" r="24"></circle><circle fill="#081022" r="14"></circle>
    <path class="slice-b" d="M0 -24 A24 24 0 0 1 20 12 L12 8 A14 14 0 0 0 0 -14 Z"></path>
    <path class="slice-c" d="M20 12 A24 24 0 0 1 -12 21 L-7 12 A14 14 0 0 0 12 8 Z"></path></g>`;
  let graphMarkup = `<path class="line" d="${path}"></path>${dots}`;
  if (family === 'column' || family === 'histogram' || family === 'bar') graphMarkup = bars;
  if (family === 'scatter') graphMarkup = scatter;
  if (family === 'pie') graphMarkup = pie;
  if (family === 'doughnut' || family === 'sunburst') graphMarkup = sunburst;
  if (family === 'boxwhisker') graphMarkup = box;
  if (family === 'area') graphMarkup = `<path class="area-fill" d="${areaPath}"></path><path class="line" d="${path}"></path>`;
  if (family === 'bubble') graphMarkup = bubble;
  if (family === 'radar') graphMarkup = radar;
  if (family === 'waterfall') graphMarkup = waterfall;
  if (family === 'funnel') graphMarkup = funnel;
  if (family === 'treemap') graphMarkup = treemap;
  if (family === 'combo') graphMarkup = `${bars}<path class="line" d="${path}"></path>`;
  svg.innerHTML = `<line class="grid" x1="0" y1="18" x2="260" y2="18"></line>
    <line class="grid" x1="0" y1="36" x2="260" y2="36"></line>
    <line class="grid" x1="0" y1="54" x2="260" y2="54"></line>${graphMarkup}`;
  svg.classList.toggle('queue', isQueue);
}

function renderTelemetry(scene, elapsed) {
  const p = sceneTelemetry(scene.id);
  const intra = (elapsed - scene.start) / Math.max(1, scene.end - scene.start);
  document.querySelector('.telemetry-grid .graph-card:first-child .graph-label').textContent = p.metricA;
  document.querySelector('.telemetry-grid .graph-card:last-child .graph-label').textContent = p.metricB;
  const typeA = chartTypeForScene(scene.id, 0);
  const typeB = chartTypeForScene(scene.id, 7);
  buildSpark(els.throughputGraph, p.baseA + intra * 4, 8, elapsed, typeA, false);
  buildSpark(els.queueGraph, p.baseB - intra * 6, 11, elapsed + 0.8, typeB, true);
  const kpiKeys = Object.keys(scene.kpis);
  els.modelDetails.innerHTML = `
    <div class="detail-row"><span class="detail-title">Equations</span> y(t)=${Math.round(p.baseA)}+8·sin(ωt), &nbsp; q(t)=${Math.round(p.baseB)}-6·t</div>
    <div class="detail-row"><span class="detail-title">KPIs</span> ${kpiKeys[0]}: ${scene.kpis[kpiKeys[0]]} | ${kpiKeys[1]}: ${scene.kpis[kpiKeys[1]]}</div>
    <div class="detail-row"><span class="detail-title">Active Models</span> Graph-A: ${typeA}, Graph-B: ${typeB}, Telemetry Optimizer: adaptive multi-agent scheduler</div>
  `;
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
