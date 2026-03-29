// ============================================
// Скрипт генерации иконки и sidebar для установщика
// Запуск: node build/generate-icon.js
// ============================================

const fs = require('fs');
const path = require('path');

// ============================================
// Генерируем SVG иконку
// ============================================
function generateIconSVG() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="50%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
    <linearGradient id="check" x1="60" y1="90" x2="200" y2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e0e0ff"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background circle -->
  <circle cx="128" cy="128" r="120" fill="url(#bg)" filter="url(#shadow)"/>

  <!-- Inner ring -->
  <circle cx="128" cy="128" r="95" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3"/>

  <!-- Orbit ring -->
  <circle cx="128" cy="128" r="75" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"
          stroke-dasharray="8 6"/>

  <!-- Check mark -->
  <path d="M80 128 L110 158 L176 92"
        stroke="url(#check)" stroke-width="16"
        stroke-linecap="round" stroke-linejoin="round"
        fill="none" filter="url(#glow)"/>

  <!-- Small decorative dots -->
  <circle cx="128" cy="45" r="5" fill="rgba(255,255,255,0.6)"/>
  <circle cx="211" cy="128" r="4" fill="rgba(255,255,255,0.4)"/>
  <circle cx="128" cy="211" r="4" fill="rgba(255,255,255,0.4)"/>
  <circle cx="45" cy="128" r="5" fill="rgba(255,255,255,0.6)"/>
</svg>`;
}

// ============================================
// Генерируем HTML для sidebar (потом конвертировать в BMP)
// ============================================
function generateSidebarInfo() {
  return `
╔══════════════════════════════════════╗
║                                      ║
║  Для создания installerSidebar.bmp:  ║
║                                      ║
║  1. Откройте Paint или Photoshop     ║
║  2. Создайте изображение 164x314 px  ║
║  3. Фон: градиент #7c3aed → #4c1d95 ║
║  4. Добавьте логотип Nova Browser    ║
║  5. Сохраните как BMP (24-bit)       ║
║                                      ║
║  Или используйте онлайн конвертер:   ║
║  convertio.co (SVG → BMP)            ║
║                                      ║
╚══════════════════════════════════════╝

Временное решение: установщик будет работать
и без sidebar картинок — просто будет стандартный вид.
`;
}

// ============================================
// Генерируем простой ICO файл (заглушка)
// ============================================
function generateSimpleICO() {
  // Минимальный валидный ICO файл 16x16
  // В реальности нужно использовать png-to-ico конвертер
  console.log('⚠️  Для настоящей иконки используйте конвертер PNG → ICO');
  console.log('   Рекомендуется: https://convertico.com/');
  console.log('   Или установите: npm install -g png-to-ico');
  console.log('   Затем: png-to-ico icon.png > icon.ico');
  console.log('');
  console.log('   Иконка должна содержать размеры: 16, 32, 48, 64, 128, 256');
}

// ============================================
// MAIN
// ============================================

const buildDir = path.join(__dirname);

// Сохраняем SVG
const svgPath = path.join(buildDir, 'icon.svg');
fs.writeFileSync(svgPath, generateIconSVG());
console.log('✅ icon.svg создан:', svgPath);

// Информация
console.log('');
console.log(generateSidebarInfo());
generateSimpleICO();

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Быстрый способ создать icon.ico:');
console.log('');
console.log('   npm install --save-dev electron-icon-builder');
console.log('   npx electron-icon-builder --input=build/icon.png --output=build/');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');