import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imageUrl = 'https://horizons-cdn.hostinger.com/b046caa6-31e1-44c9-b7bb-4c0c24e49566/05060f4f3eb24a1471d158e877be7c09.png';

async function downloadAndResizeIcons() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  try {
    console.log(`Téléchargement de l'icône source depuis ${imageUrl}...`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Échec du téléchargement: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Redimensionner pour 192x192
    await sharp(buffer)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'pwa-192x192.png'));
    console.log('Icône 192x192 générée avec succès');

    // Redimensionner pour 512x512
    await sharp(buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'pwa-512x512.png'));
    console.log('Icône 512x512 générée avec succès');

  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

downloadAndResizeIcons();
