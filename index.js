const KEY = "blind-shop", $ = id => document.getElementById(id);
const STATUS = { pending: "Mới", preparing: "Đang pha", ready: "Sẵn sàng", paid: "Đã thu", cancelled: "Đã huỷ" };
const PAY = { cash: "Tiền mặt", card: "Thẻ", transfer: "Chuyển khoản" };
const money = n => new Intl.NumberFormat("vi-VN").format(n) + "₫";
const isOpen = o => ["pending", "preparing", "ready"].includes(o.status);
const sum = list => list.reduce((s, o) => s + o.total, 0);
const clock = iso => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const newest = (a, b) => b.createdAt.localeCompare(a.createdAt);
const lineText = o => o.items.map(i => i.qty + "× " + i.name).join(", ") + (o.note ? " — " + o.note : "");

const h = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k === "text" ? (n.textContent = v) : n.setAttribute(k, v);
  n.append(...kids.flat().filter(Boolean));
  return n;
};
const btn = (text, act, id, extra = {}) => h("button", { type: "button", "data-act": act, "data-id": id, ...extra, text });

const seed = () => {
  const catalog = [["Đen đá", 29000, "Cà phê"], ["Đen nóng", 25000, "Cà phê"], ["Sữa đá", 35000, "Cà phê"], ["Bạc xỉu", 39000, "Cà phê"],
    ["Cà phê muối", 45000, "Cà phê"], ["Latte", 49000, "Cà phê"], ["Trà đào", 45000, "Trà"], ["Croissant bơ", 32000, "Bánh"]];
  const products = catalog.map(([name, price, category], i) => ({ id: "p" + (i + 1), name, price, category, available: true }));
  const customers = [
    { id: "c1", name: "Anh Minh", phone: "0901 234 567", note: "Đen đá, ít đá" },
    { id: "c2", name: "Chị Lan", phone: "0912 345 678", note: "Bạc xỉu ít ngọt" },
    { id: "c3", name: "Bạn Huy", phone: "0938 456 789", note: "Latte, mang đi" },
    { id: "c4", name: "Cô Hà", phone: "0977 567 890", note: "Trà đào, không đá" }
  ];
  const rows = [
    [[[0, 1], [7, 1]], "paid", "cash", "Anh Minh", 10],
    [[[3, 2]], "paid", "card", "Chị Lan", 25],
    [[[4, 1], [1, 1]], "paid", "transfer", "Khách lẻ", 42],
    [[[5, 1]], "ready", null, "Bạn Huy", 55],
    [[[6, 1]], "preparing", null, "Cô Hà", 70],
    [[[0, 2]], "pending", null, "Khách lẻ", 85]
  ];
  const orders = rows.map(([lines, status, payment, customerName, minute], i) => {
    const items = lines.map(([p, qty]) => ({ id: products[p].id, name: products[p].name, price: products[p].price, qty }));
    const at = new Date(); at.setHours(7, minute, 0, 0);
    return { id: "o" + (i + 1), code: "BC-" + (101 + i), items, total: items.reduce((s, l) => s + l.price * l.qty, 0), status, payment, customerName, note: "", createdAt: at.toISOString() };
  });
  return { products, customers, orders };
};

const load = () => {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.orders) return s; } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
};

let shop, view = "overview", payingId = null, timer;
const persist = () => localStorage.setItem(KEY, JSON.stringify(shop));
const save = () => { persist(); render(); };
const find = id => shop.orders.find(o => o.id === id);

const newOrder = (items, customerName, note, status, payment) => {
  const code = "BC-" + (Math.max(100, ...shop.orders.map(o => parseInt(o.code.slice(3), 10))) + 1);
  return { id: "o" + Date.now(), code, items, total: items.reduce((s, i) => s + i.price * i.qty, 0), status, payment, customerName, note, createdAt: new Date().toISOString() };
};

const renderOverview = () => {
  const today = shop.orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  $("rev").textContent = money(sum(today.filter(o => o.status === "paid")));
  $("count").textContent = today.filter(o => o.status !== "cancelled").length;
  $("open").textContent = shop.orders.filter(isOpen).length;
  $("latest").replaceChildren(...[...shop.orders].sort(newest).slice(0, 8).map(o => h("li", { class: "row" },
    h("strong", { text: o.code }),
    h("span", { class: "grow", text: o.customerName + " · " + lineText(o) }),
    h("span", { text: money(o.total) }),
    h("span", { class: "badge", text: STATUS[o.status] }))));
};

const orderRow = o => {
  const acts = [];
  if (isOpen(o)) {
    if (o.status === "pending") acts.push(btn("Bắt đầu pha", "start", o.id));
    if (o.status === "preparing") acts.push(btn("Pha xong", "done", o.id));
    acts.push(btn("Thu tiền", "pay", o.id), btn("Huỷ", "cancel", o.id));
  }
  const panel = payingId === o.id ? h("div", { class: "row pay" },
    h("span", { text: "Thu bằng:" }),
    ...Object.entries(PAY).map(([m, t]) => btn(t, "method", o.id, { "data-m": m })),
    h("p", { class: "muted", text: "Cổng thanh toán có thể gắn thêm sau." })) : null;
  return h("li", {},
    h("div", { class: "row" },
      h("strong", { text: o.code }),
      h("span", { class: "grow", text: o.customerName + " · " + clock(o.createdAt) }),
      h("span", { class: "badge", text: STATUS[o.status] }),
      h("strong", { text: money(o.total) })),
    h("p", { class: "muted", text: lineText(o) + (o.payment ? " · " + PAY[o.payment] : "") }),
    h("div", { class: "row" }, acts),
    panel);
};

const renderOrders = () => {
  const f = $("filter").value, q = $("q").value.trim().toLowerCase();
  const list = shop.orders
    .filter(o => (f === "all" || (f === "open" ? isOpen(o) : o.status === f)) && (o.code + " " + o.customerName).toLowerCase().includes(q))
    .sort(newest);
  $("order-list").replaceChildren(...(list.length ? list.map(orderRow) : [h("li", { class: "muted", text: "Không có đơn nào." })]));
};

const renderPicker = () => {
  $("pick").replaceChildren(...shop.products.filter(p => p.available).map(p => h("label", {},
    h("span", { class: "grow", text: p.name + " · " + money(p.price) }),
    h("input", { type: "number", min: "0", max: "20", value: "0", "data-id": p.id }))));
  $("cust").replaceChildren(
    h("option", { value: "Khách lẻ", text: "Khách lẻ" }),
    ...shop.customers.map(c => h("option", { value: c.name, text: c.name })));
};

const renderProducts = () => {
  $("product-list").replaceChildren(...shop.products.map(p => h("li", { class: "row" },
    h("span", { class: "grow" }, h("strong", { text: p.name }), " · " + p.category),
    h("input", { type: "number", id: "pr-" + p.id, class: "price", value: p.price, min: "1000", step: "1000", "aria-label": "Giá " + p.name }),
    btn("Lưu giá", "price", p.id),
    btn(p.available ? "Còn hàng" : "Hết hàng", "avail", p.id, { "aria-pressed": String(p.available) }))));
};

const renderCustomers = () => {
  $("customer-list").replaceChildren(...shop.customers.map(c => {
    const mine = shop.orders.filter(o => o.customerName === c.name && o.status !== "cancelled");
    return h("li", { class: "row" },
      h("span", { class: "grow" }, h("strong", { text: c.name }), " · " + c.phone, h("br"), h("span", { class: "muted", text: c.note })),
      h("span", { text: mine.length + " lượt · " + money(sum(mine.filter(o => o.status === "paid"))) }));
  }));
};

const render = () => {
  document.querySelectorAll("main > section").forEach(s => { s.hidden = s.id !== view; });
  document.querySelectorAll("nav button").forEach(b => {
    if (b.dataset.v === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  ({ overview: renderOverview, orders: renderOrders, products: renderProducts, customers: renderCustomers })[view]();
};

const act = {
  nav: (_, d) => { view = d.v; render(); },
  start: id => { find(id).status = "preparing"; save(); },
  done: id => { find(id).status = "ready"; save(); },
  pay: id => { payingId = payingId === id ? null : id; render(); },
  method: (id, d) => { const o = find(id); o.status = "paid"; o.payment = d.m; payingId = null; save(); },
  cancel: id => { const o = find(id); o.status = "cancelled"; o.payment = null; payingId = null; save(); },
  avail: id => { const p = shop.products.find(p => p.id === id); p.available = !p.available; renderPicker(); save(); },
  price: id => {
    const v = Math.round(Number($("pr-" + id).value));
    if (v > 0) { shop.products.find(p => p.id === id).price = v; renderPicker(); }
    save();
  }
};

document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (b) act[b.dataset.act](b.dataset.id, b.dataset);
});
$("filter").addEventListener("change", render);
$("q").addEventListener("input", render);
$("logout").addEventListener("click", () => { localStorage.removeItem("blind-session"); location.href = "login.html"; });

$("order-form").addEventListener("submit", e => {
  e.preventDefault();
  const items = [...$("pick").querySelectorAll("input")].filter(i => Number(i.value) > 0).map(i => {
    const p = shop.products.find(p => p.id === i.dataset.id);
    return { id: p.id, name: p.name, price: p.price, qty: Math.max(1, Math.min(20, Math.floor(Number(i.value)))) };
  });
  if (!items.length) { $("order-error").textContent = "Chọn ít nhất một món."; return; }
  const now = $("mode").value === "now";
  shop.orders.push(newOrder(items, $("cust").value, $("note").value.trim(), now ? "paid" : "pending", now ? $("method").value : null));
  $("order-error").textContent = "";
  e.target.reset();
  save();
});

$("product-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("pname").value.trim(), price = Math.round(Number($("pprice").value));
  if (!name || !(price > 0)) { $("product-error").textContent = "Nhập tên và giá hợp lệ."; return; }
  shop.products.push({ id: "p" + Date.now(), name, price, category: $("pcat").value, available: true });
  $("product-error").textContent = "";
  e.target.reset();
  renderPicker();
  save();
});

$("customer-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("cname").value.trim();
  if (!name) { $("customer-error").textContent = "Nhập tên khách hàng."; return; }
  shop.customers.push({ id: "c" + Date.now(), name, phone: $("cphone").value.trim(), note: $("cnote").value.trim() });
  $("customer-error").textContent = "";
  e.target.reset();
  renderPicker();
  save();
});

const tick = () => {
  const menu = shop.products.filter(p => p.available);
  if (!menu.length) return;
  const items = [...menu].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2))
    .map(p => ({ id: p.id, name: p.name, price: p.price, qty: 1 + Math.floor(Math.random() * 2) }));
  const names = ["Khách lẻ", ...shop.customers.map(c => c.name)];
  shop.orders.push(newOrder(items, names[Math.floor(Math.random() * names.length)], "", "pending", null));
  persist();
  if (view !== "products") render();
};
const setLive = () => { clearInterval(timer); if ($("live").checked) timer = setInterval(tick, 12000); };
$("live").addEventListener("change", setLive);

const accounts = (() => { try { return JSON.parse(localStorage.getItem("blind-accounts")) || []; } catch { return []; } })();
const me = accounts.find(a => a.id === localStorage.getItem("blind-session"));
if (!me) {
  localStorage.removeItem("blind-session");
  location.replace("login.html");
} else {
  $("who").textContent = me.name;
  shop = load();
  renderPicker();
  render();
  setLive();
}
const URL_ = "https://<project-id>.supabase.co", KEY_ = "sb_publishable_...";
const call = (path, opts = {}, token = KEY_) =>
  fetch(URL_ + path, { ...opts, headers: { apikey: KEY_, Authorization: "Bearer " + token, "Content-Type": "application/json", ...opts.headers } })
    .then(r => r.json());

call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
call("/rest/v1/orders?select=*&order=created_at.desc", {}, session.access_token);
