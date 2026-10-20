// ZIP store mode (no compression): PNGs are already compressed. No runtime dependency.
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function header(size) {
  const bytes = new Uint8Array(size);
  return [bytes, new DataView(bytes.buffer)];
}
export async function createZip(files) {
  const local = [], central = [];
  let offset = 0, centralSize = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);
    const [lh, lv] = header(30);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); lv.setUint16(12, 0x0021, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.push(lh, name, data);
    const [ch, cv] = header(46);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(14, 0x0021, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
    central.push(ch, name);
    offset += 30 + name.length + data.length;
    centralSize += 46 + name.length;
  }
  const [end, ev] = header(22);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  return new Blob([...local, ...central, end], { type: 'application/zip' });
}
