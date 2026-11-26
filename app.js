/* NestEgg — household budget planner.
   Plain vanilla JS, no dependencies. All data lives in localStorage
   under one key so the whole household state survives a reload. */
"use strict";

const STORAGE_KEY = "nestegg-household-v1";
const PALETTE = ["#2e7d4f", "#2f6fb2", "#b7791f", "#8e44ad", "#c0392b", "#0e7c7b", "#d35400", "#5d6d7e"];
const CAT_ICONS = {
  Groceries: "🛒", Housing: "🏠", Transport: "🚗", Dining: "🍽️",
  Utilities: "💡", Entertainment: "🎬", Health: "💊", Shopping: "🛍️",
  Kids: "🧒", Pets: "🐾", Income: "💰", Other: "📦"
};

function uid() { return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
function money(n) {
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
}
function monthKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function monthLabel(d) { return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function fmtDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---- Sample household: the Alvarez family, preloaded so the app
   looks alive on first open. Users can reset to it any time. ---- */
function sampleData() {
  const y = 2026, m = 10; // November 2026 (month index 10)
  const d = (day, mo = m) => `${y}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const tx = (name, cat, amount, day, type = "expense", mo = m) =>
    ({ id: uid(), name, category: cat, amount, date: d(day, mo), type });
  const prev = [];
  // A few months of history so the trend chart has something to say.
  for (let i = 5; i >= 1; i--) {
    const mo = m - i;
    prev.push(tx("Paycheck — Maya", "Income", 4200, 1, "income", mo));
    prev.push(tx("Paycheck — Leo", "Income", 2650, 15, "income", mo));
    prev.push(tx("Weekly groceries", "Groceries", 380 + i * 12, 20, "expense", mo));
    prev.push(tx("Rent", "Housing", 1450, 1, "expense", mo));
    prev.push(tx("Electric + water", "Utilities", 190 + i * 6, 12, "expense", mo));
  }
  return {
    categories: [
      { name: "Groceries", limit: 650, color: PALETTE[0] },
      { name: "Housing", limit: 1450, color: PALETTE[1] },
      { name: "Transport", limit: 320, color: PALETTE[2] },
      { name: "Dining", limit: 240, color: PALETTE[3] },
      { name: "Utilities", limit: 260, color: PALETTE[4] },
      { name: "Entertainment", limit: 150, color: PALETTE[5] },
      { name: "Health", limit: 180, color: PALETTE[6] },
      { name: "Shopping", limit: 200, color: PALETTE[7] }
    ],
    transactions: [
      ...prev,
      tx("Paycheck — Maya", "Income", 4200, 1, "income"),
      tx("Paycheck — Leo", "Income", 2650, 15, "income"),
      tx("Rent", "Housing", 1450, 1),
      tx("Whole Foods run", "Groceries", 132.40, 3),
      tx("Trader Joe's", "Groceries", 86.15, 7),
      tx("Farmers market", "Groceries", 48.90, 10),
      tx("Costco bulk shop", "Groceries", 214.75, 14),
      tx("Gas — Shell", "Transport", 52.30, 4),
      tx("Metro card top-up", "Transport", 60, 6),
      tx("Oil change", "Transport", 74.99, 18),
      tx("Pizza night", "Dining", 38.50, 5),
      tx("Sushi with friends", "Dining", 64.20, 12),
      tx("Coffee & pastries", "Dining", 22.40, 16),
      tx("Electric bill", "Utilities", 118.60, 9),
      tx("Internet — fiber", "Utilities", 65, 11),
      tx("Movie night", "Entertainment", 34, 8),
      tx("Streaming bundle", "Entertainment", 19.99, 13),
      tx("Pharmacy", "Health", 42.75, 15),
      tx("Kids' shoes", "Shopping", 58.00, 17),
      tx("Sold old bike", "Income", 120, 19, "income")
    ],
    goals: [
      { id: uid(), name: "Emergency fund", target: 5000, saved: 3250, color: PALETTE[0] },
      { id: uid(), name: "Summer vacation — coast trip", target: 2400, saved: 980, color: PALETTE[1] },
      { id: uid(), name: "New washing machine", target: 900, saved: 640, color: PALETTE[2] }
    ],
    bills: [
      { id: uid(), name: "Rent", amount: 1450, dueDay: 1, category: "Housing", paid: true },
      { id: uid(), name: "Internet — fiber", amount: 65, dueDay: 11, category: "Utilities", paid: true },
      { id: uid(), name: "Electric", amount: 118.60, dueDay: 15, category: "Utilities", paid: false },
      { id: uid(), name: "Car insurance", amount: 96, dueDay: 22, category: "Transport", paid: false },
      { id: uid(), name: "Gym membership", amount: 45, dueDay: 25, category: "Health", paid: false },
      { id: uid(), name: "Streaming bundle", amount: 19.99, dueDay: 13, category: "Entertainment", paid: true }
    ]
  };
}

let state = load();
let viewDate = new Date(2026, 10, 1); // open on the sample month

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const parsed = JSON.parse(raw); if (parsed && parsed.transactions) return parsed; }
  } catch (e) { /* corrupted storage: fall through to sample data */ }
  return sampleData();
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function monthTx() {
  const key = monthKey(viewDate);
  return state.transactions.filter(t => t.date.slice(0, 7) === key);
}
function catColor(name) {
  const c = state.categories.find(c => c.name === name);
  return c ? c.color : "#5d6d7e";
}

/* ---- Summary cards ---- */
function renderSummary() {
  const txs = monthTx();
  const income = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const spent = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const left = income - spent;
  const saved = state.goals.reduce((s, g) => s + g.saved, 0);
  const budgetTotal = state.categories.reduce((s, c) => s + c.limit, 0);

  document.getElementById("statIncome").textContent = money(income);
  document.getElementById("statSpent").textContent = money(spent);
  document.getElementById("statLeft").textContent = money(left);
  document.getElementById("statSaved").textContent = money(saved);
  document.getElementById("statIncomeSub").textContent =
    txs.filter(t => t.type === "income").length + " income entries";
  document.getElementById("statSpentSub").textContent =
    budgetTotal ? Math.round(spent / budgetTotal * 100) + "% of " + money(budgetTotal) + " budgeted" : "";
  document.getElementById("statLeftSub").textContent =
    left >= 0 ? "on track — under income" : "over income this month";
  document.getElementById("statSavedSub").textContent =
    state.goals.length + " goals · " + Math.round(saved / state.goals.reduce((s, g) => s + g.target, 0) * 100) + "% funded";
  document.getElementById("monthLabel").textContent = monthLabel(viewDate);
}

/* ---- Donut chart (hand-drawn SVG arcs, no chart library) ---- */
function renderDonut() {
  const spentByCat = {};
  monthTx().filter(t => t.type === "expense").forEach(t => {
    spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
  });
  const entries = Object.entries(spentByCat).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const svg = document.getElementById("donut");
  document.getElementById("donutTotal").textContent = money(total);

  if (!total) {
    svg.innerHTML = '<circle cx="100" cy="100" r="78" fill="none" stroke="#e3e8e2" stroke-width="26"/>';
    document.getElementById("legend").innerHTML = '<li class="empty">No spending yet this month.</li>';
    return;
  }
  const R = 78, CX = 100, CY = 100;
  let angle = -Math.PI / 2, html = "";
  entries.forEach(([name, value]) => {
    const frac = value / total;
    const a0 = angle, a1 = angle + frac * Math.PI * 2;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    html += `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${catColor(name)}" stroke-width="26"/>`;
    angle = a1;
  });
  svg.innerHTML = html;
  document.getElementById("legend").innerHTML = entries.map(([name, value]) =>
    `<li><span class="dot" style="background:${catColor(name)}"></span>${escapeHtml(name)}<span class="amt">${money(value)}</span></li>`
  ).join("");
}

/* ---- 6-month bar chart (hand-drawn SVG) ---- */
function renderBars() {
  const svg = document.getElementById("bars");
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1));
  const totals = months.map(d => {
    const key = monthKey(d);
    return state.transactions.filter(t => t.type === "expense" && t.date.slice(0, 7) === key)
      .reduce((s, t) => s + t.amount, 0);
  });
  const max = Math.max(...totals, 1);
  const W = 420, H = 190, base = 160, bw = 44, gap = (W - bw * 6) / 7;
  let html = `<line x1="8" y1="${base}" x2="${W - 8}" y2="${base}" stroke="#e3e8e2"/>`;
  totals.forEach((v, i) => {
    const h = Math.max(4, v / max * 120);
    const x = gap + i * (bw + gap);
    const current = monthKey(months[i]) === monthKey(viewDate);
    html += `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="5" fill="${current ? "#2e7d4f" : "#bcd6c2"}"/>`;
    html += `<text class="bar-value" x="${x + bw / 2}" y="${base - h - 6}" text-anchor="middle">${money(v)}</text>`;
    html += `<text class="bar-label" x="${x + bw / 2}" y="${base + 16}" text-anchor="middle">${months[i].toLocaleDateString("en-US", { month: "short" })}</text>`;
  });
  svg.innerHTML = html;
}

/* ---- Budget categories ---- */
function renderBudgets() {
  const key = monthKey(viewDate);
  const list = document.getElementById("budgetList");
  list.innerHTML = state.categories.map(c => {
    const spent = state.transactions
      .filter(t => t.type === "expense" && t.category === c.name && t.date.slice(0, 7) === key)
      .reduce((s, t) => s + t.amount, 0);
    const pct = c.limit ? Math.min(100, spent / c.limit * 100) : 0;
    const over = spent > c.limit;
    const cls = over ? "over" : pct >= 80 ? "warn" : "";
    const note = over
      ? `Over budget by ${money(spent - c.limit)} — consider moving money from another category.`
      : pct >= 80 ? `${money(c.limit - spent)} left — nearly at the limit.` : `${money(c.limit - spent)} remaining.`;
    return `<div class="budget-row" data-cat="${escapeHtml(c.name)}" title="Filter transactions by ${escapeHtml(c.name)}">
      <div class="budget-top"><span><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${c.color};margin-right:7px"></span>${escapeHtml(c.name)}</span>
      <span><span class="spent">${money(spent)}</span> <span class="limit">/ ${money(c.limit)}</span></span></div>
      <div class="progress ${cls}"><span style="width:${pct}%"></span></div>
      <div class="budget-note ${over ? "over" : ""}">${note}</div>
    </div>`;
  }).join("");
  list.querySelectorAll(".budget-row").forEach(row => row.addEventListener("click", () => {
    document.getElementById("filterCat").value = row.dataset.cat;
    renderTransactions();
    document.getElementById("txList").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }));
}

/* ---- Savings goals ---- */
function renderGoals() {
  document.getElementById("goalList").innerHTML = state.goals.map(g => {
    const pct = Math.min(100, g.saved / g.target * 100);
    return `<div class="goal">
      <div class="goal-top"><span>🎯 ${escapeHtml(g.name)}</span>
      <span><span class="saved">${money(g.saved)}</span> <span class="limit">/ ${money(g.target)}</span></span></div>
      <div class="progress"><span style="width:${pct}%;background:${g.color}"></span></div>
      <div class="budget-note">${Math.round(pct)}% funded · ${money(g.target - g.saved)} to go</div>
      <div class="goal-actions">
        <button class="btn" data-add-goal="${g.id}" data-amt="25">+ $25</button>
        <button class="btn" data-add-goal="${g.id}" data-amt="100">+ $100</button>
        <button class="btn danger" data-del-goal="${g.id}">Delete</button>
      </div>
    </div>`;
  }).join("") || '<p class="empty">No savings goals yet — add your first one.</p>';
  document.querySelectorAll("[data-add-goal]").forEach(b => b.addEventListener("click", () => {
    const g = state.goals.find(x => x.id === b.dataset.addGoal);
    if (g) { g.saved = Math.min(g.target, g.saved + Number(b.dataset.amt)); save(); renderAll(); }
  }));
  document.querySelectorAll("[data-del-goal]").forEach(b => b.addEventListener("click", () => {
    if (confirm("Delete this savings goal?")) {
      state.goals = state.goals.filter(x => x.id !== b.dataset.delGoal);
      save(); renderAll();
    }
  }));
}

/* ---- Transactions ---- */
function renderTransactions() {
  const q = (document.getElementById("searchTx").value || "").toLowerCase();
  const cat = document.getElementById("filterCat").value;
  const list = document.getElementById("txList");
  const txs = monthTx()
    .filter(t => (!cat || t.category === cat) && (!q || t.name.toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!txs.length) { list.innerHTML = '<li class="empty">No transactions match.</li>'; return; }
  list.innerHTML = txs.map(t => `
    <li class="tx-item">
      <span class="tx-icon ${t.type}">${CAT_ICONS[t.category] || (t.type === "income" ? "💰" : "📦")}</span>
      <div class="tx-main"><div class="tx-name">${escapeHtml(t.name)}</div>
      <div class="tx-meta">${escapeHtml(t.category)} · ${fmtDate(t.date)}</div></div>
      <span class="tx-amt ${t.type}">${t.type === "income" ? "+" : "−"}${money(t.amount)}</span>
      <button class="icon-btn" data-del-tx="${t.id}" title="Delete" aria-label="Delete ${escapeHtml(t.name)}">✕</button>
    </li>`).join("");
  list.querySelectorAll("[data-del-tx]").forEach(b => b.addEventListener("click", () => {
    if (confirm("Delete this transaction?")) {
      state.transactions = state.transactions.filter(x => x.id !== b.dataset.delTx);
      save(); renderAll();
    }
  }));
}

/* ---- Recurring bills + insights ---- */
function renderBills() {
  const today = new Date(2026, 10, 26); // sample "today" inside the demo month
  const list = document.getElementById("billList");
  const sorted = [...state.bills].sort((a, b) => a.dueDay - b.dueDay);
  list.innerHTML = sorted.map(b => {
    const status = b.paid ? ["Paid", ""] : b.dueDay < today.getDate() ? ["Overdue", "overdue"] : b.dueDay - today.getDate() <= 3 ? ["Due soon", "due"] : ["Upcoming", ""];
    return `<li class="bill-item">
      <div class="bill-main"><div class="bill-name">${escapeHtml(b.name)}</div>
      <div class="bill-meta">${money(b.amount)} · due day ${b.dueDay} · ${escapeHtml(b.category)}</div></div>
      <span class="pill ${status[1]}">${status[0]}</span>
      <button class="btn small" data-toggle-bill="${b.id}">${b.paid ? "Undo" : "Mark paid"}</button>
    </li>`;
  }).join("");
  const due = state.bills.filter(b => !b.paid).reduce((s, b) => s + b.amount, 0);
  document.getElementById("billsHint").textContent =
    due ? `${money(due)} still due this month across ${state.bills.filter(b => !b.paid).length} unpaid bills.` : "All bills paid for this month. Nice work!";
  list.querySelectorAll("[data-toggle-bill]").forEach(btn => btn.addEventListener("click", () => {
    const b = state.bills.find(x => x.id === btn.dataset.toggleBill);
    if (b) { b.paid = !b.paid; save(); renderAll(); }
  }));
}

function renderInsights() {
  const txs = monthTx().filter(t => t.type === "expense");
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const byCat = {};
  txs.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const days = 26; // sample month progress
  const dailyAvg = total / days;
  const over = state.categories.filter(c => {
    const spent = txs.filter(t => t.category === c.name).reduce((s, t) => s + t.amount, 0);
    return spent > c.limit;
  });
  const items = [];
  if (top) items.push(`Biggest cost so far: <strong>${escapeHtml(top[0])}</strong> at ${money(top[1])} (${Math.round(top[1] / total * 100)}% of spending).`);
  items.push(`You're spending about <strong>${money(dailyAvg)} a day</strong> this month.`);
  if (over.length) items.push(`<strong>${over.map(c => escapeHtml(c.name)).join(", ")}</strong> ${over.length > 1 ? "are" : "is"} over budget — review before month end.`);
  else items.push("Every category is within budget. Keep it up!");
  const goal = state.goals.slice().sort((a, b) => (b.saved / b.target) - (a.saved / a.target))[0];
  if (goal) items.push(`Closest goal: <strong>${escapeHtml(goal.name)}</strong> is ${Math.round(goal.saved / goal.target * 100)}% funded.`);
  document.getElementById("insights").innerHTML = items.map(i => `<li>${i}</li>`).join("");
}

/* ---- Modal forms ---- */
let modalKind = null, modalEditId = null;
const backdrop = document.getElementById("modalBackdrop");
const modalForm = document.getElementById("modalForm");
const modalFields = document.getElementById("modalFields");

function openModal(kind, title, fieldsHtml) {
  modalKind = kind;
  document.getElementById("modalTitle").textContent = title;
  modalFields.innerHTML = fieldsHtml;
  backdrop.classList.remove("hidden");
  const first = modalFields.querySelector("input, select");
  if (first) first.focus();
}
function closeModal() { backdrop.classList.add("hidden"); modalKind = null; }
document.getElementById("modalCancel").addEventListener("click", closeModal);
backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });

function field(label, inner) { return `<label>${label}</label>${inner}`; }
function catOptions(selected) {
  return state.categories.map(c => `<option ${c.name === selected ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("");
}
function todayIso() { return monthKey(viewDate) + "-" + String(new Date().getDate()).padStart(2, "0"); }

document.getElementById("addTxBtn").addEventListener("click", () => openModal("tx", "Add transaction",
  field("Description", '<input name="name" required placeholder="e.g. Weekly groceries">') +
  field("Amount ($)", '<input name="amount" type="number" min="0" step="0.01" required placeholder="0.00">') +
  field("Type", '<select name="type"><option value="expense">Expense</option><option value="income">Income</option></select>') +
  field("Category", `<select name="category">${catOptions("Groceries")}</select>`) +
  field("Date", `<input name="date" type="date" value="${todayIso()}" required>`)));

document.getElementById("addCategoryBtn").addEventListener("click", () => openModal("category", "Add budget category",
  field("Category name", '<input name="name" required placeholder="e.g. Pets">') +
  field("Monthly limit ($)", '<input name="limit" type="number" min="0" step="1" required placeholder="150">')));

document.getElementById("addGoalBtn").addEventListener("click", () => openModal("goal", "Add savings goal",
  field("Goal name", '<input name="name" required placeholder="e.g. New laptop">') +
  field("Target amount ($)", '<input name="target" type="number" min="1" step="1" required placeholder="1000">') +
  field("Already saved ($)", '<input name="saved" type="number" min="0" step="1" value="0">')));

document.getElementById("addBillBtn").addEventListener("click", () => openModal("bill", "Add recurring bill",
  field("Bill name", '<input name="name" required placeholder="e.g. Water bill">') +
  field("Amount ($)", '<input name="amount" type="number" min="0" step="0.01" required placeholder="0.00">') +
  field("Due day of month (1–28)", '<input name="dueDay" type="number" min="1" max="28" required value="1">') +
  field("Category", `<select name="category">${catOptions("Utilities")}</select>`)));

modalForm.addEventListener("submit", e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(modalForm).entries());
  if (modalKind === "tx") {
    state.transactions.push({ id: uid(), name: data.name.trim(), amount: Number(data.amount), type: data.type, category: data.category, date: data.date });
  } else if (modalKind === "category") {
    const name = data.name.trim();
    if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { alert("That category already exists."); return; }
    state.categories.push({ name, limit: Number(data.limit), color: PALETTE[state.categories.length % PALETTE.length] });
  } else if (modalKind === "goal") {
    state.goals.push({ id: uid(), name: data.name.trim(), target: Number(data.target), saved: Number(data.saved) || 0, color: PALETTE[state.goals.length % PALETTE.length] });
  } else if (modalKind === "bill") {
    state.bills.push({ id: uid(), name: data.name.trim(), amount: Number(data.amount), dueDay: Number(data.dueDay), category: data.category, paid: false });
  }
  save(); closeModal(); renderAll();
});

/* ---- Wiring + boot ---- */
function renderAll() {
  renderSummary(); renderDonut(); renderBars();
  renderBudgets(); renderGoals(); renderTransactions(); renderBills(); renderInsights();
}
function fillCategoryFilter() {
  const sel = document.getElementById("filterCat");
  const cur = sel.value;
  sel.innerHTML = '<option value="">All categories</option>' +
    state.categories.map(c => `<option>${escapeHtml(c.name)}</option>`).join("");
  sel.value = cur;
}
document.getElementById("prevMonth").addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); renderAll(); });
document.getElementById("nextMonth").addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); renderAll(); });
document.getElementById("searchTx").addEventListener("input", renderTransactions);
document.getElementById("filterCat").addEventListener("change", renderTransactions);
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset to the sample Alvarez household data? Your changes will be lost.")) {
    state = sampleData(); save(); fillCategoryFilter(); renderAll();
  }
});

fillCategoryFilter();
renderAll();
