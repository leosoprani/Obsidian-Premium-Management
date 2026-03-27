const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// The block to remove: CDN script, tailwind-config script, and the <style> block
// Let's use regex to find and extract them.

// 1. Remove CDN script
html = html.replace(/<script src="https:\/\/cdn\.tailwindcss\.com[^>]*><\/script>/g, '');

// 2. Remove tailwind config script block
html = html.replace(/<script id="tailwind-config">[\s\S]*?<\/script>/, '');

// 3. Extract and remove <style> block
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
let cssContent = '';
if (styleMatch) {
    cssContent = styleMatch[1];
    html = html.replace(styleMatch[0], '<link rel="stylesheet" href="/css/output.css">');
}

// Ensure the directory exists
if (!fs.existsSync('src')){
    fs.mkdirSync('src');
}

// Create input.css
const inputCss = `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
${cssContent}
}
`;

fs.writeFileSync('src/input.css', inputCss);
fs.writeFileSync('index.html', html);
console.log('Extraction complete! Check src/input.css and index.html');
