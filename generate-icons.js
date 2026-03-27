/**
 * generate-icons.js
 * Gera todos os tamanhos de ícone PWA a partir do ícone fonte.
 * Execute: node generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_ICON = path.join(__dirname, '..', '..', 'Users', 'rafae', '.gemini', 'antigravity', 'brain', 'f31a032a-3125-4790-a5a4-caf7e9887b52', 'pwa_icon_storey_1774619313035.png');
const OUTPUT_DIR = path.join(__dirname, 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Verifica se o arquivo fonte existe
    if (!fs.existsSync(SOURCE_ICON)) {
        console.error('❌ Arquivo fonte não encontrado:', SOURCE_ICON);
        console.log('Crie os ícones manualmente em: icons/icon-{tamanho}x{tamanho}.png');
        process.exit(1);
    }

    console.log('🎨 Gerando ícones PWA...');

    for (const size of SIZES) {
        const outputFile = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
        await sharp(SOURCE_ICON)
            .resize(size, size, { fit: 'cover', background: { r: 7, g: 14, b: 29, alpha: 1 } })
            .png()
            .toFile(outputFile);
        console.log(`✓ Gerado: icon-${size}x${size}.png`);
    }

    console.log('\n✅ Todos os ícones gerados em ./icons/');
}

generateIcons().catch(console.error);
