// ============================================
// READING MODE
// ============================================

class ReadingMode {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.isActive = false;
  }

  async toggle() {
    const wv = this.tabManager.getActiveWebview();
    if (!wv) return;

    if (this.isActive) {
      wv.reload();
      this.isActive = false;
      Utils.showNotification('📖 Режим чтения выключен', 2000, 'info');
      return;
    }

    try {
      // Извлекаем контент страницы
      const result = await wv.executeJavaScript(`
        (function() {
          // Пытаемся найти основной контент
          const article = document.querySelector('article') || 
                         document.querySelector('[role="main"]') ||
                         document.querySelector('.post-content') ||
                         document.querySelector('.article-content') ||
                         document.querySelector('.entry-content') ||
                         document.querySelector('main') ||
                         document.querySelector('#content');
          
          const title = document.title;
          const content = article ? article.innerHTML : document.body.innerHTML;
          
          // Получаем текст для оценки времени чтения
          const text = article ? article.textContent : document.body.textContent;
          const wordCount = text.split(/\\s+/).length;
          const readingTime = Math.ceil(wordCount / 200);
          
          return { title, content, wordCount, readingTime };
        })()
      `);

      if (result && result.content) {
        await wv.executeJavaScript(`
          document.documentElement.innerHTML = \`
            <head>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: 'Georgia', 'Times New Roman', serif;
                  background: #1a1a2e;
                  color: #d4d4d8;
                  line-height: 1.8;
                  padding: 40px;
                  max-width: 720px;
                  margin: 0 auto;
                }
                h1, h2, h3 { 
                  font-family: 'Segoe UI', sans-serif; 
                  color: #e6e6e6;
                  margin: 24px 0 12px;
                  line-height: 1.3;
                }
                h1 { font-size: 32px; margin-bottom: 8px; }
                .reading-meta {
                  color: #7c3aed;
                  font-size: 14px;
                  margin-bottom: 32px;
                  padding-bottom: 16px;
                  border-bottom: 1px solid #2a2a3e;
                  font-family: 'Segoe UI', sans-serif;
                }
                p { margin-bottom: 16px; font-size: 18px; }
                img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
                a { color: #7c3aed; }
                code { background: #0d1117; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
                pre { background: #0d1117; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
                blockquote { border-left: 4px solid #7c3aed; padding-left: 16px; margin: 16px 0; color: #a0a0b0; }
                ul, ol { padding-left: 24px; margin-bottom: 16px; }
                li { margin-bottom: 8px; }
                .reading-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 24px;
                }
                .exit-reading {
                  padding: 8px 16px;
                  background: #7c3aed;
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
                  font-family: 'Segoe UI', sans-serif;
                }
                .exit-reading:hover { background: #9333ea; }
                
                /* Progress bar */
                .reading-progress {
                  position: fixed;
                  top: 0;
                  left: 0;
                  height: 3px;
                  background: linear-gradient(90deg, #7c3aed, #3b82f6);
                  transition: width 0.1s;
                  z-index: 1000;
                }
              </style>
            </head>
            <body>
              <div class="reading-progress" id="reading-progress"></div>
              <div class="reading-header">
                <div>📖 Режим чтения</div>
                <button class="exit-reading" onclick="location.reload()">✕ Выйти</button>
              </div>
              <h1>${result.title.replace(/`/g, "'")}</h1>
              <div class="reading-meta">
                📝 ${result.wordCount.toLocaleString()} слов • ⏱ ~${result.readingTime} мин чтения
              </div>
              <div id="reading-content">
                ${result.content.replace(/`/g, "'")}
              </div>
              <script>
                // Progress bar
                window.addEventListener('scroll', () => {
                  const winH = document.documentElement.scrollHeight - window.innerHeight;
                  const progress = (window.scrollY / winH) * 100;
                  document.getElementById('reading-progress').style.width = progress + '%';
                });
              <\/script>
            </body>
          \`;
        `);

        this.isActive = true;
        Utils.showNotification(`📖 Режим чтения • ~${result.readingTime} мин`, 3000, 'success');
      }
    } catch (e) {
      console.error('Reading mode error:', e);
      Utils.showNotification('Не удалось включить режим чтения', 2000, 'error');
    }
  }
}