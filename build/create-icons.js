// ============================================
// Автоматическое создание иконки через Canvas
// Запуск: node build/create-icons.js
// ============================================

const fs = require('fs');
const path = require('path');

// Создаём простой PPM файл (можно конвертировать в ICO)
// Для полноценной иконки лучше использовать electron-icon-builder

function createPlaceholderIcon() {
  const buildDir = __dirname;

  // Создаём SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="48" fill="url(#g1)"/>
  <circle cx="128" cy="128" r="80" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
  <path d="M85 128 L115 158 L171 102" stroke="white" stroke-width="14"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

  fs.writeFileSync(path.join(buildDir, 'icon.svg'), svg);
  console.log('✅ build/icon.svg создан');

  // Создаём PNG placeholder инструкции
  console.log('');
  console.log('🎨 Для создания icon.ico выполните:');
  console.log('');
  console.log('   Способ 1 (онлайн):');
  console.log('   → Откройте https://convertico.com');
  console.log('   → Загрузите build/icon.svg');
  console.log('   → Скачайте .ico и положите в build/icon.ico');
  console.log('');
  console.log('   Способ 2 (автоматически):');
  console.log('   → npm install --save-dev electron-icon-builder');
  console.log('   → Сначала конвертируйте SVG в PNG (1024x1024)');
  console.log('   → npx electron-icon-builder --input=build/icon.png --output=build/icons/');
  console.log('');

  // Проверяем есть ли icon.ico
  const icoPath = path.join(buildDir, 'icon.ico');
  if (!fs.existsSync(icoPath)) {
    console.log('⚠️  icon.ico не найден. Установщик будет использовать стандартную иконку Electron.');
    console.log('   Создайте иконку одним из способов выше.');
  } else {
    console.log('✅ icon.ico найден!');
  }
}

createPlaceholderIcon();