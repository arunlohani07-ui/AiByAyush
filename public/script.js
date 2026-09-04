const $ = (s) => document.querySelector(s);
const chatEl = $("#chat");
const input = $("#input");
const composer = $("#composer");
const fileInput = $("#fileInput");
const preview = $("#preview");
const previewImg = $("#previewImg");
let selectedImage = null;

let chats = JSON.parse(localStorage.getItem("al_ai_chats") || "[]");
let currentId = localStorage.getItem("al_ai_current") || null;

function save() {
  localStorage.setItem("al_ai_chats", JSON.stringify(chats));
  if (currentId) localStorage.setItem("al_ai_current", currentId);
}
function newChat() {
  const id = Date.now().toString();
  chats.unshift({ id, title: "New conversation", messages: [] });
  currentId = id; save(); renderList(); renderMessages();
}
function currentChat() {
  return chats.find(c => c.id === currentId);
}
function renderList() {
  const list = $("#chatList");
  list.innerHTML = "";
  chats.forEach(c => {
    const div = document.createElement("div");
    div.className = "chat-item" + (c.id === currentId ? " active" : "");
    div.textContent = c.title || "New conversation";
    div.onclick = () => { currentId = c.id; save(); renderList(); renderMessages(); };
    list.appendChild(div);
  });
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
}
function renderMessages() {
  chatEl.innerHTML = "";
  const c = currentChat();
  if (!c || !c.messages.length) {
    chatEl.innerHTML = `<div class="welcome" id="welcome">
      <img src="/avatar.jpg" class="welcome-avatar" alt="AI avatar">
      <h1>How can I help?</h1>
      <p>Ask anything. I’ll adapt to your language and conversation style.</p>
      <div class="suggestions">
        <button data-prompt="Explain this topic simply">Explain something</button>
        <button data-prompt="Help me write something professionally">Write something</button>
        <button data-prompt="Help me solve a coding problem">Help with code</button>
        <button data-prompt="Teach me something interesting">Teach me</button>
      </div>
    </div>`;
    document.querySelectorAll("[data-prompt]").forEach(b => b.onclick = () => { input.value = b.dataset.prompt; send(); });
    return;
  }
  c.messages.forEach((m, i) => {
    const row = document.createElement("div");
    row.className = "message " + m.role;
    const avatar = m.role === "assistant" ? `<img class="mini-avatar" src="/avatar.jpg">` : "";
    const actions = m.role === "assistant" ? `<div class="actions">
      <button class="action" data-copy="${i}">Copy</button>
      <button class="action" data-speak="${i}">Speak</button>
      <button class="action" data-regen="${i}">Regenerate</button>
    </div>` : "";
    row.innerHTML = `${avatar}<div><div class="content">${escapeHtml(m.content)}</div>${actions}</div>`;
    chatEl.appendChild(row);
  });
  document.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => navigator.clipboard.writeText(c.messages[b.dataset.copy].content));
  document.querySelectorAll("[data-speak]").forEach(b => b.onclick = () => speak(c.messages[b.dataset.speak].content));
  document.querySelectorAll("[data-regen]").forEach(b => b.onclick = () => regenerate(Number(b.dataset.regen)));
  chatEl.scrollTop = chatEl.scrollHeight;
}
async function send() {
  const text = input.value.trim();
  if (!text && !selectedImage) return;
  if (!currentId) newChat();
  const c = currentChat();
  if (!text && selectedImage) c.messages.push({ role:"user", content:"Please analyze the uploaded image." });
  else c.messages.push({ role:"user", content:text });
  if (c.title === "New conversation") c.title = (text || "Image conversation").slice(0, 35);
  input.value = ""; autoSize(); clearImage(); save(); renderList(); renderMessages();
  const typing = document.createElement("div");
  typing.className = "message assistant";
  typing.innerHTML = `<img class="mini-avatar" src="/avatar.jpg"><div class="content typing">Thinking…</div>`;
  chatEl.appendChild(typing); chatEl.scrollTop = chatEl.scrollHeight;
  try {
    const payload = { messages: c.messages };
    if (selectedImage) payload.image = selectedImage;
    const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    c.messages.push({ role:"assistant", content:data.text });
    save(); renderMessages();
  } catch (e) {
    c.messages.push({ role:"assistant", content:"Error: " + e.message });
    save(); renderMessages();
  }
}
function regenerate(index) {
  const c = currentChat();
  if (!c || index < 1) return;
  c.messages.splice(index, 1);
  save(); renderMessages();
  const last = c.messages[c.messages.length - 1];
  if (last?.role === "user") send();
}
function speak(text) {
  if (!("speechSynthesis" in window)) return alert("Voice output is not supported by this browser.");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(u);
}
function autoSize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}
function clearImage() {
  selectedImage = null; fileInput.value = ""; preview.classList.add("hidden");
}
composer.addEventListener("submit", e => { e.preventDefault(); send(); });
input.addEventListener("input", autoSize);
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => { selectedImage = reader.result; previewImg.src = selectedImage; preview.classList.remove("hidden"); };
  reader.readAsDataURL(file);
});
$("#removeImage").onclick = clearImage;
$("#newChat").onclick = newChat;
$("#clearAll").onclick = () => { if (confirm("Delete all local chats?")) { chats=[]; currentId=null; localStorage.removeItem("al_ai_chats"); localStorage.removeItem("al_ai_current"); renderList(); renderMessages(); } };
$("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("al_theme", document.body.classList.contains("dark") ? "dark" : "light");
}
$("#themeBtn").onclick = toggleTheme;
$("#topTheme").onclick = toggleTheme;
if (localStorage.getItem("al_theme") === "dark") document.body.classList.add("dark");

let recognition;
if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new R();
  recognition.continuous = false; recognition.interimResults = true;
  recognition.onresult = e => {
    let t = "";
    for (const r of e.results) t += r[0].transcript;
    input.value = t; autoSize();
  };
}
$("#micBtn").onclick = () => {
  if (!recognition) return alert("Voice input is not supported by this browser.");
  recognition.lang = navigator.language || "en-US";
  recognition.start();
};

if (!currentId || !currentChat()) newChat();
else { renderList(); renderMessages(); }
