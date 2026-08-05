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

(function() {
        'use strict';

        // ---- 主画布 ----
        const canvas = document.getElementById('mainCanvas');
        const ctx = canvas.getContext('2d');
        const W = 800, H = 800;
        canvas.width = W;
        canvas.height = H;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);// ---- 图层系统 ----
let layers = [];
let selectedLayerIndex = 0;
let nextLayerId = 1;
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

// ---- 绘画状态 ----
let isDrawing = false;
let lastX = 0, lastY = 0;
let currentColor = '#000000';
let brushSize = 6;
let isEraser = false;
let isMosaic = false;
let isTextMode = false;
let isCropMode = false;
let cropStart = null;

// ---- 缩放状态 ----
let zoomLevel = 1.0;
let zoomLocked = false;
let zoomOffsetX = 0, zoomOffsetY = 0;
const ZOOM_STEP = 1.4;
const MAX_ZOOM = 6;// ---- 初始化 ----
function init() {
    addLayer('背景', true);
    takeSnapshot();
    renderLayers();
    renderLayerPanel();
    generateColors();
    setupEvents();
    updateZoomDisplay();
}

function setupEvents() {
    // 原作者版本中保留的初始化钩子；事件已在下方直接绑定。
}

// ---- 图层管理 ----
function addLayer(name, isBackground) {
    const layer = {
        id: nextLayerId++,
        name: name || '图层 ' + (layers.length + 1),
        visible: true,
        data: null,
        x: 0, y: 0,
        rotation: 0,
        scale: 1,
        filter: 'none',
        brightness: 0,
        isBackground: isBackground || false
    };
    if (isBackground) {
        layer.data = ctx.getImageData(0, 0, W, H);
    }
    layers.push(layer);
    selectedLayerIndex = layers.length - 1;
    return layer;
}function deleteLayer(index) {
    if (layers.length <= 1) { alert('至少保留一个图层'); return; }
    if (layers[index].isBackground) { alert('不能删除背景层'); return; }
    layers.splice(index, 1);
    if (selectedLayerIndex >= layers.length) selectedLayerIndex = layers.length - 1;
    renderLayers();
    renderLayerPanel();
    takeSnapshot();
}

function moveLayerUp(index) {
    if (index <= 0) return;
    [layers[index], layers[index-1]] = [layers[index-1], layers[index]];
    selectedLayerIndex = index - 1;
    renderLayers();
    renderLayerPanel();
    takeSnapshot();
}

function moveLayerDown(index) {
    if (index >= layers.length - 1) return;
    [layers[index], layers[index+1]] = [layers[index+1], layers[index]];
    selectedLayerIndex = index + 1;
    renderLayers();
    renderLayerPanel();
    takeSnapshot();
}function toggleLayerVisibility(index) {
    layers[index].visible = !layers[index].visible;
    renderLayers();
    renderLayerPanel();
}

function selectLayer(index) {
    selectedLayerIndex = index;
    renderLayerPanel();
}

function mergeDown(index) {
    if (index <= 0) return;
    const lower = layers[index-1];
    const upper = layers[index];
    if (!lower.data || !upper.data) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = W;
    tempCanvas.height = H;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(lower.data, 0, 0);
    tempCtx.save();
    tempCtx.translate(upper.x + W/2, upper.y + H/2);
    tempCtx.rotate(upper.rotation * Math.PI / 180);
    tempCtx.scale(upper.scale, upper.scale);
    const img = new Image();
    img.src = canvasToDataURL(upper.data);
    tempCtx.drawImage(img, -W/2, -H/2);
    tempCtx.restore();
    lower.data = tempCtx.getImageData(0, 0, W, H);
    layers.splice(index, 1);
    selectedLayerIndex = index - 1;
    renderLayers();
    renderLayerPanel();
    takeSnapshot();
}function canvasToDataURL(imgData) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const cx = c.getContext('2d');
    cx.putImageData(imgData, 0, 0);
    return c.toDataURL('image/png');
}

// ---- 渲染图层（带缩放） ----
function renderLayers() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    // 应用缩放
    ctx.save();
    ctx.translate(zoomOffsetX, zoomOffsetY);
    ctx.scale(zoomLevel, zoomLevel);
    layers.forEach(layer => {
        if (!layer.visible || !layer.data) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = W;
        tempCanvas.height = H;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(layer.data, 0, 0);
        applyFilter(tempCtx, layer.filter, layer.brightness);
        ctx.save();
        ctx.translate(layer.x + W/2, layer.y + H/2);
        ctx.rotate(layer.rotation * Math.PI / 180);
        ctx.scale(layer.scale, layer.scale);
        ctx.drawImage(tempCanvas, -W/2, -H/2);
        ctx.restore();
    });
    ctx.restore();
}function applyFilter(tempCtx, filter, brightness) {
    const imgData = tempCtx.getImageData(0, 0, W, H);
    const data = imgData.data;
    if (filter === 'gray') {
        for (let i=0; i<data.length; i+=4) {
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            data[i] = avg; data[i+1] = avg; data[i+2] = avg;
        }
    } else if (filter === 'sepia') {
        for (let i=0; i<data.length; i+=4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            data[i] = Math.min(255, r*0.393 + g*0.769 + b*0.189);
            data[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
            data[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
        }
    } else if (filter === 'blur') {
        const temp = new Uint8ClampedArray(data);
        for (let y=1; y<H-1; y++) {
            for (let x=1; x<W-1; x++) {
                const idx = (y*W + x)*4;
                let r=0,g=0,b=0;
                for (let dy=-1; dy<=1; dy++) {
                    for (let dx=-1; dx<=1; dx++) {
                        const i2 = ((y+dy)*W + (x+dx))*4;
                        r += temp[i2]; g += temp[i2+1]; b += temp[i2+2];
                    }
                }
                data[idx] = r/9; data[idx+1] = g/9; data[idx+2] = b/9;
            }
        }
    } else if (filter === 'sharpen') {
        const temp = new Uint8ClampedArray(data);
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        for (let y=1; y<H-1; y++) {
            for (let x=1; x<W-1; x++) {
                const idx = (y*W + x)*4;
                let r=0,g=0,b=0, k=0;
                for (let dy=-1; dy<=1; dy++) {
                    for (let dx=-1; dx<=1; dx++) {
                        const i2 = ((y+dy)*W + (x+dx))*4;
                        const kv = kernel[k++];
                        r += temp[i2] * kv;
                        g += temp[i2+1] * kv;
                        b += temp[i2+2] * kv;
                    }
                }
                data[idx] = Math.min(255, Math.max(0, r));
                data[idx+1] = Math.min(255, Math.max(0, g));
                data[idx+2] = Math.min(255, Math.max(0, b));
            }
        }
    }
    if (brightness !== 0) {
        for (let i=0; i<data.length; i+=4) {
            data[i] = Math.min(255, Math.max(0, data[i] + brightness));
            data[i+1] = Math.min(255, Math.max(0, data[i+1] + brightness));
            data[i+2] = Math.min(255, Math.max(0, data[i+2] + brightness));
        }
    }
    tempCtx.putImageData(imgData, 0, 0);
}// ---- 更新图层数据 ----
function updateLayerData(index) {
    const imgData = ctx.getImageData(0, 0, W, H);
    layers[index].data = imgData;
}

// ---- 历史快照 ----
function takeSnapshot() {
    const snap = layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        x: l.x, y: l.y,
        rotation: l.rotation,
        scale: l.scale,
        filter: l.filter,
        brightness: l.brightness,
        isBackground: l.isBackground,
        dataURL: l.data ? canvasToDataURL(l.data) : null
    }));
    history = history.slice(0, historyIndex + 1);
    history.push(snap);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
}

function restoreSnapshot(index) {
    if (index < 0 || index >= history.length) return;
    const snap = history[index];
    layers = snap.map(s => {
        const l = {
            id: s.id,
            name: s.name,
            visible: s.visible,
            x: s.x, y: s.y,
            rotation: s.rotation,
            scale: s.scale,
            filter: s.filter,
            brightness: s.brightness,
            isBackground: s.isBackground,
            data: null
        };
        if (s.dataURL) {
            const img = new Image();
            img.src = s.dataURL;
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const cx = c.getContext('2d');
            img.onload = function() {
                cx.drawImage(img, 0, 0);
                l.data = cx.getImageData(0, 0, W, H);
                renderLayers();
                renderLayerPanel();
            };
            img.src = s.dataURL;
        }
        return l;
    });
    renderLayers();
    renderLayerPanel();
}function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreSnapshot(historyIndex);
}

// ---- 渲染图层面板 ----
function renderLayerPanel() {
    const panel = document.getElementById('layerPanel');
    panel.innerHTML = '';
    layers.forEach((layer, index) => {
        const div = document.createElement('div');
        div.className = 'layer-item' + (index === selectedLayerIndex ? ' selected' : '');
        const vis = document.createElement('span');
        vis.className = 'visibility';
        vis.textContent = layer.visible ? '👁️' : '👁️‍🗨️';
        vis.addEventListener('click', (e) => { e.stopPropagation(); toggleLayerVisibility(index); });
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = layer.name;
        const actions = document.createElement('span');
        actions.className = 'actions';
        if (!layer.isBackground) {
            const del = document.createElement('button');
            del.textContent = '✕';
            del.addEventListener('click', (e) => { e.stopPropagation(); deleteLayer(index); });
            actions.appendChild(del);
        }
        div.appendChild(vis);
        div.appendChild(name);
        div.appendChild(actions);
        div.addEventListener('click', () => selectLayer(index));
        panel.appendChild(div);
    });
}// ---- 生成150色 ----
function generateColors() {
    const colors = [
        '#000000','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6','#ffffff',
        '#ff0000','#cc0000','#990000','#ff3333','#ff6666','#ff9999','#ffcccc','#ff1a1a','#e60000','#b30000',
        '#ff6600','#cc5500','#994400','#ff8833','#ffaa66','#ffcc99','#ffaa00','#e69900',
        '#ffcc00','#e6b800','#b39700','#ffdd33','#ffea66','#fff499','#ffe600','#ffd700',
        '#33cc00','#29a300','#1f7a00','#66dd33','#99e666','#ccf099','#00cc44','#00aa33','#008822','#44dd66',
        '#00cc99','#009977','#006655','#33ddaa','#66e6c4','#99f0d9','#00e5ff','#00b3cc',
        '#0066ff','#004dcc','#003399','#3388ff','#66aaff','#99ccff','#1a8cff','#0055e6','#0033aa','#4488ee',
        '#6633ff','#4d26cc','#331a99','#8855ff','#aa88ff','#ccbbff','#7b2ffc','#5c1ad6','#3d0fb0','#9f5eff',
        '#cc33ff','#9926cc','#661a99','#dd55ff','#e688ff','#f0bbff','#ff55cc','#e63399',
        '#8B4513','#A0522D','#D2691E','#CD853F','#DEB887','#F5DEB3','#F5F5DC','#FFF8DC',
        '#2E8B57','#3CB371','#66CDAA','#8FBC8F','#20B2AA','#48D1CC','#00CED1','#5F9EA0',
        '#4682B4','#6A5ACD','#7B68EE','#9370DB','#BA55D3','#DA70D6','#FF69B4','#FFB6C1'
    ];
    while (colors.length < 150) {
        const r = Math.floor(Math.random()*200+55);
        const g = Math.floor(Math.random()*200+55);
        const b = Math.floor(Math.random()*200+55);
        colors.push(`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
    }
    const scroll = document.getElementById('colorScroll');
    scroll.innerHTML = '';
    colors.forEach(hex => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch' + (hex === '#000000' ? ' active' : '');
        swatch.style.backgroundColor = hex;
        swatch.dataset.color = hex;
        swatch.addEventListener('click', function() {
            document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            currentColor = this.dataset.color;
            const rgb = hexToRgb(currentColor);
            if (rgb) {
                const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                document.getElementById('hueSlider').value = hsl.h;
                document.getElementById('satSlider').value = hsl.s;
                document.getElementById('lightSlider').value = hsl.l;
                document.getElementById('hueVal').textContent = hsl.h;
                document.getElementById('satVal').textContent = hsl.s;
                document.getElementById('lightVal').textContent = hsl.l;
            }
        });
        scroll.appendChild(swatch);
    });
}// ---- 辅助函数 ----
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) } : null;
}
function rgbToHsl(r,g,b) {
    r/=255; g/=255; b/=255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h,s,l = (max+min)/2;
    if(max===min) { h=s=0; }
    else {
        const d = max-min;
        s = l>0.5 ? d/(2-max-min) : d/(max+min);
        switch(max){
            case r: h = ((g-b)/d + (g<b?6:0))/6; break;
            case g: h = ((b-r)/d + 2)/6; break;
            case b: h = ((r-g)/d + 4)/6; break;
        }
    }
    return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
}
function hslToRgb(h,s,l) {
    s/=100; l/=100;
    const c = (1 - Math.abs(2*l - 1)) * s;
    const x = c * (1 - Math.abs((h/60) % 2 - 1));
    const m = l - c/2;
    let r,g,b;
    if(h < 60) { r=c; g=x; b=0; }
    else if(h < 120) { r=x; g=c; b=0; }
    else if(h < 180) { r=0; g=c; b=x; }
    else if(h < 240) { r=0; g=x; b=c; }
    else if(h < 300) { r=x; g=0; b=c; }
    else { r=c; g=0; b=x; }
    return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
}// ---- 绘画坐标获取 ----
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    let cx, cy;
    if (e.touches) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
    } else {
        cx = e.clientX;
        cy = e.clientY;
    }
    const x = (cx - rect.left) * scaleX;
    const y = (cy - rect.top) * scaleY;
    // 应用缩放逆变换
    const zx = (x - zoomOffsetX) / zoomLevel;
    const zy = (y - zoomOffsetY) / zoomLevel;
    return { x: Math.min(Math.max(zx, 0), W), y: Math.min(Math.max(zy, 0), H) };
}

function startDraw(e) {
    e.preventDefault();
    if (isTextMode) { addTextLayer(); return; }
    if (isCropMode) { startCrop(e); return; }
    const pos = getCanvasPos(e);
    isDrawing = true;
    lastX = pos.x;
    lastY = pos.y;
    if (isMosaic) {
        drawMosaic(pos.x, pos.y);
    } else {
        ctx.beginPath();
        ctx.arc(lastX, lastY, brushSize/2, 0, Math.PI*2);
        ctx.fillStyle = isEraser ? '#ffffff' : currentColor;
        ctx.fill();
    }
}function draw(e) {
    e.preventDefault();
    if (!isDrawing || isTextMode || isCropMode) return;
    const pos = getCanvasPos(e);
    if (isMosaic) {
        drawMosaicLine(lastX, lastY, pos.x, pos.y);
    } else {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
    lastX = pos.x;
    lastY = pos.y;
}

function endDraw(e) {
    e.preventDefault();
    if (isDrawing) {
        isDrawing = false;
        updateLayerData(selectedLayerIndex);
        takeSnapshot();
        renderLayers();
    }
}

// ---- 马赛克 ----
function drawMosaic(x, y) {
    const size = brushSize * 2;
    const sx = Math.floor(x / size) * size;
    const sy = Math.floor(y / size) * size;
    const imageData = ctx.getImageData(sx, sy, size, size);
    const data = imageData.data;
    let r=0,g=0,b=0,count=0;
    for (let i=0; i<data.length; i+=4) {
        r += data[i]; g += data[i+1]; b += data[i+2];
        count++;
    }
    r = Math.round(r/count); g = Math.round(g/count); b = Math.round(b/count);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(sx, sy, size, size);
}function drawMosaicLine(x1,y1,x2,y2) {
    const size = brushSize * 2;
    const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1)) / size + 1;
    for (let i=0; i<=steps; i++) {
        const t = i / steps;
        const x = x1 + (x2-x1) * t;
        const y = y1 + (y2-y1) * t;
        drawMosaic(x, y);
    }
}

// ---- 画布事件 ----
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', endDraw, { passive: false });

// ---- 工具按钮 ----
document.getElementById('penBtn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('eraserBtn').classList.remove('active');
    document.getElementById('mosaicBtn').classList.remove('active');
    isEraser = false; isMosaic = false; isTextMode = false; isCropMode = false;
});
document.getElementById('eraserBtn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('penBtn').classList.remove('active');
    document.getElementById('mosaicBtn').classList.remove('active');
    isEraser = true; isMosaic = false; isTextMode = false; isCropMode = false;
});
document.getElementById('mosaicBtn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('penBtn').classList.remove('active');
    document.getElementById('eraserBtn').classList.remove('active');
    isMosaic = true; isEraser = false; isTextMode = false; isCropMode = false;
});document.getElementById('textBtn').addEventListener('click', function() {
    isTextMode = !isTextMode;
    this.classList.toggle('active');
    if (isTextMode) {
        isCropMode = false;
        document.getElementById('cropBtn').classList.remove('active');
        alert('点击画布添加文字');
    }
});

document.getElementById('cropBtn').addEventListener('click', function() {
    isCropMode = !isCropMode;
    this.classList.toggle('active');
    if (isCropMode) {
        isTextMode = false;
        document.getElementById('textBtn').classList.remove('active');
        alert('点击画布两个对角点裁剪');
    }
});

// ---- 文字工具 ----
function addTextLayer() {
    const text = prompt('输入文字：', '你好');
    if (!text) return;
    const fontSize = prompt('字号 (px)：', '40');
    const color = prompt('颜色 (如 #ff0000)：', currentColor);
    const layer = {
        id: nextLayerId++,
        name: '文字',
        visible: true,
        data: null,
        x: 0, y: 0,
        rotation: 0,
        scale: 1,
        filter: 'none',
        brightness: 0,
        isBackground: false,
        text: text,
        fontSize: parseInt(fontSize) || 40,
        textColor: color || '#000000'
    };    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = W;
    tempCanvas.height = H;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.clearRect(0, 0, W, H);
    tempCtx.font = fontSize + 'px sans-serif';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = color || '#000000';
    tempCtx.fillText(text, W/2, H/2);
    layer.data = tempCtx.getImageData(0, 0, W, H);
    layers.push(layer);
    selectedLayerIndex = layers.length - 1;
    renderLayers();
    renderLayerPanel();
    takeSnapshot();
    isTextMode = false;
    document.getElementById('textBtn').classList.remove('active');
}

// ---- 裁剪 ----
function startCrop(e) {
    const pos = getCanvasPos(e);
    if (!cropStart) { cropStart = pos; return; }
    const x1 = Math.min(cropStart.x, pos.x);
    const y1 = Math.min(cropStart.y, pos.y);
    const x2 = Math.max(cropStart.x, pos.x);
    const y2 = Math.max(cropStart.y, pos.y);
    const w = x2 - x1, h = y2 - y1;
    if (w < 5 || h < 5) { cropStart = null; return; }
    const imageData = ctx.getImageData(x1, y1, w, h);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.putImageData(imageData, 0, 0);
    updateLayerData(selectedLayerIndex);
    takeSnapshot();
    cropStart = null;
    isCropMode = false;
    document.getElementById('cropBtn').classList.remove('active');
    renderLayers();
}// ---- 滤镜 ----
document.getElementById('filterNone').addEventListener('click', function() {
    document.querySelectorAll('.filter-options button').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (layers.length === 0) return;
    layers[selectedLayerIndex].filter = 'none';
    renderLayers();
    takeSnapshot();
});
document.getElementById('filterGray').addEventListener('click', function() {
    document.querySelectorAll('.filter-options button').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (layers.length === 0) return;
    layers[selectedLayerIndex].filter = 'gray';
    renderLayers();
    takeSnapshot();
});
document.getElementById('filterSepia').addEventListener('click', function() {
    document.querySelectorAll('.filter-options button').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (layers.length === 0) return;
    layers[selectedLayerIndex].filter = 'sepia';
    renderLayers();
    takeSnapshot();
});
document.getElementById('filterBlur').addEventListener('click', function() {
    document.querySelectorAll('.filter-options button').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (layers.length === 0) return;
    layers[selectedLayerIndex].filter = 'blur';
    renderLayers();
    takeSnapshot();
});
document.getElementById('filterSharpen').addEventListener('click', function() {
    document.querySelectorAll('.filter-options button').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (layers.length === 0) return;
    layers[selectedLayerIndex].filter = 'sharpen';
    renderLayers();
    takeSnapshot();
});
document.getElementById('filterBright').addEventListener('click', function() {
    if (layers.length === 0) return;
    const layer = layers[selectedLayerIndex];
    layer.brightness = (layer.brightness || 0) + 20;
    renderLayers();
    takeSnapshot();
});// ---- 图层操作 ----
document.getElementById('addLayerBtn').addEventListener('click', function() {
    addLayer('图层 ' + (layers.length + 1), false);
    renderLayerPanel();
    takeSnapshot();
});
document.getElementById('deleteLayerBtn').addEventListener('click', function() {
    deleteLayer(selectedLayerIndex);
});
document.getElementById('moveUpBtn').addEventListener('click', function() {
    moveLayerUp(selectedLayerIndex);
});
document.getElementById('moveDownBtn').addEventListener('click', function() {
    moveLayerDown(selectedLayerIndex);
});
document.getElementById('mergeDownBtn').addEventListener('click', function() {
    mergeDown(selectedLayerIndex);
});

// ---- 撤销 ----
document.getElementById('undoBtn').addEventListener('click', undo);

// ---- 清空 ----
document.getElementById('clearBtn').addEventListener('click', function() {
    if (confirm('清空当前图层？')) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        updateLayerData(selectedLayerIndex);
        takeSnapshot();
        renderLayers();
    }
});// ---- 保存 ----
document.getElementById('saveBtn').addEventListener('click', function() {
    canvas.toBlob(function(blob) {
        const link = document.createElement('a');
        link.download = 'drawing_' + Date.now() + '.png';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }, 'image/png', 1.0);
});

// ---- 上传 ----
document.getElementById('uploadBtn').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
            const scale = Math.min(W / img.width, H / img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = (W - dw) / 2;
            const dy = (H - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
            updateLayerData(selectedLayerIndex);
            takeSnapshot();
            renderLayers();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
});// ---- 颜色折叠 ----
const colorToggle = document.getElementById('colorToggle');
const colorArrow = document.getElementById('colorArrow');
const colorScroll = document.getElementById('colorScroll');
let colorOpen = false;
colorToggle.addEventListener('click', function() {
    colorOpen = !colorOpen;
    colorScroll.classList.toggle('open', colorOpen);
    colorArrow.classList.toggle('open', colorOpen);
    colorArrow.textContent = colorOpen ? '∨' : '∧';
});

// ---- HSL调色 ----
function updateColorFromHSL() {
    const h = parseFloat(document.getElementById('hueSlider').value);
    const s = parseFloat(document.getElementById('satSlider').value);
    const l = parseFloat(document.getElementById('lightSlider').value);
    document.getElementById('hueVal').textContent = h;
    document.getElementById('satVal').textContent = s;
    document.getElementById('lightVal').textContent = l;
    const rgb = hslToRgb(h, s, l);
    const hex = '#' + [rgb.r, rgb.g, rgb.b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
    currentColor = hex;
    document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
    let minDist = Infinity, best = null;
    document.querySelectorAll('.color-swatch').forEach(el => {
        const c = el.dataset.color;
        const cRgb = hexToRgb(c);
        if (cRgb) {
            const dist = Math.sqrt((cRgb.r-rgb.r)**2 + (cRgb.g-rgb.g)**2 + (cRgb.b-rgb.b)**2);
            if (dist < minDist) { minDist = dist; best = el; }
        }
    });
    if (best && minDist < 30) best.classList.add('active');
}
document.getElementById('hueSlider').addEventListener('input', updateColorFromHSL);
document.getElementById('satSlider').addEventListener('input', updateColorFromHSL);
document.getElementById('lightSlider').addEventListener('input', updateColorFromHSL);// ---- 粗细 ----
const sizeSlider = document.getElementById('brushSize');
const sizeVal = document.getElementById('sizeVal');
sizeSlider.addEventListener('input', function() {
    brushSize = parseInt(this.value);
    sizeVal.textContent = brushSize;
});

// ---- 放大功能 ----
function updateZoomDisplay() {
    document.getElementById('zoomLevel').textContent = zoomLevel.toFixed(1) + 'x';
}

document.getElementById('zoomBtn').addEventListener('click', function() {
    if (zoomLocked) return;
    zoomLevel = Math.min(zoomLevel * ZOOM_STEP, MAX_ZOOM);
    zoomOffsetX = (W - W * zoomLevel) / 2;
    zoomOffsetY = (H - H * zoomLevel) / 2;
    renderLayers();
    updateZoomDisplay();
});

document.getElementById('zoomLockBtn').addEventListener('click', function() {
    zoomLocked = !zoomLocked;
    this.style.color = zoomLocked ? '#4f6ef7' : '#1e293b';
    this.textContent = zoomLocked ? '🔓' : '🔒';
    if (zoomLocked) {
        // 锁定当前缩放，后续绘画坐标已自动处理
        alert('已锁定缩放，可在此放大位置精密绘画');
    } else {
        alert('缩放已解锁');
    }
});document.getElementById('zoomResetBtn').addEventListener('click', function() {
    zoomLevel = 1.0;
    zoomOffsetX = 0;
    zoomOffsetY = 0;
    zoomLocked = false;
    document.getElementById('zoomLockBtn').textContent = '🔒';
    document.getElementById('zoomLockBtn').style.color = '#1e293b';
    renderLayers();
    updateZoomDisplay();
    alert('已还原到原始大小');
});

// ---- 叠加模式（独立画布弹窗） ----
const overlayModal = document.getElementById('overlayModal');
const overlayCanvas = document.getElementById('overlayCanvas');
const oCtx = overlayCanvas.getContext('2d');
const OW = 400, OH = 400;
overlayCanvas.width = OW;
overlayCanvas.height = OH;
oCtx.fillStyle = 'rgba(0,0,0,0)';
oCtx.clearRect(0, 0, OW, OH);

let oDrawing = false, oLastX=0, oLastY=0, oEraser=false, oColor='#000000', oSize=4;

function oStart(e) {
    e.preventDefault();
    const pos = oGetPos(e);
    oDrawing = true;
    oLastX = pos.x;
    oLastY = pos.y;
    oCtx.beginPath();
    oCtx.arc(oLastX, oLastY, oSize/2, 0, Math.PI*2);
    oCtx.fillStyle = oEraser ? 'rgba(0,0,0,0)' : oColor;
    oCtx.fill();
}function oDraw(e) {
    e.preventDefault();
    if (!oDrawing) return;
    const pos = oGetPos(e);
    oCtx.beginPath();
    oCtx.moveTo(oLastX, oLastY);
    oCtx.lineTo(pos.x, pos.y);
    oCtx.strokeStyle = oEraser ? 'rgba(0,0,0,0)' : oColor;
    oCtx.lineWidth = oSize;
    oCtx.lineCap = 'round';
    oCtx.lineJoin = 'round';
    oCtx.stroke();
    oLastX = pos.x;
    oLastY = pos.y;
}
function oEnd(e) { e.preventDefault(); oDrawing = false; }
function oGetPos(e) {
    const rect = overlayCanvas.getBoundingClientRect();
    const sx = OW / rect.width, sy = OH / rect.height;
    let cx, cy;
    if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    const x = (cx - rect.left) * sx;
    const y = (cy - rect.top) * sy;
    return { x: Math.min(Math.max(x,0), OW), y: Math.min(Math.max(y,0), OH) };
}

overlayCanvas.addEventListener('mousedown', oStart);
overlayCanvas.addEventListener('mousemove', oDraw);
overlayCanvas.addEventListener('mouseup', oEnd);
overlayCanvas.addEventListener('mouseleave', oEnd);
overlayCanvas.addEventListener('touchstart', oStart, { passive: false });
overlayCanvas.addEventListener('touchmove', oDraw, { passive: false });
overlayCanvas.addEventListener('touchend', oEnd, { passive: false });document.getElementById('overlayPen').addEventListener('click', function() {
    oEraser = false;
    this.classList.add('active');
    document.getElementById('overlayEraser').classList.remove('active');
});
document.getElementById('overlayEraser').addEventListener('click', function() {
    oEraser = true;
    this.classList.add('active');
    document.getElementById('overlayPen').classList.remove('active');
});
document.getElementById('overlayPen').classList.add('active');

document.getElementById('overlayClear').addEventListener('click', function() {
    oCtx.clearRect(0, 0, OW, OH);
});

document.getElementById('overlayConfirm').addEventListener('click', function() {
    // 将叠加画布内容合并到主画布
    const imgData = oCtx.getImageData(0, 0, OW, OH);
    const data = imgData.data;
    // 缩放绘制到主画布 (400→800)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = W;
    tempCanvas.height = H;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(overlayCanvas, 0, 0, W, H);
    const mergedData = tCtx.getImageData(0, 0, W, H);
    const curData = ctx.getImageData(0, 0, W, H);
    const m = mergedData.data;
    const c = curData.data;
    for (let i=0; i<m.length; i+=4) {
        if (m[i+3] > 10) {
            c[i] = m[i];
            c[i+1] = m[i+1];
            c[i+2] = m[i+2];
            c[i+3] = 255;
        }
    }
    ctx.putImageData(curData, 0, 0);
    updateLayerData(selectedLayerIndex);
    takeSnapshot();
    renderLayers();
    overlayModal.classList.remove('open');
    oCtx.clearRect(0, 0, OW, OH);
    alert('✅ 叠加已合并到主画布');
});        document.getElementById('overlayCancel').addEventListener('click', function() {
            overlayModal.classList.remove('open');
            oCtx.clearRect(0, 0, OW, OH);
        });
        document.getElementById('overlayModalClose').addEventListener('click', function() {
            overlayModal.classList.remove('open');
            oCtx.clearRect(0, 0, OW, OH);
        });
        overlayModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('open');
                oCtx.clearRect(0, 0, OW, OH);
            }
        });

        document.getElementById('overlayBtn').addEventListener('click', function() {
            overlayModal.classList.add('open');
            oCtx.clearRect(0, 0, OW, OH);
            oColor = currentColor;
            oSize = brushSize;
        });

        // ---- 初始化 ----
        const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            const icon = document.getElementById('themeIcon');
            if (icon) icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
        }
        init();

        console.log('🎨 专业绘图板已启动！');
    })();
