const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'js');
const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.js'));

const replacements = [
    { from: /\bbg-gray-50\b/g, to: 'bg-surface-container-high' },
    { from: /\bbg-gray-100\b/g, to: 'bg-surface-variant' },
    { from: /\bbg-white\b/g, to: 'bg-surface-container' },
    { from: /\btext-gray-800\b/g, to: 'text-on-surface' },
    { from: /\btext-gray-700\b/g, to: 'text-on-surface' },
    { from: /\btext-gray-600\b/g, to: 'text-on-surface-variant' },
    { from: /\btext-gray-500\b/g, to: 'text-outline' },
    { from: /\bborder-gray-200\b/g, to: 'border-outline-variant/20' },
    { from: /\bborder-gray-300\b/g, to: 'border-outline-variant/30' },
    { from: /\bborder-gray-700\b/g, to: 'border-outline-variant/20' },
    { from: /\bdark:bg-gray-800\b/g, to: 'bg-surface-container' },
    { from: /\bdark:border-gray-700\b/g, to: 'border-outline-variant/20' },
    { from: /\bdark:border-gray-600\b/g, to: 'border-outline-variant/20' },
    { from: /\bdark:text-gray-200\b/g, to: 'text-on-surface' },
    { from: /\bdark:text-white\b/g, to: 'text-white' },
];

files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    let jsContent = fs.readFileSync(filePath, 'utf8');
    replacements.forEach(r => {
        jsContent = jsContent.replace(r.from, r.to);
    });
    fs.writeFileSync(filePath, jsContent);
    console.log(`Migrated ${file}`);
});
console.log('Class Migration Complete for all JS files');
