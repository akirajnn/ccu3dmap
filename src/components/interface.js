export function createInterface(root) {
  root.innerHTML = `
    <main id="viewport"></main>
    <header class="brand"><img class="brand-icon university-emblem" src="https://www.ccu.edu.tw/var/file/0/1000/img/1331/emblem.png" alt="國立中正大學校徽" width="48" height="48" /><div><h1>天空之城 中正大學</h1><p>3D 校園導覽</p></div></header>
    <button id="menu" class="mobile-menu" aria-expanded="false" aria-controls="sidebar">探索地標</button>
    <aside id="sidebar" class="panel sidebar" aria-label="校園地標">
      <div class="sidebar-heading"><div><p class="small">一起出發，探索校園</p><h2>島上的每一站</h2></div><span class="count">08</span></div>
      <label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="搜尋校園地標…" aria-label="搜尋校園地標" /></label>
      <div id="landmark-list" class="landmark-list"></div>
      <p class="notice">地標目前皆為示意位置，尚未精確定位。可開啟編輯模式校正。</p>
    </aside>
    <button id="edit-toggle" aria-expanded="false" aria-controls="editor" class="editor-toggle" disabled>地標編輯模式</button>
    <nav class="toolbar panel" aria-label="場景控制"><button id="home" disabled>全島視角</button><span class="divider"></span><label><input id="labels-toggle" type="checkbox" checked />地標</label><label><input id="fps-toggle" type="checkbox" />FPS</label></nav>
    <section id="detail" class="panel detail" hidden aria-label="地標介紹"><button id="close-detail" class="close" aria-label="關閉介紹">×</button><p id="detail-category" class="small"></p><h2 id="detail-name"></h2><p id="detail-description"></p><span id="position-status" class="status"></span><button id="fly" class="primary">前往這一站</button></section>
    <section id="editor" class="panel editor" hidden aria-label="地標編輯器">
      <h2>地標編輯器</h2>
      <p>點模型表面定位，再拖曳彩色箭頭微調。紅 X／綠 Y（高度）／藍 Z。</p>
      <label class="verified"><input id="top-view" type="checkbox" />俯視校正模式</label>
      <p class="small">俯視時可縮放、右鍵或雙指平移；調整 Y 高度可先關閉俯視。</p>
      <label>編輯地標<select id="edit-select"></select></label>
      <div class="coordinates"><label>X<input id="coord-x" type="number" step="0.0001" min="-1000" max="1000" required /></label><label>Y<input id="coord-y" type="number" step="0.0001" min="-1000" max="1000" required /></label><label>Z<input id="coord-z" type="number" step="0.0001" min="-1000" max="1000" required /></label></div>
      <output id="draft-status" class="small" aria-live="polite">目前為已保存座標</output>
      <button id="discard-draft" class="text-button">還原未保存調整</button>
      <label class="verified"><input id="verified" type="checkbox" />我已人工確認此位置</label>
      <div class="editor-actions"><button id="apply" class="primary">套用座標</button><button id="export">匯出 JSON</button></div>
      <p class="small">按套用後自動保存在此瀏覽器。匯出僅包含已套用的座標。</p>
      <button id="reset" class="text-button">重設為專案預設位置</button>
    </section>
    <footer class="scene-footer"><span class="live-dot"></span><span>慢慢探索，讓好奇心領路</span><span class="instructions">拖曳旋轉 · 滾輪縮放 · 右鍵平移</span></footer>
    <output id="fps" hidden class="fps panel"></output><output id="message" class="message" role="status" aria-live="polite"></output>
    <div id="loading" class="loading"><div class="panel loading-card"><img class="loading-icon university-emblem" src="https://www.ccu.edu.tw/var/file/0/1000/img/1331/emblem.png" alt="國立中正大學校徽" width="64" height="64" /><h2>天空之城 中正大學</h2><p id="loading-text">正在準備天空之城…</p><progress id="progress" max="1" value="0"></progress><button id="retry" hidden>重新載入</button></div></div>
  `;
  return id => document.getElementById(id);
}
