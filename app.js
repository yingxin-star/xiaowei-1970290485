const fallbackManifest = {
  version: 1,
  items: [
    { id: "pony-001", title: "小马正在尝试理解今天", type: "combo", visual: "pony-gallop", audio: { kind: "synth", pattern: "spark" }, tags: ["小马", "原创", "动效"], sourceName: "本项目原创", licenseNote: "原创 CSS/SVG + Web Audio" },
    { id: "pony-002", title: "拒绝加班，尾巴先走一步", type: "meme", visual: "pony-spin", audio: { kind: "synth", pattern: "alarm" }, tags: ["拒绝加班", "抽象"], sourceName: "本项目原创", licenseNote: "原创 CSS/SVG + Web Audio" },
    { id: "pony-003", title: "一口蜂蜜，进入超频模式", type: "combo", visual: "pony-honey", audio: { kind: "synth", pattern: "honey" }, tags: ["哈基米", "超频", "音乐"], sourceName: "本项目原创", licenseNote: "原创 CSS/SVG + Web Audio" },
    { id: "pony-004", title: "弹幕正在从四面八方赶来", type: "gif", visual: "pony-bounce", audio: { kind: "synth", pattern: "glitch" }, tags: ["弹幕", "GIF感", "小马"], sourceName: "本项目原创", licenseNote: "原创 CSS/SVG + Web Audio" },
    { id: "pony-005", title: "这匹马的方向感稍有欠缺", type: "meme", visual: "pony-orbit", audio: { kind: "synth", pattern: "orbit" }, tags: ["迷路", "宇宙", "梗图"], sourceName: "本项目原创", licenseNote: "原创 CSS/SVG + Web Audio" },
    { id: "pony-006", title: "FM 404.0：理智暂时无法接通", type: "audio", visual: "pony-wave", audio: { kind: "synth", pattern: "wave" }, tags: ["电台", "音乐", "404"], sourceName: "本项目原创", licenseNote: "原创 Web Audio" }
  ]
};

const state = {
  manifest: fallbackManifest,
  items: fallbackManifest.items,
  current: null,
  filter: "all",
  isPlaying: false,
  audioMode: "synth",
  timer: null,
  synth: null
};

const $ = (selector) => document.querySelector(selector);
const stage = $("#stage");
const stageMedia = $("#stage-media");
const stageError = $("#stage-error");
const stageSourceLink = $("#stage-source-link");
const stageCaption = $("#stage-caption");
const stageTags = $("#stage-tags");
const stageIndex = $("#stage-index");
const statusLine = $("#status-line");
const trackTitle = $("#track-title");
const trackMeta = $("#track-meta");
const trackArt = $("#track-art");
const playerNote = $("#player-note");
const audio = $("#audio");
const playButton = $("#play-button");
const togglePlayButton = $("#toggle-play-button");
const progress = $("#progress");
const volume = $("#volume");
const currentTime = $("#current-time");
const duration = $("#duration");
const libraryGrid = $("#library-grid");
const emptyState = $("#empty-state");
const cardTemplate = $("#card-template");

const patterns = {
  spark: { bpm: 150, notes: [523, 659, 784, 988, 784, 659, 523, 392] },
  alarm: { bpm: 118, notes: [220, 220, 277, 220, 220, 330, 277, 220] },
  honey: { bpm: 178, notes: [392, 494, 587, 659, 587, 494, 392, 330] },
  glitch: { bpm: 196, notes: [110, 165, 110, 247, 110, 185, 110, 277] },
  orbit: { bpm: 98, notes: [262, 330, 392, 523, 392, 330, 262, 196] },
  wave: { bpm: 128, notes: [330, 392, 440, 523, 440, 392, 330, 262] }
};

function setStatus(message) {
  statusLine.textContent = message;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function typeLabel(item) {
  return { combo: "图音组合", gif: "GIF / 动图", meme: "梗图", audio: "音乐" }[item.type] || "原创内容";
}

function visibleItems() {
  if (state.filter === "all") return state.items;
  return state.items.filter((item) => item.type === state.filter);
}

function setStageVisual(item) {
  stage.dataset.visual = item.visual || "pony-gallop";
  stageMedia.classList.add("is-hidden");
  stageError.classList.add("is-hidden");
  stageCaption.textContent = item.title;

  if (!item.media) return;
  stageMedia.alt = item.title;
  stageMedia.onerror = () => {
    stageMedia.classList.add("is-hidden");
    if (item.sourceUrl) {
      stageSourceLink.href = item.sourceUrl;
      stageError.classList.remove("is-hidden");
    }
    setStatus("这个素材跑路了，但小马还在。可以去原站看看。 ");
  };
  stageMedia.src = item.media;
  stageMedia.classList.remove("is-hidden");
}

function renderCurrent(item) {
  state.current = item;
  const index = state.items.findIndex((entry) => entry.id === item.id) + 1;
  stageIndex.textContent = `${String(Math.max(index, 1)).padStart(2, "0")} / ${String(state.items.length).padStart(2, "0")}`;
  stageTags.textContent = item.tags?.map((tag) => `#${tag}`).join(" ") || "#小马 #抽象";
  trackTitle.textContent = item.title;
  trackMeta.textContent = `${typeLabel(item)} · ${item.sourceName || "来源未填写"}`;
  trackArt.textContent = item.type === "audio" ? "♫" : "🐎";
  setStageVisual(item);
  loadAudio(item);
}

function renderLibrary() {
  const items = visibleItems();
  libraryGrid.replaceChildren();
  $("#item-count").textContent = `${items.length} 条内容`;
  emptyState.classList.toggle("is-hidden", items.length > 0);

  items.forEach((item, index) => {
    const card = cardTemplate.content.cloneNode(true);
    const root = card.querySelector(".media-card");
    const button = card.querySelector(".card-button");
    const visual = card.querySelector(".card-visual");
    const emoji = card.querySelector(".card-emoji");
    card.querySelector(".card-type").textContent = typeLabel(item);
    card.querySelector(".card-index").textContent = String(index + 1).padStart(2, "0");
    card.querySelector(".card-title").textContent = item.title;
    card.querySelector(".card-tags").textContent = item.tags?.map((tag) => `#${tag}`).join(" ") || "#小马";
    card.querySelector(".card-source").textContent = item.sourceName || "来源未填写";
    emoji.textContent = item.type === "audio" ? "♫" : item.type === "meme" ? "💥" : "🐴";
    visual.style.setProperty("--card-accent", ["var(--pink)", "var(--blue)", "var(--acid)", "var(--orange)"][index % 4]);
    button.setAttribute("aria-label", `播放：${item.title}`);
    button.addEventListener("click", () => {
      renderCurrent(item);
      void startPlayback();
      document.querySelector(".stage-wrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    if (item.sourceUrl) {
      const link = card.querySelector(".card-link");
      link.href = item.sourceUrl;
      link.classList.remove("is-hidden");
    }
    root.dataset.id = item.id;
    libraryGrid.append(card);
  });
}

function stopSynth() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  if (state.synth?.gain) state.synth.gain.gain.value = 0;
  state.synth = null;
}

function startSynth(patternName) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    playerNote.textContent = "当前浏览器不支持 Web Audio，请给内容添加 MP3/OGG 文件。";
    return false;
  }
  const context = state.synth?.context || new AudioContext();
  stopSynth();
  const pattern = patterns[patternName] || patterns.spark;
  const gain = context.createGain();
  gain.gain.value = Number(volume.value) * 0.08;
  gain.connect(context.destination);
  let step = 0;
  const tick = () => {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = step % 4 === 0 ? "square" : "triangle";
    oscillator.frequency.value = pattern.notes[step % pattern.notes.length];
    noteGain.gain.setValueAtTime(0.0001, context.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.75, context.currentTime + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(noteGain).connect(gain);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    step += 1;
  };
  tick();
  state.timer = window.setInterval(tick, 60000 / pattern.bpm);
  state.synth = { context, gain };
  playerNote.textContent = "原创 Web Audio 模式 · 小马正在用正弦波努力唱歌。";
  return true;
}

function loadAudio(item) {
  stopSynth();
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  progress.value = "0";
  currentTime.textContent = "0:00";
  duration.textContent = "0:00";
  state.audioMode = "synth";

  if (typeof item.audio === "string") {
    state.audioMode = "file";
    audio.src = item.audio;
    playerNote.textContent = "文件音频模式 · 点击播放。";
  } else if (item.audio?.kind === "synth") {
    playerNote.textContent = "原创 Web Audio 模式 · 先点一下，浏览器才允许小马开嗓。";
  } else {
    playerNote.textContent = "当前内容没有音频，仍然可以欣赏视觉内容。";
  }
  state.isPlaying = false;
  syncPlayButtons();
}

async function startPlayback() {
  if (!state.current) return;
  if (state.audioMode === "file") {
    try {
      await audio.play();
      state.isPlaying = true;
    } catch {
      setStatus("浏览器暂时不让音频出声，请再点一次播放。 ");
      state.isPlaying = false;
    }
  } else if (state.current.audio?.kind === "synth") {
    const started = startSynth(state.current.audio.pattern);
    if (started) {
      const context = state.synth?.context;
      if (context?.state === "suspended") await context.resume();
      state.isPlaying = true;
    }
  } else {
    setStatus("当前是视觉内容，下一匹小马有声音。 ");
  }
  syncPlayButtons();
}

function pausePlayback() {
  if (state.audioMode === "file") audio.pause();
  stopSynth();
  state.isPlaying = false;
  syncPlayButtons();
}

function syncPlayButtons() {
  playButton.disabled = !state.current;
  togglePlayButton.disabled = !state.current;
  playButton.textContent = state.isPlaying ? "Ⅱ" : "▶";
  playButton.setAttribute("aria-label", state.isPlaying ? "暂停" : "播放");
  togglePlayButton.textContent = state.isPlaying ? "Ⅱ 暂停当前" : "▶ 播放当前";
}

function pickRandom() {
  const items = visibleItems();
  if (!items.length) return;
  const candidates = items.filter((item) => item.id !== state.current?.id);
  renderCurrent((candidates.length ? candidates : items)[Math.floor(Math.random() * (candidates.length || items.length))]);
  void startPlayback();
  setStatus("随机信号已接通，正在播放一匹不太稳定的小马。 ");
}

async function loadManifest() {
  try {
    const response = await fetch("content/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`manifest ${response.status}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest.items) || !manifest.items.length) throw new Error("manifest has no items");
    state.manifest = manifest;
    state.items = manifest.items;
    setStatus(`已接通 ${state.items.length} 条内容，理智信号微弱。 `);
  } catch {
    state.manifest = fallbackManifest;
    state.items = fallbackManifest.items;
    setStatus("内容清单暂时没接通，已切换原创备用频道。 ");
  }
  renderLibrary();
  renderCurrent(state.items[0]);
}

$("#random-button").addEventListener("click", pickRandom);
playButton.addEventListener("click", () => (state.isPlaying ? pausePlayback() : void startPlayback()));
togglePlayButton.addEventListener("click", () => (state.isPlaying ? pausePlayback() : void startPlayback()));
volume.addEventListener("input", () => {
  if (state.synth?.gain) state.synth.gain.gain.value = Number(volume.value) * 0.08;
  audio.volume = Number(volume.value);
});
progress.addEventListener("input", () => {
  if (Number.isFinite(audio.duration)) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});
audio.addEventListener("timeupdate", () => {
  currentTime.textContent = formatTime(audio.currentTime);
  progress.value = audio.duration ? String((audio.currentTime / audio.duration) * 100) : "0";
});
audio.addEventListener("loadedmetadata", () => { duration.textContent = formatTime(audio.duration); });
audio.addEventListener("play", () => { state.isPlaying = true; syncPlayButtons(); });
audio.addEventListener("pause", () => { state.isPlaying = false; syncPlayButtons(); });
audio.addEventListener("ended", () => { state.isPlaying = false; syncPlayButtons(); });
audio.addEventListener("error", () => {
  setStatus("音频链接暂时失联了，当前内容仍然可以看。 ");
  playerNote.textContent = "音频加载失败 · 请检查文件路径或来源链接。";
});
document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((entry) => entry.classList.toggle("is-active", entry === button));
    renderLibrary();
  });
});

audio.volume = Number(volume.value);
void loadManifest();
