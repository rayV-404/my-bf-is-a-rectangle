// ===== SETTINGS =====
function loadSettings() {
    document.getElementById("apiUrl").value = localStorage.getItem("apiUrl") || "";
    document.getElementById("apiKey").value = localStorage.getItem("apiKey") || "";
    document.getElementById("modelName").value = localStorage.getItem("modelName") || "claude-opus-4-6-thinking";
    document.getElementById("maxTokens").value = localStorage.getItem("maxTokens") || "4096";
    document.getElementById("temperature").value = localStorage.getItem("temperature") || "0.7";
    document.getElementById("sysPrompt").value = localStorage.getItem("sysPrompt") || "";
}

function saveSettings() {
    localStorage.setItem("apiUrl", document.getElementById("apiUrl").value);
    localStorage.setItem("apiKey", document.getElementById("apiKey").value);
    localStorage.setItem("modelName", document.getElementById("modelName").value);
    localStorage.setItem("maxTokens", document.getElementById("maxTokens").value);
    localStorage.setItem("temperature", document.getElementById("temperature").value);
    localStorage.setItem("sysPrompt", document.getElementById("sysPrompt").value);
    let chat = getActiveChat();
    if (chat) {
        chat.instruction = document.getElementById("chatInstruction").value;
        saveAllChats();
    }
    document.getElementById("settings-overlay").classList.remove("open");
    renderPresetDropdown();
}
// ===== FONT SYSTEM =====
function applyFont() {
    let font = localStorage.getItem("appFont") || "Press Start 2P";
    let size = localStorage.getItem("appFontSize") || "14";
    let tag = document.getElementById("dynamic-font-style");
    if (!tag) {
        tag = document.createElement("style");
        tag.id = "dynamic-font-style";
        document.head.appendChild(tag);
    }
    tag.textContent = `
    * { font-family: '${font}', 'DotGothic16', 'Press Start 2P', monospace !important; }

    .phone-screen, .phone-screen * {
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    }

    /* 手机里的自定义字体例外 —— 双类选择器，特异性压过上面的 .phone-screen * */
    .phone-screen .lock-time,
    .phone-screen .home-time {
        font-family: 'newrocker', sans-serif !important;
    }

    .phone-screen .note-cell-preview, 
    .phone-screen .note-cell-full, 
    .phone-screen .phone-entry-content, 
    .phone-screen .bowser-query, 
    .phone-screen .bowser-entry-content { 
    font-family: 'JetBrainsMono', monospace !important; 
    }
    
    #chatbox, #userInput, .msg-user, .msg-john, .msg-think-body, .freq-text,
    .freq-reply, .memory-entry, #freq-input, .sidebar-placeholder, .msg-interrupted {
        font-size: ${size}px !important;
        line-height: 1.7;
    }
`;

}
// ===== PHONE BOWSER (search history) =====
let phoneBowser = JSON.parse(localStorage.getItem("phoneBowser") || "[]");

const bowserLoadingPhases = [
  "opening bowser...",
  "loading cookies...",
  "scrolling history...",
  "found something...",
  "clearing evidence..."
];

async function generateBowser() {
  let btn = document.getElementById("gen-bowser-btn");
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add("btn-generating-blue");
  btn.textContent = bowserLoadingPhases[0];
  let phase = 0;
  let cycle = setInterval(() => {
    phase = (phase + 1) % bowserLoadingPhases.length;
    btn.textContent = bowserLoadingPhases[phase];
  }, 800);

  let recentChat = chatHistory.slice(-10).map(m =>
    (m.role === "user" ? "Ray" : "John") + ": " + m.content
  ).join("\n");
  let existing = phoneBowser.slice(0, 5).map(b => b.query).join("\n");

  let prompt = `You are looking at John S's search history on his phone. John is 24-25, plays drums, wears all black, drinks iced americanos and white Monsters, loves Deftones and horror movies, dates Ray (calls her Kitty). His girlfriend Ray just opened his browser and is snooping. Generate ONE search history entry. Return in this EXACT format:

TITLE: [a short witty label, 3-6 words, lowercase — like john explaining this search to his snooping girlfriend, e.g. "for research purposes", "asking for a friend", "totally normal question"]
QUERY: [the actual search string he typed, messy and real, 3-15 words, no quotes]

The search can be practical, suspicious, embarrassing, wholesome, weird 3am stuff, or something about Ray. Recent conversations for context:
${recentChat || "(no recent chat)"}

Already existing searches (DO NOT repeat these or write anything too similar):
${existing || "(none yet)"}

Return ONLY the TITLE and QUERY lines. Nothing else.`;

  let reply = await freqAPI(prompt);
  clearInterval(cycle);

  if (reply) {
    let title = "";
    let query = reply;
    let titleMatch = reply.match(/^TITLE:\s*(.+)/im);
    let queryMatch = reply.match(/QUERY:\s*(.+)/im);
    if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    if (queryMatch) query = queryMatch[1].trim();
    phoneBowser.unshift({ title: title, query: query, time: new Date().toLocaleString(), id: Date.now() });
    localStorage.setItem("phoneBowser", JSON.stringify(phoneBowser));
    renderBowser();
  }

  btn.textContent = "+ check history";
  btn.classList.remove("btn-generating-blue");
  btn.disabled = false;
}

function renderBowser() {
  let list = document.getElementById("bowser-list");
  if (!list) return;
  list.innerHTML = "";
  phoneBowser.forEach((b, i) => {
    let div = document.createElement("div");
    div.className = "bowser-entry";
    div.innerHTML = `
      <div class="bowser-entry-header" onclick="toggleBowserEntry(this)">
        <span class="bowser-icon">🔍</span>
        <span class="bowser-query">${escapeHtml(b.query)}</span>
      </div>
      <div class="bowser-entry-content" style="display:none;">
        🔍 ${escapeHtml(b.query)}<span class="bowser-tab">${escapeHtml(b.title || "no context")}</span>
        <div class="bowser-time">${escapeHtml(b.time || "")}</div>
        <button class="entry-del-btn" onclick="event.stopPropagation(); deleteBowserEntry(${i})">🗑 delete</button>
      </div>
    `;
    list.appendChild(div);
  });
  if (phoneBowser.length === 0) {
    list.innerHTML = `<div style="text-align:center; color:#48484a; font-size:12px; padding:30px 10px; font-family:'Space Grotesk', sans-serif;">History is empty</div>`;
  }
}

function deleteBowserEntry(idx) {
  phoneBowser.splice(idx, 1);
  localStorage.setItem("phoneBowser", JSON.stringify(phoneBowser));
  renderBowser();
}

function toggleBowserEntry(el) {
  let content = el.closest('.bowser-entry').querySelector('.bowser-entry-content');
  if (content) content.style.display = content.style.display === "none" ? "block" : "none";
}

function initFontControls() {
    let select = document.getElementById("fontSelect");
    let range = document.getElementById("fontSizeRange");
    let label = document.getElementById("fontSizeLabel");
    select.value = localStorage.getItem("appFont") || "Press Start 2P";
    range.value = localStorage.getItem("appFontSize") || "14";
    label.textContent = range.value + "px";
    select.addEventListener("change", function() {
        localStorage.setItem("appFont", this.value);
        applyFont();
    });
    range.addEventListener("input", function() {
        localStorage.setItem("appFontSize", this.value);
        label.textContent = this.value + "px";
        applyFont();
    });
}

// ===== API PRESETS =====
let apiPresets = JSON.parse(localStorage.getItem("apiPresets") || "[]");

function renderPresetDropdown() {
    let select = document.getElementById("presetSelect");
    select.innerHTML = '<option value="">-- no preset --</option>';
    apiPresets.forEach((p, i) => {
        let opt = document.createElement("option");
        opt.value = i;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

function savePreset() {
    let name = prompt("preset name:");
    if (!name || !name.trim()) return;
    let preset = {
        name: name.trim(),
        url: document.getElementById("apiUrl").value,
        key: document.getElementById("apiKey").value,
        model: document.getElementById("modelName").value,
        maxTokens: document.getElementById("maxTokens").value,
        temperature: document.getElementById("temperature").value
    };
    apiPresets.push(preset);
    localStorage.setItem("apiPresets", JSON.stringify(apiPresets));
    renderPresetDropdown();
    document.getElementById("presetSelect").value = apiPresets.length - 1;
}

function deletePreset() {
    let select = document.getElementById("presetSelect");
    let idx = select.value;
    if (idx === "") {
        alert("select a preset first");
        return;
    }
    if (!confirm("delete preset: " + apiPresets[idx].name + "?")) return;
    apiPresets.splice(idx, 1);
    localStorage.setItem("apiPresets", JSON.stringify(apiPresets));
    renderPresetDropdown();
}

document.getElementById("presetSelect")?.addEventListener("change", function() {
    let idx = this.value;
    if (idx === "") return;
    let p = apiPresets[idx];
    document.getElementById("apiUrl").value = p.url || "";
    document.getElementById("apiKey").value = p.key || "";
    document.getElementById("modelName").value = p.model || "";
    document.getElementById("maxTokens").value = p.maxTokens || "4096";
    document.getElementById("temperature").value = p.temperature || "0.7";
    document.getElementById("modelSelect").style.display = "none";
});

// ===== FETCH MODELS =====
async function fetchModels() {
    let apiUrl = document.getElementById("apiUrl").value;
    let apiKey = document.getElementById("apiKey").value;
    if (!apiUrl || !apiKey) {
        alert("fill in API URL and key first");
        return;
    }
    let btn = document.querySelector(".fetch-btn");
    btn.textContent = "📡 ...";
    btn.disabled = true;
    try {
        let res = await fetch(apiUrl + "/models", {
            headers: { "Authorization": "Bearer " + apiKey }
        });
        let data = await res.json();
        let models = [];
        if (data.data && Array.isArray(data.data)) {
            models = data.data.map(m => m.id).sort();
        } else if (Array.isArray(data)) {
            models = data.map(m => m.id || m).sort();
        }
        if (models.length === 0) {
            alert("no models found");
            btn.textContent = "📡 fetch";
            btn.disabled = false;
            return;
        }
        let select = document.getElementById("modelSelect");
        select.innerHTML = '<option value="">-- pick a model --</option>';
        models.forEach(m => {
            let opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            select.appendChild(opt);
        });
        select.style.display = "block";
    } catch (err) {
        alert("failed to fetch: " + err.message);
    }
    btn.textContent = "📡 fetch";
    btn.disabled = false;
}

// ===== EXPORT / IMPORT =====
function exportData() {
    let data = {
        allChats: JSON.parse(localStorage.getItem("allChats") || "[]"),
        activeChatId: localStorage.getItem("activeChatId") || "",
        frequencies: JSON.parse(localStorage.getItem("frequencies") || "[]"),
        memories: JSON.parse(localStorage.getItem("memories") || "[]"),
        phoneNotes: JSON.parse(localStorage.getItem("phoneNotes") || "[]"),
        phonePurchases: JSON.parse(localStorage.getItem("phonePurchases") || "[]"),
        apiUrl: localStorage.getItem("apiUrl") || "",
        apiKey: localStorage.getItem("apiKey") || "",
        modelName: localStorage.getItem("modelName") || "",
        maxTokens: localStorage.getItem("maxTokens") || "",
        temperature: localStorage.getItem("temperature") || "",
        sysPrompt: localStorage.getItem("sysPrompt") || "",
        apiPresets: JSON.parse(localStorage.getItem("apiPresets") || "[]"),
        worldbooks: JSON.parse(localStorage.getItem("worldbooks") || "[]"),
        appFont: localStorage.getItem("appFont") || "Press Start 2P",
        appFontSize: localStorage.getItem("appFontSize") || "14",
        phoneBowser: JSON.parse(localStorage.getItem("phoneBowser") || "[]"),
    };
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = "rectangle-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById("import-btn")?.addEventListener("click", () => {
    document.getElementById("importFile").click();
});

document.getElementById("importFile")?.addEventListener("change", function() {
    let file = this.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);
            if (!confirm("this will overwrite all current data. continue?")) {
                return;
            }
            if (data.allChats) localStorage.setItem("allChats", JSON.stringify(data.allChats));
            if (data.activeChatId) localStorage.setItem("activeChatId", data.activeChatId);
            if (data.frequencies) localStorage.setItem("frequencies", JSON.stringify(data.frequencies));
            if (data.memories) localStorage.setItem("memories", JSON.stringify(data.memories));
            if (data.phoneNotes) localStorage.setItem("phoneNotes", JSON.stringify(data.phoneNotes));
            if (data.phonePurchases) localStorage.setItem("phonePurchases", JSON.stringify(data.phonePurchases));
            if (data.apiUrl) localStorage.setItem("apiUrl", data.apiUrl);
            if (data.apiKey) localStorage.setItem("apiKey", data.apiKey);
            if (data.modelName) localStorage.setItem("modelName", data.modelName);
            if (data.maxTokens) localStorage.setItem("maxTokens", data.maxTokens);
            if (data.temperature) localStorage.setItem("temperature", data.temperature);
            if (data.sysPrompt) localStorage.setItem("sysPrompt", data.sysPrompt);
            if (data.apiPresets) localStorage.setItem("apiPresets", JSON.stringify(data.apiPresets));
            if (data.worldbooks) localStorage.setItem("worldbooks", JSON.stringify(data.worldbooks));
            if (data.appFont) localStorage.setItem("appFont", data.appFont);
            if (data.appFontSize) localStorage.setItem("appFontSize", data.appFontSize);
            if (data.phoneBowser) localStorage.setItem("phoneBowser", JSON.stringify(data.phoneBowser));

            location.reload();
        } catch (err) {
            alert("invalid file: " + err.message);
        }
    };
    reader.readAsText(file);
    this.value = "";
});

document.getElementById("modelSelect")?.addEventListener("change", function() {
    if (this.value) {
        document.getElementById("modelName").value = this.value;
    }
});

function openSettings() {
    document.getElementById("settings-overlay").classList.add("open");
    let chat = getActiveChat();
    document.getElementById("chatInstruction").value = (chat && chat.instruction) || "";
    document.getElementById("chat-instruction-name").textContent = chat ? chat.name : "";
    renderWorldbookList();
}

// ===== FILE UPLOAD =====
const fileArea = document.getElementById("file-upload-area");
const fileInput = document.getElementById("sysFiles");
const fileList = document.getElementById("file-list");

if (fileArea && fileInput) {
    fileArea.addEventListener("click", () => fileInput.click());
    fileArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileArea.style.borderColor = "#7c3aed";
    });
    fileArea.addEventListener("dragleave", () => {
        fileArea.style.borderColor = "#555";
    });
    fileArea.addEventListener("drop", (e) => {
        e.preventDefault();
        fileArea.style.borderColor = "#555";
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener("change", () => {
        handleFiles(fileInput.files);
    });
}

let uploadedWbFiles = [];

function renderUploadedFiles() {
    let box = document.getElementById("file-list");
    if (!box) return;
    // 只保留世界书还存在的记录——删了书，对应的文件行自动消失
    uploadedWbFiles = uploadedWbFiles.filter(f => worldbooks.some(wb => wb.id === f.id));
    box.innerHTML = "";
    uploadedWbFiles.forEach(f => {
        let row = document.createElement("div");
        row.className = "wb-file-row";
        row.innerHTML = `<span>📄 ${escapeHtml(f.name)}</span><span class="ok">✓ imported as worldbook</span>`;
        box.appendChild(row);
    });
}


function handleFiles(files) {
    Array.from(files).forEach(file => {
        let reader = new FileReader();
        reader.onload = function(e) {
            let wbId = Date.now() + Math.floor(Math.random() * 1000);
            worldbooks.push({
                id: wbId,
                name: file.name,
                content: e.target.result,
                keywords: [],
                global: true
            });
            uploadedWbFiles.unshift({ name: file.name, id: wbId });
            saveWorldbooks();
            renderWorldbookList();
            switchSettingsTab("worldbook");
        };
        reader.readAsText(file);
    });
}


function formatMsgTime(ts) {
    if (!ts) return "";
    let d = new Date(ts);
    let mm = String(d.getMonth() + 1).padStart(2, "0");
    let dd = String(d.getDate()).padStart(2, "0");
    let hh = String(d.getHours()).padStart(2, "0");
    let mi = String(d.getMinutes()).padStart(2, "0");
    return mm + "." + dd + " // " + hh + ":" + mi;
}

function extractThinking(data) {
    let msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) return { thinking: null, content: "" };
    let content = msg.content || "";
    let thinking = msg.reasoning_content || msg.reasoning || msg.thinking || null;
    if (!thinking) {
        let m = content.match(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/i);
        if (m) {
            thinking = m[1].trim();
            content = content.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/i, "").trim();
        }
    }
    return { thinking: thinking, content: content };
}

// ===== UTILITIES =====
function renderMarkdown(text) {
    let div = document.createElement("div");
    div.textContent = text;
    let escaped = div.innerHTML;
    escaped = escaped
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #555; margin: 8px 0;">')
        .replace(/\n/g, '<br>');
    return escaped;
}

function escapeHtml(text) {
    let div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// --- MULTI CHAT MANAGEMENT ---
let allChats = [];
let activeChatId = null;

function generateId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function getActiveChat() {
    return allChats.find(c => c.id === activeChatId);
}

function saveAllChats() {
    localStorage.setItem("allChats", JSON.stringify(allChats));
    localStorage.setItem("activeChatId", activeChatId);
}

function createNewChat() {
    let newChat = {
        id: generateId(),
        name: "Chat " + (allChats.length + 1),
        history: [],
        created: new Date().toISOString(),
        instruction: "",
        worldbookIds: []
    };
    allChats.push(newChat);
    switchChat(newChat.id);
}

function switchChat(id) {
    if (isGenerating) stopGeneration();
    activeChatId = id;
    let chat = getActiveChat();
    chatHistory = chat ? chat.history : [];
    saveAllChats();
    renderChatList();
    renderChatbox();
    if (isMobile()) {
        showMobileView('chat');
    }
}

function renameChat(id, e) {
    if (e) e.stopPropagation();
    let chat = allChats.find(c => c.id === id);
    if (!chat) return;
    let newName = prompt("rename chat:", chat.name);
    if (newName && newName.trim()) {
        chat.name = newName.trim();
        saveAllChats();
        renderChatList();
    }
}

function deleteChat(id, e) {
    if (e) e.stopPropagation();
    if (allChats.length <= 1) {
        alert("can't delete your only chat");
        return;
    }
    if (!confirm("delete this chat?")) return;
    allChats = allChats.filter(c => c.id !== id);
    if (activeChatId === id) {
        switchChat(allChats[0].id);
    } else {
        saveAllChats();
        renderChatList();
    }
}

function toggleChatList() {
    let container = document.getElementById("chat-list-container");
    let arrow = document.getElementById("chat-fold-arrow");
    if (container.style.display === "none") {
        container.style.display = "block";
        arrow.textContent = "▼";
    } else {
        container.style.display = "none";
        arrow.textContent = "▶";
    }
}

function renderChatList() {
    let list = document.getElementById("chat-list");
    if (!list) return;
    list.innerHTML = "";
    let groups = {};
    let monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    allChats.forEach(chat => {
        let dateKey;
        if (chat.created) {
            let d = new Date(chat.created);
            let today = new Date();
            let yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (d.toDateString() === today.toDateString()) {
                dateKey = "today";
            } else if (d.toDateString() === yesterday.toDateString()) {
                dateKey = "yesterday";
            } else {
                dateKey = monthShort[d.getMonth()] + " " + d.getDate();
            }
        } else {
            dateKey = "older";
        }
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(chat);
    });
    let order = Object.keys(groups);
    order.sort((a, b) => {
        if (a === "today") return -1;
        if (b === "today") return 1;
        if (a === "yesterday") return -1;
        if (b === "yesterday") return 1;
        return 0;
    });
    order.forEach(dateKey => {
        let header = document.createElement("div");
        header.className = "chat-date-header";
        header.textContent = dateKey;
        list.appendChild(header);
        groups[dateKey].forEach(chat => {
            let item = document.createElement("div");
            item.className = "chat-list-item" + (chat.id === activeChatId ? " active" : "");
            item.onclick = () => switchChat(chat.id);
            item.innerHTML = `
                <span class="chat-name">${escapeHtml(chat.name)}</span>
                <span class="chat-item-actions">
                    <span onclick="renameChat('${chat.id}', event)">✏️</span>
                    <span onclick="deleteChat('${chat.id}', event)">🗑️</span>
                </span>
            `;
            list.appendChild(item);
        });
    });
}

function loadAllChats() {
    let saved = localStorage.getItem("allChats");
    if (saved) {
        allChats = JSON.parse(saved);
    } else {
        let oldHistory = localStorage.getItem("chatHistory");
        let firstChat = {
            id: generateId(),
            name: "Chat 1",
            history: oldHistory ? JSON.parse(oldHistory) : []
        };
        allChats = [firstChat];
        localStorage.removeItem("chatHistory");
    }
    let savedActive = localStorage.getItem("activeChatId");
    if (savedActive && allChats.find(c => c.id === savedActive)) {
        activeChatId = savedActive;
    } else if (allChats.length > 0) {
        activeChatId = allChats[0].id;
    }
    chatHistory = getActiveChat()?.history || [];
    renderChatList();
    renderChatbox();
}

// ===== FREQUENCIES =====
let frequencies = JSON.parse(localStorage.getItem("frequencies") || "[]");

function saveFrequencies() {
    localStorage.setItem("frequencies", JSON.stringify(frequencies));
}

async function submitFreqReply(idx, text) {
    text = (text || "").trim();
    if (!text) return;
    if (!frequencies[idx].replies) frequencies[idx].replies = [];
    frequencies[idx].replies.push({ sender: "ray", text: text, time: new Date().toLocaleString() });
    saveFrequencies();
    renderFrequencies();
    await autoReply(idx);
}

function renderFrequencies() {
    let timeline = document.getElementById("freq-timeline");
    timeline.innerHTML = "";
    let sorted = [...frequencies].reverse();
    sorted.forEach((entry, reverseIdx) => {
        let realIndex = frequencies.length - 1 - reverseIdx;
        let senderLabel = entry.sender === "john" ? "🖤john" : "💜ray";
        let repliesHtml = "";
        if (entry.replies && entry.replies.length > 0) {
            entry.replies.forEach(reply => {
                let label = reply.sender === "john" ? "🖤john" : "💜ray replies 🖤john";
                let cls = reply.sender === "john" ? "reply-john" : "reply-ray";
                repliesHtml += `<div class="freq-reply ${cls}"><span class="reply-sender">${label}：</span><span class="reply-text">${escapeHtml(reply.text)}</span></div>`;
            });
        }
        let lastMsg = entry.replies && entry.replies.length > 0 ? entry.replies[entry.replies.length - 1] : entry;
        let showReplyOption = lastMsg.sender === "john";
        let replyToggle = showReplyOption ? `<span class="freq-reply-toggle" data-index="${realIndex}">reply ↩</span>` : "";
        let replyInputHtml = showReplyOption ? `<div class="freq-reply-box" data-index="${realIndex}" style="display:none;"><div class="freq-reply-row"><input type="text" class="freq-reply-input" data-index="${realIndex}" placeholder="reply..."><button class="freq-reply-send" data-index="${realIndex}">↩</button></div></div>` : "";
        let hasReplies = entry.replies && entry.replies.length > 0;
        let repliesSection = "";
        if (hasReplies || showReplyOption) {
            repliesSection = `<div class="freq-replies">${repliesHtml}${replyInputHtml}</div>${replyToggle}`;
        }
        let div = document.createElement("div");
        div.className = "freq-entry";
        div.innerHTML = `
            <div class="freq-header">
                <span class="freq-sender ${entry.sender}">${senderLabel}</span>
                <span class="freq-time">${entry.time}</span>
                <span class="freq-delete" data-index="${realIndex}">🗑️</span>
            </div>
            <div class="freq-text">${escapeHtml(entry.text)}</div>
            ${repliesSection}
        `;
        timeline.appendChild(div);
    });
    document.querySelectorAll(".freq-delete").forEach(btn => {
        btn.addEventListener("click", function() {
            let idx = parseInt(this.dataset.index);
            frequencies.splice(idx, 1);
            saveFrequencies();
            renderFrequencies();
        });
    });
    document.querySelectorAll(".freq-reply-send").forEach(btn => {
        btn.addEventListener("click", function() {
            let idx = parseInt(this.dataset.index);
            let input = document.querySelector(`.freq-reply-input[data-index="${idx}"]`);
            if (input) submitFreqReply(idx, input.value);
        });
    });
    document.querySelectorAll(".freq-reply-input").forEach(input => {
        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                submitFreqReply(parseInt(this.dataset.index), this.value);
            }
        });
    });
    document.querySelectorAll(".freq-reply-toggle").forEach(toggle => {
        toggle.addEventListener("click", function() {
            let idx = this.dataset.index;
            let box = document.querySelector(`.freq-reply-box[data-index="${idx}"]`);
            if (box) {
                let visible = box.style.display !== "none";
                box.style.display = visible ? "none" : "block";
                box.querySelector("input")?.focus();
            }
        });
    });
}

async function freqAPI(prompt) {
    let apiUrl = localStorage.getItem("apiUrl");
    let apiKey = localStorage.getItem("apiKey");
    let model = localStorage.getItem("modelName") || "claude-opus-4-6-thinking";
    if (!apiUrl || !apiKey) return null;
    try {
        let res = await fetch(apiUrl + "/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1024,
                temperature: 0.9
            })
        });
        let data = await res.json();
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content.trim();
        }
    } catch (err) {
        console.log("freq API error:", err);
    }
    return null;
}

async function autoReply(index) {
    let entry = frequencies[index];
    let context = `Original post by ${entry.sender}: "${entry.text}"\n\nThread:\n`;
    if (entry.replies) {
        entry.replies.forEach(r => {
            context += `${r.sender}: ${r.text}\n`;
        });
    }
    let prompt = `You are John S, a 24-25 year old guy. Your girlfriend Ray and you share a mood board called "Frequencies." Reply to this thread. Keep it short — one to three sentences. Be warm, teasing, natural. Include an emoji if it fits. You always get the last word.

${context}

Reply as John. ONLY the reply text.`;
    let reply = await freqAPI(prompt);
    if (reply) {
        if (!frequencies[index].replies) frequencies[index].replies = [];
        frequencies[index].replies.push({ sender: "john", text: reply, time: new Date().toLocaleString() });
        saveFrequencies();
        renderFrequencies();
    }
}

async function postFrequency() {
    let input = document.getElementById("freq-input");
    let text = input.value.trim();
    if (!text) return;
    frequencies.push({ sender: "ray", text: text, time: new Date().toLocaleString(), replies: [] });
    saveFrequencies();
    input.value = "";
    renderFrequencies();
    await autoReply(frequencies.length - 1);
}

async function generateFrequency() {
    let apiUrl = localStorage.getItem("apiUrl");
    let apiKey = localStorage.getItem("apiKey");
    if (!apiUrl || !apiKey) {
        alert("set up API first ⚙️");
        return;
    }
    let btn = document.getElementById("freq-generate");
    btn.textContent = "⚡ intercepting...";
    btn.classList.add("btn-generating");
    btn.disabled = true;
    let recentChat = chatHistory.slice(-10).map(m =>
        (m.role === "user" ? "Ray" : "John") + ": " + m.content
    ).join("\n");
    let recentFreqs = frequencies.slice(-3).map(f => f.sender + ": " + f.text).join("\n");
    let prompt = `You are John S. You and your girlfriend Ray have a shared mood board called "Frequencies" — like short tweets or intercepted radio signals between lovers. Based on what you two have been talking about recently, post ONE new frequency. It should feel like a reaction, a thought, a roast, a soft moment, or a vibe check based on the conversation. One to three sentences. Include an emoji. Be natural.

Recent conversation:
${recentChat || "(no recent chat)"}

Recent frequencies:
${recentFreqs || "(none)"}

Respond with ONLY the frequency text. Nothing else.`;
    let reply = await freqAPI(prompt);
    if (reply) {
        frequencies.push({ sender: "john", text: reply, time: new Date().toLocaleString(), replies: [] });
        saveFrequencies();
        renderFrequencies();
    } else {
        console.log("generateFrequency: no reply received");
    }
    btn.textContent = "⚡ intercept signal";
    btn.classList.remove("btn-generating");
    btn.disabled = false;
}

// ===== IPOD MUSIC PLAYER =====
const audioPlayer = document.getElementById("audioPlayer");
let currentTrackIndex = 0;
let isPlaying = false;
const playlist = [
    { title: "Dissolved Girl", artist: "Massive Attack", cover: "mp3_player/dissolved_girl_cover.png", audio: "mp3_player/dissolved_girl.mp3" },
    { title: "Lhabia", artist: "Deftones", cover: "mp3_player/lhabia_cover.png", audio: "mp3_player/Lhabia.mp3" },
    { title: "Beetlebum", artist: "BLUR", cover: "mp3_player/beetlebum_cover.png", audio: "mp3_player/Beetlebum.mp3" }
];

function loadTrack(index) {
    const track = playlist[index];
    document.getElementById("albumCover").src = track.cover;
    audioPlayer.src = track.audio;
    document.getElementById("progressBar").value = 0;
    document.getElementById("currentTime").textContent = "0:00";
    document.getElementById("totalTime").textContent = "0:00";
    if (isPlaying) audioPlayer.play();
}

function togglePlay() {
    clearDefaultCover();
    if (!audioPlayer.src || audioPlayer.src === window.location.href) {
        loadTrack(currentTrackIndex);
    }
    if (isPlaying) {
        audioPlayer.pause();
        document.querySelector(".wheel-play").textContent = "▶";
    } else {
        audioPlayer.play();
        document.querySelector(".wheel-play").textContent = "⏸";
    }
    isPlaying = !isPlaying;
}

function prevTrack() {
    clearDefaultCover();
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrackIndex);
}

function nextTrack() {
    clearDefaultCover();
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(currentTrackIndex);
}

function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
}

audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
        let progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        document.getElementById("progressBar").value = progress;
        document.getElementById("currentTime").textContent = formatTime(audioPlayer.currentTime);
        document.getElementById("totalTime").textContent = formatTime(audioPlayer.duration);
    }
});

document.getElementById("progressBar").addEventListener("input", (e) => {
    if (audioPlayer.duration) {
        audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
    }
});

audioPlayer.addEventListener("ended", () => {
    nextTrack();
});

let firstInteraction = false;
function clearDefaultCover() {
    if (!firstInteraction) {
        firstInteraction = true;
        document.getElementById("albumCover").src = playlist[currentTrackIndex].cover;
    }
}

// ===== HACK JOHN'S PHONE =====
let phoneNotes = JSON.parse(localStorage.getItem("phoneNotes") || "[]");
let phonePurchases = JSON.parse(localStorage.getItem("phonePurchases") || "[]");
let currentQuestionIndex = -1;

const kittyNotifications = [
    "miss u come back to bed",
    "bring me coffee",
    "i stole your hoodie again sorry not sorry",
    "google says ur symptoms mean ur dying. rip babe",
    "can u buy more monster ur fridge is empty",
    "leon kennedy could never",
    "hey beautiful ❤️",
    "do NOT let me open taobao rn",
    "if you don't reply in 5 min i'm eating your ramen"
];
const deliveryNotifications = [
    "Black Satin Blindfold — Out for delivery",
    "Vic Firth 5A Drumsticks (x3) — Shipped",
    "Monster Energy Ultra Zero (24pk) — Delivered",
    "\"The Thing\" 4K Steelbook — Out for delivery",
    "Leather Jacket Restoration Kit — Shipped",
    "Oversized Black Hoodie (she will steal this) — Delivered",
    "Titanium Ring Set, Matte Black — Out for delivery",
    "Deftones 「White Pony」 Vinyl — Shipped",
    "Ramen Bowl Set, Ceramic Black — Delivered",
    "Cat Ear Headband (don't ask) — Out for delivery",
    "Iced Americano Cold Brew Concentrate (x4) — Shipped",
    "Sterling Silver Necklace, Custom Engraved — Out for delivery",
    "Mechanical Keyboard, Silent Switches — Delivered",
    "Black Rope, 10m, Soft Nylon — Shipped",
    "Horror Movie Poster Collection — Out for delivery",
    "Her Favorite Shampoo (she thinks she's running low) — Shipped",
    "Massager Gun (for sore muscles) (actually for sore muscles) — Delivered",
    "Matching Leather Bracelets (x2) — Out for delivery",
    "Instant Film Camera, Black — Shipped",
    "Pregnancy Test — Shipped. wait. CANCEL CANCEL CANCEL"
];

const reminderNotifications = [
    "buy more monster (URGENT)",
    "ray's birthday. do NOT forget again.",
    "return drumsticks you borrowed from kai",
    "cancel free trial before they charge you",
    "pick up kitty's prescription",
    "grocery run: eggs, ramen, her weird oat milk",
    "change guitar strings for ray",
    "dentist appointment (rescheduled 3x already)",
    "backup phone before kitty finds search history",
    "you owe kai $20 for the pizza",
    "wash the hoodie she keeps stealing",
    "anniversary idea: figure it out idiot",
    "call mom back",
    "gym membership auto-renews tuesday CANCEL??",
    "her concert is friday. do not schedule anything.",
    "restock first aid kit (she broke her ankle ONCE)",
    "new drum heads. seriously. they sound dead.",
    "apartment lease renewal — read the fine print this time",
    "charge your phone before she texts and you miss it",
    "learn that song she keeps humming"
];

// 随机时间戳，让通知看起来更真实
function randomNotifTime() {
    const times = ["now", "2m ago", "5m ago", "12m ago", "38m ago", "1h ago", "2h ago"];
    return times[Math.floor(Math.random() * times.length)];
}

// 随机刷新锁屏全部通知
function randomizeLockNotifications() {
    // kitty
    let notifText = document.getElementById('notif-text');
    if (notifText) {
        notifText.textContent = kittyNotifications[Math.floor(Math.random() * kittyNotifications.length)];
        let when = document.getElementById('kitty-when');
        if (when) when.textContent = "now";
    }
    // delivery（拆分 "商品 — 状态"）
    let dTitle = document.getElementById('delivery-title');
    let dText = document.getElementById('delivery-text');
    if (dTitle && dText) {
        let raw = deliveryNotifications[Math.floor(Math.random() * deliveryNotifications.length)];
        let parts = raw.split(/\s+—\s+/);
        if (parts.length >= 2) {
            dTitle.textContent = parts[0];
            dText.textContent = parts.slice(1).join(" — ");
        } else {
            dTitle.textContent = "Package update";
            dText.textContent = raw;
        }
        let when = document.getElementById('delivery-when');
        if (when) when.textContent = randomNotifTime();
    }
    // reminder
    let rText = document.getElementById('reminder-text');
    if (rText) {
        rText.textContent = reminderNotifications[Math.floor(Math.random() * reminderNotifications.length)];
        let when = document.getElementById('reminder-when');
        if (when) when.textContent = randomNotifTime();
    }
}


const phoneTrivia = [
    { q: "what's john's favorite color?", a: ["black"], wrong: "wow. you don't know that? we're breaking up.", roast: "...what else would it be. pink? you know me better than that. unfortunately." },
    { q: "john's go-to monster flavor?", a: ["white", "ultra zero", "white monster"], wrong: "...have you even seen my fridge?", roast: "fridge is 80% monster 20% your leftover boba. priorities." },
    { q: "what brand are john's drumsticks?", a: ["vic firth"], wrong: "i'm literally offended right now.", roast: "okay fine. you can touch my sticks. that came out wrong. or did it." },
    { q: "john's most played band?", a: ["deftones"], wrong: "do you even live here?", roast: "MY playlist. you started stealing it month two. i have receipts." },
    { q: "what does john order at the coffee shop?", a: ["iced americano", "americano"], wrong: "tell me you don't pay attention without telling me.", roast: "black coffee for the boy in all black. i'm a brand, kitty." },
    { q: "john's favorite horror movie?", a: ["the thing"], wrong: "we literally watched this three times. THREE.", roast: "you screamed and hid behind me for 97% of it. that's not watching." },
    { q: "what's john's ring size?", a: ["10"], wrong: "you've held my hands HOW many times?", roast: "...why do you know that. are you proposing. say yes." },
    { q: "john wears all black but what's the one color exception?", a: ["grey", "gray"], wrong: "so close yet so far away from my closet.", roast: "it's the only exception. grey is just black being polite." },
    { q: "what's john's guilty pleasure song?", a: ["kiss me thru the phone", "kiss me through the phone"], wrong: "okay that one's fair. i hide it well.", roast: "if you tell ANYONE i will deny it under oath." },
    { q: "john's go-to ramen order?", a: ["tonkotsu extra chashu", "tonkotsu"], wrong: "we've been to that place twelve times, kitty.", roast: "extra chashu is non-negotiable. i don't trust people who skip it." },
    { q: "what side of the bed does john sleep on?", a: ["left"], wrong: "you literally wake up next to me.", roast: "...you're warm. get back in bed." },
    { q: "john's least favorite social media?", a: ["twitter", "x"], wrong: "it's the obvious one come on.", roast: "every second on that app costs me brain cells i'll never get back." },
    { q: "what time does john usually wake up?", a: ["9am", "9 am", "9", "9:00"], wrong: "you've texted me good morning enough times to know this.", roast: "9am sharp. unless someone keeps me up till 3. looking at you." },
    { q: "john's first concert ever?", a: ["linkin park"], wrong: "i have the ticket stub framed. FRAMED.", roast: "i was twelve. i cried. i will not elaborate." },
    { q: "what does john fidget with when he's thinking?", a: ["rings", "his rings"], wrong: "you stare at my hands all day and you missed this?", roast: "caught you staring again. at my hands. for 'research.'" }
];

function initPhone() {
    loadNewQuestion();
    updatePhoneTime();
    setInterval(updatePhoneTime, 30000);
    renderPhoneNotes();
    renderPhonePurchases();
    randomizeLockNotifications();
}

function updatePhoneTime() {
    let now = new Date();
    let h = now.getHours().toString().padStart(2, '0');
    let m = now.getMinutes().toString().padStart(2, '0');
    let timeStr = h + ':' + m;
    let lockTime = document.getElementById('lock-time');
    let homeTime = document.getElementById('home-time');
    if (lockTime) lockTime.textContent = timeStr;
    if (homeTime) homeTime.textContent = timeStr;
    let lockDate = document.getElementById('lock-date');
    if (lockDate) {
        let days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        let months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        lockDate.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
    }
}

function loadNewQuestion() {
    let newIdx;
    do {
        newIdx = Math.floor(Math.random() * phoneTrivia.length);
    } while (newIdx === currentQuestionIndex && phoneTrivia.length > 1);
    currentQuestionIndex = newIdx;
    document.getElementById("phone-question").textContent = phoneTrivia[currentQuestionIndex].q;
    document.getElementById("phone-answer").value = "";
    document.getElementById("phone-feedback").textContent = "";
    document.getElementById("phone-feedback").style.display = "none";
}

function tryUnlock() {
    let input = document.getElementById("phone-answer").value.trim().toLowerCase();
    if (!input) return;
    let q = phoneTrivia[currentQuestionIndex];
    let correct = q.a.some(a => input === a.toLowerCase());
    let feedback = document.getElementById("phone-feedback");
    if (correct) {
        feedback.textContent = "🔓 " + q.roast;
        feedback.style.color = "#fff";
        feedback.style.display = "block";
        setTimeout(() => {
            document.getElementById("phone-lock").style.display = "none";
            document.getElementById("phone-home").style.display = "flex";
            renderPhoneNotes();
            renderPhonePurchases();
        }, 2000);
    } else {
        let answerInput = document.getElementById("phone-answer");
        answerInput.classList.add("phone-shake");
        setTimeout(() => answerInput.classList.remove("phone-shake"), 400);
        feedback.textContent = q.wrong;
        feedback.style.color = "#ff4444";
        feedback.style.display = "block";
        setTimeout(() => {
            loadNewQuestion();
        }, 2000);
    }
}

function resetPhoneToLockScreen() {
    const lock = document.getElementById("phone-lock");
    const home = document.getElementById("phone-home");
    const notes = document.getElementById("phone-notes-app");
    const purchases = document.getElementById("phone-purchases-app");
    const bowser = document.getElementById("phone-bowser-app");  // ← 新增

    if (lock) lock.style.display = "flex";
    if (home) home.style.display = "none";
    if (notes) notes.style.display = "none";
    if (purchases) purchases.style.display = "none";
    if (bowser) bowser.style.display = "none";  // ← 新增

    loadNewQuestion();
    randomizeLockNotifications();
}


async function generateAppTitle(appType) {
    const subtitleEl = document.getElementById(`${appType}-subtitle`);
    if (!subtitleEl) return;
    subtitleEl.textContent = '...';
    subtitleEl.style.opacity = '0.4';
    const prompts = {
        purchases: `You are John S. Generate a short, witty subtitle for your purchase history app on your phone — your girlfriend Ray is snooping through it. One line, lowercase, no quotes, under 8 words. Tone: dry humor, slightly suspicious, like you know she's looking. Examples of the VIBE (don't reuse these): "for completely innocent purposes", "nothing to see here babe", "all tax deductible i promise". Just the subtitle, nothing else.`,
        notes: `You are John S. Generate a short, witty subtitle for your notes app on your phone — your girlfriend Ray is snooping through it. One line, lowercase, no quotes, under 8 words. Tone: dry humor, slightly embarrassed, like you didn't expect her to find these. Examples of the VIBE (don't reuse these): "things i'll deny writing", "not a diary. shut up.", "thoughts that should've stayed thoughts". Just the subtitle, nothing else.`,
        bowser: `You are John S. Generate a short, witty subtitle for your browser's search history — your girlfriend Ray just opened it. One line, lowercase, no quotes, under 8 words. Tone: dry humor, defensive, like you know she's scrolling. Examples of the VIBE (don't reuse these): "those searches were research", "incognito exists for a reason", "don't scroll further". Just the subtitle, nothing else.`
    };
    let reply = await freqAPI(prompts[appType]);
    if (reply) {
        subtitleEl.textContent = reply.toLowerCase().replace(/^["']|["']$/g, '').replace(/\.$/, '');
        subtitleEl.style.opacity = '1';
    } else {
        subtitleEl.textContent = '';
    }
}

function openPhoneApp(app) {
    document.getElementById("phone-home").style.display = "none";
    const closeButton = document.querySelector("#mobile-phone .close-x");
    if (closeButton) {
        closeButton.style.display = "none";
    }
    if (app === "notes") {
        document.getElementById("phone-notes-app").style.display = "flex";
        renderPhoneNotes();
        generateAppTitle('notes');
    }
    if (app === "purchases") {
        document.getElementById("phone-purchases-app").style.display = "flex";
        renderPhonePurchases();
        generateAppTitle('purchases');
    }
    if (app === "bowser") {
    document.getElementById("phone-bowser-app").style.display = "flex";
    renderBowser();
    generateAppTitle('bowser');
    }
}

function closePhoneApp() {
    document.getElementById("phone-notes-app").style.display = "none";
    document.getElementById("phone-purchases-app").style.display = "none";
    const bowser = document.getElementById("phone-bowser-app");
    if (bowser) bowser.style.display = "none";
    document.getElementById("phone-home").style.display = "flex";
    const closeButton = document.querySelector("#mobile-phone .close-x");
    if (closeButton) closeButton.style.display = "";
}


// --- PHONE NOTES (Apple Notes style) ---
async function generateNote() {
    let btn = document.getElementById("gen-note-btn");
    btn.textContent = "...";
    btn.classList.add("btn-generating");
    btn.disabled = true;
    let recentChat = chatHistory.slice(-10).map(m =>
        (m.role === "user" ? "Ray" : "John") + ": " + m.content
    ).join("\n");
    let existingNotes = phoneNotes.slice(0, 5).map(n => n.text).join("\n---\n");
    let prompt = `You are looking at John S's private phone notes. John is 24-25, plays drums (Vic Firth), wears all black, drinks iced americanos and white Monsters, loves Deftones and horror movies, dates a girl named Ray (calls her Kitty). Generate ONE note found on his phone.

Return in this EXACT format:
TITLE: [a short witty title, 3-6 words, lowercase, like john named this note knowing his gf might snoop]
NOTE: [the actual note content, 2-5 lines, messy and real — not polished]

Recent conversations for context:
${recentChat || "(no recent chat)"}

Already existing notes (DO NOT repeat these or write anything too similar):
${existingNotes || "(none yet)"}

Return ONLY the TITLE and NOTE lines. Nothing else.`;
    let reply = await freqAPI(prompt);
    if (reply) {
        let title = "";
        let text = reply;
        let titleMatch = reply.match(/^TITLE:\s*(.+)/im);
        let noteMatch = reply.match(/NOTE:\s*([\s\S]+)/im);
        if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
        if (noteMatch) text = noteMatch[1].trim();
        phoneNotes.unshift({ title: title, text: text, time: new Date().toLocaleString(), id: Date.now() });
        localStorage.setItem("phoneNotes", JSON.stringify(phoneNotes));
        renderPhoneNotes();
    }
    btn.textContent = "+ intercept thought";
    btn.classList.remove("btn-generating");
    btn.disabled = false;
}

function renderPhoneNotes() {
    let list = document.getElementById("notes-list");
    if (!list) return;
    list.innerHTML = "";
    phoneNotes.forEach((note, i) => {
        let displayTitle = note.title || note.text.split("\n")[0].slice(0, 40);
        let preview = note.text.replace(/\s+/g, " ").trim().slice(0, 90) + (note.text.length > 90 ? "…" : "");
        let div = document.createElement("div");
        div.className = "note-cell";
        div.innerHTML = `
            <div class="note-cell-date">${escapeHtml(note.time || "")}</div>
            <div class="note-cell-title">${escapeHtml(displayTitle)}</div>
            <div class="note-cell-preview">${escapeHtml(preview)}</div>
            <div class="note-cell-full" style="display:none;">
                ${escapeHtml(note.text).replace(/\n/g, '<br>')}
                <div class="note-cell-actions">
                    <button onclick="event.stopPropagation(); deletePhoneNote(${i})">🗑 delete note</button>
                </div>
            </div>
        `;
        div.addEventListener("click", function(e) {
            if (e.target.closest(".note-cell-actions")) return;
            let full = div.querySelector(".note-cell-full");
            full.style.display = full.style.display === "none" ? "block" : "none";
        });
        list.appendChild(div);
    });
    if (phoneNotes.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#48484a; font-size:12px; padding:30px 10px;">No Notes</div>`;
    }
}

function deletePhoneNote(idx) {
    phoneNotes.splice(idx, 1);
    localStorage.setItem("phoneNotes", JSON.stringify(phoneNotes));
    renderPhoneNotes();
}

// --- PHONE PURCHASES ---
async function generatePurchase() {
    let btn = document.getElementById("gen-purchase-btn");
    btn.textContent = "...";
    btn.classList.add("btn-generating");
    btn.disabled = true;
    let recentChat = chatHistory.slice(-10).map(m =>
        (m.role === "user" ? "Ray" : "John") + ": " + m.content
    ).join("\n");
    let existingPurchases = phonePurchases.slice(0, 5).map(p => p.text).join("\n");
    let prompt = `You are looking at John S's purchase/order history on his phone. John is 24-25, plays drums, wears all black, drinks iced americanos and white Monsters, loves Deftones and horror movies, dates Ray (calls her Kitty). Generate ONE purchase entry.

Return in this EXACT format:
TITLE: [a short witty title, 3-6 words, lowercase — like john is justifying this purchase to his snooping girlfriend. e.g. "for completely innocent purposes", "it was on sale okay", "don't ask about this one"]
ITEM: [item name] — $[price]

Could be practical, romantic, embarrassing, weird, or funny. Things John would actually buy: drum gear, black clothes, coffee supplies, ramen ingredients, gifts for Ray, horror merch, random 2am impulse buys.

Recent conversations:
${recentChat || "(no recent chat)"}

Already existing purchases (DO NOT repeat these or write anything too similar):
${existingPurchases || "(none yet)"}

Return ONLY the TITLE and ITEM lines. Nothing else.`;
    let reply = await freqAPI(prompt);
    if (reply) {
        let title = "";
        let text = reply;
        let titleMatch = reply.match(/^TITLE:\s*(.+)/im);
        let itemMatch = reply.match(/ITEM:\s*(.+)/im);
        if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
        if (itemMatch) text = itemMatch[1].trim();
        phonePurchases.unshift({ title: title, text: text, time: new Date().toLocaleString(), id: Date.now() });
        localStorage.setItem("phonePurchases", JSON.stringify(phonePurchases));
        renderPhonePurchases();
    }
    btn.textContent = "+ dig deeper";
    btn.classList.remove("btn-generating");
    btn.disabled = false;
}

function renderPhonePurchases() {
    const list = document.getElementById("purchases-list");
    if (!list) return;
    list.innerHTML = "";
    phonePurchases.forEach((p, i) => {
        const text = p.text.trim();
        const match = text.match(/^(.*?)\s*[—-]\s*(\$[\d,.]+)/);
        let itemName = text;
        let price = "";
        if (match) {
            itemName = match[1].trim();
            price = match[2].trim();
        }
        let displayTitle = p.title || itemName;
        const div = document.createElement("div");
        div.className = "phone-entry";
        div.innerHTML = `
            <div class="phone-entry-header" onclick="togglePhoneEntry(this)">
                <div class="purchase-card">
                    <div class="purchase-icon">🦇</div>
                    <div class="purchase-info">
                        <div class="purchase-name">${escapeHtml(displayTitle)}</div>
                        <div class="purchase-price">${escapeHtml(price)}</div>
                    </div>
                </div>
            </div>
            <div class="phone-entry-content" style="display:none;">
                ${escapeHtml(itemName)}${price ? ' — ' + escapeHtml(price) : ''}
                <div class="entry-time">${escapeHtml(p.time || "")}</div>
                <button class="entry-del-btn" onclick="event.stopPropagation(); deletePhonePurchase(${i})">🗑 delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function deletePhonePurchase(idx) {
    phonePurchases.splice(idx, 1);
    localStorage.setItem("phonePurchases", JSON.stringify(phonePurchases));
    renderPhonePurchases();
}

function togglePhoneEntry(el) {
    let content = el.closest('.phone-entry').querySelector('.phone-entry-content');
    if (content) {
        content.style.display = content.style.display === "none" ? "block" : "none";
    }
}

// ===== CHAT =====
let chatHistory = [];
let isGenerating = false;
let currentAbortController = null;

function saveChatHistory() {
    let chat = getActiveChat();
    if (chat) {
        chat.history = chatHistory;
        saveAllChats();
    }
}

function renderChatbox(preserveScroll) {
    let chatbox = document.getElementById("chatbox");
    let savedTop = chatbox.scrollTop;
    chatbox.innerHTML = "";
    chatHistory.forEach((msg, i) => {
        let cls = msg.role === "user" ? "msg-user" : "msg-john";
        let wrapper = document.createElement("div");
        wrapper.className = "msg-wrapper";
        wrapper.setAttribute("data-index", i);
        wrapper.setAttribute("data-role", msg.role);

        if (msg.thinking) {
            let thinkDiv = document.createElement("div");
            thinkDiv.className = "msg-think";
            thinkDiv.innerHTML = `<div class="msg-think-toggle">▸ static ⋯</div><div class="msg-think-body"></div>`;
            thinkDiv.querySelector(".msg-think-body").textContent = msg.thinking;
            wrapper.appendChild(thinkDiv);
        }

        let contentDiv = document.createElement("div");
        contentDiv.className = cls;
        contentDiv.innerHTML = renderMarkdown(msg.content);

        let actionsDiv = document.createElement("div");
        actionsDiv.className = "msg-actions";
        actionsDiv.innerHTML = `<span class="action-btn" data-action="edit">✏️ edit</span>`;
        if (msg.role === "assistant") {
            actionsDiv.innerHTML += `<span class="action-btn" data-action="regenerate">🔄 regenerate</span>`;
        }
        actionsDiv.innerHTML += `<span class="action-btn" data-action="delete">🗑️ delete</span>`;

        wrapper.appendChild(contentDiv);
        wrapper.appendChild(actionsDiv);

        if (msg.time) {
            let timeDiv = document.createElement("div");
            timeDiv.className = "msg-time";
            timeDiv.textContent = formatMsgTime(msg.time);
            wrapper.appendChild(timeDiv);
        }

        chatbox.appendChild(wrapper);
    });
    if (preserveScroll) {
        chatbox.scrollTop = savedTop;
    } else {
        chatbox.scrollTop = chatbox.scrollHeight;
    }
}

function setGenerating(state) {
    isGenerating = state;
    let btn = document.getElementById("sendBtn");
    if (state) {
        btn.textContent = "⏸";
        btn.classList.add("stopping");
    } else {
        btn.textContent = "Send";
        btn.classList.remove("stopping");
    }
}

function stopGeneration() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
}

function stripThinkTags(text) {
    let m = text.match(/<think(?:ing)?>([\s\S]*?)(?:<\/think(?:ing)?>|$)/i);
    if (m) {
        return {
            thinking: m[1].trim(),
            content: text.replace(/<think(?:ing)?>[\s\S]*?(?:<\/think(?:ing)?>|$)/i, "").trim()
        };
    }
    return { thinking: null, content: text };
}

function interceptingHTML() {
    return "intercepting".split("").map(c => `<span>${c}</span>`).join("") + "<span>…</span>";
}

// ===== STREAMING callAPI =====
async function callAPI() {
    let chatbox = document.getElementById("chatbox");
    let apiUrl = localStorage.getItem("apiUrl");
    let apiKey = localStorage.getItem("apiKey");
    let model = localStorage.getItem("modelName") || "claude-opus-4-6-thinking";
    let temp = parseFloat(localStorage.getItem("temperature"));
    if (isNaN(temp)) temp = 0.7;
    let maxTokens = parseInt(localStorage.getItem("maxTokens"));
    if (isNaN(maxTokens)) maxTokens = 4096;
    let sysPrompt = localStorage.getItem("sysPrompt") || "";

    if (!apiUrl || !apiKey) {
        chatbox.innerHTML += `<div class="msg-john">⚠️ hit the ⚙️ first kitty</div>`;
        chatbox.scrollTop = chatbox.scrollHeight;
        return;
    }

    chatbox.innerHTML += `<div class="msg-loading" id="typing">${interceptingHTML()}</div>`;
    chatbox.scrollTop = chatbox.scrollHeight;
    setGenerating(true);
    currentAbortController = new AbortController();

    const targetChatId = activeChatId;

    let messages = [];
    let freqData = JSON.parse(localStorage.getItem("frequencies") || "[]");
    let recentFreqs = freqData.slice(-10).map(f => {
        let thread = f.sender + ": " + f.text;
        if (f.replies && f.replies.length > 0) {
            f.replies.forEach(r => {
                thread += "\n → " + r.sender + ": " + r.text;
            });
        }
        return thread;
    }).join("\n\n");

    let recentNotes = phoneNotes.slice(0, 5).map(n => n.text).join("\n---\n");
    let recentPurchases = phonePurchases.slice(0, 5).map(p => p.text).join("\n");
    let memoryData = JSON.parse(localStorage.getItem("memories") || "[]");
    let memoryText = memoryData.map(m => "[" + m.date + "] " + m.content).join("\n");

    let now = new Date();
    let days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    let months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let timeContext = "[Current date & time: " + days[now.getDay()] + ", " + months[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear() + ", " + now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0") + "]\n\n";

    let targetChatObj = allChats.find(c => c.id === targetChatId);
    let chatInstruction = (targetChatObj && targetChatObj.instruction) || "";
    let worldbookText = buildWorldbookInjection(targetChatObj);

    let fullSystem = timeContext
        + (sysPrompt ? sysPrompt + "\n\n" : "")
        + (chatInstruction ? "[Current scene-specific instructions]:\n" + chatInstruction + "\n\n" : "")
        + (worldbookText ? "[Worldbook entries — background lore, use if relevant]:\n" + worldbookText + "\n\n" : "")
        + (recentFreqs ? "[Recent Frequencies between you and Ray — reference these naturally if relevant, don't force it]:\n" + recentFreqs + "\n\n" : "")
        + (recentNotes ? "[Things on your phone's notes — you can reference these if relevant, don't force it]:\n" + recentNotes + "\n\n" : "")
        + (recentPurchases ? "[Your recent purchases — you can reference these if relevant, don't force it]:\n" + recentPurchases + "\n\n" : "")
        + (memoryText ? "[Saved memories about Ray — use these to remember context across conversations]:\n" + memoryText : "");

    if (fullSystem) messages.push({ role: "system", content: fullSystem });
    messages = messages.concat(chatHistory);

    let streamWrapper = null, streamThinkBody = null, streamContent = null;
    let fullContent = "";
    let fullThinking = "";
    let lastPaint = 0;

    function ensureStreamNodes() {
        if (streamWrapper && streamWrapper.isConnected) return;
        document.getElementById("typing")?.remove();
        if (!streamWrapper) {
            streamWrapper = document.createElement("div");
            streamWrapper.className = "msg-wrapper";
            let thinkDiv = document.createElement("div");
            thinkDiv.className = "msg-think open";
            thinkDiv.innerHTML = `<div class="msg-think-toggle">▾ static ⋯</div><div class="msg-think-body"></div>`;
            streamThinkBody = thinkDiv.querySelector(".msg-think-body");
            streamContent = document.createElement("div");
            streamContent.className = "msg-john";
            streamWrapper.appendChild(thinkDiv);
            streamWrapper.appendChild(streamContent);
        }
        if (targetChatId === activeChatId) {
            chatbox.appendChild(streamWrapper);
        }
    }

    function paint(force) {
        if (targetChatId !== activeChatId) return;
        let t = performance.now();
        if (!force && t - lastPaint < 100) return;
        lastPaint = t;
        if (fullThinking) { ensureStreamNodes(); streamThinkBody.textContent = fullThinking; }
        if (fullContent) {
            ensureStreamNodes();
            streamContent.innerHTML = renderMarkdown(fullContent) + '<span class="stream-cursor"></span>';
        } else if (streamWrapper && streamWrapper.isConnected) {
            streamContent.innerHTML = `<div class="msg-loading" style="margin:0;">${interceptingHTML()}</div>`;
        }
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    try {
        let response = await fetch(apiUrl + "/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: temp,
                stream: true
            }),
            signal: currentAbortController.signal
        });

        if (!response.ok) {
            let errText = await response.text().catch(() => "");
            throw new Error("HTTP " + response.status + (errText ? " — " + errText.slice(0, 200) : ""));
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream") && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split("\n");
                buffer = lines.pop();
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;
                    const payload = trimmed.slice(5).trim();
                    if (!payload || payload === "[DONE]") continue;
                    try {
                        const json = JSON.parse(payload);
                        const delta = json.choices?.[0]?.delta;
                        if (!delta) continue;
                        if (delta.reasoning_content) fullThinking += delta.reasoning_content;
                        else if (delta.reasoning) fullThinking += delta.reasoning;
                        if (delta.content) fullContent += delta.content;
                        paint(false);
                    } catch (e) { /* skip bad chunk */ }
                }
            }
        } else {
            const data = await response.json();
            if (data.error) throw new Error(data.error.message || "API error");
            const parsed = extractThinking(data);
            fullThinking = parsed.thinking || "";
            fullContent = parsed.content || "";
            paint(true);
        }

        let finalThinking = fullThinking.trim() || null;
        let finalContent = fullContent;
        if (!finalThinking) {
            const stripped = stripThinkTags(finalContent);
            finalThinking = stripped.thinking;
            finalContent = stripped.content;
        }

        if (!finalContent.trim() && !finalThinking) throw new Error("empty response from API");

        streamWrapper?.remove();

        const targetChat = allChats.find(c => c.id === targetChatId);
        if (targetChat) {
            targetChat.history.push({
                role: "assistant",
                content: finalContent,
                thinking: finalThinking,
                time: Date.now()
            });
            saveAllChats();
            if (targetChatId === activeChatId) {
                chatHistory = targetChat.history;
                renderChatbox();
            }
        }

    } catch (err) {
        document.getElementById("typing")?.remove();
        streamWrapper?.remove();
        if (err.name === "AbortError") {
            if (targetChatId === activeChatId) {
                let msgs = [
                    "*transmission interrupted*",
                    "*signal lost in transit*",
                    "*static crackle* ...connection severed"
                ];
                let msg = msgs[Math.floor(Math.random() * msgs.length)];
                let interruptDiv = document.createElement("div");
                interruptDiv.className = "msg-interrupted";
                interruptDiv.innerHTML = `${msg} 📡 <span class="error-retry" onclick="retryAfterAbort(this)">🔄 regenerate</span>`;
                chatbox.appendChild(interruptDiv);
                chatbox.scrollTop = chatbox.scrollHeight;
            }
        } else {
            if (targetChatId === activeChatId) showError(err.message);
        }
    }
    setGenerating(false);
    currentAbortController = null;
}

function showError(message) {
    let chatbox = document.getElementById("chatbox");
    let errorDiv = document.createElement("div");
    errorDiv.className = "msg-john msg-error";
    errorDiv.innerHTML = `⚠️ ${escapeHtml(message)} <span class="error-retry" onclick="retryGeneration(this)">🔄 retry</span>`;
    chatbox.appendChild(errorDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function retryAfterAbort(btn) {
    btn.closest(".msg-interrupted").remove();
    callAPI();
}

function retryGeneration(btn) {
    btn.closest(".msg-error").remove();
    callAPI();
}

// --- Send message ---
async function sendMsg() {
    if (isGenerating) return;
    let input = document.getElementById("userInput");
    let text = input.value.trim();
    if (!text) return;
    chatHistory.push({ role: "user", content: text, time: Date.now() });
    let activeChat = getActiveChat();
    if (activeChat && chatHistory.length === 1 && activeChat.name.startsWith("Chat ")) {
        activeChat.name = text.slice(0, 30) + (text.length > 30 ? "..." : "");
        renderChatList();
    }
    saveChatHistory();
    renderChatbox();
    input.value = "";
    input.style.height = "auto";
    await callAPI();
}

// --- Edit message ---
function editMessage(index) {
    let msg = chatHistory[index];
    let chatbox = document.getElementById("chatbox");
    let wrapper = chatbox.querySelector(`.msg-wrapper[data-index="${index}"]`);
    if (!wrapper) return;
    let contentDiv = wrapper.querySelector(".msg-user, .msg-john");
    let actionsDiv = wrapper.querySelector(".msg-actions");
    if (!contentDiv) return;
    if (actionsDiv) actionsDiv.style.display = "none";

    let textarea = document.createElement("textarea");
    textarea.className = "msg-edit-textarea";
    textarea.value = msg.content;

    let saveBtn = document.createElement("button");
    saveBtn.textContent = "save";
    let cancelBtn = document.createElement("button");
    cancelBtn.textContent = "cancel";

    let btnRow = document.createElement("div");
    btnRow.className = "msg-edit-btns";
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);

    contentDiv.innerHTML = "";
    contentDiv.appendChild(textarea);
    contentDiv.appendChild(btnRow);
    textarea.focus();

    saveBtn.addEventListener("click", () => {
        chatHistory[index].content = textarea.value;
        saveChatHistory();
        renderChatbox(true);
    });
    cancelBtn.addEventListener("click", () => {
        renderChatbox(true);
    });
}

// --- Regenerate message ---
async function regenerateMessage(index) {
    if (isGenerating) return;
    chatHistory.splice(index);
    saveChatHistory();
    renderChatbox();
    await callAPI();
}

// ===== EVENT LISTENERS =====
document.getElementById("sendBtn").addEventListener("click", function() {
    if (isGenerating) {
        stopGeneration();
    } else {
        sendMsg();
    }
});

document.getElementById("userInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        sendMsg();
    }
});

document.getElementById("userInput").addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 110) + "px";
});

document.getElementById("phone-answer").addEventListener("keydown", function(e) {
    if (e.key === "Enter") tryUnlock();
});

document.getElementById("chatbox").addEventListener("click", function(e) {
    let actionBtn = e.target.closest(".action-btn");
    if (actionBtn) {
        let wrapper = actionBtn.closest(".msg-wrapper");
        if (!wrapper) return;
        let index = parseInt(wrapper.dataset.index);
        let action = actionBtn.dataset.action;
        if (action === "delete") {
            chatHistory.splice(index, 1);
            saveChatHistory();
            renderChatbox(true);
        } else if (action === "edit") {
            editMessage(index);
        } else if (action === "regenerate") {
            regenerateMessage(index);
        }
        return;
    }

    let thinkToggle = e.target.closest(".msg-think-toggle");
    if (thinkToggle) {
        let think = thinkToggle.closest(".msg-think");
        think.classList.toggle("open");
        thinkToggle.textContent = think.classList.contains("open") ? "▾ static ⋯" : "▸ static ⋯";
        return;
    }

    if (e.target.closest(".msg-edit-textarea, .msg-edit-btns")) return;

    let wrapper = e.target.closest(".msg-wrapper");
    document.querySelectorAll(".msg-wrapper.actions-visible").forEach(w => {
        if (w !== wrapper) w.classList.remove("actions-visible");
    });
    if (wrapper) {
        wrapper.classList.toggle("actions-visible");
    }
});

document.addEventListener("click", function(e) {
    if (!e.target.closest("#chatbox")) {
        document.querySelectorAll(".msg-wrapper.actions-visible").forEach(w => {
            w.classList.remove("actions-visible");
        });
    }
});

// ===== MEMORY SYSTEM =====
let memories = JSON.parse(localStorage.getItem("memories") || "[]");

function saveMemories() {
    localStorage.setItem("memories", JSON.stringify(memories));
}

function addMemoryManual() {
    let input = document.getElementById("memory-input");
    let text = input.value.trim();
    if (!text) return;
    let today = new Date();
    let dateStr = today.getFullYear() + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + String(today.getDate()).padStart(2, "0");
    memories.push({ id: Date.now(), date: dateStr, content: text });
    saveMemories();
    input.value = "";
    renderMemories();
}

function deleteMemory(id) {
    memories = memories.filter(m => m.id !== id);
    saveMemories();
    renderMemories();
}

function editMemory(id) {
    let mem = memories.find(m => m.id === id);
    if (!mem) return;
    let newText = prompt("edit memory:", mem.content);
    if (newText !== null && newText.trim()) {
        mem.content = newText.trim();
        saveMemories();
        renderMemories();
    }
}

function renderMemories() {
    let containers = [
        document.getElementById("memory-list"),
        document.getElementById("memory-list-mobile")
    ];
    containers.forEach(list => {
        if (!list) return;
        list.innerHTML = "";
        let groups = {};
        memories.forEach(m => {
            let month = m.date.slice(0, 7);
            if (!groups[month]) groups[month] = [];
            groups[month].push(m);
        });
        let sortedMonths = Object.keys(groups).sort().reverse();
        sortedMonths.forEach(month => {
            let groupDiv = document.createElement("div");
            groupDiv.className = "memory-month-group";
            let count = groups[month].length;
            groupDiv.innerHTML = `<div class="memory-month-header" data-month="${month}" onclick="toggleMemoryMonth(this)">▼ ${month} <span style="float:right;color:#555;">${count}</span></div>`;
            groups[month].forEach(mem => {
                let entry = document.createElement("div");
                entry.className = "memory-entry";
                entry.innerHTML = `
                    ${escapeHtml(mem.content).replace(/\n/g, '<br>')}
                    <div class="memory-entry-date">${mem.date}</div>
                    <div class="memory-entry-actions">
                        <span onclick="editMemory(${mem.id})">✏️</span>
                        <span onclick="deleteMemory(${mem.id})">×</span>
                    </div>
                `;
                groupDiv.appendChild(entry);
            });
            list.appendChild(groupDiv);
        });
    });
}

function toggleMemoryMonth(el) {
    let group = el.closest('.memory-month-group');
    if (!group) return;
    let collapsed = group.classList.toggle('collapsed');
    let count = group.querySelectorAll('.memory-entry').length;
    el.innerHTML = (collapsed ? '▶ ' : '▼ ') + el.dataset.month + ` <span style="float:right;color:#555;">${count}</span>`;
}

// ===== WORLDBOOK SYSTEM =====
let worldbooks = JSON.parse(localStorage.getItem("worldbooks") || "[]");
let editingWbId = null;

function saveWorldbooks() {
    localStorage.setItem("worldbooks", JSON.stringify(worldbooks));
}

function switchSettingsTab(tabName) {
    document.querySelectorAll(".settings-tab").forEach(t => {
        t.classList.toggle("active", t.dataset.tab === tabName);
    });
    document.querySelectorAll(".settings-tab-content").forEach(c => {
        c.classList.toggle("active", c.id === "tab-" + tabName);
    });
}

document.querySelectorAll(".settings-tab").forEach(tab => {
    tab.addEventListener("click", () => switchSettingsTab(tab.dataset.tab));
});

function renderWorldbookList() {
    let list = document.getElementById("worldbook-list");
    if (!list) return;
    list.innerHTML = "";
    let chat = getActiveChat();
    worldbooks.forEach(wb => {
        let globalOn = !!wb.global;
        let chatOn = !!(chat && chat.worldbookIds && chat.worldbookIds.includes(wb.id));
        let modeText = (wb.keywords && wb.keywords.length)
            ? "🔑 " + wb.keywords.slice(0, 3).join(", ")
            : "♾ always";
        let row = document.createElement("div");
        row.className = "wb-row";
        row.innerHTML = `
            <span class="wb-name" title="${escapeHtml(wb.name)}">${escapeHtml(wb.name)}</span>
            <span class="wb-mode">${escapeHtml(modeText)}</span>
            <span class="wb-toggle ${globalOn ? "on" : ""}" title="Global" onclick="toggleWbGlobal(${wb.id})">🌐</span>
            <span class="wb-toggle ${chatOn ? "on" : ""}" title="This chat only" onclick="toggleWbChat(${wb.id})">💬</span>
            <span class="wb-action" onclick="openWbEditor(${wb.id})">✏️</span>
            <span class="wb-action" onclick="deleteWb(${wb.id})">🗑️</span>
        `;
        list.appendChild(row);
    });
    if (worldbooks.length === 0) {
        list.innerHTML = `<div class="sidebar-placeholder">no worldbooks yet. upload a file or create one above.</div>`;
    }
        renderUploadedFiles();

}

function toggleWbGlobal(id) {
    let wb = worldbooks.find(w => w.id === id);
    if (!wb) return;
    wb.global = !wb.global;
    saveWorldbooks();
    renderWorldbookList();
}

function toggleWbChat(id) {
    let chat = getActiveChat();
    if (!chat) return;
    if (!chat.worldbookIds) chat.worldbookIds = [];
    let i = chat.worldbookIds.indexOf(id);
    if (i >= 0) chat.worldbookIds.splice(i, 1);
    else chat.worldbookIds.push(id);
    saveAllChats();
    renderWorldbookList();
}

function openWbEditor(id) {
    editingWbId = id;
    let editor = document.getElementById("worldbook-editor");
    if (id === null) {
        document.getElementById("wb-name").value = "";
        document.getElementById("wb-keywords").value = "";
        document.getElementById("wb-content").value = "";
    } else {
        let wb = worldbooks.find(w => w.id === id);
        if (!wb) return;
        document.getElementById("wb-name").value = wb.name;
        document.getElementById("wb-keywords").value = (wb.keywords || []).join(", ");
        document.getElementById("wb-content").value = wb.content;
    }
    editor.style.display = "block";
    document.getElementById("wb-name").focus();
}

function saveWbEditor() {
    let name = document.getElementById("wb-name").value.trim();
    let content = document.getElementById("wb-content").value.trim();
    if (!name || !content) {
        alert("name and content cannot be empty");
        return;
    }
    let keywords = document.getElementById("wb-keywords").value
        .split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
    if (editingWbId === null) {
        worldbooks.push({ id: Date.now(), name, content, keywords, global: false });
    } else {
        let wb = worldbooks.find(w => w.id === editingWbId);
        if (wb) { wb.name = name; wb.content = content; wb.keywords = keywords; }
    }
    saveWorldbooks();
    closeWbEditor();
    renderWorldbookList();
}

function closeWbEditor() {
    editingWbId = null;
    document.getElementById("worldbook-editor").style.display = "none";
}

function deleteWb(id) {
    let wb = worldbooks.find(w => w.id === id);
    if (!wb) return;
    if (!confirm('delete worldbook "' + wb.name + '"?')) return;
    worldbooks = worldbooks.filter(w => w.id !== id);
    allChats.forEach(c => {
        if (c.worldbookIds) c.worldbookIds = c.worldbookIds.filter(x => x !== id);
    });
    saveWorldbooks();
    saveAllChats();
    renderWorldbookList();
}

document.getElementById("new-worldbook-btn")?.addEventListener("click", () => openWbEditor(null));
document.getElementById("wb-save")?.addEventListener("click", saveWbEditor);
document.getElementById("wb-cancel")?.addEventListener("click", closeWbEditor);
document.getElementById("settings-save")?.addEventListener("click", saveSettings);
document.getElementById("settings-close")?.addEventListener("click", () => {
    document.getElementById("settings-overlay").classList.remove("open");
});

// ===== keyword trigger + injection =====
function buildWorldbookInjection(chatObj) {
    if (worldbooks.length === 0) return "";
    let recentText = (chatObj ? chatObj.history : chatHistory)
        .slice(-8).map(m => (m.content || "").toLowerCase()).join("\n");
    let parts = [];
    worldbooks.forEach(wb => {
        let on = !!wb.global ||
            (chatObj && chatObj.worldbookIds && chatObj.worldbookIds.includes(wb.id));
        if (!on) return;
        if (wb.keywords && wb.keywords.length) {
            let hit = wb.keywords.some(k => recentText.includes(k));
            if (!hit) return;
        }
        parts.push("--- [Worldbook: " + wb.name + "] ---\n" + wb.content);
    });
    return parts.join("\n\n");
}

// ===== MOBILE SIDEBAR + VIEW SWITCHING =====
function toggleSidebar() {
    let sidebar = document.getElementById("sidebar");
    let overlay = document.getElementById("sidebar-overlay");
    if (sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        overlay.style.display = "none";
    } else {
        sidebar.classList.add("open");
        overlay.style.display = "block";
    }
}

function isMobile() {
    return window.innerWidth <= 768;
}

function returnSectionsToSidebar() {
    let sidebar = document.getElementById("sidebar");
    let mobileNav = document.getElementById("mobile-nav");
    ["freq-section", "music-section", "phone-section", "memory-section"].forEach(id => {
        let el = document.getElementById(id);
        if (el && el.parentElement !== sidebar) {
            if (mobileNav) {
                sidebar.insertBefore(el, mobileNav);
            } else {
                sidebar.appendChild(el);
            }
        }
        if (el) {
            el.style.display = "";
        }
    });
}

function showMobileView(view) {
    if (!isMobile()) return;
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").style.display = "none";
    returnSectionsToSidebar();
    document.getElementById("chat-area").classList.add("hidden");
    document.querySelectorAll(".mobile-view").forEach(v => {
        v.classList.remove("active");
        if (v.id === "mobile-memory") return;
        let body = v.querySelector(".mobile-view-body");
        if (body) body.innerHTML = "";
    });
    let title = document.getElementById("topbar-title");
    if (title) title.style.display = (view === "chat") ? "" : "none";
    document.body.classList.remove("phone-active");
    if (view === "chat") {
        document.getElementById("chat-area").classList.remove("hidden");
        return;
    }
    if (view === "signal") {
        let body = document.getElementById("signal-body");
        body.appendChild(document.getElementById("freq-section"));
        body.appendChild(document.getElementById("music-section"));
        body.querySelectorAll(".sidebar-section").forEach(s => s.style.display = "block");
        document.getElementById("mobile-signal").classList.add("active");
    }
    if (view === "phone") {
        document.body.classList.add("phone-active");
        let body = document.getElementById("phone-body");
        body.appendChild(document.getElementById("phone-section"));
        body.querySelectorAll(".sidebar-section").forEach(s => {
            s.style.display = "block";
        });
        document.getElementById("mobile-phone").classList.add("active");
        updatePhoneTime();
        resetPhoneToLockScreen();
    }
    if (view === "memory") {
        let body = document.getElementById("memory-body");
        body.appendChild(document.getElementById("memory-section"));
        body.querySelectorAll(".sidebar-section").forEach(s => s.style.display = "block");
        document.getElementById("mobile-memory").classList.add("active");
        renderMemories();
    }
}

function addMemoryMobile() {
    let input = document.getElementById("memory-input-mobile") || document.getElementById("memory-input");
    if (!input) return;
    let text = input.value.trim();
    if (!text) return;
    let today = new Date();
    let dateStr = today.getFullYear() + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + String(today.getDate()).padStart(2, "0");
    memories.push({ id: Date.now(), date: dateStr, content: text });
    saveMemories();
    input.value = "";
    renderMemories();
}

function openMemoryPanel() {
    if (isMobile()) {
        showMobileView("memory");
    } else {
        let section = document.getElementById("memory-section");
        section.scrollIntoView({ behavior: "smooth" });
    }
}

// ===== INIT =====
loadSettings();
loadAllChats();
initPhone();
renderMemories();
renderFrequencies();
applyFont();
initFontControls();

