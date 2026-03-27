const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

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

replacements.forEach(r => {
    html = html.replace(r.from, r.to);
});

fs.writeFileSync('index.html', html);
console.log('Class Migration Complete');
