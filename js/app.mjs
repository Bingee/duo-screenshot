import { templates } from './templates.mjs';
import { cleanName, randomSystemTime, loadImage, compose, canvasBlob } from './composer.mjs';
import { createZip } from './zip.mjs';
const $ = selector => document.querySelector(selector);
const input = $('#name-input'), upload = $('#avatar-input'), save = $('#save-button');
const previews = $('.preview-section'), screens = $('.screens'), status = $('#status');
const state = { revision: 0, avatarRevision: 0, avatar: null, avatarURL: '', time: '', generated: null, urls: [], busy: false, loadingAvatar: false, renderTimer: null };
const bases = Promise.all(templates.map(t => loadImage(t.path)));
// Rendering reports the error; prevent a fast failed load becoming an unhandled rejection.
bases.catch(() => {});
function message(text = '', error = false) { status.textContent = text; status.classList.toggle('error', error); }
function invalidate() {
  state.revision++;
  state.generated = null;
  save.disabled = true;
  $('#download-options').hidden = true;
  previews.setAttribute('aria-busy', 'true');
  $('#render-state').textContent = '生成中…';
  message();
  clearTimeout(state.renderTimer);
}
function schedule() { invalidate(); if (!state.loadingAvatar) state.renderTimer = setTimeout(render, 180); }
async function render() {
  const revision = state.revision;
  if (state.loadingAvatar) return;
  const name = cleanName(input.value), avatarImage = state.avatar;
  const time = randomSystemTime(state.time);
  try {
    const images = await bases;
    if (revision !== state.revision) return;
    const canvases = templates.map((t, i) => compose(t, { name, avatarImage, systemTime: time }, images[i]));
    const blobs = await Promise.all(canvases.map(canvasBlob));
    // Release native-resolution canvas backing stores after PNG encoding.
    canvases.forEach(c => { c.width = 1; c.height = 1; });
    if (revision !== state.revision) return;
    const files = templates.map((t, i) => ({ name: `Duo-${t.id}.png`, blob: blobs[i] }));
    const zip = await createZip(files);
    if (revision !== state.revision) return;
    const oldURLs = state.urls;
    state.urls = blobs.map(blob => URL.createObjectURL(blob));
    templates.forEach((t, i) => {
      $(`#preview-${t.id}`).src = state.urls[i];
      $(`#download-${t.id}`).href = state.urls[i];
    });
    oldURLs.forEach(url => URL.revokeObjectURL(url));
    state.time = time;
    $('#clock').textContent = time;
    state.generated = { files, zip, revision };
    previews.setAttribute('aria-busy', 'false');
    $('#render-state').textContent = '原尺寸 · PNG';
    save.disabled = !name || state.busy;
  } catch (error) {
    if (revision !== state.revision) return;
    previews.setAttribute('aria-busy', 'false');
    $('#render-state').textContent = '生成失败';
    message(error.message || '生成失败，请刷新后重试。', true);
  }
}
async function chooseAvatar(file) {
  if (!file || state.busy) return;
  if (!file.type.startsWith('image/')) { message('请选择图片文件。', true); return; }
  if (file.size > 20 * 1024 * 1024) { message('请选择小于 20 MB 的图片。', true); return; }
  const avatarRevision = ++state.avatarRevision;
  state.loadingAvatar = true;
  invalidate();
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (avatarRevision !== state.avatarRevision) { URL.revokeObjectURL(url); return; }
    // Keep a bounded local avatar so very large camera photos do not remain decoded in memory.
    const side = Math.min(image.width, image.height);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = Math.min(1024, side);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    const blob = await canvasBlob(canvas); canvas.width = canvas.height = 1;
    const croppedURL = URL.createObjectURL(blob);
    const croppedImage = await loadImage(croppedURL);
    if (avatarRevision !== state.avatarRevision) { URL.revokeObjectURL(croppedURL); return; }
    if (state.avatarURL) URL.revokeObjectURL(state.avatarURL);
    state.avatarURL = croppedURL; state.avatar = croppedImage;
    $('#avatar-preview').src = croppedURL; $('#avatar-preview').hidden = false;
    $('#avatar-placeholder').setAttribute('hidden', ''); $('#avatar-label').textContent = '更换头像';
  } catch (error) { if (avatarRevision === state.avatarRevision) message(error.message, true); }
  finally {
    URL.revokeObjectURL(url);
    if (avatarRevision === state.avatarRevision) {
      state.loadingAvatar = false;
      // Render current input, including edits made while the photo was decoding.
      clearTimeout(state.renderTimer); state.renderTimer = setTimeout(render, 0);
    }
  }
}
input.addEventListener('input', schedule);
input.addEventListener('blur', () => { const name = cleanName(input.value); if (name !== input.value) { input.value = name; schedule(); } });
upload.addEventListener('change', () => { chooseAvatar(upload.files[0]); upload.value = ''; });
$('#reroll').addEventListener('click', schedule);
$('#reset').addEventListener('click', () => {
  if (state.busy) return;
  state.avatarRevision++; state.loadingAvatar = false; state.avatar = null;
  if (state.avatarURL) URL.revokeObjectURL(state.avatarURL);
  state.avatarURL = ''; input.value = '';
  $('#avatar-preview').removeAttribute('src'); $('#avatar-preview').hidden = true;
  $('#avatar-placeholder').removeAttribute('hidden'); $('#avatar-label').textContent = '选择头像';
  schedule();
});
const drop = $('#drop-zone');
for (const event of ['dragenter', 'dragover']) drop.addEventListener(event, e => { e.preventDefault(); drop.classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) drop.addEventListener(event, e => { e.preventDefault(); drop.classList.remove('dragging'); if (event === 'drop') chooseAvatar(e.dataTransfer.files[0]); });
const tabs = [...document.querySelectorAll('[role=tab]')];
function selectMode(mode) {
  screens.dataset.mode = mode;
  tabs.forEach(tab => { const selected = tab.dataset.mode === mode; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectMode(tab.dataset.mode));
  tab.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : 1 - index;
    selectMode(tabs[next].dataset.mode); tabs[next].focus();
  });
});
function download(blob, filename) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
save.addEventListener('click', async () => {
  const generated = state.generated;
  if (!generated || generated.revision !== state.revision || !cleanName(input.value) || state.busy) return;
  state.busy = true; save.disabled = true;
  input.disabled = upload.disabled = $('#reset').disabled = $('#reroll').disabled = true;
  message();
  const files = generated.files.map(f => new File([f.blob], f.name, { type: 'image/png' }));
  try {
    // Files are prepared before the click, preserving transient activation for mobile sharing.
    const mobile = matchMedia('(pointer: coarse)').matches;
    if (mobile && navigator.canShare?.({ files })) {
      await navigator.share({ files });
      message('已打开系统保存面板，可选择“存储图像”。');
    } else {
      download(generated.zip, 'Duo-screenshots.zip');
      message('已开始下载，压缩包内包含两张原尺寸 PNG。');
    }
  } catch (error) {
    if (error.name === 'AbortError') message('已取消保存，可随时重试。');
    else message('浏览器未能打开保存面板，请使用下方 PNG 链接。', true);
  } finally {
    $('#download-options').hidden = false;
    $('#download-help').textContent = '也可以分别保存 PNG，在浏览器下载记录中查看。';
    state.busy = false; input.disabled = upload.disabled = $('#reset').disabled = $('#reroll').disabled = false;
    save.disabled = !state.generated || !cleanName(input.value);
  }
});
selectMode('open');
schedule();
