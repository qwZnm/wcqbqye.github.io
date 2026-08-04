// ===== FFmpeg 单线程 WASM 页面脚本 =====
const FFMPEG_MAX_FILE_SIZE = 500 * 1024 * 1024;
let ffmpegInstance = null;
let ffmpegFetchFile = null;
let ffmpegLoadingPromise = null;
let toastTimer;

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

function setFFmpegProgress(percent, text) {
  const fill = document.getElementById('ffmpegProgressFill');
  const label = document.getElementById('ffmpegLoadText');
  const num = document.getElementById('ffmpegLoadPercent');
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  if (fill) fill.style.width = `${value}%`;
  if (label && text) label.textContent = text;
  if (num) num.textContent = `${value}%`;
}

function setFFmpegStatus(text) {
  const status = document.getElementById('ffmpegStatus');
  if (status) status.textContent = text;
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existed = document.querySelector(`script[src="${src}"]`);
    if (existed) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('FFmpeg 脚本加载失败，请检查网络连接'));
    document.head.appendChild(script);
  });
}

async function ensureFFmpegLoaded() {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;
  ffmpegLoadingPromise = (async () => {
    setFFmpegProgress(8, '正在加载 ffmpeg-wasm 脚本...');
    await loadScriptOnce('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
    if (!window.FFmpeg) throw new Error('FFmpeg 对象不可用');

    const { createFFmpeg, fetchFile } = window.FFmpeg;
    ffmpegFetchFile = fetchFile;
    setFFmpegProgress(25, '正在加载单线程 WASM 内核...');

    const ffmpeg = createFFmpeg({
      log: false,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
      progress: ({ ratio }) => {
        if (ratio > 0) setFFmpegProgress(30 + ratio * 65, 'FFmpeg 正在处理文件...');
      },
    });

    await ffmpeg.load();
    ffmpegInstance = ffmpeg;
    setFFmpegProgress(100, '单线程 FFmpeg 内核已加载，可开始处理');
    setFFmpegStatus('单线程 FFmpeg 内核已加载。请选择文件后开始处理。');
    return ffmpeg;
  })();
  return ffmpegLoadingPromise;
}

function updateFFmpegMode() {
  const mode = document.getElementById('ffmpegMode')?.value || 'cut-video';
  const mainInput = document.getElementById('ffmpegMainFile');
  const mainLabel = document.getElementById('ffmpegMainLabel');
  const mainHint = document.getElementById('ffmpegMainHint');
  const audioBox = document.getElementById('ffmpegAudioBox');
  const timeRow = document.getElementById('ffmpegTimeRow');
  const formatBox = document.getElementById('ffmpegFormatBox');
  if (!mainInput || !mainLabel || !mainHint || !audioBox || !timeRow || !formatBox) return;

  audioBox.style.display = mode === 'merge-av' ? 'block' : 'none';
  timeRow.style.display = mode === 'audio-convert' || mode === 'merge-av' ? 'none' : 'grid';
  formatBox.style.display = mode === 'audio-convert' ? 'block' : 'none';

  if (mode === 'cut-audio' || mode === 'audio-convert') {
    mainInput.accept = 'audio/*';
    mainLabel.textContent = '选择音频文件';
    mainHint.textContent = '支持 MP3 / WAV / AAC / OGG / FLAC 等常见音频';
  } else {
    mainInput.accept = 'video/*';
    mainLabel.textContent = '选择视频文件';
    mainHint.textContent = mode === 'merge-av' ? '选择要合并音轨的视频文件' : '支持 MP4 / MOV / WEBM 等常见视频';
  }
}

function getFileExt(file, fallback) {
  const name = file?.name || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return ext || fallback;
}

function assertFFmpegFileSize(files) {
  const total = files.reduce((sum, file) => sum + (file?.size || 0), 0);
  if (total > FFMPEG_MAX_FILE_SIZE) {
    throw new Error('文件总大小超过 500MB。为避免 WASM 内存溢出和页面崩溃，请选择更小的视频或音频。');
  }
}

function buildFFmpegOutputName(mode, mainFile) {
  const format = document.getElementById('ffmpegFormat')?.value || 'mp3';
  if (mode === 'audio-convert') return `converted.${format}`;
  if (mode === 'merge-av') return 'merged-video-audio.mp4';
  return mode === 'cut-audio' ? `cut-audio.${getFileExt(mainFile, 'mp3')}` : `cut-video.${getFileExt(mainFile, 'mp4')}`;
}

async function runFFmpegTask() {
  const mode = document.getElementById('ffmpegMode')?.value || 'cut-video';
  const mainFile = document.getElementById('ffmpegMainFile')?.files?.[0];
  const audioFile = document.getElementById('ffmpegAudioFile')?.files?.[0];
  const resultBox = document.getElementById('ffmpegResult');
  const download = document.getElementById('ffmpegDownload');
  if (resultBox) resultBox.classList.remove('show');

  try {
    if (!mainFile) throw new Error('请先选择主文件');
    if (mode === 'merge-av' && !audioFile) throw new Error('请同时选择视频文件和音频文件');
    assertFFmpegFileSize(mode === 'merge-av' ? [mainFile, audioFile] : [mainFile]);

    const ffmpeg = await ensureFFmpegLoaded();
    const inputName = `input.${getFileExt(mainFile, mode.includes('audio') ? 'mp3' : 'mp4')}`;
    const outputName = buildFFmpegOutputName(mode, mainFile);

    setFFmpegStatus('正在写入浏览器内存文件系统...');
    ffmpeg.FS('writeFile', inputName, await ffmpegFetchFile(mainFile));

    const args = [];
    if (mode === 'cut-video' || mode === 'cut-audio') {
      const start = document.getElementById('ffmpegStart')?.value.trim() || '00:00:00';
      const end = document.getElementById('ffmpegEnd')?.value.trim();
      args.push('-ss', start);
      if (end) args.push('-to', end);
      args.push('-i', inputName, '-c', 'copy', outputName);
    } else if (mode === 'audio-convert') {
      args.push('-i', inputName, '-vn', outputName);
    } else if (mode === 'merge-av') {
      const audioName = `audio.${getFileExt(audioFile, 'mp3')}`;
      ffmpeg.FS('writeFile', audioName, await ffmpegFetchFile(audioFile));
      args.push('-i', inputName, '-i', audioName, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-shortest', outputName);
    }

    setFFmpegStatus('FFmpeg 正在处理，页面可能短暂卡顿...');
    setFFmpegProgress(35, 'FFmpeg 正在处理文件...');
    await ffmpeg.run(...args);

    const data = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([data.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    if (download) {
      download.href = url;
      download.download = outputName;
    }
    if (resultBox) resultBox.classList.add('show');
    setFFmpegProgress(100, '处理完成');
    setFFmpegStatus('处理完成，请点击下载结果。');
  } catch (err) {
    setFFmpegStatus(err.message || '处理失败，请重试。');
    showToast(err.message || 'FFmpeg 处理失败');
  }
}

function resetFFmpegTool() {
  ['ffmpegMainFile', 'ffmpegAudioFile', 'ffmpegStart', 'ffmpegEnd'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'file') el.value = '';
    else el.value = id === 'ffmpegStart' ? '00:00:00' : '';
  });
  const resultBox = document.getElementById('ffmpegResult');
  if (resultBox) resultBox.classList.remove('show');
  setFFmpegProgress(ffmpegInstance ? 100 : 0, ffmpegInstance ? '单线程 FFmpeg 内核已加载，可开始处理' : '正在准备加载单线程 FFmpeg 内核...');
  setFFmpegStatus(ffmpegInstance ? '请选择文件后开始处理。' : '正在加载单线程 FFmpeg 内核，请稍候。');
}

function initFFmpegPage() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
  updateFFmpegMode();
  ensureFFmpegLoaded().catch(err => {
    setFFmpegStatus(err.message || 'FFmpeg 内核加载失败，请刷新页面重试。');
    setFFmpegProgress(0, 'FFmpeg 内核加载失败');
  });
}

initFFmpegPage();
