import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, randomSystemTime } from '../js/composer.mjs';
import { crc32, createZip } from '../js/zip.mjs';
test('名字移除控制字符，按 Unicode 字符限制长度，保留 emoji', () => {
  assert.equal(cleanName('  小\u0000明  🍎 \n '), '小明 🍎');
  assert.equal(Array.from(cleanName('🍎'.repeat(50))).length, 40);
});
test('随机时间覆盖全天，排除 09:41，连续生成不重复', () => {
  const all = new Set();
  for (let i = 0; i < 1439; i++) {
    const value = randomSystemTime('', () => (i + 0.5) / 1439);
    assert.match(value, /^(?:[01]\d|2[0-3]):[0-5]\d$/);
    assert.notEqual(value, '09:41');
    assert.notEqual(randomSystemTime(value, () => (i + 0.5) / 1439), value);
    all.add(value);
  }
  assert.equal(all.size, 1439);
});
test('ZIP 包含可独立解压的两份原始数据，CRC 和中央目录偏移一致', async () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const files = [{name:'Duo-内屏.png',blob:new Blob(['inner'])},{name:'Duo-外屏.png',blob:new Blob(['outer'])}];
  const bytes = new Uint8Array(await (await createZip(files)).arrayBuffer());
  const view = new DataView(bytes.buffer);
  let offset = 0;
  for (const file of files) {
    assert.equal(view.getUint32(offset,true),0x04034b50);
    const size = view.getUint32(offset+18,true), nameSize = view.getUint16(offset+26,true);
    const data = bytes.slice(offset+30+nameSize,offset+30+nameSize+size);
    assert.equal(new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameSize)),file.name);
    assert.equal(crc32(data),view.getUint32(offset+14,true));
    assert.equal(new TextDecoder().decode(data),await file.blob.text());
    offset += 30+nameSize+size;
  }
  assert.equal(view.getUint32(offset,true),0x02014b50);
  const end = bytes.length-22;
  assert.equal(view.getUint32(end,true),0x06054b50);
  assert.equal(view.getUint16(end+10,true),2);
  assert.equal(view.getUint32(end+16,true),offset);
  assert.equal(offset+view.getUint32(end+12,true),end);
});
