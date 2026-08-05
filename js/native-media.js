// ===== 浏览器原生音视频工具 =====
// 仅使用 Web Audio API、MediaRecorder、captureStream。
const NATIVE_MAX_FILE_SIZE = 500 * 1024 * 1024;
let toastTimer;
let supportInfo = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('toolbox_theme', isDark ? 'light' : 'dark');
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = isDark
      ? '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
}

function setNativeProgress(percent, text) {
  const fill = document.getElementById('mediaProgressFill');
  const label = document.getElementById('mediaLoadText');
  const num = document.getElementById('mediaLoadPercent');
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  if (fill) fill.style.width = `${value}%`;
  if (label && text) label.textContent = text;
  if (num) num.textContent = `${value}%`;
}

function setNativeStatus(text) {
  const status = document.getElementById('mediaStatus');
  if (status) status.textContent = text;
}

function getAudioContextClass() {
  return window.AudioContext || window.webkitAudioContext;
}

function getMediaCapture(el) {
  return el.captureStream || el.mozCaptureStream;
}

function canRecord(mime) {
  return window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime);
}

function detectBrowserSupport() {
  const AudioContextClass = getAudioContextClass();
  const video = document.createElement('video');
  return {
    file: !!(window.File && window.Blob && window.URL && Blob.prototype.arrayBuffer),
    audio: !!(AudioContextClass && window.OfflineAudioContext),
    mediaRecorder: !!window.MediaRecorder,
    mediaCapture: !!getMediaCapture(video),
    canvasCapture: !!(window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream),
    webmVideo: canRecord('video/webm;codecs=vp8,opus') || canRecord('video/webm'),
    webmAudio: canRecord('audio/webm;codecs=opus') || canRecord('audio/webm')
  };
}

function renderBrowserSupport() {
  supportInfo = detectBrowserSupport();
  const items = [
    ['基础文件 API', supportInfo.file],
    ['Web Audio / OfflineAudioContext', supportInfo.audio],
    ['MediaRecorder', supportInfo.mediaRecorder],
    ['视频 captureStream', supportInfo.mediaCapture],
    ['Canvas captureStream', supportInfo.canvasCapture],
    ['WebM 视频录制', supportInfo.webmVideo],
    ['WebM 音频录制', supportInfo.webmAudio]
  ];
  const missing = items.filter(([, ok]) => !ok).map(([name]) => name);
  const compat = document.getElementById('mediaCompatStatus');
  if (compat) {
    compat.innerHTML = items.map(([name, ok]) => `${ok ? '✅' : '⚠️'} ${name}`).join('　');
  }
  setNativeProgress(100, missing.length ? '检测完成：当前浏览器部分能力不足' : '检测完成：当前浏览器可用');
  if (missing.length) {
    setNativeStatus(`检测到老浏览器或受限环境：${missing.join('、')} 不可用。建议使用新版 Chrome / Edge / Safari。音频 WAV 功能通常仍可用，视频功能可能不可用。`);
  } else {
    setNativeStatus('浏览器能力检测通过。请选择文件后开始处理。');
  }
}

function parseTimeToSeconds(value, fallback = 0) {
  const text = (value || '').trim();
  if (!text) return fallback;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const parts = text.split(':').map(Number);
  if (parts.some(Number.isNaN)) return fallback;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return fallback;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function assertNativeFileSize(files) {
  const total = files.reduce((sum, file) => sum + (file?.size || 0), 0);
  if (total > NATIVE_MAX_FILE_SIZE) {
    throw new Error('文件总大小超过 500MB，请选择更小的文件。');
  }
}

function updateMediaMode() {
  const mode = document.getElementById('mediaMode')?.value || 'cut-video';
  const mainInput = document.getElementById('mediaMainFile');
  const mainLabel = document.getElementById('mediaMainLabel');
  const mainHint = document.getElementById('mediaMainHint');
  const audioBox = document.getElementById('mediaAudioBox');
  const timeRow = document.getElementById('mediaTimeRow');
  const formatBox = document.getElementById('mediaFormatBox');
  if (!mainInput || !mainLabel || !mainHint || !audioBox || !timeRow || !formatBox) return;

  audioBox.style.display = mode === 'merge-av' ? 'block' : 'none';
  timeRow.style.display = mode === 'audio-convert' || mode === 'merge-av' ? 'none' : 'grid';
  formatBox.style.display = mode === 'audio-convert' ? 'block' : 'none';

  if (mode === 'cut-audio' || mode === 'audio-convert') {
    mainInput.accept = 'audio/*';
    mainLabel.textContent = '选择音频文件';
    mainHint.textContent = mode === 'audio-convert' ? '将音频解码后导出为 WAV' : '剪切指定时间段并导出 WAV';
  } else {
    mainInput.accept = 'video/*';
    mainLabel.textContent = '选择视频文件';
    mainHint.textContent = mode === 'merge-av' ? '选择要合并音轨的视频文件，结果输出 WebM' : '剪切指定时间段并输出 WebM';
  }
  renderBrowserSupport();
}

async function decodeAudioFile(file) {
  if (!supportInfo?.audio) throw new Error('当前浏览器不支持 Web Audio，请升级浏览器。');
  const AudioContextClass = getAudioContextClass();
  const ctx = new AudioContextClass();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  await ctx.close?.();
  return audioBuffer;
}

function sliceAudioBuffer(audioBuffer, start, end) {
  const sampleRate = audioBuffer.sampleRate;
  const safeStart = Math.max(0, Math.min(start, audioBuffer.duration));
  const safeEnd = Math.max(safeStart, Math.min(end || audioBuffer.duration, audioBuffer.duration));
  const frameCount = Math.max(1, Math.ceil((safeEnd - safeStart) * sampleRate));
  const offline = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sampleRate);
  const output = offline.createBuffer(audioBuffer.numberOfChannels, frameCount, sampleRate);
  const startFrame = Math.floor(safeStart * sampleRate);
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const input = audioBuffer.getChannelData(channel).subarray(startFrame, startFrame + frameCount);
    output.getChannelData(channel).set(input);
  }
  return output;
}

function encodeWav(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length * channels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset++, str.charCodeAt(i));
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + length, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * channels * 2, true); offset += 4;
  view.setUint16(offset, channels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString('data');
  view.setUint32(offset, length, true); offset += 4;

  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function getRecorderMime(kind) {
  const candidates = kind === 'audio'
    ? ['audio/webm;codecs=opus', 'audio/webm']
    : ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((mime) => canRecord(mime)) || '';
}

function recordStream(stream, durationMs, mimeType) {
  return new Promise((resolve, reject) => {
    if (!window.MediaRecorder) {
      reject(new Error('当前浏览器不支持 MediaRecorder，请升级浏览器。'));
      return;
    }
    const chunks = [];
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(recorder.error || new Error('录制失败'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
    recorder.start(250);
    setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, Math.max(300, durationMs));
  });
}

async function cutAudio(file) {
  setNativeStatus('正在解码音频...');
  setNativeProgress(20, '正在解码音频...');
  const start = parseTimeToSeconds(document.getElementById('mediaStart')?.value, 0);
  const end = parseTimeToSeconds(document.getElementById('mediaEnd')?.value, 0);
  const audioBuffer = await decodeAudioFile(file);
  setNativeProgress(55, '正在剪切音频...');
  const sliced = sliceAudioBuffer(audioBuffer, start, end || audioBuffer.duration);
  setNativeProgress(80, '正在导出 WAV...');
  return { blob: encodeWav(sliced), name: 'cut-audio.wav' };
}

async function convertAudio(file) {
  setNativeStatus('正在转为 WAV...');
  setNativeProgress(25, '正在解码音频...');
  const audioBuffer = await decodeAudioFile(file);
  setNativeProgress(80, '正在导出 WAV...');
  return { blob: encodeWav(audioBuffer), name: 'converted.wav' };
}

function loadMediaElement(el, file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    el.preload = 'metadata';
    el.src = url;
    el.onloadedmetadata = () => resolve(url);
    el.onerror = () => reject(new Error('浏览器无法读取该媒体文件，请换用 MP4 / WebM / MP3 / WAV 等常见格式。'));
  });
}

async function cutVideo(file) {
  if (!supportInfo?.mediaRecorder || !supportInfo?.mediaCapture || !supportInfo?.webmVideo) {
    throw new Error('当前浏览器不支持视频 captureStream / MediaRecorder，请使用新版 Chrome 或 Edge。');
  }
  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = false;
  video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;';
  document.body.appendChild(video);
  const objectUrl = await loadMediaElement(video, file);
  try {
    const start = parseTimeToSeconds(document.getElementById('mediaStart')?.value, 0);
    const end = parseTimeToSeconds(document.getElementById('mediaEnd')?.value, video.duration);
    const safeStart = Math.max(0, Math.min(start, video.duration));
    const safeEnd = Math.max(safeStart + 0.3, Math.min(end || video.duration, video.duration));
    video.currentTime = safeStart;
    await new Promise((resolve) => { video.onseeked = resolve; });
    const stream = getMediaCapture(video).call(video);
    const mime = getRecorderMime('video');
    const recording = recordStream(stream, (safeEnd - safeStart) * 1000, mime);
    setNativeStatus('正在录制剪切片段，输出为 WebM...');
    setNativeProgress(35, '正在处理视频...');
    await video.play();
    const blob = await recording;
    video.pause();
    stream.getTracks().forEach((track) => track.stop());
    return { blob, name: 'cut-video.webm' };
  } finally {
    URL.revokeObjectURL(objectUrl);
    video.remove();
  }
}

async function mergeVideoAudio(videoFile, audioFile) {
  if (!supportInfo?.mediaRecorder || !supportInfo?.canvasCapture || !supportInfo?.webmVideo || !supportInfo?.audio) {
    throw new Error('当前浏览器缺少 Canvas captureStream / MediaRecorder / Web Audio，无法合并音视频。');
  }
  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;';
  document.body.appendChild(video);
  const objectUrl = await loadMediaElement(video, videoFile);
  const audioBuffer = await decodeAudioFile(audioFile);
  const AudioContextClass = getAudioContextClass();
  const audioCtx = new AudioContextClass();

  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    const frameRate = 30;
    const videoStream = canvas.captureStream(frameRate);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    const mixedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    let drawing = true;
    const drawFrame = () => {
      if (!drawing) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    };
    const duration = Math.min(video.duration || audioBuffer.duration, audioBuffer.duration) * 1000;
    const mime = getRecorderMime('video');
    const recording = recordStream(mixedStream, duration, mime);
    setNativeStatus('正在合并音视频，输出为 WebM...');
    setNativeProgress(35, '正在合并音视频...');
    await audioCtx.resume();
    video.currentTime = 0;
    await video.play();
    source.start();
    drawFrame();
    const blob = await recording;
    drawing = false;
    video.pause();
    mixedStream.getTracks().forEach((track) => track.stop());
    return { blob, name: 'merged-video-audio.webm' };
  } finally {
    await audioCtx.close?.();
    URL.revokeObjectURL(objectUrl);
    video.remove();
  }
}

function showResult(blob, name) {
  const resultBox = document.getElementById('mediaResult');
  const download = document.getElementById('mediaDownload');
  const url = URL.createObjectURL(blob);
  if (download) {
    download.href = url;
    download.download = name;
    download.textContent = `💾 下载结果（${formatBytes(blob.size)}）`;
  }
  if (resultBox) resultBox.classList.add('show');
  setNativeProgress(100, '处理完成');
  setNativeStatus('处理完成，请点击下载结果。');
}

async function runMediaTask() {
  const mode = document.getElementById('mediaMode')?.value || 'cut-video';
  const mainFile = document.getElementById('mediaMainFile')?.files?.[0];
  const audioFile = document.getElementById('mediaAudioFile')?.files?.[0];
  const resultBox = document.getElementById('mediaResult');
  if (resultBox) resultBox.classList.remove('show');

  try {
    renderBrowserSupport();
    if (!mainFile) throw new Error('请先选择主文件。');
    if (mode === 'merge-av' && !audioFile) throw new Error('请同时选择视频文件和音频文件。');
    assertNativeFileSize(mode === 'merge-av' ? [mainFile, audioFile] : [mainFile]);

    let result;
    if (mode === 'cut-audio') result = await cutAudio(mainFile);
    else if (mode === 'audio-convert') result = await convertAudio(mainFile);
    else if (mode === 'cut-video') result = await cutVideo(mainFile);
    else if (mode === 'merge-av') result = await mergeVideoAudio(mainFile, audioFile);
    else throw new Error('未知功能类型。');

    showResult(result.blob, result.name);
  } catch (err) {
    console.error('Native media task error:', err);
    const msg = err?.message || '处理失败，请重试。';
    setNativeProgress(0, '处理失败');
    setNativeStatus(msg);
    showToast(msg);
  }
}

function resetMediaTool() {
  ['mediaMainFile', 'mediaAudioFile', 'mediaStart', 'mediaEnd'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'file') el.value = '';
    else el.value = id === 'mediaStart' ? '00:00:00' : '';
  });
  const resultBox = document.getElementById('mediaResult');
  const download = document.getElementById('mediaDownload');
  if (resultBox) resultBox.classList.remove('show');
  if (download) download.textContent = '💾 下载结果';
  renderBrowserSupport();
}

function initNativeMediaPage() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
  updateMediaMode();
  renderBrowserSupport();
}

initNativeMediaPage();
