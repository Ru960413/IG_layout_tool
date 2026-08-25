// ─── Shared: ensure blob < 10MB ───
const MAX_BLOB_SIZE = 10 * 1024 * 1024;

function canvasToConstrainedBlob(canvas) {
  return new Promise(function(resolve) {
    canvas.toBlob(function(pngBlob) {
      if (pngBlob && pngBlob.size <= MAX_BLOB_SIZE) {
        resolve({ blob: pngBlob, ext: 'png' });
        return;
      }
      var quality = 0.92;
      function tryJpeg() {
        canvas.toBlob(function(jpgBlob) {
          if (jpgBlob && jpgBlob.size <= MAX_BLOB_SIZE || quality <= 0.5) {
            resolve({ blob: jpgBlob, ext: 'jpg' });
          } else {
            quality -= 0.05;
            tryJpeg();
          }
        }, 'image/jpeg', quality);
      }
      tryJpeg();
    }, 'image/png');
  });
}

// Generate stars
const starsEl = document.getElementById('stars');
for (let i = 0; i < 80; i++) {
  const s = document.createElement('div');
  s.className = 'star';
  const size = Math.random() * 2.5 + 0.5;
  s.style.cssText = `
    width: ${size}px; height: ${size}px;
    left: ${Math.random() * 100}%;
    top: ${Math.random() * 100}%;
    --dur: ${2 + Math.random() * 4}s;
    --min: ${0.1 + Math.random() * 0.3};
    --max: ${0.5 + Math.random() * 0.5};
    animation-delay: ${Math.random() * 4}s;
  `;
  starsEl.appendChild(s);
}

// ─── Slide state management ───
const defaultSlideState = () => ({
  template: 'title',
  ratio: '9/16',
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Jost',
  sizes: { heading: 36, subheading: 22, body: 13, paragraph: 12 },
  colors: { heading: '#ffffff', subheading: '#c9b8ff', body: 'rgba(255,255,255,0.55)' },
  bgImageData: null,
  overlayOpacity: 55,
  textShadow: false,
  textBg: false,
  artworkImageData: null,
  featureImageData: null,
  texts: {}
});

let slides = [defaultSlideState()];
let currentSlide = 0;

// Collect all editable text from current canvas
function getEditableKey(el, index) {
  if (el.id) return el.id;
  const parent = el.closest('[id]');
  return (parent ? parent.id : 'unknown') + '_' + el.className + '_' + index;
}

function collectTexts() {
  const texts = {};
  const editables = document.querySelectorAll('.story-canvas [contenteditable]');
  editables.forEach((el, i) => {
    const key = getEditableKey(el, i);
    texts[key] = el.innerHTML;
  });
  // Also save the number of list items
  texts.__listItemCount = document.querySelectorAll('#list-items .list-item').length;
  return texts;
}

// Restore editable text to canvas
function restoreTexts(texts) {
  if (!texts || Object.keys(texts).length === 0) return;

  // Restore list item count first
  if (texts.__listItemCount !== undefined) {
    const container = document.getElementById('list-items');
    const current = container.querySelectorAll('.list-item').length;
    const target = texts.__listItemCount;
    // Add items if needed
    for (let i = current; i < target; i++) addListItem();
    // Remove items if needed
    while (container.querySelectorAll('.list-item').length > target && container.querySelectorAll('.list-item').length > 1) {
      container.removeChild(container.lastElementChild);
    }
  }

  const editables = document.querySelectorAll('.story-canvas [contenteditable]');
  editables.forEach((el, i) => {
    const key = getEditableKey(el, i);
    if (texts[key] !== undefined) el.innerHTML = texts[key];
  });
}

function saveCurrentSlide() {
  const slide = slides[currentSlide];
  slide.texts = collectTexts();
  slide.template = document.querySelector('.template.active')?.id.replace('tpl-', '') || 'title';
  slide.ratio = document.querySelector('.canvas-wrapper').style.aspectRatio || '9/16';
  slide.headingFont = currentHeadingFont;
  slide.bodyFont = currentBodyFont;
  slide.sizes = { ...sizes };
  const artworkImg = document.getElementById('artwork-img');
  slide.artworkImageData = artworkImg.src && artworkImg.style.display !== 'none' ? artworkImg.src : null;
  const featureImg = document.getElementById('feature-img');
  slide.featureImageData = featureImg.src && featureImg.style.display !== 'none' ? featureImg.src : null;
  // Save colors from current elements (check all template variants)
  const headingEl = document.querySelector('.story-canvas .heading, .story-canvas .section-title, .story-canvas .text-heading');
  const subEl = document.querySelector('.story-canvas .subheading, .story-canvas .section-sub, .story-canvas .artwork-title-en');
  const bodyEl = document.querySelector('.story-canvas .tagline, .story-canvas .cta-body, .story-canvas .list-item-title, .story-canvas .text-body');
  if (headingEl) slide.colors.heading = headingEl.style.color || '#ffffff';
  if (subEl) slide.colors.subheading = subEl.style.color || '#c9b8ff';
  if (bodyEl) slide.colors.body = bodyEl.style.color || 'rgba(255,255,255,0.55)';
  const bgImg = document.getElementById('bg-image').style.backgroundImage;
  slide.bgImageData = bgImg && bgImg !== 'none' ? bgImg : null;
  slide.overlayOpacity = parseInt(document.querySelector('.opacity-slider')?.value || 55);
  const canvas = document.querySelector('.story-canvas');
  slide.textShadow = canvas.classList.contains('text-shadow-on');
  slide.textBg = canvas.classList.contains('text-bg-on');
}

function loadSlide(index) {
  const slide = slides[index];

  // Template
  switchTemplate(slide.template, true);

  // Ratio
  document.querySelector('.canvas-wrapper').style.aspectRatio = slide.ratio;
  document.querySelectorAll('.ratio-tab').forEach(t => {
    t.classList.toggle('active', t.textContent.includes(slide.ratio.replace('/', ':')));
  });

  // Fonts
  currentHeadingFont = slide.headingFont || 'Cormorant Garamond';
  currentBodyFont = slide.bodyFont || 'Jost';
  document.querySelectorAll('#heading-font-row .font-option').forEach(btn => {
    const name = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    btn.classList.toggle('active', name === currentHeadingFont);
  });
  document.querySelectorAll('#body-font-row .font-option').forEach(btn => {
    const name = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    btn.classList.toggle('active', name === currentBodyFont);
  });
  applyFonts();

  // Artwork image
  const artworkImg = document.getElementById('artwork-img');
  const artworkPlaceholder = document.getElementById('artwork-placeholder');
  if (slide.artworkImageData) {
    artworkImg.src = slide.artworkImageData;
    artworkImg.style.display = 'block';
    artworkPlaceholder.style.display = 'none';
  } else {
    artworkImg.src = '';
    artworkImg.style.display = 'none';
    artworkPlaceholder.style.display = 'flex';
  }

  // Feature image
  const featureImg = document.getElementById('feature-img');
  const featurePlaceholder = document.getElementById('feature-placeholder');
  if (slide.featureImageData) {
    featureImg.src = slide.featureImageData;
    featureImg.style.display = 'block';
    featurePlaceholder.style.display = 'none';
  } else {
    featureImg.src = '';
    featureImg.style.display = 'none';
    featurePlaceholder.style.display = 'flex';
  }

  // Sizes
  Object.assign(sizes, slide.sizes);
  document.getElementById('heading-val').textContent = sizes.heading + 'px';
  document.getElementById('subheading-val').textContent = sizes.subheading + 'px';
  document.getElementById('body-val').textContent = sizes.body + 'px';
  document.getElementById('paragraph-val').textContent = sizes.paragraph + 'px';
  applyFontSizes();

  // Background image
  const bgImage = document.getElementById('bg-image');
  const bgOverlay = document.getElementById('bg-overlay');
  if (slide.bgImageData) {
    bgImage.style.backgroundImage = slide.bgImageData;
    bgOverlay.style.display = 'block';
    bgOverlay.style.background = `rgba(15, 10, 35, ${slide.overlayOpacity / 100})`;
    document.getElementById('remove-img-btn').style.display = '';
    document.getElementById('opacity-ctrl').style.display = '';
    document.querySelector('.opacity-slider').value = slide.overlayOpacity;
  } else {
    bgImage.style.backgroundImage = '';
    bgOverlay.style.display = 'none';
    document.getElementById('remove-img-btn').style.display = 'none';
    document.getElementById('opacity-ctrl').style.display = 'none';
  }

  // Text effects
  const storyCanvas = document.querySelector('.story-canvas');
  storyCanvas.classList.toggle('text-shadow-on', !!slide.textShadow);
  storyCanvas.classList.toggle('text-bg-on', !!slide.textBg);
  const effectBtns = document.querySelectorAll('.text-effect-btn');
  effectBtns[0].classList.toggle('active', !!slide.textShadow);
  effectBtns[1].classList.toggle('active', !!slide.textBg);

  // Colors
  if (slide.colors) {
    const ct = colorTarget;
    colorTarget = 'heading'; applyTextColor(slide.colors.heading, null);
    colorTarget = 'subheading'; applyTextColor(slide.colors.subheading, null);
    colorTarget = 'body'; applyTextColor(slide.colors.body, null);
    colorTarget = ct;
  }

  // Texts (restore after template switch)
  restoreTexts(slide.texts);
}

function renderSlideBar() {
  const container = document.getElementById('slide-thumbs');
  container.innerHTML = '';
  slides.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'slide-thumb' + (i === currentSlide ? ' active' : '');
    btn.textContent = i + 1;
    btn.onclick = () => goToSlide(i);
    container.appendChild(btn);
  });
}

function goToSlide(index) {
  if (index === currentSlide) return;
  saveCurrentSlide();
  currentSlide = index;
  loadSlide(index);
  renderSlideBar();
}

function addSlide() {
  saveCurrentSlide();
  const current = slides[currentSlide];
  const newSlide = JSON.parse(JSON.stringify(current));
  // Keep settings but clear text content and images
  newSlide.texts = {};
  newSlide.bgImageData = null;
  newSlide.artworkImageData = null;
  slides.push(newSlide);
  currentSlide = slides.length - 1;
  loadSlide(currentSlide);
  renderSlideBar();
}

function deleteSlide() {
  if (slides.length <= 1) return;
  slides.splice(currentSlide, 1);
  if (currentSlide >= slides.length) currentSlide = slides.length - 1;
  loadSlide(currentSlide);
  renderSlideBar();
}

// ─── Font sizes state ───
const sizes = { heading: 36, subheading: 22, body: 13, paragraph: 12 };

function adjustSize(type, delta) {
  sizes[type] = Math.max(8, Math.min(72, sizes[type] + delta));
  document.getElementById(`${type}-val`).textContent = sizes[type] + 'px';
  applyFontSizes();
}

function applyFontSizes() {
  const active = document.querySelector('.template.active');
  if (!active) return;
  const id = active.id;

  if (id === 'tpl-title') {
    document.getElementById('heading-text').style.fontSize = sizes.heading + 'px';
    document.getElementById('subheading-text').style.fontSize = sizes.subheading + 'px';
    document.getElementById('tagline-text').style.fontSize = sizes.body + 'px';
    document.getElementById('eyebrow-text').style.fontSize = sizes.body + 'px';
    document.getElementById('body-text').style.fontSize = sizes.paragraph + 'px';
  } else if (id === 'tpl-list') {
    document.getElementById('list-heading').style.fontSize = sizes.heading + 'px';
    document.getElementById('list-sub').style.fontSize = sizes.subheading + 'px';
    document.querySelectorAll('.list-item-title').forEach(el => el.style.fontSize = sizes.body + 'px');
    document.querySelectorAll('.list-item-desc').forEach(el => el.style.fontSize = (sizes.body - 2) + 'px');
    document.querySelectorAll('.list-icon').forEach(el => el.style.fontSize = sizes.body + 'px');
  } else if (id === 'tpl-cta') {
    document.getElementById('cta-heading').style.fontSize = sizes.heading + 'px';
    document.getElementById('cta-sub').style.fontSize = sizes.subheading + 'px';
    document.getElementById('cta-body').style.fontSize = sizes.body + 'px';
  } else if (id === 'tpl-text') {
    document.getElementById('text-heading').style.fontSize = sizes.heading + 'px';
    document.getElementById('text-body').style.fontSize = sizes.paragraph + 'px';
  } else if (id === 'tpl-artwork') {
    document.getElementById('artwork-zh').style.fontSize = sizes.heading + 'px';
    document.getElementById('artwork-en').style.fontSize = sizes.subheading + 'px';
    document.getElementById('artwork-eyebrow').style.fontSize = sizes.body + 'px';
    document.getElementById('artwork-meta').style.fontSize = (sizes.body - 4) + 'px';
  } else if (id === 'tpl-feature') {
    document.getElementById('feature-heading').style.fontSize = sizes.heading + 'px';
    document.getElementById('feature-body').style.fontSize = sizes.body + 'px';
    document.getElementById('feature-body-zh').style.fontSize = sizes.body + 'px';
    document.getElementById('feature-cta').style.fontSize = sizes.body + 'px';
  }
}

function switchTemplate(name, silent, btn) {
  document.querySelectorAll('.template').forEach(t => t.classList.remove('active'));
  document.getElementById('tpl-' + name).classList.add('active');

  if (!silent && btn) {
    document.querySelectorAll('.tab:not(.ratio-tab)').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  } else {
    document.querySelectorAll('.tab:not(.ratio-tab)').forEach(t => {
      t.classList.toggle('active', t.textContent.toLowerCase() === name);
    });
  }

  document.querySelector('.swipe-hint').style.display = (name === 'cta' || name === 'artwork' || name === 'text' || name === 'feature') ? 'none' : 'block';
  document.querySelector('.brand-label').style.display = (name === 'artwork' || name === 'feature') ? 'none' : '';
  document.querySelector('.footer-label').style.display = (name === 'artwork' || name === 'feature') ? 'none' : '';

  // Show/hide controls based on template
  document.querySelectorAll('[data-templates]').forEach(el => {
    const templates = el.dataset.templates.split(' ');
    el.style.display = templates.includes(name) ? '' : 'none';
  });

  // Reset color target to heading when switching templates
  const firstVisibleColorBtn = document.querySelector('.color-target-btn[data-templates*="' + name + '"]');
  if (firstVisibleColorBtn) {
    document.querySelectorAll('.color-target-btn').forEach(b => b.classList.remove('active'));
    firstVisibleColorBtn.classList.add('active');
    colorTarget = 'heading';
  }

  applyFontSizes();
  applyFonts();
}

// ─── Text color ───
let colorTarget = 'heading'; // 'heading', 'subheading', 'body'

function setColorTarget(target, btn) {
  colorTarget = target;
  document.querySelectorAll('.color-target-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function getColorTargetElements() {
  const canvas = document.querySelector('.story-canvas');
  if (colorTarget === 'heading') {
    return canvas.querySelectorAll('.heading, .section-title, .cta-card .heading, .eyebrow, .brand-label, .artwork-title-zh, .text-heading, .feature-heading');
  } else if (colorTarget === 'subheading') {
    return canvas.querySelectorAll('.subheading, .section-sub, .artwork-title-en');
  } else {
    return canvas.querySelectorAll('.tagline, .body-text, .list-item-title, .list-item-desc, .cta-body, .cta-highlight, .swipe-hint, .footer-label, .artwork-eyebrow, .artwork-meta, .text-body, .feature-body, .feature-body-zh, .feature-cta');
  }
}

function applyTextColor(color, btn) {
  if (btn) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
  }
  getColorTargetElements().forEach(el => {
    el.style.color = color;
  });
}

// ─── Paste cleanup — strip inline colors from rich text ───
document.addEventListener('paste', function(e) {
  const target = e.target;
  if (!target.hasAttribute('contenteditable')) return;

  e.preventDefault();
  // Get plain text to avoid inline styles
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  // Insert as plain text, preserving line breaks
  const lines = text.split('\n');
  const frag = document.createDocumentFragment();
  lines.forEach((line, i) => {
    frag.appendChild(document.createTextNode(line));
    if (i < lines.length - 1) frag.appendChild(document.createElement('br'));
  });

  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(frag);
    range.collapse(false);
  }
});

// ─── Text effects ───
function toggleTextEffect(effect, btn) {
  const canvas = document.querySelector('.story-canvas');
  if (effect === 'shadow') {
    canvas.classList.toggle('text-shadow-on');
    btn.classList.toggle('active');
  } else if (effect === 'bg') {
    canvas.classList.toggle('text-bg-on');
    btn.classList.toggle('active');
  }
}

// ─── Dual font system ───
const fontFallbacks = {
  'Cormorant Garamond': "'Cormorant Garamond', serif",
  'Playfair Display': "'Playfair Display', serif",
  'Noto Serif TC': "'Noto Serif TC', serif",
  'Noto Sans TC': "'Noto Sans TC', sans-serif",
  'LXGW WenKai TC': "'LXGW WenKai TC', cursive",
  'ChenYuluoyan': "'ChenYuluoyan', cursive",
  'Jost': "'Jost', sans-serif"
};

let currentHeadingFont = 'Cormorant Garamond';
let currentBodyFont = 'Jost';

function switchHeadingFont(fontName, btn) {
  document.querySelectorAll('#heading-font-row .font-option').forEach(f => f.classList.remove('active'));
  btn.classList.add('active');
  currentHeadingFont = fontName;
  applyFonts();
}

function switchBodyFont(fontName, btn) {
  document.querySelectorAll('#body-font-row .font-option').forEach(f => f.classList.remove('active'));
  btn.classList.add('active');
  currentBodyFont = fontName;
  applyFonts();
}

function applyFonts() {
  const canvas = document.querySelector('.story-canvas');
  const hf = fontFallbacks[currentHeadingFont];
  const bf = fontFallbacks[currentBodyFont];

  // Heading font targets
  canvas.querySelectorAll('.heading, .section-title, .cta-card .heading, .subheading, .section-sub, .artwork-title-zh, .text-heading, .feature-heading').forEach(el => {
    el.style.fontFamily = hf;
  });
  // Body font targets
  canvas.querySelectorAll('.eyebrow, .tagline, .body-text, .list-item-title, .list-item-desc, .cta-body, .cta-highlight, .swipe-hint, .artwork-eyebrow, .artwork-title-en, .artwork-meta, .text-body, .feature-body, .feature-body-zh, .feature-cta').forEach(el => {
    el.style.fontFamily = bf;
  });
}

// ─── List item add/remove ───
function addListItem() {
  const container = document.getElementById('list-items');
  const item = document.createElement('div');
  item.className = 'list-item';
  item.innerHTML = `
    <span class="list-icon" style="font-size:${sizes.body}px">&#10022;</span>
    <div>
      <span class="list-item-title" style="font-size:${sizes.body}px" contenteditable>New Item</span>
      <span class="list-item-desc" style="font-size:${sizes.body - 2}px" contenteditable>Description here</span>
    </div>
  `;
  container.appendChild(item);
  applyFonts();
}

function removeListItem() {
  const container = document.getElementById('list-items');
  if (container.children.length <= 1) return;
  container.removeChild(container.lastElementChild);
}

// ─── Feature card ───
function handleFeatureUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = document.getElementById('feature-img');
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('feature-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ─── Artwork card ───
function handleArtworkUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = document.getElementById('artwork-img');
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('artwork-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ─── Aspect ratio switching ───
function switchRatio(ratio, btn) {
  document.querySelector('.canvas-wrapper').style.aspectRatio = ratio;
  document.querySelectorAll('.ratio-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

// ─── Image upload ───
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const bgImage = document.getElementById('bg-image');
    bgImage.style.backgroundImage = `url(${ev.target.result})`;
    document.getElementById('bg-overlay').style.display = 'block';
    document.getElementById('remove-img-btn').style.display = '';
    document.getElementById('opacity-ctrl').style.display = '';
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  document.getElementById('bg-image').style.backgroundImage = '';
  document.getElementById('bg-overlay').style.display = 'none';
  document.getElementById('remove-img-btn').style.display = 'none';
  document.getElementById('opacity-ctrl').style.display = 'none';
  document.getElementById('img-upload').value = '';
}

function setOverlayOpacity(val) {
  document.getElementById('bg-overlay').style.background = `rgba(15, 10, 35, ${val / 100})`;
}

// ─── Download single ───
function downloadCanvas() {
  const btn = document.querySelector('.download-btn');
  btn.disabled = true;
  btn.textContent = 'Exporting...';

  exportCanvasToBlob().then(function(result) {
    const link = document.createElement('a');
    link.download = `soulbrush-slide${currentSlide + 1}-${Date.now()}.${result.ext}`;
    link.href = URL.createObjectURL(result.blob);
    link.click();
    URL.revokeObjectURL(link.href);
    btn.disabled = false;
    btn.textContent = 'Download PNG';
  }).catch(err => {
    console.error('Export failed:', err);
    btn.disabled = false;
    btn.textContent = 'Download PNG';
  });
}

function exportCanvasToBlob() {
  const canvas = document.querySelector('.story-canvas');
  const ratioStr = document.querySelector('.canvas-wrapper').style.aspectRatio || '9/16';
  const [w, h] = ratioStr.split('/').map(Number);
  const exportWidth = 1080;
  const scale = exportWidth / canvas.offsetWidth;

  return html2canvas(canvas, {
    scale: scale,
    width: canvas.offsetWidth,
    height: canvas.offsetHeight,
    useCORS: true,
    backgroundColor: null,
    onclone: function(clonedDoc) {
      clonedDoc.querySelector('.story-canvas').style.borderRadius = '0';
      clonedDoc.querySelector('.story-canvas').style.boxShadow = 'none';
      const listActions = clonedDoc.querySelector('.list-actions');
      if (listActions) listActions.style.display = 'none';
    }
  }).then(c => canvasToConstrainedBlob(c));
}

// ─── Download all slides ───
async function downloadAll() {
  if (slides.length === 1) {
    downloadCanvas();
    return;
  }

  const btn = document.querySelector('.download-all-btn');
  btn.disabled = true;

  saveCurrentSlide();
  const originalSlide = currentSlide;

  for (let i = 0; i < slides.length; i++) {
    btn.textContent = `Exporting ${i + 1}/${slides.length}...`;
    currentSlide = i;
    loadSlide(i);
    renderSlideBar();

    // Small delay to let DOM render
    await new Promise(r => setTimeout(r, 200));

    const result = await exportCanvasToBlob();
    const link = document.createElement('a');
    link.download = `soulbrush-slide${i + 1}.${result.ext}`;
    link.href = URL.createObjectURL(result.blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Restore original slide
  currentSlide = originalSlide;
  loadSlide(originalSlide);
  renderSlideBar();

  btn.disabled = false;
  btn.textContent = 'Download All';
}

// ─── Watermark ───
let wmEnabled = false;
let wmPosition = 'bottom-right';

function toggleWatermark(btn) {
  wmEnabled = !wmEnabled;
  btn.textContent = wmEnabled ? 'On' : 'Off';
  btn.classList.toggle('active', wmEnabled);
  document.getElementById('wm-options').style.display = wmEnabled ? '' : 'none';
  const wm = document.getElementById('watermark');
  wm.style.display = wmEnabled ? '' : 'none';
  if (wmEnabled) {
    updateWatermark();
    applyWmPosition();
  }
}

function updateWatermark() {
  const text = document.getElementById('wm-text').value;
  document.getElementById('watermark').textContent = text;
}

function setWmPosition(pos, btn) {
  wmPosition = pos;
  document.querySelectorAll('.wm-pos-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyWmPosition();
}

function applyWmPosition() {
  const wm = document.getElementById('watermark');
  wm.className = 'watermark pos-' + wmPosition;
}

function setWmOpacity(val) {
  document.getElementById('watermark').style.color = `rgba(255,255,255,${val / 100})`;
}

// ─── Project Save/Load ───
function saveProject() {
  saveCurrentSlide();
  const data = JSON.stringify(slides);
  localStorage.setItem('soulbrush-project', data);
  alert('Project saved! (' + slides.length + ' slides)');
}

function loadProject() {
  const data = localStorage.getItem('soulbrush-project');
  if (!data) {
    alert('No saved project found.');
    return;
  }
  try {
    const loaded = JSON.parse(data);
    if (!Array.isArray(loaded) || loaded.length === 0) throw new Error('Invalid');
    slides.length = 0;
    loaded.forEach(s => slides.push(s));
    currentSlide = 0;
    loadSlide(0);
    renderSlideBar();
    alert('Project loaded! (' + slides.length + ' slides)');
  } catch (e) {
    alert('Failed to load project.');
  }
}

function exportProjectJSON() {
  saveCurrentSlide();
  const data = JSON.stringify(slides, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `soulbrush-project-${Date.now()}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function importProjectJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const loaded = JSON.parse(ev.target.result);
      if (!Array.isArray(loaded) || loaded.length === 0) throw new Error('Invalid');
      slides.length = 0;
      loaded.forEach(s => slides.push(s));
      currentSlide = 0;
      loadSlide(0);
      renderSlideBar();
      alert('Project imported! (' + slides.length + ' slides)');
    } catch (err) {
      alert('Invalid project file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
