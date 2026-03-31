// Quick script to generate PWA icons as simple colored PNGs
// Run: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");

function createPNG(size) {
  // Create a minimal valid PNG with green background and "FA" text
  // Using a simple approach: create raw pixel data and encode as PNG

  const { createCanvas } = require("canvas");
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Green background
  ctx.fillStyle = "#1DB954";
  ctx.fillRect(0, 0, size, size);

  // White circle
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // "FA" text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FA", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

// Try with canvas, fallback to minimal 1x1 PNG
try {
  require("canvas");
  [192, 512].forEach((size) => {
    const buf = createPNG(size);
    fs.writeFileSync(
      path.join(__dirname, "..", "public", "icons", `icon-${size}.png`),
      buf
    );
    console.log(`Created icon-${size}.png`);
  });
} catch {
  // Fallback: create minimal valid PNGs (1x1 green pixel, scaled by browser)
  // PNG header + IHDR + IDAT + IEND for a 1x1 green pixel
  const createMinimalPNG = () => {
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk (width=1, height=1, bit depth=8, color type=2 RGB)
    const ihdrData = Buffer.from([
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
    ]);
    const ihdrCrc = crc32(Buffer.concat([Buffer.from("IHDR"), ihdrData]));
    const ihdr = Buffer.concat([
      Buffer.from([0, 0, 0, 13]),
      Buffer.from("IHDR"),
      ihdrData,
      ihdrCrc,
    ]);

    // IDAT chunk (zlib compressed: filter byte 0 + RGB 29,185,84)
    const { deflateSync } = require("zlib");
    const rawData = Buffer.from([0, 0x1d, 0xb9, 0x54]); // filter=0, R G B
    const compressed = deflateSync(rawData);
    const idatCrc = crc32(Buffer.concat([Buffer.from("IDAT"), compressed]));
    const idatLen = Buffer.alloc(4);
    idatLen.writeUInt32BE(compressed.length);
    const idat = Buffer.concat([
      idatLen,
      Buffer.from("IDAT"),
      compressed,
      idatCrc,
    ]);

    // IEND chunk
    const iendCrc = crc32(Buffer.from("IEND"));
    const iend = Buffer.concat([
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("IEND"),
      iendCrc,
    ]);

    return Buffer.concat([pngSignature, ihdr, idat, iend]);
  };

  // Simple CRC32
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    const result = Buffer.alloc(4);
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return result;
  }

  const png = createMinimalPNG();
  [192, 512].forEach((size) => {
    fs.writeFileSync(
      path.join(__dirname, "..", "public", "icons", `icon-${size}.png`),
      png
    );
    console.log(`Created minimal icon-${size}.png (1x1 green pixel fallback)`);
  });
}
