import './styles.css';
import initialLandmarks from './data/landmarks.json';
import modelUrl from '../island+city+3d+model.glb?url';
import { CampusScene } from './scene/CampusScene.js';
import { createInterface } from './components/interface.js';

const element = createInterface(document.getElementById('app'));
const storageKey = 'ccu-sky-landmarks-v1';
let landmarks = structuredClone(initialLandmarks);
let selectedId = landmarks[0].id;
let editing = false;
let ready = false;
let messageTimeout;

function validLandmarks(value) {
  return Array.isArray(value) && value.length === initialLandmarks.length && initialLandmarks.every(original => {
    const item = value.find(candidate => candidate.id === original.id);
    return item && typeof item.name === 'string' && typeof item.description === 'string' && typeof item.category === 'string' && Array.isArray(item.position) && item.position.length === 3 && item.position.every(Number.isFinite);
  });
}

try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (validLandmarks(stored)) landmarks = stored;
} catch {}

function notify(message) {
  element('message').textContent = message;
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => { element('message').textContent = ''; }, 5500);
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(landmarks)); }
  catch { notify('瀏覽器無法保存，請匯出 JSON 保留變更。'); }
}

function current() { return landmarks.find(landmark => landmark.id === selectedId); }

function renderList() {
  const query = element('search').value.trim().toLocaleLowerCase();
  const list = element('landmark-list');
  list.replaceChildren();
  landmarks.forEach((landmark, index) => {
    if (!`${landmark.name}${landmark.category}`.toLocaleLowerCase().includes(query)) return;
    const button = document.createElement('button');
    button.className = `landmark-item${(!editing && element('detail').hidden) || landmark.id !== selectedId ? '' : ' active'}`;
    button.disabled = !ready;
    const number = document.createElement('span');
    number.className = 'landmark-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = landmark.name;
    const category = document.createElement('small');
    category.textContent = landmark.category;
    title.append(name, category);
    const arrow = document.createElement('span');
    arrow.className = 'item-arrow';
    arrow.textContent = '↗';
    button.append(number, title, arrow);
    button.addEventListener('click', () => select(landmark.id));
    list.append(button);
  });
  if (!list.children.length) list.textContent = '找不到符合的地標，試試其他名稱。';
}

function syncEditor() {
  const landmark = current();
  element('edit-select').value = selectedId;
  ['x', 'y', 'z'].forEach((axis, index) => { element(`coord-${axis}`).value = landmark.position[index]; });
  element('verified').checked = landmark.provisional === false;
  if (editing) scene.setEditorTarget(selectedId, landmark.position);
  element('draft-status').textContent = '目前為已保存座標';
}

function renderDetail() {
  const landmark = current();
  element('detail-name').textContent = landmark.name;
  element('detail-category').textContent = landmark.category;
  element('detail-description').textContent = landmark.description;
  element('position-status').textContent = landmark.provisional !== false ? '示意位置 · 尚待校正' : '位置已由使用者人工確認';
}

function refreshMarkers() { scene.setLandmarks(landmarks, select, !editing && element('detail').hidden ? null : selectedId); }

function updateDraft(position) {
  ['x', 'y', 'z'].forEach((axis, index) => { element(`coord-${axis}`).value = position[index]; });
  scene.setEditorTarget(selectedId, position);
  element('draft-status').textContent = '尚未保存 · 按「套用座標」保存';
}

function select(id, fly = true) {
  selectedId = id;
  element('detail').hidden = editing;
  renderDetail();
  syncEditor();
  renderList();
  refreshMarkers();
  if (fly && !editing) scene.focus(current().position);
  if (matchMedia('(max-width: 700px)').matches) {
    element('sidebar').classList.remove('open');
    element('menu').setAttribute('aria-expanded', 'false');
  }
}

let scene;
try {
  scene = new CampusScene(element('viewport'), {
    progress(value) {
      if (value === null) element('progress').removeAttribute('value');
      else element('progress').value = value;
      element('loading-text').textContent = value === null ? '正在下載模型…' : `正在下載模型 ${Math.round(value * 100)}% · 接著解析貼圖`;
    },
    loaded(info) {
      ready = true;
      element('loading').hidden = true;
      element('home').disabled = false;
      element('edit-toggle').disabled = false;
      renderList();
      refreshMarkers();
      console.info('模型分析：原始尺寸、中心、正規化倍率、Mesh 數', info);
    },
    fps(value) { if (!element('fps').hidden) element('fps').textContent = `${value} FPS`; },
    move(position) { if (editing) updateDraft(position); },
    pick(position) {
      notify(`模型表面座標 [${position.join(', ')}]${editing ? ' · 已帶入編輯器，按套用以保存' : ''}`);
      if (editing) updateDraft(position);
    }
  });
  scene.load(modelUrl).catch(showError);
} catch (error) { showError(error); }

function showError(error) {
  element('loading-text').textContent = `無法載入 3D 校園：${error.message}。請確認 GLB 檔案及瀏覽器 WebGL 支援。`;
  element('progress').hidden = true;
  element('retry').hidden = false;
  console.error(error);
}

landmarks.forEach(landmark => {
  const option = document.createElement('option');
  option.value = landmark.id;
  option.textContent = landmark.name;
  element('edit-select').append(option);
});
renderList();
syncEditor();
element('retry').onclick = () => location.reload();
element('search').oninput = renderList;
element('home').onclick = () => { scene.setTopView(false); element('top-view').checked = false; scene.overview(); element('detail').hidden = true; renderList(); refreshMarkers(); if (editing) scene.previewEditorMarker(); };
element('fly').onclick = () => scene.focus(current().position);
element('close-detail').onclick = () => { element('detail').hidden = true; renderList(); refreshMarkers(); };
element('labels-toggle').onchange = event => { if (scene) scene.markers.visible = event.target.checked; };
element('fps-toggle').onchange = event => { element('fps').hidden = !event.target.checked; };
element('menu').onclick = () => {
  const open = element('sidebar').classList.toggle('open');
  element('menu').setAttribute('aria-expanded', String(open));
};
element('edit-toggle').onclick = () => {
  editing = !editing;
  element('editor').hidden = !editing;
  element('detail').hidden = true;
  element('edit-toggle').setAttribute('aria-expanded', String(editing));
  element('edit-toggle').textContent = editing ? '結束編輯模式' : '地標編輯模式';
  document.body.classList.toggle('editing', editing);
  scene.setEditorEnabled(editing, selectedId, current().position);
  element('top-view').checked = false;
  refreshMarkers();
  renderList();
  if (editing) { syncEditor(); notify('點表面定位，或拖曳 XYZ 軸微調；按套用保存。'); }
};
element('top-view').onchange = event => scene.setTopView(event.target.checked);
element('discard-draft').onclick = () => { refreshMarkers(); syncEditor(); };
['x', 'y', 'z'].forEach(axis => {
  element(`coord-${axis}`).oninput = () => {
    const inputs = ['x', 'y', 'z'].map(name => element(`coord-${name}`));
    if (inputs.some(input => input.value === '' || !input.validity.valid)) return;
    const position = inputs.map(input => Number(input.value));
    if (position.every(value => Number.isFinite(value) && Math.abs(value) <= 1000)) {
      scene.setEditorTarget(selectedId, position);
      element('draft-status').textContent = '尚未保存 · 按「套用座標」保存';
    }
  };
});
element('edit-select').onchange = event => select(event.target.value, false);
element('apply').onclick = () => {
  const inputs = ['x', 'y', 'z'].map(axis => element(`coord-${axis}`));
  if (inputs.some(input => !input.reportValidity() || input.value.trim() === '')) return;
  const position = inputs.map(input => Number(input.value));
  if (!position.every(Number.isFinite) || position.some(value => Math.abs(value) > 1000)) { notify('請輸入 -1000 至 1000 的有效座標。'); return; }
  current().position = position;
  current().provisional = !element('verified').checked;
  save();
  refreshMarkers();
  renderDetail();
  syncEditor();
  notify(`已保存「${current().name}」的位置。`);
};
element('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(landmarks, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'landmarks.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('已匯出 landmarks.json。');
};
element('reset').onclick = () => {
  if (!confirm('將清除此瀏覽器的地標修改，恢復專案預設位置？')) return;
  landmarks = structuredClone(initialLandmarks);
  save();
  syncEditor();
  renderList();
  if (ready) refreshMarkers();
  notify('已恢復專案預設位置。');
};
window.addEventListener('pagehide', event => { if (!event.persisted) scene?.dispose(); });
if (import.meta.hot) import.meta.hot.dispose(() => { clearTimeout(messageTimeout); scene?.dispose(); });
