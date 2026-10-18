const KEY = "blind-accounts", SESSION = "blind-session";
const $ = id => document.getElementById(id);
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

if (read().some(a => a.id === localStorage.getItem(SESSION))) location.replace("index.html");

$("form").addEventListener("submit", e => {
  e.preventDefault();
  const email = $("email").value.trim().toLowerCase(), password = $("password").value;
  const account = read().find(a => a.email.toLowerCase() === email);
  if (!email || !password || !account || account.password !== password) {
    $("error").textContent = "Email hoặc mật khẩu không đúng.";
    return;
  }
  localStorage.setItem(SESSION, account.id);
  location.href = "index.html";
});
const URL_ = "https://<project-id>.supabase.co", KEY_ = "sb_publishable_...";
const call = (path, opts = {}, token = KEY_) =>
  fetch(URL_ + path, { ...opts, headers: { apikey: KEY_, Authorization: "Bearer " + token, "Content-Type": "application/json", ...opts.headers } })
    .then(r => r.json());

call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
call("/rest/v1/orders?select=*&order=created_at.desc", {}, session.access_token);
