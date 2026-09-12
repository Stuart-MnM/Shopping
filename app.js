// app.js

// --- Data model in localStorage ---
const STORAGE_KEY = 'shoppingAppData';

let data = {
  categories: [
    { id: 'veg', name: 'Vegetables' },
    { id: 'dairy', name: 'Dairy' },
    { id: 'clean', name: 'Cleaning' }
  ],
  items: [
    { id: 'milk', name: 'Milk', categoryId: 'dairy', alwaysBuy: true },
    { id: 'bread', name: 'Bread', categoryId: 'dairy', alwaysBuy: true },
    { id: 'eggs', name: 'Eggs', categoryId: 'dairy', alwaysBuy: false }
  ],
  todayList: [],          // [{itemId, name, bought:false}]
  previousLists: [],      // [{date, durationSeconds, items:[...]}]
  lastUnboughtItems: [],  // item names from last trip not bought
  trip: {
    active: false,
    startTime: null,
    durationSeconds: 0
  },
  stats: {
    totalTrips: 0,
    totalSeconds: 0,
    longestSeconds: 0,
    shortestSeconds: 0
  }
};

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    data = JSON.parse(saved);
  } else {
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Screen navigation ---
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// --- Render functions ---
function renderCategories() {
  const container = document.getElementById('categories-container');
  container.innerHTML = '';
  data.categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'panel';
    const h = document.createElement('h3');
    h.textContent = cat.name;
    div.appendChild(h);

    const ul = document.createElement('ul');
    data.items
      .filter(i => i.categoryId === cat.id)
      .forEach(item => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = `Add: ${item.name}`;
        btn.onclick = () => addItemToTodayList(item);
        li.appendChild(btn);
        ul.appendChild(li);
      });

    div.appendChild(ul);
    container.appendChild(div);
  });
}

function renderTodayList() {
  const ul = document.getElementById('today-list');
  ul.innerHTML = '';
  data.todayList.forEach((entry, index) => {
    const li = document.createElement('li');
    li.textContent = entry.name + ' ';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
      data.todayList.splice(index, 1);
      saveData();
      renderTodayList();
    };
    li.appendChild(removeBtn);
    ul.appendChild(li);
  });
}

function renderTripList() {
  const ul = document.getElementById('trip-list');
  ul.innerHTML = '';
  data.todayList.forEach((entry, index) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    label.textContent = entry.name;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!entry.bought;
    checkbox.onchange = () => {
      entry.bought = checkbox.checked;
      saveData();
    };
    label.appendChild(checkbox);
    li.appendChild(label);
    ul.appendChild(li);
  });
}

function renderForgotten() {
  const ul = document.getElementById('forgotten-list');
  ul.innerHTML = '';
  data.lastUnboughtItems.forEach(name => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = `Add: ${name}`;
    btn.onclick = () => {
      addItemToTodayList({ id: name.toLowerCase(), name });
    };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function renderStats() {
  const p = document.getElementById('stats-summary');
  const s = data.stats;
  if (s.totalTrips === 0) {
    p.textContent = 'No trips yet.';
    return;
  }
  const avg = Math.round(s.totalSeconds / s.totalTrips);
  p.textContent =
    `Trips: ${s.totalTrips} | Avg: ${formatSeconds(avg)} | ` +
    `Shortest: ${formatSeconds(s.shortestSeconds)} | Longest: ${formatSeconds(s.longestSeconds)}`;
}

function renderPreviousLists() {
  const ul = document.getElementById('previous-lists');
  ul.innerHTML = '';
  data.previousLists.forEach(list => {
    const li = document.createElement('li');
    li.textContent = `${list.date} – ${formatSeconds(list.durationSeconds)} – Items: ${list.items.map(i => i.name).join(', ')}`;
    ul.appendChild(li);
  });
}

function renderManage() {
  const select = document.getElementById('category-select');
  select.innerHTML = '';
  data.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });

  const container = document.getElementById('manage-items-container');
  container.innerHTML = '';
  data.categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'panel';
    const h = document.createElement('h3');
    h.textContent = cat.name;
    div.appendChild(h);

    const ul = document.createElement('ul');
    data.items
      .filter(i => i.categoryId === cat.id)
      .forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.name + (item.alwaysBuy ? ' (Always)' : '');
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => {
          data.items = data.items.filter(x => x.id !== item.id);
          saveData();
          renderManage();
        };
        li.appendChild(delBtn);
        ul.appendChild(li);
      });

    div.appendChild(ul);
    container.appendChild(div);
  });
}

// --- Helpers ---
function addItemToTodayList(item) {
  // Avoid duplicates by name
  if (!data.todayList.some(e => e.name === item.name)) {
    data.todayList.push({ itemId: item.id, name: item.name, bought: false });
    saveData();
    renderTodayList();
  }
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- Trip timer ---
let tripTimerInterval = null;

function startTrip() {
  if (data.trip.active) return;
  data.trip.active = true;
  data.trip.startTime = Date.now();
  data.trip.durationSeconds = 0;
  saveData();
  showScreen('trip-screen');
  renderTripList();
  tripTimerInterval = setInterval(() => {
    const diff = Math.floor((Date.now() - data.trip.startTime) / 1000);
    data.trip.durationSeconds = diff;
    document.getElementById('trip-time').textContent = formatSeconds(diff);
  }, 1000);
}

function stopTrip() {
  if (!data.trip.active) return;
  clearInterval(tripTimerInterval);
  tripTimerInterval = null;
  data.trip.active = false;

  const duration = data.trip.durationSeconds;
  const allBought = data.todayList.every(e => e.bought);

  // Track forgotten items
  data.lastUnboughtItems = data.todayList
    .filter(e => !e.bought)
    .map(e => e.name);

  // Save previous list
  data.previousLists.push({
    date: new Date().toLocaleString(),
    durationSeconds: duration,
    items: data.todayList.map(e => ({ name: e.name, bought: e.bought }))
  });

  // Update stats
  const s = data.stats;
  s.totalTrips += 1;
  s.totalSeconds += duration;
  if (s.shortestSeconds === 0 || duration < s.shortestSeconds) s.shortestSeconds = duration;
  if (duration > s.longestSeconds) s.longestSeconds = duration;

  // Clear today list
  data.todayList = [];
  saveData();

  alert(allBought ? 'Shopping Completed!' : 'Trip ended – some items were not bought.');
  showScreen('home-screen');
  renderForgotten();
  renderStats();
  renderTodayList();
  renderPreviousLists();
}

// --- Event wiring ---
function setupEvents() {
  document.getElementById('btn-usual-shop').onclick = () => {
    renderCategories();
    showScreen('shop-screen');
  };

  document.getElementById('btn-view-list').onclick = () => {
    renderTodayList();
    showScreen('list-screen');
  };

  document.getElementById('btn-start-trip').onclick = () => {
    if (data.todayList.length === 0) {
      alert('No items in today’s list.');
      return;
    }
    startTrip();
  };

  document.getElementById('btn-stop-trip').onclick = () => {
    stopTrip();
  };

  document.getElementById('btn-previous-lists').onclick = () => {
    renderPreviousLists();
    showScreen('previous-screen');
  };

  document.getElementById('btn-manage').onclick = () => {
    renderManage();
    showScreen('manage-screen');
  };

  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.target;
      showScreen(target);
    };
  });

  document.getElementById('quick-add-btn').onclick = () => {
    const input = document.getElementById('quick-add-input');
    const name = input.value.trim();
    if (!name) return;
    addItemToTodayList({ id: name.toLowerCase(), name });
    input.value = '';
  };

  document.getElementById('add-category-btn').onclick = () => {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '_');
    if (!data.categories.some(c => c.id === id)) {
      data.categories.push({ id, name });
      saveData();
      document.getElementById('new-category-name').value = '';
      renderManage();
    }
  };

  document.getElementById('add-item-btn').onclick = () => {
    const catId = document.getElementById('category-select').value;
    const name = document.getElementById('new-item-name').value.trim();
    const alwaysBuy = document.getElementById('always-buy-checkbox').checked;
    if (!name || !catId) return;
    const id = (catId + '_' + name).toLowerCase().replace(/\s+/g, '_');
    if (!data.items.some(i => i.id === id)) {
      data.items.push({ id, name, categoryId: catId, alwaysBuy });
      if (alwaysBuy) {
        addItemToTodayList({ id, name });
      }
      saveData();
      document.getElementById('new-item-name').value = '';
      document.getElementById('always-buy-checkbox').checked = false;
      renderManage();
      renderCategories();
    }
  };
}

// --- Init ---
loadData();
setupEvents();
renderForgotten();
renderStats();
renderTodayList();
