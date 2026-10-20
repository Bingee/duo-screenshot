import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { compose } from "../js/composer.mjs";
import { templates } from "../js/templates.mjs";
for (const t of templates)
  test(`${t.id}: 原尺寸合成只修改头像、姓名和时间框，透明/横向头像正确裁切`, async () => {
    const base = await loadImage(
      fileURLToPath(new URL("../" + t.path, import.meta.url)),
    );
    const avatar = createCanvas(400, 200),
      ac = avatar.getContext("2d");
    ac.fillStyle = "#ff0000";
    ac.fillRect(0, 0, 400, 200);
    ac.fillStyle = "#009944";
    ac.fillRect(100, 0, 200, 200);
    ac.clearRect(160, 60, 80, 80);
    const generated = compose(
      t,
      {
        name: "名字很长的测试用户 🍎".repeat(8),
        avatarImage: avatar,
        systemTime: "13:08",
      },
      base,
      createCanvas,
    );
    assert.equal(generated.width, t.width);
    assert.equal(generated.height, t.height);
    const before = createCanvas(t.width, t.height);
    before.getContext("2d").drawImage(base, 0, 0);
    const a = before
      .getContext("2d")
      .getImageData(0, 0, t.width, t.height).data;
    const ctx = generated.getContext("2d"),
      b = ctx.getImageData(0, 0, t.width, t.height).data;
    const areas = [t.avatar, t.name, t.clock];
    let changed = 0;
    for (let y = 0; y < t.height; y++)
      for (let x = 0; x < t.width; x++) {
        const i = (y * t.width + x) * 4;
        if (
          a[i] !== b[i] ||
          a[i + 1] !== b[i + 1] ||
          a[i + 2] !== b[i + 2] ||
          a[i + 3] !== b[i + 3]
        ) {
          assert.ok(
            areas.some(
              (c) =>
                x >= c.x && x < c.x + c.width && y >= c.y && y < c.y + c.height,
            ),
            `区域外像素变化 ${x},${y}`,
          );
          changed++;
        }
      }
    assert.ok(changed > 100);
    const aBox = t.avatar;
    assert.deepEqual(
      [
        ...ctx.getImageData(
          aBox.x + aBox.width / 2,
          aBox.y + aBox.height / 2,
          1,
          1,
        ).data,
      ],
      [229, 229, 234, 255],
    );
    assert.deepEqual(
      [...ctx.getImageData(aBox.x + aBox.width / 2, aBox.y + 20, 1, 1).data],
      [0, 153, 68, 255],
    );
  });
test("底图尺寸或系统时间不合法时阻止导出", () => {
  const t = templates[0];
  assert.throws(
    () =>
      compose(
        t,
        { systemTime: "13:08" },
        { width: 1, height: 1 },
        createCanvas,
      ),
    /底图尺寸/,
  );
  assert.throws(
    () =>
      compose(
        t,
        { systemTime: "25:00" },
        { width: t.width, height: t.height },
        createCanvas,
      ),
    /时间无效/,
  );
});
