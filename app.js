const tracks = [
  {
    title: "沙龙",
    artist: "陈奕迅",
    src: "assets/shalong.mp3",
    cover: "./images/Easonchan-H3M-cover.jpg",
    lrc: "lyrics/shalong.lrc",
  },
];

// 为了避免 file:// 下同源策略限制，这里把 LRC “写死”在代码中。
// 直接把你自己的 shalong.lrc 全文粘贴到下面（保持原格式）。
const EMBEDDED_LRC = String.raw`[00:00.000] 作曲 : 陈奕迅
[00:01.000] 作词 : 黄伟文
[00:04.460] 编曲：C. Y. Kong / Gary Tong / Davy Chan
[00:05.460] 监制：Eason / Stanley Leung / C. Y. / Davy Chan
[00:14.460] 对焦 她的爱
[00:20.430] 对慢了 爱人会失去可爱
[00:27.940] 记低 这感慨
[00:33.810] 世事变 有没有将你淹盖
[00:40.400] 只一格 经典的偶遇已 不再
[00:49.020] 尽量框住目前大概
[00:56.810] 留住 温度 速度 温柔和愤怒
[01:04.260] 凝住 今日 怎样 好
[01:10.700] 捉紧 生命浓度 坦白流露 感情和态度
[01:17.790] 留下 浮光 掠影 飞舞
[01:25.370] 每张 都罕有
[01:31.300] 拍下过 记住过 好过拥有 光圈爱漫游
[01:39.329] 眼睛 等色诱
[01:44.859] 有人性 镜头里总有丰收
[01:51.329] 虽则那 即影即有售罄
[01:55.790] 菲林都已拆走
[01:59.880] 但是冲动用完 又再有
[02:08.030] 留住 温度 速度 温柔和愤怒
[02:15.230] 凝住 今日 怎样 好
[02:21.700] 捉紧 生命浓度 坦白流露 感情和态度
[02:29.050] 停下时光 静止衰老
[02:36.770] 登高峰一秒 得奖一秒
[02:41.190] 再破纪录的一秒
[02:43.350] 港湾晚灯 山顶破晓
[02:46.640] 摘下怀念 记住美妙
[02:50.579] 升职那刻 新婚那朝
[02:53.940] 成为父母的一秒
[02:57.560] 要拍照的事 可不少
[03:21.510] 音乐 话剧 诗词和舞蹈
[03:27.440] 揉合 生命 千样好 摄入相簿
[03:35.040] 绚烂如电 虚幻如雾 哀愁和仰慕
[03:40.890] 游乐人间 活得好 谈何容易
[03:46.970] 拍着照片 一路同步 坦白流露 感情和态度
[03:54.450] 其实 人生并非虚耗
[04:03.010] 何来尘埃飞舞
`;

const audio = document.getElementById("audio");
const disc = document.getElementById("disc");
const coverImg = document.getElementById("coverImg");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const lyricsLinesEl = document.getElementById("lyricsLines");
const lyricsEmptyEl = document.getElementById("lyricsEmpty");

const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const progressRange = document.getElementById("progressRange");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const volumeRange = document.getElementById("volumeRange");

let currentIndex = 0;
let isSeeking = false;
let lyrics = [];
let activeLyricIndex = -1;
let lyricOffsetSec = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex(r, g, b) {
  const to2 = (x) => String(clamp(Math.round(x), 0, 255).toString(16)).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function setBgGradient(topRgb, bottomRgb) {
  const root = document.documentElement;
  const top = rgbToHex(topRgb.r, topRgb.g, topRgb.b);
  const bottom = rgbToHex(bottomRgb.r, bottomRgb.g, bottomRgb.b);
  const midRgb = mixRgb(topRgb, bottomRgb, 0.5);
  const mid = rgbToHex(midRgb.r, midRgb.g, midRgb.b);

  root.style.setProperty("--bgTop", top);
  root.style.setProperty("--bgMid", mid);
  root.style.setProperty("--bgBottom", bottom);
}

function trySetBgFromImage(imgEl) {
  try {
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(imgEl, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const topAcc = { r: 0, g: 0, b: 0, n: 0 };
    const bottomAcc = { r: 0, g: 0, b: 0, n: 0 };
    const topMaxY = Math.floor(size / 3);
    const bottomMinY = Math.floor((size * 2) / 3);
    const step = 2;

    for (let y = 0; y < size; y += step) {
      const isTop = y < topMaxY;
      const isBottom = y >= bottomMinY;
      if (!isTop && !isBottom) continue;
      for (let x = 0; x < size; x += step) {
        const idx = (y * size + x) * 4;
        const a = data[idx + 3];
        if (a < 16) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const acc = isTop ? topAcc : bottomAcc;
        acc.r += r;
        acc.g += g;
        acc.b += b;
        acc.n += 1;
      }
    }

    if (topAcc.n === 0 || bottomAcc.n === 0) return;

    const avgTop = { r: topAcc.r / topAcc.n, g: topAcc.g / topAcc.n, b: topAcc.b / topAcc.n };
    const avgBottom = { r: bottomAcc.r / bottomAcc.n, g: bottomAcc.g / bottomAcc.n, b: bottomAcc.b / bottomAcc.n };

    const black = { r: 0, g: 0, b: 0 };
    const top = mixRgb(avgTop, black, 0.15);
    const bottom = mixRgb(avgBottom, black, 0.45);

    setBgGradient(top, bottom);
  } catch {
    // ignore (e.g. canvas security restrictions)
  }
}

function parseLrc(lrcText) {
  const lines = lrcText.split(/\r?\n/);
  const items = [];
  let offsetMs = 0;

  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;

    const mOffset = raw.match(/^\[offset:([+-]?\d+)\]$/i);
    if (mOffset) {
      offsetMs = Number(mOffset[1]) || 0;
      continue;
    }

    const timeRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    let match;
    const times = [];
    while ((match = timeRe.exec(raw)) !== null) {
      const mm = Number(match[1]);
      const ss = Number(match[2]);
      const frac = match[3] ? match[3].padEnd(3, "0") : "000";
      const ms = Number(frac);
      if (!Number.isFinite(mm) || !Number.isFinite(ss) || !Number.isFinite(ms)) continue;
      times.push(mm * 60 + ss + ms / 1000);
    }
    if (times.length === 0) continue;

    const text = raw.replace(timeRe, "").trim();
    if (!text) continue;

    for (const t of times) items.push({ time: t, text });
  }

  const shiftSec = offsetMs / 1000;
  const normalized = items
    .map((x) => ({ time: Math.max(0, x.time + shiftSec), text: x.text }))
    .sort((a, b) => a.time - b.time);

  return { items: normalized, offsetSec: shiftSec };
}

function renderLyrics() {
  if (!lyricsLinesEl || !lyricsEmptyEl) return;
  lyricsLinesEl.innerHTML = "";
  activeLyricIndex = -1;

  if (!lyrics.length) {
    lyricsEmptyEl.hidden = false;
    return;
  }

  lyricsEmptyEl.hidden = true;
  for (let i = 0; i < lyrics.length; i++) {
    const div = document.createElement("div");
    div.className = "lyricLine";
    div.textContent = lyrics[i].text;
    div.dataset.index = String(i);
    lyricsLinesEl.appendChild(div);
  }
}

function ensureVisible(container, el) {
  const pad = 24;
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  const viewTop = container.scrollTop;
  const viewBottom = viewTop + container.clientHeight;
  if (top < viewTop + pad) container.scrollTop = Math.max(0, top - pad);
  else if (bottom > viewBottom - pad) container.scrollTop = Math.max(0, bottom - container.clientHeight + pad);
}

function setActiveLyric(index) {
  if (!lyricsLinesEl) return;
  if (index === activeLyricIndex) return;

  const prev = lyricsLinesEl.querySelector(".lyricLine.is-active");
  if (prev) prev.classList.remove("is-active");

  activeLyricIndex = index;
  if (index < 0) return;

  const el = lyricsLinesEl.querySelector(`.lyricLine[data-index="${index}"]`);
  if (!el) return;
  el.classList.add("is-active");
  ensureVisible(lyricsLinesEl, el);
}

function findLyricIndex(timeSec) {
  if (!lyrics.length) return -1;
  let lo = 0;
  let hi = lyrics.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lyrics[mid].time <= timeSec) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function syncLyrics() {
  const t = (audio.currentTime || 0) + lyricOffsetSec;
  setActiveLyric(findLyricIndex(t));
}

function clearLyrics() {
  lyricOffsetSec = 0;
  lyrics = [];
  activeLyricIndex = -1;
  renderLyrics();
}

function loadLyricsFromText(lrcText) {
  clearLyrics();

  try {
    const parsed = parseLrc(lrcText || "");
    lyricOffsetSec = parsed.offsetSec || 0;
    lyrics = parsed.items || [];
    renderLyrics();
    syncLyrics();
    if (!lyrics.length) console.warn("歌词解析失败：请检查 LRC 是否包含 [mm:ss.xx] 时间戳");
  } catch (e) {
    console.warn("歌词解析失败：请检查 LRC 文本", e);
  }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function safePlay() {
  try {
    await audio.play();
  } catch (err) {
    console.warn("无法播放：", err);
  }
}

function loadTrack(index) {
  currentIndex = clamp(index, 0, tracks.length - 1);
  const track = tracks[currentIndex];

  if (disc) {
    document.body.classList.remove("is-playing");
    disc.style.animation = "none";
    void disc.offsetHeight;
    disc.style.animation = "";
  }

  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  coverImg.src = track.cover;
  if (coverImg.complete) trySetBgFromImage(coverImg);
  loadLyricsFromText(EMBEDDED_LRC);

  audio.src = track.src;
  audio.load();

  progressRange.value = "0";
  progressRange.style.setProperty("--p", "0%");
  currentTimeEl.textContent = "00:00";
  durationEl.textContent = "00:00";
}

function updatePlayUI() {
  const playing = !audio.paused && !audio.ended;
  playBtn.setAttribute("aria-pressed", String(playing));
  if (playIcon) playIcon.dataset.state = playing ? "pause" : "play";
  document.body.classList.toggle("is-playing", playing);
  if (disc) disc.setAttribute("aria-label", playing ? "唱片旋转中" : "唱片已停止");
}

function updateProgressUI() {
  if (isSeeking) return;
  const duration = audio.duration;
  const current = audio.currentTime;

  currentTimeEl.textContent = formatTime(current);
  durationEl.textContent = formatTime(duration);

  if (Number.isFinite(duration) && duration > 0) {
    progressRange.value = String(Math.round((current / duration) * 1000));
    progressRange.style.setProperty("--p", `${(current / duration) * 100}%`);
  } else {
    progressRange.value = "0";
    progressRange.style.setProperty("--p", "0%");
  }
}

function togglePlay() {
  if (!audio.src) loadTrack(currentIndex);
  if (audio.paused) void safePlay();
  else audio.pause();
}

function prevTrack() {
  loadTrack((currentIndex - 1 + tracks.length) % tracks.length);
  void safePlay();
}

function nextTrack() {
  loadTrack((currentIndex + 1) % tracks.length);
  void safePlay();
}

playBtn.addEventListener("click", togglePlay);
prevBtn.addEventListener("click", prevTrack);
nextBtn.addEventListener("click", nextTrack);

volumeRange.addEventListener("input", () => {
  audio.volume = clamp(Number(volumeRange.value), 0, 1);
});

progressRange.addEventListener("pointerdown", () => {
  isSeeking = true;
});
progressRange.addEventListener("pointerup", () => {
  isSeeking = false;
});
progressRange.addEventListener("input", () => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  const ratio = Number(progressRange.value) / 1000;
  audio.currentTime = clamp(ratio * audio.duration, 0, audio.duration);
  currentTimeEl.textContent = formatTime(audio.currentTime);
  progressRange.style.setProperty("--p", `${ratio * 100}%`);
  syncLyrics();
});

audio.addEventListener("play", () => {
  updatePlayUI();
});
audio.addEventListener("pause", () => {
  updatePlayUI();
});
audio.addEventListener("timeupdate", updateProgressUI);
audio.addEventListener("timeupdate", syncLyrics);
audio.addEventListener("loadedmetadata", updateProgressUI);
audio.addEventListener("ended", () => {
  updatePlayUI();
  nextTrack();
});
audio.addEventListener("error", () => {
  updatePlayUI();
  console.warn("音频加载失败：请确认 assets/shalong.mp3 存在且可访问");
});

coverImg.addEventListener("load", () => {
  trySetBgFromImage(coverImg);
  syncLyrics();
});

audio.volume = clamp(Number(volumeRange.value), 0, 1);
loadTrack(0);
