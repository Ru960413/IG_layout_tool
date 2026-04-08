// ─── Print Mode ───

const printSizes = {
  '5x7':  { name: '5×7"',  w: 5, h: 7,      dpi: 300 },
  '4x6':  { name: '4×6"',  w: 4, h: 6,      dpi: 300 },
  '8x10': { name: '8×10"', w: 8, h: 10,     dpi: 300 },
  'A4':   { name: 'A4',    w: 8.27, h: 11.69, dpi: 300 },
  'A3':   { name: 'A3',    w: 11.69, h: 16.54, dpi: 300 },
  'A5':   { name: 'A5',    w: 5.83, h: 8.27, dpi: 300 }
};

let printCurrentSize = '5x7';
let printOrientation = 'portrait';
let printState = {
  scale: 100,
  x: 50,
  y: 50,
  bg: '#ffffff',
  fit: 'contain',
  imageData: null
};

function printGetDimensions() {
  const size = printSizes[printCurrentSize];
  let w = Math.round(size.w * size.dpi);
  let h = Math.round(size.h * size.dpi);
  if (printOrientation === 'landscape') [w, h] = [h, w];
  return { w, h };
}

function printSwitchSize(sizeId, btn) {
  printCurrentSize = sizeId;
  document.querySelectorAll('.print-size-row .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  printUpdateCanvas();
}

function printSetOrientation(orient, btn) {
  printOrientation = orient;
  document.querySelectorAll('.print-orient-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  printUpdateCanvas();
}

function printUpdateCanvas() {
  const dim = printGetDimensions();
  const canvas = document.getElementById('print-canvas');
  canvas.style.aspectRatio = dim.w + '/' + dim.h;
  document.getElementById('print-res-label').textContent = `${dim.w} × ${dim.h} px (300 DPI)`;
  printApplyImage();
}

function printHandleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    printState.imageData = ev.target.result;
    const img = document.getElementById('print-image');
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('print-placeholder').style.display = 'none';
    document.getElementById('print-remove-btn').style.display = '';
    printApplyImage();
  };
  reader.readAsDataURL(file);
}

function printRemoveImage() {
  printState.imageData = null;
  const img = document.getElementById('print-image');
  img.src = '';
  img.style.display = 'none';
  document.getElementById('print-placeholder').style.display = '';
  document.getElementById('print-remove-btn').style.display = 'none';
  document.getElementById('print-upload').value = '';
}

function printAdjust(prop, delta) {
  if (prop === 'scale') {
    printState.scale = Math.max(10, Math.min(300, printState.scale + delta));
    document.getElementById('print-scale-val').textContent = printState.scale + '%';
  } else if (prop === 'x') {
    printState.x = Math.max(0, Math.min(100, printState.x + delta));
    document.getElementById('print-x-val').textContent = printState.x + '%';
  } else if (prop === 'y') {
    printState.y = Math.max(0, Math.min(100, printState.y + delta));
    document.getElementById('print-y-val').textContent = printState.y + '%';
  }
  printApplyImage();
}

function printSetBg(color, btn) {
  printState.bg = color;
  document.getElementById('print-canvas').style.background = color;
  if (btn) {
    document.querySelectorAll('#print-bg-row .color-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
  }
}

function printSetFit(fit, btn) {
  printState.fit = fit;
  document.querySelectorAll('.print-fit-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  printApplyImage();
}

function printApplyImage() {
  const img = document.getElementById('print-image');
  if (!img.src || img.style.display === 'none') return;

  img.style.objectFit = printState.fit;
  img.style.width = printState.scale + '%';
  img.style.height = printState.fit === 'contain' ? 'auto' : printState.scale + '%';
  img.style.left = printState.x + '%';
  img.style.top = printState.y + '%';
  img.style.transform = `translate(-${printState.x}%, -${printState.y}%)`;

  if (printState.fit === 'contain') {
    img.style.maxWidth = printState.scale + '%';
    img.style.maxHeight = printState.scale + '%';
    img.style.width = 'auto';
    img.style.height = 'auto';
  }
}

function printDownload() {
  const img = document.getElementById('print-image');
  if (!img.src || img.style.display === 'none') {
    alert('Please upload an artwork first.');
    return;
  }

  const dim = printGetDimensions();
  const canvas = document.createElement('canvas');
  canvas.width = dim.w;
  canvas.height = dim.h;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = printState.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw image
  const srcImg = new Image();
  srcImg.crossOrigin = 'anonymous';
  srcImg.onload = function() {
    const imgRatio = srcImg.width / srcImg.height;
    const canvasRatio = canvas.width / canvas.height;
    const scaleFactor = printState.scale / 100;

    let drawW, drawH;
    if (printState.fit === 'contain') {
      if (imgRatio > canvasRatio) {
        drawW = canvas.width * scaleFactor;
        drawH = drawW / imgRatio;
      } else {
        drawH = canvas.height * scaleFactor;
        drawW = drawH * imgRatio;
      }
    } else {
      if (imgRatio > canvasRatio) {
        drawH = canvas.height * scaleFactor;
        drawW = drawH * imgRatio;
      } else {
        drawW = canvas.width * scaleFactor;
        drawH = drawW / imgRatio;
      }
    }

    const drawX = (canvas.width - drawW) * (printState.x / 100);
    const drawY = (canvas.height - drawH) * (printState.y / 100);

    ctx.drawImage(srcImg, drawX, drawY, drawW, drawH);

    // Draw watermark if enabled
    if (printWmState.enabled) {
      const wmText = printWmState.text;
      const isCenter = printWmState.position === 'center';
      const fontSize = isCenter ? Math.round(canvas.width * 0.025) : Math.round(canvas.width * 0.015);
      ctx.font = `300 ${fontSize}px Jost, sans-serif`;
      ctx.letterSpacing = `${fontSize * 0.12}px`;

      const alpha = printWmState.opacity / 100;
      if (printWmState.colorMode === 'dark') {
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      }

      const margin = canvas.width * 0.06;
      if (isCenter) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-30 * Math.PI / 180);
        ctx.textAlign = 'center';
        ctx.fillText(wmText, 0, 0);
        ctx.restore();
      } else {
        const metrics = ctx.measureText(wmText);
        let wx, wy;
        if (printWmState.position === 'top-left') { wx = margin; wy = margin + fontSize; }
        else if (printWmState.position === 'top-right') { wx = canvas.width - margin - metrics.width; wy = margin + fontSize; }
        else if (printWmState.position === 'bottom-left') { wx = margin; wy = canvas.height - margin; }
        else { wx = canvas.width - margin - metrics.width; wy = canvas.height - margin; }
        ctx.fillText(wmText, wx, wy);
      }
    }

    canvas.toBlob(function(blob) {
      const link = document.createElement('a');
      const sizeName = printSizes[printCurrentSize].name.replace(/[×"]/g, 'x').replace(/\s/g, '');
      link.download = `soulbrush-print-${sizeName}-300dpi.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'image/png');
  };
  srcImg.src = img.src;
}

// ─── Print Watermark ───
let printWmState = {
  enabled: false,
  text: '© Soulbrush Studio',
  position: 'bottom-right',
  opacity: 30,
  colorMode: 'dark'
};

function printToggleWm(btn) {
  printWmState.enabled = !printWmState.enabled;
  btn.textContent = printWmState.enabled ? 'On' : 'Off';
  btn.classList.toggle('active', printWmState.enabled);
  document.getElementById('print-wm-options').style.display = printWmState.enabled ? '' : 'none';
  const wm = document.getElementById('print-watermark');
  wm.style.display = printWmState.enabled ? '' : 'none';
  if (printWmState.enabled) printUpdateWm();
}

function printUpdateWm() {
  printWmState.text = document.getElementById('print-wm-text').value;
  printWmState.opacity = parseInt(document.getElementById('print-wm-opacity').value);
  const wm = document.getElementById('print-watermark');
  wm.textContent = printWmState.text;
  const alpha = printWmState.opacity / 100;
  if (printWmState.colorMode === 'dark') {
    wm.style.color = `rgba(0,0,0,${alpha})`;
  } else {
    wm.style.color = `rgba(255,255,255,${alpha})`;
  }
}

function printSetWmPos(pos, btn) {
  printWmState.position = pos;
  document.querySelectorAll('#print-wm-options .wm-pos-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const wm = document.getElementById('print-watermark');
  wm.className = 'print-watermark pos-' + pos + ' wm-' + printWmState.colorMode;
}

function printSetWmColor(mode, btn) {
  printWmState.colorMode = mode;
  document.querySelectorAll('.print-wm-color-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const wm = document.getElementById('print-watermark');
  wm.className = 'print-watermark pos-' + printWmState.position + ' wm-' + mode;
  printUpdateWm();
}
