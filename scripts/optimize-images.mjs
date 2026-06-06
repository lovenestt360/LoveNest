import sharp from 'sharp';
import path from 'path';

const images = ['hero', 'distance', 'gestures', 'safe'];
const sizes  = [768, 1280, 1920];

for (const name of images) {
  const input = path.resolve(`./public/${name}.jpg`);
  for (const w of sizes) {
    await sharp(input)
      .resize(w, null, { withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(path.resolve(`./public/${name}-${w}.webp`));
    console.log(`  ${name}-${w}.webp`);
  }
  console.log(`✓ ${name}`);
}
console.log('\nDone.');
