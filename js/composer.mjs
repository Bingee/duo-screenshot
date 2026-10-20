export function cleanName(value) {
  return Array.from(String(value || '').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 40).join('');
}
export function randomSystemTime(previous, random = Math.random) {
  let minutes = Math.floor(random() * 1439);
  if (minutes >= 581) minutes++;
  const format = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  if (format(minutes) === previous) {
    minutes = (minutes + 1) % 1440;
    if (minutes === 581) minutes++;
  }
  return format(minutes);
}
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片无法读取，请换一张 JPG、PNG 或 WebP。'));
    image.src = src;
  });
}
export function fitName(ctx, text, box) {
  let size = box.fontSize;
  const family = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  while (size > box.minFontSize) {
    ctx.font = `${box.weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= box.width) break;
    size--;
  }
  ctx.font = `${box.weight} ${size}px ${family}`;
  const chars = Array.from(text);
  if (ctx.measureText(text).width > box.width) {
    while (chars.length && ctx.measureText(chars.join('') + '…').width > box.width) chars.pop();
    text = chars.join('') + '…';
  }
  return text;
}
export function compose(template, { name, avatarImage, systemTime }, baseImage, canvasFactory = () => document.createElement('canvas')) {
  if (baseImage.width !== template.width || baseImage.height !== template.height) throw new Error('底图尺寸不匹配，无法生成。');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(systemTime)) throw new Error('系统时间无效。');
  const canvas = canvasFactory(template.width, template.height);
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持画布，请更新浏览器。');
  ctx.drawImage(baseImage, 0, 0);
  const n = template.name;
  name = cleanName(name);
  if (name) {
    ctx.fillStyle = n.background;
    ctx.fillRect(n.x, n.y, n.width, n.height);
    const fitted = fitName(ctx, name, n);
    ctx.fillStyle = n.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(fitted, n.x, n.y + n.height / 2);
  }
  const c = template.clock;
  ctx.fillStyle = c.background;
  ctx.fillRect(c.x, c.y, c.width, c.height);
  ctx.font = `${c.weight} ${c.fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillStyle = c.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(systemTime, c.x + c.width / 2, c.y + c.height / 2);
  if (avatarImage) {
    const a = template.avatar;
    const side = Math.min(avatarImage.width, avatarImage.height);
    if (!side) throw new Error('头像尺寸无效。');
    ctx.save();
    ctx.beginPath();
    ctx.arc(a.x + a.width / 2, a.y + a.height / 2, a.width / 2, 0, 2 * Math.PI);
    ctx.clip();
    ctx.fillStyle = a.background;
    ctx.fillRect(a.x, a.y, a.width, a.height);
    ctx.drawImage(avatarImage, (avatarImage.width - side) / 2, (avatarImage.height - side) / 2, side, side, a.x, a.y, a.width, a.height);
    ctx.restore();
  }
  return canvas;
}
export function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片导出失败，请重试。')), 'image/png'));
}
