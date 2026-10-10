/* ══════════════════════════════════════════════
   宝盒 · 主脚本
   - 所有数据保存在浏览器 localStorage（键：baohe.data.v1）
   - 网站更新只改代码，不触碰用户存储，数据不会丢失
   ══════════════════════════════════════════════ */
'use strict';

/* ────────────────────────────────────────────────
   ✏️ 内置任务卡片（作者后续在此补充，留空不影响使用）
   格式：{ id: 'run', name: '跑步', emoji: '🏃', cat: 'sport' }
   cat 取值：study 学习 / sport 体育 / art 文艺 / life 生活 / other 其他
   用户自己创建的卡片保存在本地，与这里互不影响。
   ──────────────────────────────────────────────── */
const BUILTIN_CARDS = [
  { id: 'math-analysis', name: '数学分析', emoji: '📐', cat: 'study' },
  { id: 'linear-algebra', name: '线性代数', emoji: '🔢', cat: 'study' },
  { id: 'vocab', name: '背单词', emoji: '🔤', cat: 'study' },
  { id: 'listening', name: '听听力', emoji: '🎧', cat: 'study' },
  { id: 'eng-read', name: '英语阅读', emoji: '📖', cat: 'study' },
  { id: 'c-lang', name: '学习C语言', emoji: '💻', cat: 'study' },
  { id: 'python', name: '学习Python', emoji: '🐍', cat: 'study' },
  { id: 'books', name: '阅读课外书', emoji: '📚', cat: 'study' },
  { id: 'run', name: '跑步', emoji: '🏃', cat: 'sport' },
  { id: 'badminton', name: '打羽毛球', emoji: '🏸', cat: 'sport' },
  { id: 'early-sleep', name: '早睡', emoji: '🌙', cat: 'life' },
];

/* ────────────────────────────────────────────────
   ✏️ 成就定义（作者后续在此补充）
   格式：{
     id: 'first-card',            唯一标识
     name: '第一张卡',             名称
     icon: '🎖️',                  图标（emoji）
     desc: '收集第一张任务卡片',    描述
     goal: 1,                     目标数值
     progress: s => s.stats.totalCollected   当前进度（s 为全部数据，返回数字）
   }
   达成条件由系统自动判定，用户不可自选。
   ──────────────────────────────────────────────── */
const ACHIEVEMENTS = [
  { id: 'first-shine', name: '金光闪闪', icon: '✨', desc: '获得第一张卡片', goal: 1,
    progress: s => s.stats.totalCollected },
  { id: 'great-start', name: '开门大吉', icon: '🎊', desc: '某一天内完成所有任务', goal: 1,
    progress: s => {
      const t = s.history[todayStr()];
      return (s.todayList.length === 0 && t && t.collected > 0) ? 1 : 0;
    } },
  { id: 'into-box', name: '初入宝盒', icon: '📦', desc: '累计收集 10 张卡片', goal: 10,
    progress: s => s.stats.totalCollected },
  { id: 'hundred', name: '百尺竿头', icon: '📈', desc: '累计收集 100 张卡片', goal: 100,
    progress: s => s.stats.totalCollected },
  { id: 'seven-days', name: '七日之约', icon: '📅', desc: '连续七天完成同一个任务', goal: 7,
    progress: s => {
      const streakOf = anchor => {
        const h = s.history[todayStr(anchor)];
        const ids = h && h.cards ? Object.keys(h.cards) : [];
        let best = 0;
        for (const cid of ids) {
          let n = 0;
          const d = new Date(anchor);
          while (n < 15) {
            const hh = s.history[todayStr(d)];
            if (hh && hh.cards && hh.cards[cid]) { n++; d.setDate(d.getDate() - 1); }
            else break;
          }
          best = Math.max(best, n);
        }
        return best;
      };
      const now = new Date();
      let r = streakOf(now);
      if (r < 7) {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        r = Math.max(r, streakOf(y));
      }
      return Math.min(r, 7);
    } },
  { id: 'triple', name: '一键三连', icon: '🎯', desc: '一天之内完成三个相同类别的任务', goal: 3,
    progress: s => Math.max(0, ...Object.values(s.history).flatMap(h => Object.values(h.cats || {}))) },
  { id: 'umbrella', name: '未雨绸缪', icon: '🌂', desc: '自定义一张任务卡片', goal: 1,
    progress: s => (s.customCards || []).length },
  { id: 'declutter', name: '断舍离', icon: '🗑️', desc: '删除一张自定义任务卡片', goal: 1,
    progress: s => s.stats.deletedCards || 0 },
  { id: 'gem', name: '金石为开', icon: '💎', desc: '收集同一张卡片达到 10 张', goal: 10,
    progress: s => Math.max(0, ...Object.values(s.collection).map(c => c.count)) },
  { id: 'full-house', name: '满堂彩', icon: '🎉', desc: '一天之内完成学习、体育、文艺、生活四种任务', goal: 4,
    progress: s => Math.max(0, ...Object.values(s.history).map(h =>
      ['study', 'sport', 'art', 'life'].filter(c => (h.cats || {})[c] > 0).length)) },
  { id: 'golden-hour', name: '黄金体验', icon: '🌅', desc: '在早上 6-8 点之间完成一张任务', goal: 1,
    progress: s => s.stats.morningCollects || 0 },
  { id: 'calm-night', name: '气定神闲', icon: '🌃', desc: '在晚上 22-24 点之间完成一张任务', goal: 1,
    progress: s => s.stats.nightCollects || 0 },
  { id: 'deadly-rhythm', name: '致命节奏', icon: '🥁', desc: '在「关于作者」界面累计拍拍作者 6 次', goal: 6,
    progress: s => s.stats.avatarPats || 0 },
  { id: 'flush', name: '同花顺', icon: '🃏', desc: '收集 5 张不同的任务卡片', goal: 5,
    progress: s => Object.values(s.collection).filter(c => c.count > 0).length },
  { id: 'royal-flush', name: '皇家同花顺', icon: '👑', desc: '收集 8 张不同的任务卡片', goal: 8,
    progress: s => Object.values(s.collection).filter(c => c.count > 0).length },
  { id: 'sport-five', name: '力拔山兮', icon: '🏋️', desc: '累计收集 5 张体育类卡片', goal: 5,
    progress: s => sumCatCount(s, 'sport') },
  { id: 'study-ten', name: '汗牛充栋', icon: '📚', desc: '累计收集 10 张学习类卡片', goal: 10,
    progress: s => sumCatCount(s, 'study') },
  { id: 'art-five', name: '阳春白雪', icon: '🎻', desc: '累计收集 5 张文艺类卡片', goal: 5,
    progress: s => sumCatCount(s, 'art') },
];

/* 某类别卡片的累计收集总数 */
function sumCatCount(s, cat) {
  return Object.values(s.collection).filter(c => c.cat === cat).reduce((n, c) => n + c.count, 0);
}

/* ─────────── 公告（每次更新在这里追加一条，最新的放最上面） ─────────── */
const ANNOUNCEMENTS = [
  {
    version: '1.2.1',
    date: '2026-10-10',
    title: '集卡特效登场 ✨',
    items: [
      '新增：完成任务时的集卡特效——卡片弹出到屏幕中央、星光闪烁，随后被吸入屏幕底端，伴随翻纸音效',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-10',
    title: '明日任务 · 卡片管理 · 更多成就 🔮',
    items: [
      '新增：「明日任务」——今日清单可翻页到明天，提前部署第二天的任务（明天才可完成），第二天自动接棒为今日清单',
      '新增：初始任务卡片支持删除，删除后可随时在卡片池下方一键恢复',
      '新增：一批新成就等你发现；另调整了部分成就的达成条件',
      '优化：手机端「今日任务」页面操作体验（按钮常显、触控尺寸更合适）',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-09',
    title: '卡片类别 + 初始卡片 + 首批成就 🔓',
    items: [
      '新增：任务卡片类别（学习 / 体育 / 文艺 / 生活 / 其他），今日任务页可按类别筛选，自定义卡片时可选类别',
      '新增：11 张初始任务卡片（学习类 8 张、体育类 2 张、生活类 1 张）',
      '新增：首批 10 个成就（金光闪闪、开门大吉、初入宝盒、百尺竿头、七日之约、一键三连、未雨绸缪、断舍离、金石为开、满堂彩），达成后系统自动解锁',
      '新增：作者微信头像',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-09',
    title: '宝盒正式上线 🎉',
    items: [
      '新增「今日任务」：把任务卡片拖进清单，完成后点击方块打勾，即可收集该卡片',
      '新增「卡片盒」：查看你收集到的全部卡片和数量',
      '新增「成就」：成就系统框架已就位，具体成就将陆续解锁',
      '新增「设置」：提供浅蓝白（默认）、黑白、橙白、粉白四套配色',
      '新增「关于作者」与「公告板」',
      '所有数据保存在你的浏览器本地，无需登录；后续更新不会丢失数据',
    ],
  },
];

/* ─────────── 其他常量 ─────────── */
const STORAGE_KEY = 'baohe.data.v1';
const SCHEMA_VERSION = 1;
const EMOJI_CHOICES = ['📝', '🏃', '📚', '💧', '🧘', '🎸', '🛏️', '🥗', '🧹', '☀️', '💪', '🎯'];

/* ─────────── 卡片类别 ─────────── */
const CATEGORIES = [
  { id: 'study', name: '学习类', emoji: '📖' },
  { id: 'sport', name: '体育类', emoji: '🏅' },
  { id: 'art', name: '文艺类', emoji: '🎨' },
  { id: 'life', name: '生活类', emoji: '🏠' },
  { id: 'other', name: '其他类', emoji: '✨' },
];
function catInfo(catId) {
  return CATEGORIES.find(c => c.id === catId) || CATEGORIES[4];
}
function catOf(card) {
  return card.cat || 'other';
}

const THEMES = [
  { id: 'blue',   name: '浅蓝 · 白', bg: '#edf4fc', primary: '#3b82f6' },
  { id: 'dark',   name: '黑 · 白',   bg: '#121212', primary: '#ffffff' },
  { id: 'orange', name: '橙 · 白',   bg: '#fff7ef', primary: '#f97316' },
  { id: 'pink',   name: '粉 · 白',   bg: '#fdf2f7', primary: '#ec4899' },
];

const PAGE_TITLES = {
  tasks: '今日任务', collection: '卡片盒', achievements: '成就',
  announcements: '公告板', about: '关于作者', settings: '设置',
};

/* ══════════════ 工具函数 ══════════════ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fmtCN(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ══════════════ 数据层 ══════════════ */
function defaultData() {
  return {
    schema: SCHEMA_VERSION,
    createdAt: todayStr(),
    theme: 'blue',
    customCards: [],        // 用户自建卡片模板 [{id,name,emoji,cat,createdAt}]
    hiddenBuiltin: [],      // 用户删除的初始卡片 id（可恢复）
    collection: {},         // cardId -> {count,name,emoji,cat,lastAt}
    todayList: [],          // 当日清单 [{uid,cardId,addedAt}]
    tomorrowList: [],       // 明日清单（提前部署，次日自动接棒）
    todayDate: todayStr(),
    history: {},            // date -> {collected:n, cards:{}, cats:{}}
    stats: {
      totalCollected: 0,
      deletedCards: 0,      // 删除的自定义卡片模板数（断舍离）
      morningCollects: 0,   // 早6-8点完成数（黄金体验）
      nightCollects: 0,     // 晚22-24点完成数（气定神闲）
      avatarPats: 0,        // 拍拍作者次数（致命节奏）
    },
    unlocked: {},           // 成就id -> 解锁日期
    lastReadAnnouncement: '',
  };
}

let memoryFallback = null; // localStorage 不可用时的内存兜底
let storageOK = true;

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const saved = JSON.parse(raw);
    // 合并默认值：新增字段自动补齐，用户数据原样保留
    const merged = Object.assign(defaultData(), saved);
    // stats 单独深合并，保证旧数据升级后也有 deletedCards 等新字段
    merged.stats = Object.assign(
      { totalCollected: 0, deletedCards: 0, morningCollects: 0, nightCollects: 0, avatarPats: 0 },
      saved.stats || {},
    );
    return merged;
  } catch (e) {
    storageOK = false;
    return memoryFallback || defaultData();
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    storageOK = false;
    memoryFallback = state;
  }
}

let state = loadData();

/* 跨天时：今日清单按日清空；若提前部署了明日任务则自动接棒为今日清单 */
function rolloverToday() {
  const today = todayStr();
  if (state.todayDate !== today) {
    state.todayDate = today;
    state.todayList = state.tomorrowList.length ? state.tomorrowList : [];
    state.tomorrowList = [];
    saveData();
  }
}

/* ══════════════ 统计辅助 ══════════════ */
function collectedToday() {
  return (state.history[todayStr()] || {}).collected || 0;
}
function bumpToday() {
  const t = todayStr();
  state.history[t] = state.history[t] || { collected: 0 };
  state.history[t].collected++;
  return state.history[t];
}
/* 记录当日单卡/类别完成情况（供「七日之约 / 一键三连 / 满堂彩」等成就判定） */
function recordDaily(cardId, cat) {
  const h = bumpToday();
  h.cards = h.cards || {};
  h.cards[cardId] = (h.cards[cardId] || 0) + 1;
  h.cats = h.cats || {};
  h.cats[cat] = (h.cats[cat] || 0) + 1;
}
function activeDays() {
  return Object.values(state.history).filter(h => h.collected > 0).length;
}
function streakDays() {
  let streak = 0;
  const d = new Date();
  // 今天还没收集不打断连续记录，从今天（若有）或昨天往前数
  if (!collectedToday()) d.setDate(d.getDate() - 1);
  for (;;) {
    const h = state.history[todayStr(d)];
    if (h && h.collected > 0) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

/* ══════════════ 卡片模板 ══════════════ */
function allCardTemplates() {
  const visible = BUILTIN_CARDS.filter(c => !state.hiddenBuiltin.includes(c.id));
  return [...visible, ...state.customCards];
}
function findTemplate(cardId) {
  return allCardTemplates().find(c => c.id === cardId);
}

/* ══════════════ 主题 ══════════════ */
function applyTheme(themeId) {
  document.documentElement.dataset.theme = themeId;
  state.theme = themeId;
  saveData();
}

/* ══════════════ Toast ══════════════ */
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.remove('hide');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => { el.hidden = true; }, 320);
  }, 2200);
}

/* ══════════════ 模态框 ══════════════ */
function openModal(html) {
  $('#modalBox').innerHTML = html;
  $('#modalBackdrop').hidden = false;
}
function closeModal() {
  $('#modalBackdrop').hidden = true;
  $('#modalBox').innerHTML = '';
}
$('#modalBackdrop')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ══════════════ 页面路由 ══════════════ */
let currentPage = 'tasks';
function showPage(page) {
  currentPage = page;
  $$('.page').forEach(p => { p.hidden = p.id !== `page-${page}`; });
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  document.title = `宝盒 · ${PAGE_TITLES[page]}`;
  renderPage();
  window.scrollTo({ top: 0 });
}
$('#nav').addEventListener('click', e => {
  e.preventDefault();
  const a = e.target.closest('a[data-page]');
  if (a) showPage(a.dataset.page);
});

/* ══════════════ 渲染总入口 ══════════════ */
function renderPage() {
  updateAnnDot();
  switch (currentPage) {
    case 'tasks': renderTasks(); break;
    case 'collection': renderCollection(); break;
    case 'achievements': renderAchievements(); break;
    case 'announcements': renderAnnouncements(); break;
    case 'settings': renderSettings(); break;
    /* about 页面为静态内容，无需渲染 */
  }
}

/* ══════════════ 今日任务页 ══════════════ */
let currentCat = 'all';   // 卡片池当前筛选的类别
let currentDay = 'today'; // 清单当前页：today 今日 / tomorrow 明日

/* 当前页对应的清单数组 */
function listState() {
  return currentDay === 'tomorrow' ? state.tomorrowList : state.todayList;
}

function renderTasks() {
  /* 类别筛选条 */
  const cards = allCardTemplates();
  const countOf = cat => cards.filter(c => catOf(c) === cat).length;
  $('#catFilter').innerHTML =
    `<button class="cat-chip ${currentCat === 'all' ? 'active' : ''}" data-cat="all">全部 ${cards.length}</button>` +
    CATEGORIES.map(c =>
      `<button class="cat-chip ${currentCat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.name.replace('类', '')} ${countOf(c.id)}</button>`
    ).join('');

  /* 卡片池 */
  const pool = $('#cardPool');
  const shown = cards.filter(c => currentCat === 'all' || catOf(c) === currentCat);
  let html = shown.map(c => {
    const ci = catInfo(catOf(c));
    return `
    <div class="task-card" data-card="${esc(c.id)}" title="${esc(ci.name)} · 拖到右侧清单，或点 ＋ 添加">
      <span class="card-cat" title="${esc(ci.name)}">${ci.emoji}</span>
      <button class="card-corner add" data-add="${esc(c.id)}" title="添加到${currentDay === 'tomorrow' ? '明日' : '今日'}清单">＋</button>
      <button class="card-corner del" data-delcard="${esc(c.id)}" title="删除这张卡片">✕</button>
      <span class="card-emoji">${esc(c.emoji)}</span>
      <span class="card-name">${esc(c.name)}</span>
    </div>`;
  }).join('');
  if (shown.length === 0) {
    html = `<div class="empty-state" style="grid-column:1/-1"><span class="empty-emoji">📭</span>这个类别下还没有卡片<br>点下方「自定义」创建一张吧</div>`;
  }
  html += `
    <div class="task-card add-card" id="addCardBtn" title="新建任务卡片">
      <span class="card-emoji"><span class="plus-big">＋</span></span>
      <span class="card-name">自定义</span>
    </div>`;
  pool.innerHTML = html;

  /* 已删除初始卡片的恢复入口 */
  const restoreWrap = $('#restoreBuiltin');
  if (state.hiddenBuiltin.length > 0) {
    restoreWrap.hidden = false;
    restoreWrap.textContent = `↩ 恢复已删除的初始卡片（${state.hiddenBuiltin.length} 张）`;
  } else {
    restoreWrap.hidden = true;
  }

  /* 今日 / 明日 翻页 */
  $('#dayTabs').innerHTML = `
    <button class="day-tab ${currentDay === 'today' ? 'active' : ''}" data-day="today">今日任务</button>
    <button class="day-tab ${currentDay === 'tomorrow' ? 'active' : ''}" data-day="tomorrow">明日任务${state.tomorrowList.length ? ' · ' + state.tomorrowList.length : ''}</button>`;
  $('#listTitle').textContent = currentDay === 'tomorrow' ? '明日任务清单' : '今日任务清单';

  /* 清单 */
  const list = $('#taskList');
  const isTomorrow = currentDay === 'tomorrow';
  const active = listState();
  if (active.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">${isTomorrow ? '🗓️' : '🗒️'}</span>
        ${isTomorrow ? '明天还是空的<br>提前把任务卡片拖进来部署吧' : '今天还是空的<br>把左侧的任务卡片拖进来吧'}
      </div>`;
  } else {
    list.innerHTML = active.map(item => {
      const tpl = findTemplate(item.cardId);
      const snap = state.collection[item.cardId];
      const name = tpl ? tpl.name : snap?.name || '未知任务';
      const emoji = tpl ? tpl.emoji : snap?.emoji || '❓';
      const ci = catInfo(tpl ? catOf(tpl) : (snap?.cat || 'other'));
      return `
      <div class="task-row${isTomorrow ? ' tomorrow' : ''}" data-uid="${esc(item.uid)}">
        <span class="grip" title="拖动排序">⋮⋮</span>
        <button class="checkbox" data-check="${esc(item.uid)}" title="${isTomorrow ? '明天才能完成哦' : '完成任务并收集卡片'}">✓</button>
        <span class="row-name"><span>${esc(emoji)}</span>${esc(name)}</span>
        <span class="row-cat" title="${esc(ci.name)}">${ci.emoji} ${esc(ci.name.replace('类', ''))}</span>
        <button class="row-x" data-remove="${esc(item.uid)}" title="从清单移除">✕</button>
      </div>`;
    }).join('');
  }

  /* 进度 */
  if (isTomorrow) {
    $('#taskProgress').textContent = '明天做不了，只能提前部署';
  } else {
    const done = collectedToday();
    const pending = state.todayList.length;
    $('#taskProgress').textContent = pending > 0 || done > 0
      ? `已完成 ${done} · 待完成 ${pending}`
      : '点击方块完成任务';
  }
}

function isCustomCard(cardId) {
  return state.customCards.some(c => c.id === cardId);
}

function addToList(cardId, index = null) {
  const tpl = findTemplate(cardId);
  if (!tpl) return;
  const target = listState(); // 加到当前翻到的清单页（今日或明日）
  const item = { uid: uid(), cardId, addedAt: Date.now() };
  if (index === null || index >= target.length) target.push(item);
  else target.splice(index, 0, item);
  saveData();
  renderTasks();
}

/* 打勾 → 收集 */
function collectItem(itemUid) {
  const row = $(`.task-row[data-uid="${itemUid}"]`);
  const item = state.todayList.find(i => i.uid === itemUid);
  if (!item) return;
  const tpl = findTemplate(item.cardId);

  const finish = () => {
    const cardId = item.cardId;
    const entry = state.collection[cardId] || {
      count: 0,
      name: tpl ? tpl.name : '未知任务',
      emoji: tpl ? tpl.emoji : '❓',
      cat: 'other',
    };
    const cat = tpl ? catOf(tpl) : (entry.cat || 'other');
    if (tpl) { entry.name = tpl.name; entry.emoji = tpl.emoji; entry.cat = cat; }
    entry.count++;
    entry.lastAt = todayStr();
    state.collection[cardId] = entry;
    state.stats.totalCollected++;
    recordDaily(cardId, cat);
    // 时段计数：早6-8点 / 晚22-24点
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 8) state.stats.morningCollects = (state.stats.morningCollects || 0) + 1;
    if (hour >= 22) state.stats.nightCollects = (state.stats.nightCollects || 0) + 1;
    state.todayList = state.todayList.filter(i => i.uid !== itemUid);
    saveData();
    checkAchievements();
    toast(`✨ 已收集〔${entry.name}〕卡片 ×${entry.count}`);
    renderTasks();
    playCollectFx(entry);
  };

  if (row) {
    row.classList.add('collecting');
    setTimeout(finish, 620);
  } else finish();
}

function removeFromList(itemUid) {
  state.todayList = state.todayList.filter(i => i.uid !== itemUid);
  state.tomorrowList = state.tomorrowList.filter(i => i.uid !== itemUid);
  saveData();
  renderTasks();
}
/* 删除卡片模板时，把两个清单里它的任务行一并移除 */
function purgeListItemRows(cardId) {
  state.todayList = state.todayList.filter(i => i.cardId !== cardId);
  state.tomorrowList = state.tomorrowList.filter(i => i.cardId !== cardId);
}

/* 今日任务页事件（委托） */
$('#page-tasks').addEventListener('click', e => {
  const chip = e.target.closest('[data-cat]');
  if (chip && chip.classList.contains('cat-chip')) {
    currentCat = chip.dataset.cat;
    renderTasks();
    return;
  }
  const dayTab = e.target.closest('[data-day]');
  if (dayTab && dayTab.classList.contains('day-tab')) {
    currentDay = dayTab.dataset.day;
    renderTasks();
    return;
  }
  if (e.target.closest('#restoreBuiltin')) {
    state.hiddenBuiltin = [];
    saveData();
    renderTasks();
    toast('已恢复全部初始卡片');
    return;
  }
  const addBtn = e.target.closest('[data-add]');
  if (addBtn) { addToList(addBtn.dataset.add); return; }
  const delCardBtn = e.target.closest('[data-delcard]');
  if (delCardBtn) {
    const id = delCardBtn.dataset.delcard;
    const isBuiltin = BUILTIN_CARDS.some(c => c.id === id);
    const tpl = allCardTemplates().find(c => c.id === id);
    openModal(`
      <h3>删除卡片模板</h3>
      <p class="modal-text">确定删除「${tpl ? esc(tpl.name) : ''}」吗？<br>${isBuiltin
        ? '初始卡片删除后不再显示，可随时在卡片池下方恢复。'
        : '已收集的历史记录会保留在卡片盒。'}<br>两个清单里它的任务也会一并移除。</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-modal-cancel>取消</button>
        <button class="btn btn-danger" data-modal-delcard-ok="${esc(id)}">删除</button>
      </div>`);
    return;
  }
  const checkBtn = e.target.closest('[data-check]');
  if (checkBtn) {
    if (checkBtn.closest('.task-row').classList.contains('tomorrow')) {
      toast('🛌 这是明天的任务，明天才能完成哦');
      return;
    }
    collectItem(checkBtn.dataset.check);
    return;
  }
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) { removeFromList(removeBtn.dataset.remove); return; }
  if (e.target.closest('#addCardBtn')) openAddCardModal();
});

function openAddCardModal() {
  const picks = EMOJI_CHOICES.map((em, i) =>
    `<button type="button" data-emoji="${em}" class="${i === 0 ? 'picked' : ''}">${em}</button>`).join('');
  const cats = CATEGORIES.map((c, i) =>
    `<button type="button" data-catpick="${c.id}" class="${c.id === 'other' ? 'picked' : ''}">${c.emoji} ${c.name}</button>`).join('');
  openModal(`
    <h3>新建任务卡片</h3>
    <div class="field">
      <label>卡片名称</label>
      <input id="newCardName" maxlength="10" placeholder="例如：跑步（最多 10 个字）">
    </div>
    <div class="field">
      <label>选择图标</label>
      <div class="emoji-picks">${picks}</div>
    </div>
    <div class="field">
      <label>选择类别</label>
      <div class="cat-picks">${cats}</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-cancel>取消</button>
      <button class="btn btn-primary" id="newCardOk">创建</button>
    </div>`);
  $('#newCardName').focus();
}

/* 模态框内事件（委托） */
$('#modalBox').addEventListener('click', e => {
  if (e.target.closest('[data-modal-cancel]')) { closeModal(); return; }
  const emojiBtn = e.target.closest('[data-emoji]');
  if (emojiBtn) {
    $$('#modalBox .emoji-picks button').forEach(b => b.classList.toggle('picked', b === emojiBtn));
    return;
  }
  const catBtn = e.target.closest('[data-catpick]');
  if (catBtn) {
    $$('#modalBox .cat-picks button').forEach(b => b.classList.toggle('picked', b === catBtn));
    return;
  }
  const delOk = e.target.closest('[data-modal-delcard-ok]');
  if (delOk) {
    const id = delOk.dataset.modalDelcardOk;
    if (BUILTIN_CARDS.some(c => c.id === id)) {
      state.hiddenBuiltin.push(id); // 初始卡片只是隐藏，可恢复
    } else {
      state.customCards = state.customCards.filter(c => c.id !== id);
      state.stats.deletedCards = (state.stats.deletedCards || 0) + 1;
    }
    purgeListItemRows(id);
    saveData();
    closeModal();
    renderTasks();
    toast('已删除卡片模板');
    checkAchievements();
    return;
  }
  if (e.target.closest('#newCardOk')) {
    const name = $('#newCardName').value.trim();
    if (!name) { $('#newCardName').focus(); return; }
    const emoji = $('#modalBox .emoji-picks button.picked')?.dataset.emoji || '📝';
    const cat = $('#modalBox .cat-picks button.picked')?.dataset.catpick || 'other';
    state.customCards.push({ id: 'c' + uid(), name, emoji, cat, createdAt: todayStr() });
    saveData();
    closeModal();
    renderTasks();
    toast(`已创建〔${name}〕卡片`);
    checkAchievements();
  }
});
$('#modalBox').addEventListener('keydown', e => {
  if (e.key === 'Enter' && $('#newCardOk') && e.target.id === 'newCardName') $('#newCardOk').click();
});

/* ══════════════ 拖拽系统（鼠标 + 触屏通用） ══════════════ */
let dragCtx = null; // {kind:'pool'|'list', cardId, uid, ghost, started, offX, offY, srcEl}

function startDragCandidate(e, kind, srcEl, payload) {
  dragCtx = { kind, srcEl, started: false, offX: e.clientX, offY: e.clientY, ...payload };
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd, { once: true });
  document.addEventListener('pointercancel', onDragEnd, { once: true });
}

$('#page-tasks').addEventListener('pointerdown', e => {
  if (e.button !== undefined && e.button !== 0) return; // 仅主键
  const card = e.target.closest('.task-card:not(.add-card)');
  if (card && !e.target.closest('.card-corner')) {
    e.preventDefault();
    startDragCandidate(e, 'pool', card, { cardId: card.dataset.card });
    return;
  }
  const grip = e.target.closest('.grip');
  if (grip) {
    e.preventDefault();
    const row = grip.closest('.task-row');
    startDragCandidate(e, 'list', row, { uid: row.dataset.uid });
  }
});

/* 落点判定：清单区含整个右面板（标题、空隙都算），卡片区含整个左面板 */
function inListZone(el) {
  return !!(el && (el.closest('#taskList') || el.closest('#listPanel')));
}
function inPoolZone(el) {
  return !!(el && (el.closest('#cardPool') || el.closest('#poolPanel')));
}

function onDragMove(e) {
  if (!dragCtx) return;
  const dx = e.clientX - dragCtx.offX, dy = e.clientY - dragCtx.offY;
  if (!dragCtx.started) {
    if (Math.hypot(dx, dy) < 8) return;
    dragCtx.started = true;
    const src = dragCtx.srcEl;
    const ghost = src.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = src.offsetWidth + 'px';
    // 让幽灵跟随手指相对卡片的抓取点
    dragCtx.grabX = dragCtx.offX - src.getBoundingClientRect().left;
    dragCtx.grabY = dragCtx.offY - src.getBoundingClientRect().top;
    document.body.appendChild(ghost);
    dragCtx.ghost = ghost;
    src.classList.add('dragging-source');
    document.body.classList.add('dragging-active');
    $('#taskList').classList.add('drop-ready');
  }
  e.preventDefault();
  dragCtx.ghost.style.left = (e.clientX - dragCtx.grabX) + 'px';
  dragCtx.ghost.style.top = (e.clientY - dragCtx.grabY) + 'px';

  /* 高亮落点 & 排序参考线 */
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const list = $('#taskList');
  const rows = $$('.task-row', list);
  list.classList.toggle('drag-over', inListZone(under));
  let marker = $('.drop-marker', list);
  if (inListZone(under)) {
    if (!marker) { marker = document.createElement('div'); marker.className = 'drop-marker'; }
    let target = rows.find(r => {
      const rect = r.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });
    list.insertBefore(marker, target || null);
    dragCtx.dropIndex = target ? listState().findIndex(i => i.uid === target.dataset.uid) : listState().length;
  } else {
    marker?.remove();
    dragCtx.dropIndex = null;
  }
}

function onDragEnd(e) {
  document.removeEventListener('pointermove', onDragMove);
  if (!dragCtx) return;
  const ctx = dragCtx;
  dragCtx = null;
  if (!ctx.started) return; // 只是点击，不算拖拽

  ctx.ghost?.remove();
  ctx.srcEl.classList.remove('dragging-source');
  document.body.classList.remove('dragging-active');
  $('#taskList').classList.remove('drop-ready', 'drag-over');
  $('.drop-marker')?.remove();

  const under = document.elementFromPoint(e.clientX, e.clientY);
  const overList = inListZone(under);
  const overPool = inPoolZone(under);

  if (ctx.kind === 'pool') {
    if (overList) addToList(ctx.cardId, ctx.dropIndex ?? null);
  } else if (ctx.kind === 'list') {
    if (overPool) removeFromList(ctx.uid);
    else if (overList) reorderList(ctx.uid, ctx.dropIndex);
    // 原地松手 = 放回原位，不动作
  }
}

function reorderList(itemUid, newIndex) {
  if (newIndex === null || newIndex === undefined) return;
  const target = listState();
  const oldIndex = target.findIndex(i => i.uid === itemUid);
  if (oldIndex < 0) return;
  const [item] = target.splice(oldIndex, 1);
  // 移除后索引可能偏移，按落点前后修正
  let idx = newIndex;
  if (oldIndex < idx) idx--;
  target.splice(Math.max(0, Math.min(idx, target.length)), 0, item);
  saveData();
  renderTasks();
}

/* ══════════════ 卡片盒页 ══════════════ */
function renderCollection() {
  const entries = Object.values(state.collection).filter(c => c.count > 0);
  const kinds = entries.length;
  const total = state.stats.totalCollected;

  $('#statsStrip').innerHTML = `
    <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">累计收集</div></div>
    <div class="stat-box"><div class="stat-num">${kinds}</div><div class="stat-label">卡片种类</div></div>
    <div class="stat-box"><div class="stat-num">${activeDays()}<span style="font-size:14px"> 天</span></div><div class="stat-label">连续打卡 ${streakDays()} 天</div></div>`;

  if (kinds === 0) {
    $('#collectedGrid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-emoji">🗃️</span>
        卡片盒还是空的<br>完成今日任务后，卡片就会收进这里
      </div>`;
    return;
  }
  entries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
  $('#collectedGrid').innerHTML = entries.map(c => {
    const ci = catInfo(c.cat || 'other');
    return `
    <div class="collect-tile">
      <div class="tile-emoji">${esc(c.emoji)}</div>
      <div class="tile-name">${esc(c.name)}</div>
      <span class="row-cat" style="display:inline-block;margin-top:5px">${ci.emoji} ${esc(ci.name.replace('类', ''))}</span>
      <div><span class="tile-count">× ${c.count}</span></div>
      <div class="tile-last">最近收集 ${fmtCN(c.lastAt)}</div>
    </div>`;
  }).join('');
}

/* ══════════════ 成就页 ══════════════ */
function renderAchievements() {
  const unlocked = ACHIEVEMENTS.filter(a => state.unlocked[a.id]);
  const locked = ACHIEVEMENTS.filter(a => !state.unlocked[a.id]);

  $('#unlockedGrid').innerHTML = unlocked.length ? unlocked.map(tileUnlocked).join('')
    : `<div class="empty-state" style="grid-column:1/-1"><span class="empty-emoji">🏆</span>还没有达成的成就<br>先去完成今日任务吧</div>`;
  $('#lockedGrid').innerHTML = locked.length ? locked.map(tileLocked).join('')
    : `<div class="empty-state" style="grid-column:1/-1"><span class="empty-emoji">🔮</span>成就列表暂未开放<br>敬请期待后续更新</div>`;
}
function tileUnlocked(a) {
  return `
    <div class="ach-tile unlocked">
      <span class="ach-icon">${esc(a.icon)}</span>
      <div class="ach-info">
        <div class="ach-name">${esc(a.name)}</div>
        <div class="ach-desc">${esc(a.desc)}</div>
        <div class="ach-date">🎖️ ${fmtCN(state.unlocked[a.id])} 达成</div>
      </div>
    </div>`;
}
function tileLocked(a) {
  let prog = 0, goal = a.goal || 1;
  try { prog = Math.max(0, a.progress(state) || 0); } catch (_) { /* 进度函数异常不影响展示 */ }
  const pct = Math.min(100, Math.round(prog / goal * 100));
  return `
    <div class="ach-tile locked">
      <span class="ach-icon">${esc(a.icon)}</span>
      <div class="ach-info">
        <div class="ach-name">${esc(a.name)}</div>
        <div class="ach-desc">${esc(a.desc)}</div>
        <div class="ach-progress"><i style="width:${pct}%"></i></div>
        <div class="ach-progress-text">${prog} / ${goal}</div>
      </div>
    </div>`;
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (state.unlocked[a.id]) continue;
    let prog = 0;
    try { prog = a.progress(state) || 0; } catch (_) { continue; }
    if (prog >= (a.goal || 1)) {
      state.unlocked[a.id] = todayStr();
      toast(`🏆 达成成就「${a.name}」！`);
    }
  }
  saveData();
}

/* ══════════════ 公告板页 ══════════════ */
function renderAnnouncements() {
  $('#annList').innerHTML = ANNOUNCEMENTS.map(a => `
    <article class="ann-item">
      <div class="ann-meta">
        <span class="ann-version">v${esc(a.version)}</span>
        <span class="ann-date">${fmtCN(a.date)}</span>
      </div>
      <h3>${esc(a.title)}</h3>
      <ul>${a.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </article>`).join('');
  // 看过公告后去掉导航上的红点
  if (state.lastReadAnnouncement !== ANNOUNCEMENTS[0].version) {
    state.lastReadAnnouncement = ANNOUNCEMENTS[0].version;
    saveData();
    updateAnnDot();
  }
}
function updateAnnDot() {
  $('#annDot').hidden = state.lastReadAnnouncement === ANNOUNCEMENTS[0].version;
}

/* ══════════════ 设置页 ══════════════ */
function renderSettings() {
  $('#themeGrid').innerHTML = THEMES.map(t => `
    <button class="theme-card ${state.theme === t.id ? 'active' : ''}" data-theme-pick="${t.id}">
      <div class="theme-preview">
        <span style="background:${t.bg}"></span>
        <span style="background:${t.primary}"></span>
      </div>
      <div class="theme-name">${esc(t.name)}${state.theme === t.id ? '<span class="theme-check">✓</span>' : ''}</div>
    </button>`).join('');
}

$('#page-settings').addEventListener('click', e => {
  const pick = e.target.closest('[data-theme-pick]');
  if (pick) {
    applyTheme(pick.dataset.themePick);
    renderSettings();
    toast('配色已切换');
    return;
  }
  if (e.target.closest('#exportBtn')) exportData();
  if (e.target.closest('#importBtn')) $('#importFile').click();
  if (e.target.closest('#clearBtn')) confirmClear();
});

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `baohe-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('已导出备份文件');
}

$('#importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (typeof imported !== 'object' || typeof imported.collection !== 'object' || !('schema' in imported)) {
        throw new Error('bad');
      }
      state = Object.assign(defaultData(), imported);
      saveData();
      rolloverToday();
      applyTheme(state.theme);
      renderPage();
      toast('数据导入成功');
    } catch (_) {
      toast('导入失败：文件格式不正确');
    }
  };
  reader.readAsText(file);
});

function confirmClear() {
  openModal(`
    <h3>清空所有数据</h3>
    <p class="modal-text">将删除本浏览器中保存的全部任务、卡片、收集记录与成就，<b>无法恢复</b>。确定继续吗？</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-cancel>取消</button>
      <button class="btn btn-danger" id="clearOk">确认清空</button>
    </div>`);
  $('#clearOk').addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* 忽略 */ }
    state = defaultData();
    saveData();
    closeModal();
    applyTheme('blue');
    renderPage();
    toast('数据已清空');
  });
}

/* ══════════════ 关于作者页 ══════════════ */
$('#copyWechatBtn').addEventListener('click', async () => {
  const text = $('#wechatId').textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
    toast('微信号已复制');
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('微信号已复制'); }
    catch (__) { toast('复制失败，请手动复制'); }
    ta.remove();
  }
});
/* 头像占位：等作者提供真实头像 assets/avatar.jpg 后自动显示 */
$('#avatarImg').addEventListener('error', () => {
  $('#avatarImg').src = 'assets/avatar-placeholder.svg';
});
/* 彩蛋：双击头像 → 轻微晃动，并累计「拍拍」次数 */
$('#avatarImg').addEventListener('dblclick', () => {
  const img = $('#avatarImg');
  img.classList.remove('avatar-shake');
  void img.offsetWidth; // 重置动画
  img.classList.add('avatar-shake');
  state.stats.avatarPats = (state.stats.avatarPats || 0) + 1;
  saveData();
  checkAchievements();
});

/* ══════════════ 集卡特效 ══════════════ */
let fxAudio = null;
/* 合成翻纸音效（轻薄高亮版）：一声、约0.18秒、干脆无沙沙 */
function fxSound() {
  try {
    fxAudio = fxAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (fxAudio.state === 'suspended') fxAudio.resume();
    const t = fxAudio.currentTime;
    const sr = fxAudio.sampleRate;
    const dur = 0.18;
    const buf = fxAudio.createBuffer(1, Math.floor(sr * dur), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const p = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.min(p / 0.055, 1) * Math.pow(1 - p, 1.9);
    }
    const src = fxAudio.createBufferSource();
    src.buffer = buf;
    const bp = fxAudio.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(1200, t + dur);
    const g = fxAudio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(fxAudio.destination);
    src.start(t);
  } catch (e) { /* 音频不可用时静默 */ }
}
/* 卡片弹出屏幕中央（约1秒，周围小星星闪烁，配一声翻纸）→ 被吸入屏幕底端（约0.8秒，无声） */
function playCollectFx(entry) {
  const el = document.createElement('div');
  el.className = 'collect-fx';
  el.innerHTML = `
    <div class="fx-card">
      <div class="fx-emoji">${esc(entry.emoji)}</div>
      <div class="fx-name">${esc(entry.name)}</div>
      <span class="fx-count">× ${entry.count}</span>
    </div>`;
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('span');
    s.className = 'fx-star';
    s.textContent = i % 2 ? '✦' : '✧';
    const ang = Math.random() * Math.PI * 2;
    const dist = 75 + Math.random() * 45;
    s.style.setProperty('--sx', (Math.cos(ang) * dist * 1.3).toFixed(0) + 'px');
    s.style.setProperty('--sy', (Math.sin(ang) * dist * 0.85).toFixed(0) + 'px');
    s.style.animationDelay = (Math.random() * 0.18).toFixed(2) + 's';
    el.appendChild(s);
  }
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.classList.add('pop'); fxSound(); });
  setTimeout(() => { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('suck'); }, 1050);
  setTimeout(() => el.remove(), 1950);
}

/* ══════════════ 初始化 ══════════════ */
function init() {
  rolloverToday();
  applyTheme(state.theme);
  const now = new Date();
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  $('#todayInfo').innerHTML = `<strong>${fmtCN(todayStr())}</strong>星期${week}`;
  $('#footerVersion').textContent = `v${ANNOUNCEMENTS[0].version}`;
  showPage('tasks');
  checkAchievements(); // 升级后回溯检查，老数据已达成的成就自动补发
  if (!storageOK) {
    setTimeout(() => toast('⚠️ 当前浏览器无法保存数据（隐私模式？）'), 800);
  }
}
init();

/* 其他标签页修改数据时同步刷新 */
window.addEventListener('storage', e => {
  if (e.key === STORAGE_KEY) {
    state = loadData();
    rolloverToday();
    applyTheme(state.theme);
    renderPage();
  }
});
