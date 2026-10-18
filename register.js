const KEY = "blind-accounts", SESSION = "blind-session";
const $ = id => document.getElementById(id);
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

if (read().some(a => a.id === localStorage.getItem(SESSION))) location.replace("index.html");

$("form").addEventListener("submit", e => {
  e.preventDefault();
  const fail = msg => { $("error").textContent = msg; };
  const name = $("name").value.trim(), phone = $("phone").value.trim();
  const email = $("email").value.trim().toLowerCase(), password = $("password").value;
  const accounts = read();
  if (!name || !email) return fail("Vui lòng nhập họ tên và email.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Email chưa hợp lệ.");
  if (password.length < 4) return fail("Mật khẩu cần ít nhất 4 ký tự.");
  if (accounts.some(a => a.email.toLowerCase() === email)) return fail("Email này đã được sử dụng.");
  const account = { id: "a" + Date.now(), name, phone, email, password };
  localStorage.setItem(KEY, JSON.stringify([...accounts, account]));
  localStorage.setItem(SESSION, account.id);
  location.href = "index.html";
});
const URL_ = "https://<project-id>.supabase.co", KEY_ = "sb_publishable_...";
const call = (path, opts = {}, token = KEY_) =>
  fetch(URL_ + path, { ...opts, headers: { apikey: KEY_, Authorization: "Bearer " + token, "Content-Type": "application/json", ...opts.headers } })
    .then(r => r.json());

call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
call("/rest/v1/orders?select=*&order=created_at.desc", {}, session.access_token);