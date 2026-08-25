// ─── Wallpaper Mode ───

const wpDevices = {
  'iphone-15-pro': { name: 'iPhone 15 Pro', w: 1179, h: 2556, ratio: '9/19.5' },
  'iphone-15-max': { name: 'iPhone 15 Pro Max', w: 1290, h: 2796, ratio: '9/19.5' },
  'iphone-se':     { name: 'iPhone SE', w: 750, h: 1334, ratio: '9/16' },
  'ipad-pro-11':   { name: 'iPad Pro 11"', w: 1668, h: 2388, ratio: '2/3' },
  'ipad-pro-13':   { name: 'iPad Pro 13"', w: 2048, h: 2732, ratio: '3/4' },
  'ipad-air':      { name: 'iPad Air', w: 1640, h: 2360, ratio: '2/3' }
};

let wpCurrentDevice = 'iphone-15-pro';
let wpState = {
  scale: 100,
  x: 50,
  y: 50,
  bg: '#0d0920',
  fit: 'contain',
  imageData: null
};

function switchMode(mode, btn) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('mode-' + mode).classList.add('active');
}

function wpSwitchDevice(deviceId, btn) {
  wpCurrentDevice = deviceId;
  document.querySelectorAll('.wp-device-row .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const device = wpDevices[deviceId];
  document.getElementById('wp-canvas').style.aspectRatio = device.ratio;
  document.getElementById('wp-res-label').textContent = `${device.w} × ${device.h} px`;
  wpApplyImage();
}

function wpHandleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    wpState.imageData = ev.target.result;
    const img = document.getElementById('wp-image');
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('wp-placeholder').style.display = 'none';
    document.getElementById('wp-remove-btn').style.display = '';
    wpApplyImage();
  };
  reader.readAsDataURL(file);
}

function wpRemoveImage() {
  wpState.imageData = null;
  const img = document.getElementById('wp-image');
  img.src = '';
  img.style.display = 'none';
  document.getElementById('wp-placeholder').style.display = '';
  document.getElementById('wp-remove-btn').style.display = 'none';
  document.getElementById('wp-upload').value = '';
}

function wpAdjust(prop, delta) {
  if (prop === 'scale') {
    wpState.scale = Math.max(10, Math.min(300, wpState.scale + delta));
    document.getElementById('wp-scale-val').textContent = wpState.scale + '%';
  } else if (prop === 'x') {
    wpState.x = Math.max(0, Math.min(100, wpState.x + delta));
    document.getElementById('wp-x-val').textContent = wpState.x + '%';
  } else if (prop === 'y') {
    wpState.y = Math.max(0, Math.min(100, wpState.y + delta));
    document.getElementById('wp-y-val').textContent = wpState.y + '%';
  }
  wpApplyImage();
}

function wpSetBg(color, btn) {
  wpState.bg = color;
  document.getElementById('wp-canvas').style.background = color;
  if (btn) {
    document.querySelectorAll('#wp-bg-row .color-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
  }
}

function wpSetFit(fit, btn) {
  wpState.fit = fit;
  document.querySelectorAll('.wp-fit-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  wpApplyImage();
}

function wpApplyImage() {
  const img = document.getElementById('wp-image');
  if (!img.src || img.style.display === 'none') return;

  img.style.objectFit = wpState.fit;
  img.style.width = wpState.scale + '%';
  img.style.height = wpState.fit === 'contain' ? 'auto' : wpState.scale + '%';
  img.style.left = wpState.x + '%';
  img.style.top = wpState.y + '%';
  img.style.transform = `translate(-${wpState.x}%, -${wpState.y}%)`;

  if (wpState.fit === 'contain') {
    img.style.maxWidth = wpState.scale + '%';
    img.style.maxHeight = wpState.scale + '%';
    img.style.width = 'auto';
    img.style.height = 'auto';
  }
}

function wpDownload() {
  const img = document.getElementById('wp-image');
  if (!img.src || img.style.display === 'none') {
    alert('Please upload an artwork first.');
    return;
  }

  const device = wpDevices[wpCurrentDevice];
  const canvas = document.createElement('canvas');
  canvas.width = device.w;
  canvas.height = device.h;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = wpState.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw image
  const srcImg = new Image();
  srcImg.crossOrigin = 'anonymous';
  srcImg.onload = function() {
    const imgRatio = srcImg.width / srcImg.height;
    const canvasRatio = canvas.width / canvas.height;
    const scaleFactor = wpState.scale / 100;

    let drawW, drawH;
    if (wpState.fit === 'contain') {
      if (imgRatio > canvasRatio) {
        drawW = canvas.width * scaleFactor;
        drawH = drawW / imgRatio;
      } else {
        drawH = canvas.height * scaleFactor;
        drawW = drawH * imgRatio;
      }
    } else {
      // cover
      if (imgRatio > canvasRatio) {
        drawH = canvas.height * scaleFactor;
        drawW = drawH * imgRatio;
      } else {
        drawW = canvas.width * scaleFactor;
        drawH = drawW / imgRatio;
      }
    }

    // Position based on x/y percentage
    const drawX = (canvas.width - drawW) * (wpState.x / 100);
    const drawY = (canvas.height - drawH) * (wpState.y / 100);

    ctx.drawImage(srcImg, drawX, drawY, drawW, drawH);

    canvasToConstrainedBlob(canvas).then(function(result) {
      const link = document.createElement('a');
      link.download = `soulbrush-wallpaper-${device.name.replace(/[\s"]/g, '-')}.${result.ext}`;
      link.href = URL.createObjectURL(result.blob);
      link.click();
      URL.revokeObjectURL(link.href);
    });
  };
  srcImg.src = img.src;
}
