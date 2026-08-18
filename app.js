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
    document.getElementById("settings-overlay").classList.remove("open");
    renderPresetDropdown();
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

    // auto-select the one we just saved
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

document.getElementById("presetSelect").addEventListener("change", function() {
    let idx = this.value;
    if (idx === "") return;

    let p = apiPresets[idx];
    document.getElementById("apiUrl").value = p.url || "";
    document.getElementById("apiKey").value = p.key || "";
    document.getElementById("modelName").value = p.model || "";
    document.getElementById("maxTokens").value = p.maxTokens || "4096";
    document.getElementById("temperature").value = p.temperature || "0.7";

    // hide model dropdown if visible
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
        });select.style.display = "block";

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
        apiUrl: localStorage.getItem("apiUrl") || "",
        apiKey: localStorage.getItem("apiKey") || "",
        modelName: localStorage.getItem("modelName") || "",
        maxTokens: localStorage.getItem("maxTokens") || "",
        temperature: localStorage.getItem("temperature") || "",
        sysPrompt: localStorage.getItem("sysPrompt") || "",
        apiPresets: JSON.parse(localStorage.getItem("apiPresets") || "[]")
    };

    let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = "rectangle-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", function() {
    let file = this.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);

            if (!confirm("this will overwrite all current data. continue?")) return;

            if (data.allChats) localStorage.setItem("allChats", JSON.stringify(data.allChats));
            if (data.activeChatId) localStorage.setItem("activeChatId", data.activeChatId);
            if (data.frequencies) localStorage.setItem("frequencies", JSON.stringify(data.frequencies));
            if (data.apiUrl) localStorage.setItem("apiUrl", data.apiUrl);
            if (data.apiKey) localStorage.setItem("apiKey", data.apiKey);
            if (data.modelName) localStorage.setItem("modelName", data.modelName);
            if (data.maxTokens) localStorage.setItem("maxTokens", data.maxTokens);
            if (data.temperature) localStorage.setItem("temperature", data.temperature);
            if (data.sysPrompt) localStorage.setItem("sysPrompt", data.sysPrompt);
            if (data.apiPresets) localStorage.setItem("apiPresets", JSON.stringify(data.apiPresets));

            location.reload();
        } catch (err) {
            alert("invalid file: " + err.message);
        }
    };
    reader.readAsText(file);

    this.value = "";
});


document.getElementById("modelSelect").addEventListener("change", function() {
    if (this.value) {
        document.getElementById("modelName").value = this.value;
    }
});

function openSettings() {
    document.getElementById("settings-overlay").classList.add("open");
}

document.getElementById("settings-save").addEventListener("click", saveSettings);
document.getElementById("settings-close").addEventListener("click", () => {
    document.getElementById("settings-overlay").classList.remove("open");
});


// ===== FILE UPLOAD =====
const fileArea = document.getElementById("file-upload-area");
const fileInput = document.getElementById("sysFiles");
const fileList = document.getElementById("file-list");

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

function handleFiles(files) {
    let names = [];
    let allText = document.getElementById("sysPrompt").value;

    Array.from(files).forEach(file => {
        names.push(file.name);
        let reader = new FileReader();
        reader.onload = function(e) {
            allText += "\n\n--- " + file.name + " ---\n" + e.target.result;
            document.getElementById("sysPrompt").value = allText.trim();
        };
        reader.readAsText(file);
    });

    let existing = fileList.innerHTML;
    names.forEach(n => {
        existing += `<span style="display:inline-block; margin: 3px; padding: 3px 6px; background: #1a1a1a; border: 1px solid #555; border-radius: 3px;">${n} ✓</span>`;
    });
    fileList.innerHTML = existing;
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
// --- MULTI CHAT MANAGEMENT ---
let allChats = [];
let activeChatId = null;

function generateId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
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
        created: new Date().toISOString()
    };
    allChats.push(newChat);
    switchChat(newChat.id);
}

function switchChat(id) {
    if (typeof isGenerating !== 'undefined' && isGenerating) stopGeneration();
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

    // group chats by date
    let groups = {};
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
                let m = d.getMonth() + 1;
                let day = d.getDate();
                dateKey = m + "月" + day + "日";
            }
        } else {
            dateKey = "older";
        }
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(chat);
    });

    // render groups
    let order = Object.keys(groups);
    // put "today" first, "yesterday" second
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
function escapeHtml(text) {
    let div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ===== FREQUENCIES =====
let frequencies = JSON.parse(localStorage.getItem("frequencies") || "[]");

function saveFrequencies() {
    localStorage.setItem("frequencies", JSON.stringify(frequencies));
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

        let lastMsg = entry.replies && entry.replies.length > 0
            ? entry.replies[entry.replies.length - 1]
            : entry;
        let showReplyOption = lastMsg.sender === "john";

        let replyToggle = showReplyOption
            ? `<span class="freq-reply-toggle" data-index="${realIndex}">reply ↩</span>`
            : "";

        let replyInputHtml = showReplyOption
            ? `<div class="freq-reply-box" data-index="${realIndex}" style="display:none;"><div class="freq-reply-row"><input type="text" class="freq-reply-input" data-index="${realIndex}" placeholder="reply..."><button class="freq-reply-send" data-index="${realIndex}">↩</button></div></div>`
            : "";

        // reply send button handlers
        document.querySelectorAll(".freq-reply-send").forEach(btn => {
            btn.addEventListener("click", async function () {
                let idx = parseInt(this.dataset.index);
                let input = document.querySelector(`.freq-reply-input[data-index="${idx}"]`);
                if (input) {
                    let text = input.value.trim();
                    if (!text) return;
                    if (!frequencies[idx].replies) frequencies[idx].replies = [];
                    frequencies[idx].replies.push({
                        sender: "ray",
                        text: text,
                        time: new Date().toLocaleString()
                    });
                    saveFrequencies();
                    renderFrequencies();
                    await autoReply(idx);
                }
            });
        });

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

    document.querySelectorAll(".freq-reply-input").forEach(input => {
        input.addEventListener("keydown", async function(e) {
            if (e.key === "Enter") {
                let idx = parseInt(this.dataset.index);
                let text = this.value.trim();
                if (!text) return;

                if (!frequencies[idx].replies) frequencies[idx].replies = [];
                frequencies[idx].replies.push({
                    sender: "ray",
                    text: text,
                    time: new Date().toLocaleString()
                });
                saveFrequencies();
                renderFrequencies();
                await autoReply(idx);
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
        frequencies[index].replies.push({
            sender: "john",
            text: reply,
            time: new Date().toLocaleString()
        });
        saveFrequencies();
        renderFrequencies();
    }
}

async function postFrequency() {
    let input = document.getElementById("freq-input");
    let text = input.value.trim();
    if (!text) return;

    frequencies.push({
        sender: "ray",
        text: text,
        time: new Date().toLocaleString(),
        replies: []
    });
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
        frequencies.push({
            sender: "john",
            text: reply,
            time: new Date().toLocaleString(),
            replies: []
        });
        saveFrequencies();
        renderFrequencies();
    } else {
        console.log("generateFrequency: no reply received");
    }

    btn.textContent = "⚡ intercept signal";
    btn.disabled = false;
}

renderFrequencies();

// ===== IPOD MUSIC PLAYER =====
const audioPlayer = document.getElementById("audioPlayer");
let currentTrackIndex = 0;
let isPlaying = false;

const playlist = [
    {
        title: "Dissolved Girl",
        artist: "Massive Attack",
        cover: "mp3_player/dissolved_girl_cover.png",
        audio: "mp3_player/dissolved_girl.mp3"
    },
    {
        title: "Lhabia",
        artist: "Deftones",
        cover: "mp3_player/lhabia_cover.png",
        audio: "mp3_player/Lhabia.mp3"
    },
    {
        title: "Beetlebum",
        artist: "BLUR",
        cover: "mp3_player/beetlebum_cover.png",
        audio: "mp3_player/Beetlebum.mp3"
    }
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
    "hey loser ❤️",
    "do NOT let me open taobao rn",
    "if you don't reply in 5 min i'm eating your ramen"
];

const phoneTrivia = [
    {
        q: "what's john's favorite color?",
        a: ["black"],
        wrong: "wow. you don't know that? we're breaking up.",
        roast: "...what else would it be. pink? you know me better than that. unfortunately."
    },
    {
        q: "john's go-to monster flavor?",
        a: ["white", "ultra zero", "white monster"],
        wrong: "...have you even seen my fridge?",
      roast: "fridge is 80% monster 20% your leftover boba. priorities."
     },
    {
        q: "what brand are john's drumsticks?",
        a: ["vic firth"],
        wrong: "i'm literally offended right now.",
        roast: "okay fine. you can touch my sticks. that came out wrong. or did it."
    },
    {
        q: "john's most played band?",
        a: ["deftones"],
        wrong: "do you even live here?",
        roast: "MY playlist. you started stealing it month two. i have receipts."
    },
    {
        q: "what does john order at the coffee shop?",
        a: ["iced americano", "americano"],
        wrong: "tell me you don't pay attention without telling me.",
        roast: "black coffee for the boy in all black. i'm a brand, kitty."
    },
    {
        q: "john's favorite horror movie?",
        a: ["the thing"],
        wrong: "we literally watched this three times. THREE.",
        roast: "you screamed and hid behind me for 97% of it. that's not watching."
    },
    {
        q: "what's john's ring size?",
        a: ["10"],
        wrong: "you've held my hands HOW many times?",
        roast: "...why do you know that. are you proposing. say yes."
    },
    {
        q: "john wears all black but what's the one color exception?",
        a: ["grey", "gray"],
        wrong: "so close yet so far away from my closet.",
        roast: "it's the only exception. grey is just black being polite."
    },
    {
        q: "what's john's guilty pleasure song?",
        a: ["kiss me thru the phone", "kiss me through the phone"],
        wrong: "okay that one's fair. i hide it well.",
        roast: "if you tell ANYONE i will deny it under oath."
    },
    {
        q: "john's go-to ramen order?",
        a: ["tonkotsu extra chashu", "tonkotsu"],
        wrong: "we've been to that place twelve times, kitty.",
        roast: "extra chashu is non-negotiable. i don't trust people who skip it."
    },
    {
        q: "what side of the bed does john sleep on?",
        a: ["left"],
        wrong: "you literally wake up next to me.",
        roast: "...you're warm. get back in bed."
    },
    {
        q: "john's least favorite social media?",
        a: ["twitter", "x"],
        wrong: "it's the obvious one come on.",
       roast: "every second on that app costs me brain cells i'll never get back."
    },
    {
        q: "what time does john usually wake up?",
        a: ["9am", "9 am", "9", "9:00"],
        wrong: "you've texted me good morning enough times to know this.",
        roast: "9am sharp. unless someone keeps me up till 3. looking at you."
    },
    {
        q: "john's first concert ever?",
        a: ["linkin park"],
        wrong: "i have the ticket stub framed. FRAMED.",
        roast: "i was twelve. i cried. i will not elaborate."
    },
    {
        q: "what does john fidget with when he's thinking?",
        a: ["rings", "his rings"],
        wrong: "you stare at my hands all day and you missed this?",
        roast: "caught you staring again. at my hands. for 'research.'"
    }
];

function initPhone() {
    loadNewQuestion();
    updatePhoneTime();
    setInterval(updatePhoneTime, 30000);
    renderPhoneNotes();
    renderPhonePurchases();

    let notifText = document.getElementById('notif-text');
    if (notifText) {
        notifText.textContent = kittyNotifications[Math.floor(Math.random() * kittyNotifications.length)];
    }
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

function openPhoneApp(app) {
    document.getElementById("phone-home").style.display = "none";
    if (app === "notes") {
        document.getElementById("phone-notes-app").style.display = "flex";
        renderPhoneNotes();
    } else if (app === "purchases") {
        document.getElementById("phone-purchases-app").style.display = "flex";
        renderPhonePurchases();
    }
}

function closePhoneApp() {
    document.getElementById("phone-notes-app").style.display = "none";
    document.getElementById("phone-purchases-app").style.display = "none";
    document.getElementById("phone-home").style.display = "flex";
}

// --- PHONE NOTES ---
async function generateNote() {
    let btn = document.getElementById("gen-note-btn");
    btn.textContent = "...";
    btn.disabled = true;

    let recentChat = chatHistory.slice(-10).map(m =>
        (m.role === "user" ? "Ray" : "John") + ": " + m.content
    ).join("\n");

    let existingNotes = phoneNotes.slice(0, 5).map(n => n.text).join("\n---\n");let prompt = `You are looking at John S's private phone notes. John is 24-25, plays drums (Vic Firth), wears all black, drinks iced americanos and white Monsters, loves Deftones and horror movies, dates a girl named Ray (calls her Kitty). Generate ONE note found on his phone. Could be: a reminder, a random thought, lyrics he's working on, a to-do list, something about Ray, a grocery list, a rant, a voice-memo transcript. Keep it natural, short (2-5 lines), in-character. Messy and real — not polished.

Recent conversations for context:
${recentChat || "(no recent chat)"}

Already existing notes (DO NOT repeat these or write anything too similar):
${existingNotes || "(none yet)"}

Write ONLY the note. Nothing else.`;

    let reply = await freqAPI(prompt);
    if (reply) {
        phoneNotes.unshift({ text: reply, time: new Date().toLocaleString(), id: Date.now() });
        localStorage.setItem("phoneNotes", JSON.stringify(phoneNotes));
        renderPhoneNotes();
    }

    btn.textContent = "+ generate";
    btn.disabled = false;
}

function renderPhoneNotes() {
    let list = document.getElementById("notes-list");
    if (!list) return;
    list.innerHTML = "";

    phoneNotes.forEach((note, i) => {
        let preview = note.text.split("\n")[0].slice(0, 40) + (note.text.length > 40 ? "..." : "");
        let div = document.createElement("div");
        div.className = "phone-entry";
        div.innerHTML = `
            <div class="phone-entry-header">
                <span class="entry-preview" onclick="togglePhoneEntry(this)">${escapeHtml(preview)}</span>
                <span class="entry-delete" onclick="deletePhoneNote(${i})">×</span>
            </div>
            <div class="phone-entry-content" style="display:none;">
                ${escapeHtml(note.text).replace(/\n/g, '<br>')}
                <div class="entry-time">${note.time}</div>
            </div>
        `;
        list.appendChild(div);
    });
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
    btn.disabled = true;

     let recentChat = chatHistory.slice(-10).map(m =>(m.role === "user" ? "Ray" : "John") + ": " + m.content
    ).join("\n");

    let existingPurchases = phonePurchases.slice(0, 5).map(p => p.text).join("\n");

    let prompt = `You are looking at John S's purchase/order history on his phone. John is 24-25, plays drums, wears all black, drinks iced americanos and white Monsters, loves Deftones and horror movies, dates Ray (calls her Kitty). Generate ONE purchase entry. Format: ITEM NAME — $PRICE. Could be practical, romantic, embarrassing, weird, or funny. Things John would actually buy: drum gear, black clothes, coffee supplies, ramen ingredients, gifts for Ray, horror merch, random 2am impulse buys. Reference recent conversations if something inspires a purchase naturally.

Recent conversations:
${recentChat || "(no recent chat)"}

Already existing purchases (DO NOT repeat these or write anything too similar):
${existingPurchases || "(none yet)"}

Write ONLY the purchase line. Nothing else.`;
    let reply = await freqAPI(prompt);
    if (reply) {
        phonePurchases.unshift({ text: reply, time: new Date().toLocaleString(), id: Date.now() });
        localStorage.setItem("phonePurchases", JSON.stringify(phonePurchases));
        renderPhonePurchases();
    }

    btn.textContent = "+ generate";
    btn.disabled = false;
}

function renderPhonePurchases() {
    let list = document.getElementById("purchases-list");
    if (!list) return;
    list.innerHTML = "";

    phonePurchases.forEach((p, i) => {
        let preview = p.text.split("\n")[0].slice(0, 40) + (p.text.length > 40 ? "..." : "");
        let div = document.createElement("div");
        div.className = "phone-entry";
        div.innerHTML = `
            <div class="phone-entry-header">
                <span class="entry-preview" onclick="togglePhoneEntry(this)">${escapeHtml(preview)}</span>
                <span class="entry-delete" onclick="deletePhonePurchase(${i})">×</span>
            </div>
            <div class="phone-entry-content" style="display:none;">
                ${escapeHtml(p.text).replace(/\n/g, '<br>')}
                <div class="entry-time">${p.time}</div>
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

function loadChatHistory() {
    let saved = localStorage.getItem("chatHistory");
    if (saved) {
        chatHistory = JSON.parse(saved);
        renderChatbox();
    }
}

function renderChatbox() {
    let chatbox = document.getElementById("chatbox");
    chatbox.innerHTML = "";

    chatHistory.forEach((msg, i) => {
        let cls = msg.role === "user" ? "msg-user" : "msg-john";

        let wrapper = document.createElement("div");
        wrapper.className = "msg-wrapper";
        wrapper.setAttribute("data-index", i);
        wrapper.setAttribute("data-role", msg.role);

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
        chatbox.appendChild(wrapper);
    });

    chatbox.scrollTop = chatbox.scrollHeight;
}

// --- Generation state ---
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

// --- Shared API call (used by send + regenerate + retry) ---
async function callAPI() {
    let chatbox = document.getElementById("chatbox");

    let apiUrl = localStorage.getItem("apiUrl");
    let apiKey = localStorage.getItem("apiKey");
    let model = localStorage.getItem("modelName") || "claude-opus-4-6-thinking";
    let maxTokens = parseInt(localStorage.getItem("maxTokens")) || 4096;
    let temp = parseFloat(localStorage.getItem("temperature")) || 0.7;
    let sysPrompt = localStorage.getItem("sysPrompt") || "";

    if (!apiUrl || !apiKey) {
        chatbox.innerHTML += `<div class="msg-john">⚠️ hit the ⚙️ first kitty</div>`;
        chatbox.scrollTop = chatbox.scrollHeight;
        return;
    }

    // show loading
    chatbox.innerHTML += `<div class="msg-loading" id="typing"><span>i</span><span>n</span><span>t</span><span>e</span><span>r</span><span>c</span><span>e</span><span>p</span><span>t</span><span>i</span><span>n</span><span>g</span><span>…</span></div>`;
    chatbox.scrollTop = chatbox.scrollHeight;

    setGenerating(true);
    currentAbortController = new AbortController();

    // build messages
    let messages = [];

    let freqData = JSON.parse(localStorage.getItem("frequencies") || "[]");
    let recentFreqs = freqData.slice(-10).map(f => {
        let thread = f.sender + ": " + f.text;
        if (f.replies && f.replies.length > 0) {
            f.replies.forEach(r => {
                thread += "\n  → " + r.sender + ": " + r.text;
            });
        }
        return thread;
    }).join("\n\n");

    let recentNotes = (typeof phoneNotes !== 'undefined' ? phoneNotes : []).slice(0, 5).map(n => n.text).join("\n---\n");
    let recentPurchases = (typeof phonePurchases !== 'undefined' ? phonePurchases : []).slice(0, 5).map(p => p.text).join("\n");
    let memoryData = JSON.parse(localStorage.getItem("memories") || "[]");
    let memoryText = memoryData.map(m => "[" + m.date + "] " + m.content).join("\n");

    let fullSystem = (sysPrompt ? sysPrompt + "\n\n" : "") +
    (recentFreqs ? "[Recent Frequencies between you and Ray — reference these naturally if relevant, don't force it]:\n" + recentFreqs + "\n\n" : "") +
    (recentNotes ? "[Things on your phone's notes — you can reference these if relevant, don't force it]:\n" + recentNotes + "\n\n" : "") +
    (recentPurchases ? "[Your recent purchases — you can reference these if relevant, don't force it]:\n" + recentPurchases + "\n\n" : "") +
    (memoryText ? "[Saved memories about Ray — use these to remember context across conversations]:\n" + memoryText : "");

    if (fullSystem) messages.push({ role: "system", content: fullSystem });
    messages = messages.concat(chatHistory);

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
                temperature: temp
            }),
            signal: currentAbortController.signal
        });

        let data = await response.json();
        document.getElementById("typing")?.remove();

        if (data.choices && data.choices[0]) {
            let reply = data.choices[0].message.content;
            chatHistory.push({ role: "assistant", content: reply });
            saveChatHistory();
            renderChatbox();
        } else if (data.error) {
            showError(data.error.message);
        } else {
            showError("weird response. check console.");
            console.log(data);
        }
    } catch (err) {
        document.getElementById("typing")?.remove();
        if (err.name === "AbortError") {
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
        } else {
            showError(err.message);
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

    chatHistory.push({ role: "user", content: text });
    // auto-rename new chats
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

// --- Clear chat ---
function clearChat() {
    if (confirm("clear this chat's history?")) {
        chatHistory.length = 0;
        saveAllChats();
        renderChatbox();
    }
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
        renderChatbox();
    });

    cancelBtn.addEventListener("click", () => {
        renderChatbox();
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

// Send / Stop button
document.getElementById("sendBtn").addEventListener("click", function() {
    if (isGenerating) {
        stopGeneration();
    } else {
        sendMsg();
    }
});

// Enter to send, Shift+Enter for new line
document.getElementById("userInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        sendMsg();
    }
});

// Auto-resize textarea (caps at 5 lines then scrolls)
document.getElementById("userInput").addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 110) + "px";
});
// Phone answer enter key
document.getElementById("phone-answer").addEventListener("keydown", function(e) {
    if (e.key === "Enter") tryUnlock();
});
// Chatbox: action buttons + mobile tap toggle
document.getElementById("chatbox").addEventListener("click", function(e) {
    // handle action button clicks
    let actionBtn = e.target.closest(".action-btn");
    if (actionBtn) {
        let wrapper = actionBtn.closest(".msg-wrapper");
        if (!wrapper) return;
        let index = parseInt(wrapper.dataset.index);
        let action = actionBtn.dataset.action;

        if (action === "delete") {
            chatHistory.splice(index, 1);
            saveChatHistory();
            renderChatbox();
        } else if (action === "edit") {
            editMessage(index);
        } else if (action === "regenerate") {
            regenerateMessage(index);
        }
        return;
    }

    // don't toggle if clicking inside edit mode
    if (e.target.closest(".msg-edit-textarea, .msg-edit-btns")) return;

    // mobile: toggle actions visibility
    let wrapper = e.target.closest(".msg-wrapper");

    // close all others
    document.querySelectorAll(".msg-wrapper.actions-visible").forEach(w => {
        if (w !== wrapper) w.classList.remove("actions-visible");
    });

    // toggle this one
    if (wrapper) {
        wrapper.classList.toggle("actions-visible");
    }
});

// click outside chatbox closes any visible action buttons
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
    let dateStr = today.getFullYear() + "/" +
        String(today.getMonth() + 1).padStart(2, "0") + "/" +
        String(today.getDate()).padStart(2, "0");

    memories.push({
        id: Date.now(),
        date: dateStr,
        content: text
    });
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

        // group by month
        let groups = {};
        memories.forEach(m => {
            let month = m.date.slice(0, 7); // "2026/08"
            if (!groups[month]) groups[month] = [];
            groups[month].push(m);
        });

        // sort months descending
        let sortedMonths = Object.keys(groups).sort().reverse();

        sortedMonths.forEach(month => {
            let groupDiv = document.createElement("div");
            groupDiv.className = "memory-month-group";

            let count = groups[month].length;
            groupDiv.innerHTML = `<div class="memory-month-header">▼ ${month} <span style="float:right;color:#555;">${count}条</span></div>`;

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

        // Clear mobile inline display override
        if (el) {
            el.style.display = "";
        }
    });
}

function showMobileView(view) {
    if (!isMobile()) return;

    // close sidebar
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").style.display = "none";

    // return any moved sections first
    returnSectionsToSidebar();

    // hide everything
    document.getElementById("chat-area").classList.add("hidden");
    document.querySelectorAll(".mobile-view").forEach(v => {
        v.classList.remove("active");
        // clear mobile view bodies
        let body = v.querySelector(".mobile-view-body");
        if (body) body.innerHTML = "";
    });

    // hide/show topbar title
    let title = document.getElementById("topbar-title");
    if (title) title.style.display = (view === "chat") ? "" : "none";
    document.body.classList.remove("phone-active");
    if (view === "chat") {
        document.getElementById("chat-area").classList.remove("hidden");
        return;
    }

    if (view === "signal") {
        let body = document.getElementById("signal-body");
        // move actual elements (not clone — preserves event listeners)
        body.appendChild(document.getElementById("freq-section"));
        body.appendChild(document.getElementById("music-section"));
        body.querySelectorAll(".sidebar-section").forEach(s => s.style.display = "block");
        document.getElementById("mobile-signal").classList.add("active");
    }

   if (view === "phone") {
    document.body.classList.add("phone-active");  // ← THIS WAS MISSING
    let body = document.getElementById("phone-body");
        body.appendChild(document.getElementById("phone-section"));
        body.querySelectorAll(".sidebar-section").forEach(s => s.style.display = "block");
        document.getElementById("mobile-phone").classList.add("active");
        // re-init phone time
        updatePhoneTime();
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
    let input = document.getElementById("memory-input-mobile");
    let text = input.value.trim();
    if (!text) return;

    let today = new Date();
    let dateStr = today.getFullYear() + "/" +
        String(today.getMonth() + 1).padStart(2, "0") + "/" +
        String(today.getDate()).padStart(2, "0");

    memories.push({
        id: Date.now(),
        date: dateStr,
        content: text
    });
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
