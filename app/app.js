// Leonida Trophy Guide: checklist + roadmap + missables, all state in localStorage.
// Data lives in data/trophies.json (official names/descriptions/grades plus our own
// guides, kinds, missable flags, roadmap stages and named sources). No network use:
// the only fetch is the local JSON file, and nothing else leaves the browser.
const KEY = 'gta6-trophy-guide-v1';
const PREFS = 'gta6-trophy-guide-prefs-v1';

const listEl = document.getElementById('view-checklist');
const roadmapEl = document.getElementById('roadmap');
const missableEl = document.getElementById('missableList');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoilers');
const hideEarnedEl = document.getElementById('hideEarned');

let earned = new Set(loadJson(KEY, []));
let prefs = loadJson(PREFS, { kind: 'all', grade: 'all', spoilers: false, hideEarned: false, view: 'checklist', open: null });
let trophies = [];

function loadJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback; }
  catch { return fallback; }
}
function saveEarned() { localStorage.setItem(KEY, JSON.stringify([...earned])); }
function savePrefs() { localStorage.setItem(PREFS, JSON.stringify(prefs)); }

function gradeLabel(t) { return t.grade.charAt(0).toUpperCase() + t.grade.slice(1); }
function isStory(t) { return t.kind === 'story'; }
function isSpoilerHidden(t) { return prefs.spoilers && isStory(t) && !earned.has(t.name); }
function kindLabel(t) { return t.kind === 'platinum' ? 'Platinum' : t.kind; }

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (prefs.kind === 'missable' && !t.missable) return false;
    if (prefs.kind !== 'all' && prefs.kind !== 'missable' && t.kind !== prefs.kind) return false;
    if (prefs.grade !== 'all' && t.grade !== prefs.grade) return false;
    if (prefs.hideEarned && earned.has(t.name)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + (t.guide || '')).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderProgress() {
  const total = trophies.length || 55;
  const n = earned.size;
  document.getElementById('progressText').textContent = n + ' of ' + total + ' earned';
  document.getElementById('progressPct').textContent = Math.round((n / total) * 100) + '%';
  document.getElementById('progressFill').style.width = ((n / total) * 100) + '%';
  const counts = {};
  for (const t of trophies) counts[t.grade] = (counts[t.grade] || 0) + (earned.has(t.name) ? 1 : 0);
  const totals = {};
  for (const t of trophies) totals[t.grade] = (totals[t.grade] || 0) + 1;
  document.getElementById('gradeCounts').textContent =
    ['platinum', 'gold', 'silver', 'bronze'].map((g) => gradeLabel({ grade: g }) + ' ' + (counts[g] || 0) + '/' + (totals[g] || 0)).join('  ·  ');
}

function guideHtml(t) {
  const steps = (t.steps || []).map((s) => '<li>' + escapeHtml(s) + '</li>').join('');
  const srcs = (t.sources || []).map(escapeHtml).join(' &middot; ');
  return '<div class="guide"><h4>Guide — in our own words</h4><p>' + escapeHtml(t.guide) + '</p>'
    + (steps ? '<ol>' + steps + '</ol>' : '')
    + (t.whenMissed ? '<p><b>When it can be missed:</b> ' + escapeHtml(t.whenMissed) + '</p>' : '')
    + '<p class="sources"><b>Sources:</b> ' + srcs + '</p></div>';
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trophyCard(t) {
  const card = document.createElement('article');
  card.className = 'card' + (earned.has(t.name) ? ' earned' : '');
  const head = document.createElement('div');
  head.className = 'cardhead';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  box.addEventListener('change', (ev) => {
    ev.stopPropagation();
    if (box.checked) earned.add(t.name); else earned.delete(t.name);
    saveEarned(); renderAll();
  });
  const mid = document.createElement('div');
  const hidden = isSpoilerHidden(t);
  const nameHtml = hidden ? 'Hidden story trophy — earn it to reveal' : escapeHtml(t.name) + (t.count ? ' <span class="count">(' + t.count + ')</span>' : '');
  const descHtml = hidden ? 'Story spoiler hidden. Turn off “Hide story spoilers” or earn this trophy to see its name and description.' : escapeHtml(t.description);
  mid.innerHTML = '<div class="tname">' + nameHtml + '</div><div class="tdesc">' + descHtml + '</div>';
  const badge = document.createElement('span');
  badge.className = 'badge ' + t.grade;
  badge.textContent = gradeLabel(t);
  const tags = document.createElement('div');
  tags.className = 'tags';
  tags.innerHTML = '<span class="tag">' + escapeHtml(kindLabel(t)) + '</span>'
    + (t.missable ? '<span class="tag miss">Missable</span>' : '')
    + (isStory(t) ? '<span class="tag spoiler">Story</span>' : '');
  head.append(box, mid, badge, tags);
  head.addEventListener('click', (ev) => {
    if (ev.target === box) return;
    prefs.open = prefs.open === t.name ? null : t.name;
    savePrefs(); renderAll();
  });
  card.append(head);
  if (prefs.open === t.name) {
    const g = document.createElement('div');
    g.innerHTML = guideHtml(t);
    card.append(g.firstChild);
  }
  return card;
}

function renderChecklist() {
  listEl.replaceChildren();
  if (prefs.kind === 'online') {
    const d = document.createElement('div');
    d.className = 'empty';
    d.innerHTML = '<h3>No online trophies</h3><p>Every one of the 55 trophies in the official list is earned in single-player. There is nothing to track under Online — the filter is here so you can check that for yourself.</p><p class="sources"><b>Sources:</b> Exophase — GTA VI trophy list &middot; PSNProfiles — Grand Theft Auto VI trophy list</p>';
    listEl.append(d);
    return;
  }
  const shown = visibleTrophies();
  if (!shown.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'No trophies match this filter. Try clearing the search or choosing another kind.';
    listEl.append(d);
    return;
  }
  for (const t of shown) listEl.append(trophyCard(t));
}

const ROADMAP = [
  { title: 'Play the story — Chapters 1–4 and the final mission', text: 'Finish “Gone Fishing”, then Chapters 1, 2, 3 and 4, then the final mission. The descriptions name the missions “Breakfast Run”, “The Cartel Heist”, “Child’s Play”, “Headliners”, “VCIA Takedown” and “Operation Savage Glory” — each one is its own trophy, so none of them can be missed by playing the story through.', ids: ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Vice City, Baby!', 'Top Of The World, Ma', 'Trust', 'Break the Bank', 'Family Matters', 'DWNFALL', 'Hi-Jacked', 'Snow Storm', 'You Gotta Know When to Get Off'] },
  { title: 'Side strands as they open', text: 'Finish the final mission for Andy, Kenton, Billy, Randy and Tyrone, and complete 8 stranger mission strands across Leonida. The descriptions name the characters, not the mission order — do each strand when its missions appear, before the story moves on.', ids: ['Road to Rehabilitation', 'This Was No Boat Accident', 'The Lone Rider', 'Supply & Demand', 'Spin On This!', 'Strangers & Freaks'] },
  { title: 'Collectibles sweep', text: 'Complete 3 Collectible Card sets, WAiNK It at 100 locations, discover 100 vehicles, explore all 52 areas of Leonida, buy all 8 garage properties, register 10 vehicles to the Scooter Bros app, and meditate at all 18 spots. Counts come from the official descriptions; the exact spots are unconfirmed until release, so work from the in-game collectible trackers as you go.', ids: ["Don't Touch My Deck", 'You WAiNKer!', 'Whip It Good', 'The Goodtime State', 'Little Boxes', 'On the Spot', 'Positive Mental Attitude'] },
  { title: 'Activities and challenges', text: 'Try each activity type once, then go deep: 250 stunts, gold in all 42 Shooting Range challenges, a Top Fun Drone Race win at every location, 20 different race wins, a fishing win over Cal, one arcade game, 50 challenges, a bowling follow-through, and a hunted unique animal for Bret.', ids: ['Master of None', 'Cunning Stunts', 'The Shootist', 'Top Fun', 'Earn Cash, Not Kudos', 'Baited My Tackle', 'Stick Fiddler', 'One Last Thing', 'Let’s Go Bowling', 'Fair Game'] },
  { title: 'Open-world crime and one-off moments', text: 'Partner robberies and escapes (shops, bank vaults, armored truck, gang operations), Combat Focus, the VCIA departure, the tank, the jewelry store, and the money goals — $250,000 laundered, $100,000 spent. Several of these are one-attempt conditions: read the Missable tab before you try them.', ids: ['Hot Together', 'Retail Therapy', 'Gunslinger', 'Catch Me If You Can', 'Challenging Tank', 'Sneakthief', 'Maximum Withdrawal', 'A Classic Blitz Play', 'Pest Control', 'Dime on the Dollar', 'Treat Yo Self'] },
  { title: 'The cryptic ones, then 100% and Platinum', text: '“In The Beginning…”, “Capital Offense”, “Personal Best”, “Actions Speak Louder”, “Bad Luck, I Guess”, “The Truth Is Out There” and “Ten Pin” have descriptions that do not spell out how they unlock — follow their guides, which say so plainly. Last: reach 100% completion for “A Long Road” (gold), and the Platinum “Vice Got a Price!” pops with the final trophy.', ids: ['In The Beginning…', 'Capital Offense', 'Personal Best', 'Actions Speak Louder', 'Bad Luck, I Guess', 'The Truth Is Out There', 'Ten Pin', 'A Long Road', 'Vice Got a Price!'] },
];

function renderRoadmap() {
  roadmapEl.replaceChildren();
  for (const stage of ROADMAP) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const name of stage.ids) {
      const t = trophies.find((x) => x.name === name);
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = (t && earned.has(t.name) ? '✓ ' : '') + name;
      chips.append(c);
    }
    li.append(h, p, chips);
    roadmapEl.append(li);
  }
}

function renderMissables() {
  missableEl.replaceChildren();
  const list = trophies.filter((t) => t.missable);
  for (const t of list) {
    const card = trophyCard(t);
    missableEl.append(card);
  }
  if (!list.length) missableEl.textContent = 'No missable trophies flagged.';
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderRoadmap();
  renderMissables();
}

function showView(name) {
  prefs.view = name;
  savePrefs();
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.view === name);
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== 'view-' + name;
  document.getElementById('controls').style.display = name === 'checklist' || name === 'missables' ? '' : 'none';
  document.getElementById('hint').style.display = name === 'checklist' ? '' : 'none';
}

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
document.querySelectorAll('.kind').forEach((b) => b.addEventListener('click', () => {
  prefs.kind = b.dataset.kind;
  savePrefs();
  document.querySelectorAll('.kind').forEach((x) => x.classList.toggle('active', x === b));
  renderChecklist();
}));
searchEl.addEventListener('input', renderChecklist);
gradeEl.addEventListener('change', () => { prefs.grade = gradeEl.value; savePrefs(); renderChecklist(); });
spoilerEl.addEventListener('change', () => { prefs.spoilers = spoilerEl.checked; savePrefs(); renderAll(); });
hideEarnedEl.addEventListener('change', () => { prefs.hideEarned = hideEarnedEl.checked; savePrefs(); renderChecklist(); });

document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set((names || []).filter((n) => known.has(n)));
    saveEarned(); renderAll();
  } catch { alert('That file is not a valid progress export.'); }
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) { earned = new Set(); saveEarned(); renderAll(); }
});

// Restore saved preferences, then load the trophy data.
searchEl.value = '';
gradeEl.value = prefs.grade;
spoilerEl.checked = prefs.spoilers;
hideEarnedEl.checked = prefs.hideEarned;
document.querySelectorAll('.kind').forEach((x) => x.classList.toggle('active', x.dataset.kind === prefs.kind));
const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
showView(prefs.view || 'checklist');
renderAll();
