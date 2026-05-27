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
  resetBtn: document.getElementById('resetBtn')
};

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
