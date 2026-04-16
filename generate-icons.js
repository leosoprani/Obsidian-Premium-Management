/**
 * generate-icons.js
 * Gera todos os tamanhos de ícone PWA e Expo a partir do ícone fonte.
 * Execute: node generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_ICON = path.join(__dirname, 'icons', 'source_icon.png');
const PWA_OUTPUT_DIR = path.join(__dirname, 'icons');
const EXPO_OUTPUT_DIR = path.join(__dirname, 'mobile', 'assets');

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const EXPO_ICONS = [
    { name: 'icon.png', size: 1024 },
    { name: 'adaptive-icon.png', size: 1024 },
    { name: 'favicon.png', size: 192 },
    { name: 'splash-icon.png', size: 1024 }
];

async function generateIcons() {
    // Verifica se o arquivo fonte existe
    if (!fs.existsSync(SOURCE_ICON)) {
        console.error('❌ Arquivo fonte não encontrado:', SOURCE_ICON);
        process.exit(1);
    }

    if (!fs.existsSync(PWA_OUTPUT_DIR)) {
        fs.mkdirSync(PWA_OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(EXPO_OUTPUT_DIR)) {
        fs.mkdirSync(EXPO_OUTPUT_DIR, { recursive: true });
    }

    console.log('🎨 Gerando ícones PWA...');
    for (const size of PWA_SIZES) {
        const outputFile = path.join(PWA_OUTPUT_DIR, `icon-${size}x${size}.png`);
        await sharp(SOURCE_ICON)
            .resize(size, size, { fit: 'cover' })
            .png()
            .toFile(outputFile);
        console.log(`✓ Gerado PWA: icon-${size}x${size}.png`);
    }

    console.log('\n📱 Gerando ícones Expo...');
    for (const icon of EXPO_ICONS) {
        const outputFile = path.join(EXPO_OUTPUT_DIR, icon.name);
        await sharp(SOURCE_ICON)
            .resize(icon.size, icon.size, { fit: 'cover' })
            .png()
            .toFile(outputFile);
        console.log(`✓ Gerado Expo: ${icon.name} (${icon.size}x${icon.size})`);
    }

    console.log('\n✅ Todos os ícones gerados com sucesso!');
}

generateIcons().catch(console.error);
