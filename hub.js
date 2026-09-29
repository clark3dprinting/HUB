(() => {
  const $ = (id) => document.getElementById(id);
  const uid = () => Math.random().toString(36).slice(2, 10);

  // True when the hub is running as the HUB Chrome extension, which lets every
  // site load inside the hub (see background.js).
  const EXT = !!(window.chrome && chrome.runtime && chrome.runtime.id);
  let hubTabId = null;
  const extReady = EXT
    ? chrome.runtime.sendMessage({ type: "hub-ready" }).then((r) => { hubTabId = r && r.tabId; }).catch(() => {})
    : Promise.resolve();

  // Browser tabs the hub opens itself; with the extension these aren't pulled back in.
  function openBrowserTab(url) {
    if (EXT) chrome.runtime.sendMessage({ type: "open-tab", url });
    else window.open(url, "_blank", "noopener");
  }

  // ---------- Defaults ----------
  // "tab" links are sites that refuse to be shown inside another page (checked with their headers).
  const DEFAULT_LINKS = [
    ["School",     "Tooele School District", "https://www.tooeleschools.org/students", "tab", "#1f5fbf", "🏫"],
    ["School",     "Canvas",            "https://tooeleschools.instructure.com/", "tab", "#e13f2b"],
    ["School",     "Clever",            "https://clever.com/in/tooeleschools", "tab", "#1464ff"],
    ["School",     "Google Classroom",  "https://classroom.google.com", "tab", "#1e8e3e"],
    ["AI",         "ChatGPT",           "https://chatgpt.com", "tab", "#10a37f"],
    ["AI",         "Gemini",            "https://gemini.google.com", "tab", "#4285f4"],
    ["AI",         "Google AI Mode",    "https://www.google.com/search?udm=50", "tab", "#34a853", "✨"],
    ["AI",         "Claude",            "https://claude.ai", "tab", "#d97757"],
    ["AI",         "Copilot",           "https://copilot.microsoft.com", "tab", "#0078d4", "🤖"],
    ["AI",         "Perplexity",        "https://www.perplexity.ai", "tab", "#20808d"],
    ["AI",         "Meta AI",           "https://www.meta.ai", "tab", "#0668e1"],
    ["AI",         "Grok",              "https://grok.com", "tab", "#111111"],
    ["AI",         "DeepSeek",          "https://chat.deepseek.com", "tab", "#4d6bfe"],
    ["Social",     "Instagram",         "https://www.instagram.com", "tab", "#e1306c"],
    ["Social",     "Snapchat",          "https://www.snapchat.com/web", "tab", "#fffc00"],
    ["Social",     "TikTok",            "https://www.tiktok.com", "tab", "#010101"],
    ["Social",     "Pinterest",         "https://www.pinterest.com", "tab", "#e60023"],
    ["Social",     "Discord",           "https://discord.com/app", "tab", "#5865f2"],
    ["Cloud Gaming", "Xbox Cloud Gaming", "https://www.xbox.com/play", "tab", "#107c10"],
    ["Cloud Gaming", "GeForce NOW",     "https://play.geforcenow.com", "tab", "#76b900"],
    ["Games",      "Coolmath Games",    "https://www.coolmathgames.com", "hub", "#e8491d"],
    ["Games",      "Minecraft Classic", "https://classic.minecraft.net", "hub", "#62b33b", "⛏️"],
    ["Games",      "Slither.io",        "https://slither.io", "hub", "#e0457b"],
    ["Games",      "Smash Karts",       "https://smashkarts.io", "hub", "#ff8a00"],
    ["Games",      "Shell Shockers",    "https://shellshock.io", "hub", "#f5c518"],
    ["Games",      "Paper.io",          "https://paper-io.com", "hub", "#ff5a5f"],
    ["Games",      "Tetris",            "https://tetris.com/play-tetris", "hub", "#9b30ff", "🧱"],
    ["Social",     "YouTube",           "https://www.youtube.com", "tab", "#ff0033"],
    ["Tools",      "Wikipedia",         "https://en.wikipedia.org", "hub", "#8a8f98"],
    ["Tools",      "Calculator",        "https://www.desmos.com/scientific", "hub", "#2f72dc"],
    ["Tools",      "Whiteboard",        "https://excalidraw.com", "hub", "#6965db", "🖍️"],
  ];

  // Bumped whenever the default links change, so saved hubs get the same update.
  const DATA_REV = 3;
  const REMOVED_IN_REV2 = [
    "https://skyward.iscorp.com/scripts/wsisa.dll/WService=wsedutooeleut/seplog01.w",
    "https://www.khanacademy.org", "https://kahoot.it",
    "https://krunker.io", "https://diep.io", "https://www.solitr.com", "https://minesweeper.online",
    "https://wordleunlimited.org", "https://skribbl.io",
    "https://poki.com", "https://www.crazygames.com", "https://www.chess.com", "https://play2048.co",
    "https://www.google.com/webhp?igu=1",
    "https://www.openstreetmap.org/export/embed.html?bbox=-125,24,-66,50&layer=mapnik",
    "https://www.photopea.com",
  ];
  const ADDED_IN_REV2 = new Set(DEFAULT_LINKS.filter(([f, name]) => (f === "Social" && name !== "YouTube") || (f === "AI" && name !== "ChatGPT")).map((l) => l[2]));

  // Sites checked to refuse being shown inside another page. They get the hub's
  // "can't open here" page instead of a broken frame.
  const BLOCKED_HOSTS = [
    "tooeleschools.org", "tooeleschools.instructure.com", "skyward.iscorp.com", "classroom.google.com",
    "docs.google.com", "drive.google.com", "translate.google.com", "gemini.google.com", "accounts.google.com",
    "chatgpt.com", "openai.com", "claude.ai", "copilot.microsoft.com", "perplexity.ai", "grok.com", "chat.mistral.ai",
    "character.ai",
    "instagram.com", "snapchat.com", "tiktok.com", "discord.com", "pinterest.com", "reddit.com", "x.com", "twitter.com",
    "facebook.com", "youtube.com", "twitch.tv", "soundcloud.com", "open.spotify.com",
    "xbox.com", "play.geforcenow.com", "poki.com", "crazygames.com", "chess.com", "chesskid.com", "lichess.org",
    "play2048.co", "mathplayground.com", "geoguessr.com", "sudoku.com", "typing.com", "monkeytype.com", "nytimes.com",
    "abcya.com", "gartic.io", "scratch.mit.edu", "quizlet.com", "blooket.com", "gimkit.com", "canva.com", "office.com",
    "github.com", "amazon.com", "duckduckgo.com", "startpage.com", "qwant.com", "ecosia.org",
  ];

  const WALLPAPERS = {
    default:  { name: "Default",  bg: "var(--wall)" },
    sonoma:   { name: "Sonoma",   bg: "linear-gradient(160deg,#f6d365 0%,#fda085 45%,#a18cd1 100%)" },
    ocean:    { name: "Ocean",    bg: "linear-gradient(160deg,#89f7fe 0%,#66a6ff 50%,#3b41c5 100%)" },
    aurora:   { name: "Aurora",   bg: "radial-gradient(70% 60% at 20% 20%,#43e97b 0%,transparent 60%),radial-gradient(70% 60% at 85% 30%,#38f9d7 0%,transparent 60%),radial-gradient(80% 70% at 50% 100%,#7b2ff7 0%,transparent 65%),#0b1026" },
    sunset:   { name: "Sunset",   bg: "linear-gradient(160deg,#ff5f6d 0%,#ffc371 100%)" },
    lavender: { name: "Lavender", bg: "linear-gradient(160deg,#e0c3fc 0%,#8ec5fc 100%)" },
    forest:   { name: "Forest",   bg: "linear-gradient(160deg,#134e5e 0%,#71b280 100%)" },
    midnight: { name: "Midnight", bg: "linear-gradient(160deg,#0f2027 0%,#203a43 50%,#2c5364 100%)" },
    graphite: { name: "Graphite", bg: "linear-gradient(160deg,#232526 0%,#414345 100%)" },
  };

  const ACCENTS = ["", "#bf5af2", "#ff375f", "#ff453a", "#ff9f0a", "#ffd60a", "#30d158", "#64d2ff", "#8e8e93"];

  const DEFAULT_SETTINGS = { theme: "auto", accent: "", wallpaper: "default", wallUrl: "", dim: 0, clock24: false, seconds: false, notes: true, engine: "google", safe: true };

  const SVG = {
    tab: '<svg class="i" viewBox="0 0 24 24"><path d="M8 16 16 8M9 8h7v7"/></svg>',
    close: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    search: '<svg class="i" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>',
    plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    grip: '<svg class="i" viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg>',
    trash: '<svg class="i" viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/></svg>',
    expand: '<svg class="i" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    shrink: '<svg class="i" viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    sunLow: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 4.5v1M12 18.5v1M4.5 12h1M18.5 12h1"/></svg>',
    sunHigh: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  };
  function speakerSvg(level) {
    const body = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>';
    const extra =
      level === "mute" ? '<path d="M16 9.5l5 5M21 9.5l-5 5"/>' :
      level === "low"  ? '<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/>' :
                         '<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/>';
    return '<svg class="i" viewBox="0 0 24 24">' + body + extra + "</svg>";
  }

  // ---------- Storage ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
  };

  function defaultData() {
    const folders = [];
    const links = [];
    DEFAULT_LINKS.forEach(([folder, name, url, mode, color, icon]) => {
      let f = folders.find((x) => x.name === folder);
      if (!f) { f = { id: uid(), name: folder }; folders.push(f); }
      links.push({ id: uid(), folderId: f.id, name, url, mode, color, icon: icon || "" });
    });
    return { folders, links, rev: DATA_REV };
  }

  function migrate(d) {
    const rev = d.rev || 1;
    if (rev >= DATA_REV) return d;
    if (rev < 2) migrateRev2(d);
    if (rev < 3) {
      const yt = d.links.find((l) => l.url === "https://www.youtube.com");
      if (yt) {
        let social = d.folders.find((f) => f.name === "Social");
        if (!social) {
          social = { id: uid(), name: "Social" };
          const ai = d.folders.findIndex((x) => x.name === "AI");
          d.folders.splice(ai >= 0 ? ai + 1 : d.folders.length, 0, social);
        }
        yt.folderId = social.id;
        d.links = d.links.filter((l) => l !== yt).concat(yt);
      }
      d.folders = d.folders.filter((f) => f.name !== "Videos" || d.links.some((l) => l.folderId === f.id));
    }
    d.rev = DATA_REV;
    store.set("hub-data-v3", d);
    return d;
  }

  function migrateRev2(d) {
    d.links = d.links.filter((l) => !REMOVED_IN_REV2.includes(l.url));
    d.folders = d.folders.filter((f) => f.name !== "Game Sites" || d.links.some((l) => l.folderId === f.id));
    DEFAULT_LINKS.forEach(([folder, name, url, mode, color, icon]) => {
      if (!ADDED_IN_REV2.has(url) || d.links.some((l) => l.url === url)) return;
      let f = d.folders.find((x) => x.name === folder);
      if (!f) {
        f = { id: uid(), name: folder };
        const ai = d.folders.findIndex((x) => x.name === "AI");
        d.folders.splice(ai >= 0 ? ai + 1 : d.folders.length, 0, f);
      }
      d.links.push({ id: uid(), folderId: f.id, name, url, mode, color, icon: icon || "" });
    });
  }

  function loadData() {
    const saved = store.get("hub-data-v3", null);
    if (saved && Array.isArray(saved.folders) && Array.isArray(saved.links)) return migrate(saved);
    const d = defaultData();
    store.get("hub-links-v2", []).forEach((l) => {
      if (!l.url || l.cat === "My Links" || /tooelesd\.org/.test(l.url) || REMOVED_IN_REV2.includes(l.url) || d.links.some((x) => x.url === l.url)) return;
      let f = d.folders.find((x) => x.name === l.cat);
      if (!f) { f = { id: uid(), name: l.cat || "Links" }; d.folders.push(f); }
      d.links.push({ id: uid(), folderId: f.id, name: l.name, url: l.url, mode: l.mode || "hub", color: l.color || "", icon: l.icon || "" });
    });
    store.set("hub-data-v3", d);
    return d;
  }

  let data = loadData();
  const savedSettings = store.get("hub-settings", {});
  let settings = { ...DEFAULT_SETTINGS, ...savedSettings };
  if (savedSettings.engineV !== 2) { settings.engine = "google"; settings.engineV = 2; store.set("hub-settings", settings); }
  const saveData = () => store.set("hub-data-v3", data);
  const saveSettings = () => store.set("hub-settings", settings);

  // ---------- Helpers ----------
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // Returns a full URL if the text looks like a website, otherwise null.
  function normalizeUrl(input) {
    const text = input.trim();
    if (!text) return null;
    if (/^https?:\/\/\S+$/i.test(text)) return text;
    if (/^[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(text)) return "https://" + text;
    return null;
  }

  // igu=1 is the version of Google Search that allows being shown inside other pages.
  const googleUrl = (q) => "https://www.google.com/search?igu=1&q=" + encodeURIComponent(q) + (settings.safe ? "&safe=active" : "");

  function isBlockedUrl(url) {
    if (EXT) return false;
    let u;
    try { u = new URL(url); } catch { return false; }
    const host = u.hostname.replace(/^www\./, "");
    if (host === "google.com") return u.searchParams.get("igu") !== "1";
    if (host === "youtube.com" && u.pathname.startsWith("/embed/")) return false;
    return BLOCKED_HOSTS.some((b) => host === b || host.endsWith("." + b));
  }

  // YouTube's normal pages refuse to load inside the hub, but its video player does.
  function embeddable(url) {
    if (EXT) return url;
    try {
      const u = new URL(url);
      let id = null;
      if (/(^|\.)youtube\.com$/.test(u.hostname)) {
        if (u.pathname === "/watch") id = u.searchParams.get("v");
        else if (/^\/(shorts|live)\//.test(u.pathname)) id = u.pathname.split("/")[2];
      } else if (u.hostname === "youtu.be") {
        id = u.pathname.slice(1);
      }
      if (id) return "https://www.youtube.com/embed/" + id + "?autoplay=1";
    } catch {}
    return url;
  }

  function hostOf(url) {
    try { return new URL(url).hostname; } catch { return url; }
  }
  const shortHost = (url) => hostOf(url).replace(/^www\./, "");
  const favicon = (url, size) => "https://www.google.com/s2/favicons?sz=" + size + "&domain=" + hostOf(url);

  // ---------- Theme & wallpaper ----------
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");

  function applyTheme() {
    const dark = settings.theme === "dark" || (settings.theme === "auto" && darkQuery.matches);
    document.documentElement.dataset.mode = dark ? "dark" : "light";
    if (settings.accent) document.documentElement.style.setProperty("--accent", settings.accent);
    else document.documentElement.style.removeProperty("--accent");
  }
  darkQuery.addEventListener("change", applyTheme);

  function wallpaperCss() {
    if (settings.wallpaper === "image") {
      const img = localStorage.getItem("hub-bg-image");
      if (img) return `url("${img}") center / cover no-repeat`;
    }
    if (settings.wallpaper === "url" && settings.wallUrl) {
      return `url("${settings.wallUrl.replace(/"/g, "%22")}") center / cover no-repeat, var(--wall)`;
    }
    return (WALLPAPERS[settings.wallpaper] || WALLPAPERS.default).bg;
  }

  function applyWallpaper() {
    $("wall").style.background = wallpaperCss();
    $("wallDim").style.background = settings.dim ? `rgba(0,0,0,${settings.dim / 100})` : "";
  }

  // ---------- Folders & links ----------
  let editing = false;

  function makeApp(link) {
    const app = document.createElement("div");
    app.className = "app";
    app.dataset.id = link.id;
    app.title = link.mode === "tab" ? link.name + " (can’t open inside the hub)" : link.name;
    app.style.setProperty("--c", link.color || "#0071e3");

    const icon = document.createElement("div");
    icon.className = "icon";
    if (link.icon) {
      icon.classList.add("emoji");
      icon.textContent = link.icon;
    } else {
      const img = document.createElement("img");
      img.src = favicon(link.url, 128);
      img.alt = "";
      img.draggable = false;
      img.onerror = () => { icon.classList.add("emoji"); icon.textContent = "🌐"; };
      icon.appendChild(img);
    }

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = link.name;
    if (link.mode === "tab") label.insertAdjacentHTML("beforeend", SVG.tab);

    const mode = document.createElement("button");
    mode.className = "mode";
    mode.textContent = link.mode === "tab" ? "Blocked site" : "In hub";
    mode.title = "Switch between trying to open it inside the hub, or marking it as a site that blocks the hub";
    mode.onclick = (e) => {
      e.stopPropagation();
      link.mode = link.mode === "tab" ? "hub" : "tab";
      saveData();
      renderCards();
    };

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "−";
    del.title = "Remove";
    del.onclick = (e) => {
      e.stopPropagation();
      data.links = data.links.filter((l) => l !== link);
      saveData();
      renderCards();
    };

    app.append(icon, label, mode, del);
    app.onclick = () => {
      if (editing || suppressClick) return;
      openLink(link);
    };
    return app;
  }

  function renderCards() {
    const root = $("cards");
    root.innerHTML = "";
    data.folders.forEach((folder) => {
      const inFolder = data.links.filter((l) => l.folderId === folder.id);
      const card = document.createElement("div");
      card.className = "card glass" + (inFolder.length > 4 ? " wide" : "");
      card.dataset.folder = folder.id;

      const head = document.createElement("div");
      head.className = "card-head";
      head.insertAdjacentHTML("beforeend", '<span class="grip">' + SVG.grip + "</span>");

      const name = document.createElement("span");
      name.className = "fname";
      name.textContent = folder.name;
      name.spellcheck = false;
      if (editing) name.contentEditable = "true";
      name.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); name.blur(); } });
      name.addEventListener("blur", () => {
        const v = name.textContent.trim() || "Folder";
        name.textContent = v;
        if (v !== folder.name) { folder.name = v; saveData(); }
      });

      const count = document.createElement("span");
      count.className = "count";
      if (editing) count.textContent = inFolder.length;

      const del = document.createElement("button");
      del.className = "fdel";
      del.title = "Delete folder";
      del.innerHTML = SVG.trash;
      del.onclick = () => deleteFolder(folder.id);

      head.append(name, count, del);

      const apps = document.createElement("div");
      apps.className = "apps";
      inFolder.forEach((l) => apps.appendChild(makeApp(l)));

      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = editing ? "Drag links here" : "Empty folder — tap Edit to move links here";

      card.append(head, apps, empty);
      root.appendChild(card);
    });

    if (settings.notes) {
      const card = document.createElement("div");
      card.className = "card glass notes-card";
      card.innerHTML = '<div class="card-head"><span class="fname">Notes</span></div>';
      const ta = document.createElement("textarea");
      ta.placeholder = "Type anything… it saves automatically.";
      ta.value = localStorage.getItem("hub-notes") || "";
      ta.addEventListener("input", () => {
        clearTimeout(ta.timer);
        ta.timer = setTimeout(() => localStorage.setItem("hub-notes", ta.value), 300);
      });
      card.appendChild(ta);
      root.appendChild(card);
    }
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle("editing", on);
    $("editBtn").textContent = on ? "Done" : "Edit";
    $("editBtn").classList.toggle("on", on);
    renderCards();
  }
  $("editBtn").onclick = () => setEditing(!editing);

  function deleteFolder(id) {
    const folder = data.folders.find((f) => f.id === id);
    const n = data.links.filter((l) => l.folderId === id).length;
    if (n && !confirm(`Delete the folder “${folder.name}” and the ${n} link${n > 1 ? "s" : ""} inside it?`)) return;
    data.folders = data.folders.filter((f) => f.id !== id);
    data.links = data.links.filter((l) => l.folderId !== id);
    saveData();
    renderCards();
  }

  $("newFolderBtn").onclick = () => {
    const folder = { id: uid(), name: "New Folder" };
    data.folders.push(folder);
    saveData();
    setEditing(true);
    const name = document.querySelector(`.card[data-folder="${folder.id}"] .fname`);
    name.scrollIntoView({ block: "center", behavior: "smooth" });
    name.focus();
    const range = document.createRange();
    range.selectNodeContents(name);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  };

  // ---------- Dragging (edit mode) & long-press ----------
  let press = null;
  let drag = null;
  let suppressClick = false;
  const cardsRoot = $("cards");

  cardsRoot.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, textarea, [contenteditable="true"]')) return;
    const app = e.target.closest(".app");

    if (!editing) {
      if (!app) return;
      press = {
        x: e.clientX, y: e.clientY,
        timer: setTimeout(() => {
          press = null;
          suppressClick = true;
          setEditing(true);
          if (navigator.vibrate) navigator.vibrate(15);
        }, 550),
      };
      return;
    }

    const head = e.target.closest(".card[data-folder] > .card-head");
    const el = app || (head && head.parentElement);
    if (!el) return;
    e.preventDefault();
    drag = { type: app ? "link" : "folder", el, x0: e.clientX, y0: e.clientY, started: false };
  });

  function startDrag() {
    const r = drag.el.getBoundingClientRect();
    const ghost = drag.el.cloneNode(true);
    ghost.classList.add("ghost");
    ghost.style.width = r.width + "px";
    ghost.style.height = r.height + "px";
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    drag.offX = drag.x0 - r.left;
    drag.offY = drag.y0 - r.top;
    drag.el.classList.add("placeholder");
    document.body.classList.add("dragging-now");
    drag.started = true;
    suppressClick = true;
  }

  function moveDrag(x, y) {
    drag.ghost.style.transform = `translate(${x - drag.offX}px, ${y - drag.offY}px) scale(1.04)`;

    const home = $("home").getBoundingClientRect();
    if (y < home.top + 60) $("home").scrollTop -= 14;
    else if (y > home.bottom - 60) $("home").scrollTop += 14;

    const target = document.elementFromPoint(x, y);
    if (!target) return;

    if (drag.type === "link") {
      const overApp = target.closest(".app");
      const overCard = target.closest(".card[data-folder]");
      if (overApp && overApp !== drag.el && !overApp.classList.contains("ghost")) {
        const r = overApp.getBoundingClientRect();
        const before = x < r.left + r.width / 2;
        overApp.parentNode.insertBefore(drag.el, before ? overApp : overApp.nextSibling);
      } else if (overCard && !overApp) {
        const apps = overCard.querySelector(".apps");
        if (drag.el.parentNode !== apps) apps.appendChild(drag.el);
      }
    } else {
      const overCard = target.closest(".card[data-folder]");
      if (overCard && overCard !== drag.el) {
        const r = overCard.getBoundingClientRect();
        const oneColumn = r.width > cardsRoot.clientWidth * 0.8;
        const before = oneColumn ? y < r.top + r.height / 2 : x < r.left + r.width / 2;
        cardsRoot.insertBefore(drag.el, before ? overCard : overCard.nextSibling);
      }
    }
  }

  function commitOrder() {
    const cards = [...cardsRoot.querySelectorAll(".card[data-folder]")];
    const order = cards.map((c) => c.dataset.folder);
    data.folders.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const byId = new Map(data.links.map((l) => [l.id, l]));
    const ordered = [];
    cards.forEach((card) => {
      card.querySelectorAll(".apps > .app").forEach((a) => {
        const link = byId.get(a.dataset.id);
        if (!link) return;
        link.folderId = card.dataset.folder;
        ordered.push(link);
        byId.delete(link.id);
      });
    });
    byId.forEach((l) => ordered.push(l));
    data.links = ordered;
    saveData();
    renderCards();
  }

  document.addEventListener("pointermove", (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) {
      clearTimeout(press.timer);
      press = null;
    }
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      startDrag();
    }
    moveDrag(e.clientX, e.clientY);
  });

  function endPointer() {
    if (press) { clearTimeout(press.timer); press = null; }
    if (drag) {
      if (drag.started) {
        drag.ghost.remove();
        drag.el.classList.remove("placeholder");
        document.body.classList.remove("dragging-now");
        commitOrder();
      }
      drag = null;
    }
    if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
  }
  document.addEventListener("pointerup", endPointer);
  document.addEventListener("pointercancel", endPointer);

  // ---------- Add link ----------
  function openAddDialog() {
    if (!data.folders.length) { data.folders.push({ id: uid(), name: "Links" }); saveData(); renderCards(); }
    $("addForm").reset();
    $("linkFolder").innerHTML = "";
    data.folders.forEach((f) => {
      const o = document.createElement("option");
      o.value = f.id;
      o.textContent = f.name;
      $("linkFolder").appendChild(o);
    });
    const last = store.get("hub-last-folder", null);
    if (data.folders.some((f) => f.id === last)) $("linkFolder").value = last;
    $("addBg").classList.add("show");
    setTimeout(() => $("linkName").focus(), 30);
  }
  const closeAddDialog = () => $("addBg").classList.remove("show");

  $("addBtn").onclick = openAddDialog;
  $("cancelAdd").onclick = closeAddDialog;
  $("addBg").onclick = (e) => { if (e.target === $("addBg")) closeAddDialog(); };
  $("addForm").onsubmit = (e) => {
    e.preventDefault();
    const url = normalizeUrl($("linkUrl").value);
    if (!url) { toast("Type a website, like wikipedia.org"); return; }
    data.links.push({
      id: uid(),
      folderId: $("linkFolder").value,
      name: $("linkName").value.trim(),
      url,
      icon: $("linkIcon").value.trim(),
      color: "",
      mode: $("linkMode").value,
    });
    store.set("hub-last-folder", $("linkFolder").value);
    saveData();
    renderCards();
    closeAddDialog();
    toast("Link added");
  };

  // ---------- Hub tabs ----------
  // Every site you open gets a hub tab. Its page keeps running while you use other
  // tabs or the home screen, and open tabs come back after a refresh.
  // Tab kinds: "site" (a website in a frame), "search" (HUB Search results) and
  // "blocked" (a site that refuses to be shown inside another page).
  let tabs = store.get("hub-tabs", []).map((t) => (t.search ? { ...t, kind: "search", q: t.q || t.name }
    : { ...t, kind: EXT && t.kind === "blocked" ? "site" : t.kind || "site" }));
  let activeId = null;
  let noticeDismissed = false;
  const frames = new Map();
  let currentState = { view: "home" };

  const saveTabs = () => store.set("hub-tabs", tabs.map(({ id, url, name, kind, q, icon, color }) => ({ id, url, name, kind, q, icon, color })));
  const findTab = (id) => tabs.find((t) => t.id === id);

  // No "allow-top-navigation" in the sandbox, so a site can't pull you out of the hub.
  // Popups are only allowed with the HUB extension, which turns them into hub tabs.
  function createFrame(url) {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox",
      "allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-presentation allow-pointer-lock allow-storage-access-by-user-activation" +
      (EXT ? " allow-popups" : ""));
    frame.setAttribute("allow", "fullscreen; autoplay; gamepad; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; identity-credentials-get; publickey-credentials-get");
    frame.setAttribute("allowfullscreen", "");
    frame.src = url;
    return frame;
  }

  function createView(tab) {
    if (tab.kind === "search") return buildResultsPage(tab);
    if (tab.kind === "blocked" && !EXT) return buildBlockedPage(tab);
    return createFrame(tab.url);
  }

  function showFrame(tab) {
    let frame = frames.get(tab.id);
    if (!frame) {
      frame = createView(tab);
      frames.set(tab.id, frame);
      $("frameHolder").appendChild(frame);
    }
    frames.forEach((f, id) => { f.style.display = id === tab.id ? "" : "none"; });
  }

  function makeIcon(info, big) {
    const icon = document.createElement("div");
    icon.className = big ? "bp-icon" : "tab-ico";
    if (info.icon) {
      icon.textContent = info.icon;
      icon.style.background = info.color ? `linear-gradient(160deg, color-mix(in srgb, ${info.color} 80%, white), ${info.color})` : "";
    } else {
      const img = document.createElement("img");
      img.src = favicon(info.url, big ? 128 : 32);
      img.alt = "";
      icon.appendChild(img);
    }
    return icon;
  }

  function buildBlockedPage(tab) {
    const page = document.createElement("div");
    page.className = "hub-page bp";
    const card = document.createElement("div");
    card.className = "bp-card";
    const h = document.createElement("h2");
    h.textContent = tab.name + " can’t open inside the hub";
    const p = document.createElement("p");
    p.textContent = tab.name + " blocks other websites from showing it, so the hub isn’t allowed to display it here. Nothing opened in a new tab — you choose:";
    const row = document.createElement("div");
    row.className = "bp-actions";
    const here = document.createElement("button");
    here.className = "sbtn primary";
    here.textContent = "Open it in this tab";
    here.title = "The hub is saved — press Back to come right back";
    here.onclick = () => { location.href = tab.url; };
    const newT = document.createElement("button");
    newT.className = "sbtn";
    newT.textContent = "Open in a new tab";
    newT.onclick = () => openBrowserTab(tab.url);
    row.append(here, newT);
    const hint = document.createElement("p");
    hint.className = "bp-hint";
    hint.textContent = "“Open it in this tab” leaves the hub for a moment. Press Back to return — your tabs and links will still be here.";
    card.append(makeIcon(tab, true), h, p, row, hint);
    page.appendChild(card);
    return page;
  }

  const SAFE_FILTER = /\b(porn\w*|xxx|sex\w*|nude\w*|naked|nsfw|onlyfans|hentai|camgirls?|escorts?|casinos?|gambling|erotic\w*)\b/i;

  function buildResultsPage(tab) {
    const q = tab.q;
    const page = document.createElement("div");
    page.className = "hub-page rp";
    const inner = document.createElement("div");
    inner.className = "rp-inner";
    page.appendChild(inner);

    const h = document.createElement("h1");
    h.textContent = "Results for “" + q + "”";
    inner.appendChild(h);

    const section = (title) => {
      const s = document.createElement("section");
      const t = document.createElement("h3");
      t.textContent = title;
      s.appendChild(t);
      inner.appendChild(s);
      return s;
    };
    const loading = (s) => {
      const l = document.createElement("div");
      l.className = "rp-loading";
      l.textContent = "Loading…";
      s.appendChild(l);
      return l;
    };
    const result = (title, url, text) => {
      const r = document.createElement("div");
      r.className = "res";
      const host = document.createElement("div");
      host.className = "host";
      const img = document.createElement("img");
      img.src = favicon(url, 32);
      img.alt = "";
      const hs = document.createElement("span");
      hs.textContent = shortHost(url) + (isBlockedUrl(url) ? "  ·  can’t open in the hub" : "");
      host.append(img, hs);
      const t = document.createElement("div");
      t.className = "title";
      t.textContent = title || shortHost(url);
      const ex = document.createElement("div");
      ex.className = "ex";
      ex.textContent = text || "";
      r.append(host, t, ex);
      r.onclick = () => openSite(url, title);
      return r;
    };

    const ql = q.toLowerCase();
    const hits = data.links.filter((l) => l.name.toLowerCase().includes(ql) || shortHost(l.url).includes(ql)).slice(0, 8);
    if (hits.length) {
      const s = section("Your links");
      const chips = document.createElement("div");
      chips.className = "rp-links";
      hits.forEach((l) => {
        const c = document.createElement("button");
        c.className = "chip";
        c.append(makeIcon(l, false));
        const n = document.createElement("span");
        n.textContent = l.name;
        c.appendChild(n);
        c.onclick = () => openLink(l);
        chips.appendChild(c);
      });
      s.appendChild(chips);
    }

    const answer = document.createElement("div");
    inner.appendChild(answer);
    fetchWiki(q).then((w) => {
      if (!w) return;
      const card = document.createElement("div");
      card.className = "wcard";
      if (w.thumb) {
        const img = document.createElement("img");
        img.src = w.thumb;
        img.alt = "";
        card.appendChild(img);
      }
      const body = document.createElement("div");
      const t = document.createElement("div");
      t.className = "title";
      t.textContent = w.title;
      const ex = document.createElement("div");
      ex.className = "ex";
      ex.textContent = w.extract;
      const src = document.createElement("div");
      src.className = "src";
      src.textContent = "Wikipedia";
      body.append(t, ex, src);
      card.appendChild(body);
      card.onclick = () => openSite(w.url, w.title);
      answer.appendChild(card);
    }).catch(() => {});

    const web = section("Web");
    const webLoading = loading(web);
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    fetch("https://api.mwmbl.org/search/?s=" + encodeURIComponent(q), { signal: ctrl.signal })
      .then((r) => r.json())
      .then((list) => {
        webLoading.remove();
        const seen = new Set();
        const text = (parts) => (parts || []).map((p) => p.value).join("");
        const results = list
          .map((r) => ({ url: r.url, title: text(r.title), extract: text(r.extract) }))
          .filter((r) => /^https?:/.test(r.url) && !seen.has(r.url) && seen.add(r.url))
          .filter((r) => !settings.safe || !SAFE_FILTER.test(r.title + " " + r.url + " " + r.extract))
          .slice(0, 15);
        if (!results.length) throw new Error("none");
        results.forEach((r) => web.appendChild(result(r.title, r.url, r.extract)));
      })
      .catch(() => {
        webLoading.textContent = "No web results right now — try different words, or check the Wikipedia results below.";
      });

    const wiki = section("Wikipedia");
    const wikiLoading = loading(wiki);
    fetch("https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=6&format=json&origin=*&srsearch=" + encodeURIComponent(q))
      .then((r) => r.json())
      .then((d) => {
        wikiLoading.remove();
        const items = (d.query && d.query.search) || [];
        if (!items.length) throw new Error("none");
        items.forEach((it) => {
          const snippet = new DOMParser().parseFromString(it.snippet, "text/html").body.textContent;
          const url = "https://en.wikipedia.org/wiki/" + encodeURIComponent(it.title.replace(/ /g, "_"));
          wiki.appendChild(result(it.title, url, snippet + "…"));
        });
      })
      .catch(() => { wikiLoading.textContent = "No Wikipedia articles found."; });

    const foot = document.createElement("div");
    foot.className = "rp-foot";
    const g = document.createElement("button");
    g.className = "link-btn";
    g.textContent = "Search Google instead";
    g.onclick = () => googleSearch(q);
    foot.appendChild(g);
    inner.appendChild(foot);

    return page;
  }

  function reloadFrame(tab) {
    const old = frames.get(tab.id);
    if (old) old.remove();
    frames.delete(tab.id);
    showFrame(tab);
  }

  function renderTabs() {
    const bar = $("tabs");
    bar.innerHTML = "";
    bar.classList.toggle("show", tabs.length > 0);
    tabs.forEach((tab, i) => {
      const el = document.createElement("div");
      el.className = "tab glass" + (tab.id === activeId ? " active" : "");
      el.title = tab.name + (i < 9 ? `  (Alt+${i + 1})` : "");

      let img;
      if (tab.kind === "search" || tab.kind === "google") {
        img = document.createElement("span");
        img.className = "tab-ico plain";
        img.innerHTML = SVG.search;
      } else {
        img = makeIcon(tab, false);
      }
      const t = document.createElement("span");
      t.className = "t";
      t.textContent = tab.name;
      const x = document.createElement("button");
      x.className = "x";
      x.title = "Close tab (Alt+W)";
      x.innerHTML = SVG.close;
      x.onclick = (e) => { e.stopPropagation(); closeTab(tab.id); };

      el.append(img, t, x);
      el.onclick = () => switchTab(tab.id);
      el.addEventListener("auxclick", (e) => { if (e.button === 1) closeTab(tab.id); });
      bar.appendChild(el);
      if (tab.id === activeId) setTimeout(() => el.scrollIntoView({ inline: "nearest", block: "nearest" }), 0);
    });
    const add = document.createElement("button");
    add.className = "tb tab-new";
    add.title = "New tab (Alt+T)";
    add.innerHTML = SVG.plus;
    add.onclick = newTab;
    bar.appendChild(add);
  }

  function render(state) {
    const tab = state.view === "tab" ? findTab(state.id) : null;
    if (tab) {
      currentState = state;
      activeId = tab.id;
      $("home").style.display = "none";
      $("viewer").classList.add("show");
      showFrame(tab);
      const knownToWork = EXT || (tab.kind !== "site" && tab.kind !== "google") || tab.url.startsWith("https://www.youtube.com/embed/") ||
        data.links.some((l) => l.mode === "hub" && embeddable(l.url) === tab.url);
      $("notice").classList.toggle("hidden", knownToWork || noticeDismissed);
      $("noticeText").textContent = tab.kind === "google"
        ? "Clicked a result and see a sad-face page? That site doesn’t allow the hub — press Back to return to your results."
        : "Page blank or says “refused to connect”? That site doesn’t allow being shown inside other pages.";
      if (document.activeElement !== $("address")) $("address").value = addressText(tab);
      document.title = tab.name + " – HUB";
    } else {
      currentState = { view: "home" };
      activeId = null;
      $("viewer").classList.remove("show");
      frames.forEach((f) => { f.style.display = "none"; });
      $("home").style.display = "";
      $("address").value = "";
      document.title = "HUB";
    }
    $("newTabBtn").disabled = !tab || tab.kind === "search";
    renderTabs();
  }

  const addressText = (tab) => (tab.kind === "search" || tab.kind === "google" ? tab.q : shortHost(tab.url));

  function hashFor(state) {
    return state.view === "tab" ? "#tab=" + state.id : "#home";
  }

  function go(state) {
    history.pushState(state, "", hashFor(state));
    render(state);
  }

  function openLink(link) {
    if (link.mode === "tab" && !EXT) openBlocked(link);
    else openSite(link.url, link.name);
  }

  function openSite(url, name) {
    url = embeddable(url);
    if (isBlockedUrl(url)) { openBlocked({ url, name }); return; }
    let tab = tabs.find((t) => t.kind === "site" && t.url === url);
    if (!tab) {
      tab = { id: uid(), kind: "site", url, name: name || shortHost(url) };
      tabs.push(tab);
      saveTabs();
    }
    go({ view: "tab", id: tab.id });
  }

  function openBlocked(info) {
    let tab = tabs.find((t) => t.kind === "blocked" && t.url === info.url);
    if (!tab) {
      tab = { id: uid(), kind: "blocked", url: info.url, name: info.name || shortHost(info.url), icon: info.icon || "", color: info.color || "" };
      tabs.push(tab);
      saveTabs();
    }
    go({ view: "tab", id: tab.id });
  }

  function switchTab(id) {
    if (id === activeId) return;
    go({ view: "tab", id });
  }

  // Searches reuse one "search" hub tab instead of piling up new ones.
  function doSearch(q) {
    q = q.trim();
    if (!q) return;
    if (settings.engine === "google") { googleSearch(q); return; }
    let tab = tabs.find((t) => t.kind === "search");
    if (tab) {
      tab.q = q;
      tab.name = q;
      const old = frames.get(tab.id);
      if (old) old.remove();
      frames.delete(tab.id);
    } else {
      tab = { id: uid(), kind: "search", url: "", q, name: q };
      tabs.push(tab);
    }
    saveTabs();
    if (tab.id === activeId) render(currentState);
    else go({ view: "tab", id: tab.id });
  }

  function googleSearch(q) {
    let tab = tabs.find((t) => t.kind === "google");
    const url = googleUrl(q);
    if (tab) {
      Object.assign(tab, { q, name: q, url });
      const frame = frames.get(tab.id);
      if (frame) frame.src = url;
    } else {
      tab = { id: uid(), kind: "google", url, q, name: q };
      tabs.push(tab);
    }
    saveTabs();
    if (tab.id === activeId) render(currentState);
    else go({ view: "tab", id: tab.id });
  }

  function navigateActive(url) {
    const tab = findTab(activeId);
    if (!tab || tab.kind === "search" || tab.kind === "google") { openSite(url); return; }
    tab.url = embeddable(url);
    tab.name = shortHost(tab.url);
    tab.kind = isBlockedUrl(tab.url) ? "blocked" : "site";
    saveTabs();
    reloadFrame(tab);
    render(currentState);
  }

  function closeTab(id) {
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const frame = frames.get(id);
    if (frame) frame.remove();
    frames.delete(id);
    tabs.splice(i, 1);
    saveTabs();
    if (id === activeId) {
      const next = tabs[i] || tabs[i - 1];
      const state = next ? { view: "tab", id: next.id } : { view: "home" };
      history.replaceState(state, "", hashFor(state));
      render(state);
    } else {
      renderTabs();
    }
  }

  function goHome() {
    if (currentState.view !== "home") go({ view: "home" });
  }

  function newTab() {
    goHome();
    setTimeout(() => $("bigSearch").focus(), 0);
  }

  // The first history entry is a "guard": going back onto it returns you to the
  // hub home instead of leaving the page.
  window.addEventListener("popstate", (e) => {
    const state = e.state;
    if (!state || state.guard) {
      const home = { view: "home" };
      history.pushState(home, "", hashFor(home));
      render(home);
      return;
    }
    render(state);
  });

  function initialState() {
    const tabMatch = location.hash.match(/^#tab=(.+)$/);
    if (tabMatch && findTab(tabMatch[1])) return { view: "tab", id: tabMatch[1] };
    const openMatch = location.hash.match(/^#open=(.+)$/);
    if (openMatch) {
      const url = embeddable(decodeURIComponent(openMatch[1]));
      let tab = tabs.find((t) => t.url === url);
      if (!tab) { tab = { id: uid(), kind: isBlockedUrl(url) ? "blocked" : "site", url, name: shortHost(url) }; tabs.push(tab); saveTabs(); }
      return { view: "tab", id: tab.id };
    }
    return { view: "home" };
  }

  function refresh() {
    const tab = findTab(activeId);
    if (tab) { reloadFrame(tab); toast("Refreshed"); }
    else location.reload();
  }

  function openInBrowserTab() {
    const tab = findTab(activeId);
    if (tab && tab.url) openBrowserTab(tab.url);
  }

  $("homeBtn").onclick = goHome;
  $("backBtn").onclick = () => history.back();
  $("fwdBtn").onclick = () => history.forward();
  $("refreshBtn").onclick = refresh;
  $("newTabBtn").onclick = openInBrowserTab;
  $("noticeOpenBtn").onclick = openInBrowserTab;
  $("noticeCloseBtn").onclick = () => { noticeDismissed = true; $("notice").classList.add("hidden"); };

  $("address").addEventListener("focus", (e) => {
    const tab = findTab(activeId);
    if (tab) { e.target.value = tab.kind === "search" || tab.kind === "google" ? tab.q : tab.url; e.target.select(); }
  });
  $("address").addEventListener("blur", (e) => {
    const tab = findTab(activeId);
    e.target.value = tab ? addressText(tab) : "";
  });

  // ---------- Spotlight search ----------
  // Results show while you type: your own links, a website to open, a web search,
  // a Wikipedia answer and Google's suggestions.
  const SEARCH_SVG = '<svg class="i" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>';
  const GLOBE_SVG = '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/></svg>';
  const spot = { input: null, items: [], hl: 0, q: "", seq: 0, suggestions: [], wiki: null, timer: null };
  let jsonpCount = 0;

  function jsonp(url) {
    if (EXT) return fetch(url).then((r) => r.json());
    return new Promise((resolve, reject) => {
      const cb = "__hubJsonp" + (++jsonpCount);
      const s = document.createElement("script");
      const timer = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, 3000);
      function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
      window[cb] = (d) => { cleanup(); resolve(d); };
      s.onerror = () => { cleanup(); reject(new Error("failed")); };
      s.src = url + "&callback=" + cb;
      document.head.appendChild(s);
    });
  }

  async function fetchWiki(q) {
    const search = await fetch("https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&origin=*&search=" + encodeURIComponent(q)).then((r) => r.json());
    const title = search[1] && search[1][0];
    if (!title) return null;
    const sum = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title)).then((r) => r.json());
    if (sum.type !== "standard" || !sum.extract) return null;
    return { title: sum.title, extract: sum.extract, thumb: sum.thumbnail && sum.thumbnail.source, url: sum.content_urls.desktop.page };
  }

  function buildItems() {
    const q = spot.q;
    const ql = q.toLowerCase();
    const items = [];
    const url = normalizeUrl(q);
    if (url) items.push({ type: "url", url });
    const hits = data.links
      .filter((l) => l.name.toLowerCase().includes(ql) || shortHost(l.url).includes(ql))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(ql)) - Number(a.name.toLowerCase().startsWith(ql)))
      .slice(0, 5);
    hits.forEach((link) => items.push({ type: "link", link }));
    items.push({ type: "search", q });
    if (spot.wiki) items.push({ type: "wiki", wiki: spot.wiki });
    spot.suggestions
      .filter((s) => s.toLowerCase() !== ql)
      .slice(0, 6)
      .forEach((s) => items.push({ type: "suggest", q: s }));
    return items;
  }

  function iconFor(item) {
    const box = document.createElement("span");
    box.className = "sp-ico";
    if (item.type === "link") {
      if (item.link.icon) {
        box.textContent = item.link.icon;
      } else {
        const img = document.createElement("img");
        img.src = favicon(item.link.url, 64);
        img.alt = "";
        box.appendChild(img);
      }
    } else {
      box.classList.add("plain");
      box.innerHTML = item.type === "url" ? GLOBE_SVG : SEARCH_SVG;
    }
    return box;
  }

  function renderSpot() {
    const pop = $("spotPop");
    pop.innerHTML = "";
    let lastSection = null;
    const sectionOf = { url: "Website", link: "Top Hits", search: "Search", wiki: "Wikipedia", suggest: "Suggestions" };
    spot.items.forEach((item, i) => {
      const section = sectionOf[item.type];
      if (section !== lastSection && section !== "Search") {
        const h = document.createElement("div");
        h.className = "sp-sec";
        h.textContent = section;
        pop.appendChild(h);
      }
      lastSection = section;

      const row = document.createElement("div");
      row.className = "sp-item" + (i === spot.hl ? " hl" : "");
      const main = document.createElement("span");
      main.className = "main";
      const sub = document.createElement("span");
      sub.className = "sub";

      if (item.type === "wiki") {
        row.classList.add("sp-wiki");
        if (item.wiki.thumb) {
          const img = document.createElement("img");
          img.className = "thumb";
          img.src = item.wiki.thumb;
          img.alt = "";
          row.appendChild(img);
        } else {
          row.appendChild(iconFor(item));
        }
        const t = document.createElement("div");
        t.className = "t";
        t.textContent = item.wiki.title;
        const ex = document.createElement("div");
        ex.className = "ex";
        ex.textContent = item.wiki.extract;
        main.append(t, ex);
        row.appendChild(main);
      } else {
        row.appendChild(iconFor(item));
        if (item.type === "url") { main.textContent = "Open " + shortHost(item.url); sub.textContent = "in the hub"; }
        if (item.type === "link") { main.textContent = item.link.name; sub.textContent = item.link.mode === "tab" ? "can’t open in the hub" : "in the hub"; }
        if (item.type === "search") { main.textContent = "Search the web for “" + item.q + "”"; sub.textContent = settings.engine === "google" ? "Google, in the hub" : "HUB Search"; }
        if (item.type === "suggest") { main.textContent = item.q; }
        row.append(main, sub);
      }

      row.addEventListener("pointerdown", (e) => e.preventDefault());
      row.addEventListener("mouseenter", () => { spot.hl = i; highlight(); });
      row.addEventListener("click", () => activate(item));
      pop.appendChild(row);
    });
    placeSpot();
    pop.classList.toggle("show", spot.items.length > 0);
  }

  function highlight() {
    $("spotPop").querySelectorAll(".sp-item").forEach((el, i) => el.classList.toggle("hl", i === spot.hl));
    const el = $("spotPop").querySelectorAll(".sp-item")[spot.hl];
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function placeSpot() {
    if (!spot.input) return;
    const r = spot.input.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 380), window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const pop = $("spotPop");
    pop.style.left = left + "px";
    pop.style.top = r.bottom + 6 + "px";
    pop.style.width = width + "px";
  }

  function hideSpot() {
    spot.seq++;
    clearTimeout(spot.timer);
    $("spotPop").classList.remove("show");
    spot.items = [];
  }

  function updateSpot(input) {
    spot.input = input;
    spot.q = input.value.trim();
    if (!spot.q || (input === $("address") && activeId && input.value === findTab(activeId).url)) { hideSpot(); return; }
    spot.hl = 0;
    spot.suggestions = [];
    spot.wiki = null;
    spot.items = buildItems();
    renderSpot();

    const seq = ++spot.seq;
    clearTimeout(spot.timer);
    if (normalizeUrl(spot.q)) return;
    spot.timer = setTimeout(() => {
      const q = spot.q;
      jsonp("https://suggestqueries.google.com/complete/search?client=chrome&q=" + encodeURIComponent(q))
        .then((d) => {
          if (seq !== spot.seq) return;
          spot.suggestions = (d && d[1]) || [];
          refreshItems();
        })
        .catch(() => {});
      if (q.length >= 3) {
        fetchWiki(q)
          .then((w) => {
            if (seq !== spot.seq || !w) return;
            spot.wiki = w;
            refreshItems();
          })
          .catch(() => {});
      }
    }, 160);
  }

  function refreshItems() {
    const current = spot.items[spot.hl];
    spot.items = buildItems();
    const keep = current ? spot.items.findIndex((it) => it.type === current.type && (it.q || it.url || (it.link && it.link.id)) === (current.q || current.url || (current.link && current.link.id))) : 0;
    spot.hl = keep >= 0 ? keep : 0;
    renderSpot();
  }

  function activate(item) {
    const input = spot.input;
    hideSpot();
    if (!item) return;
    if (item.type === "url") {
      if (input === $("address") && activeId) navigateActive(item.url);
      else openSite(item.url);
    } else if (item.type === "link") {
      openLink(item.link);
    } else if (item.type === "wiki") {
      openSite(item.wiki.url, item.wiki.title);
    } else {
      doSearch(item.q);
    }
    if (input) {
      if (input === $("bigSearch")) input.value = "";
      input.blur();
    }
  }

  [$("bigSearch"), $("address")].forEach((input) => {
    input.addEventListener("input", () => updateSpot(input));
    input.addEventListener("keydown", (e) => {
      const open = $("spotPop").classList.contains("show") && spot.input === input;
      if (e.key === "Enter") {
        e.preventDefault();
        if (open) { activate(spot.items[spot.hl]); return; }
        const text = input.value.trim();
        if (!text) return;
        spot.input = input;
        const url = normalizeUrl(text);
        activate(url ? { type: "url", url } : { type: "search", q: text });
      } else if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const n = spot.items.length;
        spot.hl = (spot.hl + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
        highlight();
      } else if (open && e.key === "Escape") {
        e.stopPropagation();
        hideSpot();
      }
    });
    input.addEventListener("blur", () => setTimeout(() => { if (spot.input === input) hideSpot(); }, 120));
  });
  window.addEventListener("resize", placeSpot);
  $("home").addEventListener("scroll", placeSpot);

  // ---------- Full screen ----------
  // Older Safari only has the webkit-prefixed versions.
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFullscreen() {
    const root = document.documentElement;
    if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else if (root.requestFullscreen) root.requestFullscreen().catch(() => toast("Full screen was blocked by the browser"));
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else toast("This browser doesn’t support full screen");
  }
  function updateFsIcon() {
    const on = !!fsElement();
    $("fsBtn").innerHTML = on ? SVG.shrink : SVG.expand;
    $("fsBtn").title = on ? "Exit full screen (Alt+F)" : "Full screen (Alt+F)";
  }
  $("fsBtn").onclick = toggleFullscreen;
  document.addEventListener("fullscreenchange", updateFsIcon);
  document.addEventListener("webkitfullscreenchange", updateFsIcon);

  // ---------- Control Center ----------
  function closeCC() {
    $("cc").classList.remove("show");
    $("ccBtn").classList.remove("on");
  }
  $("ccBtn").onclick = (e) => {
    e.stopPropagation();
    const on = $("cc").classList.toggle("show");
    $("ccBtn").classList.toggle("on", on);
  };
  document.addEventListener("click", (e) => {
    if (!$("cc").contains(e.target) && !$("ccBtn").contains(e.target)) closeCC();
  });

  function paintSlider(el) {
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty("--p", pct + "%");
  }

  function showHud(iconHtml, percent) {
    $("hudIco").innerHTML = iconHtml;
    $("hudFill").style.width = Math.max(0, Math.min(100, percent)) + "%";
    $("hud").classList.add("show");
    clearTimeout(showHud.timer);
    showHud.timer = setTimeout(() => $("hud").classList.remove("show"), 1200);
  }

  // ---------- Brightness ----------
  let brightness = store.get("hub-brightness", 100);

  function setBrightness(value, withHud) {
    brightness = Math.max(30, Math.min(150, value));
    store.set("hub-brightness", brightness);
    document.body.style.filter = brightness === 100 ? "" : `brightness(${brightness / 100})`;
    $("briSlider").value = brightness;
    paintSlider($("briSlider"));
    $("briNum").textContent = "Brightness " + brightness + "%";
    if (withHud) showHud(brightness >= 100 ? SVG.sunHigh : SVG.sunLow, ((brightness - 30) / 120) * 100);
  }
  $("briSlider").addEventListener("input", (e) => setBrightness(Number(e.target.value)));
  $("briReset").onclick = () => setBrightness(100, true);

  // ---------- Volume / speakers ----------
  let volume = store.get("hub-volume", 70);
  let muted = store.get("hub-muted", false);
  let audioCtx = null;

  const volLevel = () => (muted || volume === 0 ? "mute" : volume < 40 ? "low" : "high");

  function updateVolumeUI() {
    $("volSlider").value = muted ? 0 : volume;
    paintSlider($("volSlider"));
    $("volNum").textContent = muted ? "Muted" : "Volume " + volume + "%";
    $("muteBtn").innerHTML = speakerSvg(volLevel());
  }

  function setVolume(value, withHud) {
    volume = Math.max(0, Math.min(100, value));
    muted = false;
    store.set("hub-volume", volume);
    store.set("hub-muted", muted);
    updateVolumeUI();
    if (withHud) { showHud(speakerSvg(volLevel()), volume); beep(); }
  }

  function toggleMute(withHud) {
    muted = !muted;
    store.set("hub-muted", muted);
    updateVolumeUI();
    if (withHud) showHud(speakerSvg(volLevel()), muted ? 0 : volume);
  }

  function audio() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, start, length, pan) {
    const ctx = audio();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const level = (volume / 100) * 0.5;
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(g);
    if (panner) { panner.pan.value = pan; g.connect(panner).connect(ctx.destination); }
    else g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  function beep() {
    if (muted || volume === 0) return;
    tone(880, audio().currentTime, 0.12, 0);
  }

  function playTestSound(pan) {
    if (muted || volume === 0) { toast("Sound is muted – turn the volume up first"); return; }
    const now = audio().currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, now + i * 0.16, 0.45, pan));
    toast(pan < 0 ? "Playing on the left speaker" : pan > 0 ? "Playing on the right speaker" : "Playing on both speakers");
  }

  $("volSlider").addEventListener("input", (e) => setVolume(Number(e.target.value)));
  $("volSlider").addEventListener("change", beep);
  $("muteBtn").onclick = () => toggleMute(true);
  $("testLeft").onclick = () => playTestSound(-1);
  $("testBoth").onclick = () => playTestSound(0);
  $("testRight").onclick = () => playTestSound(1);

  // ---------- Customize ----------
  function openCustomize() {
    closeCC();
    renderCustomize();
    $("custBg").classList.add("show");
  }
  const closeCustomize = () => $("custBg").classList.remove("show");
  $("custBtn").onclick = openCustomize;
  $("custPill").onclick = openCustomize;
  $("custClose").onclick = closeCustomize;
  $("custBg").onclick = (e) => { if (e.target === $("custBg")) closeCustomize(); };

  function renderCustomize() {
    $("themeSeg").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === settings.theme));
    $("engineSeg").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === settings.engine));
    $("safeToggle").checked = settings.safe;

    const sw = $("swatches");
    sw.innerHTML = "";
    ACCENTS.forEach((c) => {
      const b = document.createElement("button");
      b.className = "swatch" + (settings.accent === c ? " on" : "");
      b.style.background = c || "linear-gradient(135deg,#0071e3 50%,#0a84ff 50%)";
      b.title = c ? c : "Blue (default)";
      b.onclick = () => { settings.accent = c; saveSettings(); applyTheme(); renderCustomize(); };
      sw.appendChild(b);
    });

    const wps = $("wps");
    wps.innerHTML = "";
    Object.entries(WALLPAPERS).forEach(([key, wp]) => {
      const b = document.createElement("button");
      b.className = "wp" + (settings.wallpaper === key ? " on" : "");
      b.style.background = wp.bg;
      b.innerHTML = "<span></span>";
      b.firstChild.textContent = wp.name;
      b.onclick = () => { settings.wallpaper = key; saveSettings(); applyWallpaper(); renderCustomize(); };
      wps.appendChild(b);
    });
    const img = localStorage.getItem("hub-bg-image");
    const up = document.createElement("button");
    up.className = "wp" + (img ? "" : " upload") + (settings.wallpaper === "image" ? " on" : "");
    if (img) up.style.background = `url("${img}")`;
    else up.innerHTML = SVG.plus;
    up.insertAdjacentHTML("beforeend", "<span>" + (img ? "Your photo" : "Upload photo") + "</span>");
    up.title = img ? "Click to use it · click again to pick a different photo" : "Pick a photo from this computer";
    up.onclick = () => {
      if (img && settings.wallpaper !== "image") {
        settings.wallpaper = "image"; saveSettings(); applyWallpaper(); renderCustomize();
      } else {
        $("wallFile").click();
      }
    };
    wps.appendChild(up);

    $("wallUrl").value = settings.wallpaper === "url" ? settings.wallUrl : "";
    $("dimSlider").value = settings.dim;
    paintSlider($("dimSlider"));
    $("clock24").checked = settings.clock24;
    $("seconds").checked = settings.seconds;
    $("notesToggle").checked = settings.notes;
  }

  $("themeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    settings.theme = b.dataset.v;
    saveSettings();
    applyTheme();
    renderCustomize();
  });

  $("engineSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    settings.engine = b.dataset.v;
    saveSettings();
    renderCustomize();
  });
  $("safeToggle").onchange = (e) => { settings.safe = e.target.checked; saveSettings(); };

  $("wallFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let quality = 0.85;
      let url = canvas.toDataURL("image/jpeg", quality);
      while (url.length > 3_500_000 && quality > 0.4) {
        quality -= 0.15;
        url = canvas.toDataURL("image/jpeg", quality);
      }
      localStorage.setItem("hub-bg-image", url);
      settings.wallpaper = "image";
      saveSettings();
      applyWallpaper();
      renderCustomize();
      toast("Wallpaper set");
    } catch {
      toast("Couldn’t use that picture – try a smaller one");
    }
  });

  $("wallUrlBtn").onclick = () => {
    const v = $("wallUrl").value.trim();
    if (!/^https?:\/\//i.test(v)) { toast("Paste a link that starts with https://"); return; }
    settings.wallpaper = "url";
    settings.wallUrl = v;
    saveSettings();
    applyWallpaper();
    renderCustomize();
  };

  $("dimSlider").addEventListener("input", (e) => {
    settings.dim = Number(e.target.value);
    paintSlider(e.target);
    saveSettings();
    applyWallpaper();
  });
  $("clock24").onchange = (e) => { settings.clock24 = e.target.checked; saveSettings(); tick(); };
  $("seconds").onchange = (e) => { settings.seconds = e.target.checked; saveSettings(); tick(); };
  $("notesToggle").onchange = (e) => { settings.notes = e.target.checked; saveSettings(); renderCards(); };

  $("exportBtn").onclick = () => {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith("hub-")) backup[k] = localStorage.getItem(k);
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
    a.download = "hub-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const keys = Object.keys(backup).filter((k) => k.startsWith("hub-"));
      if (!keys.length) throw new Error("empty");
      keys.forEach((k) => localStorage.setItem(k, backup[k]));
      location.hash = "";
      location.reload();
    } catch {
      toast("That file isn’t a HUB backup");
    }
  });
  $("resetBtn").onclick = () => {
    if (!confirm("Reset HUB? This removes your folders, links, tabs, notes, wallpaper and settings.")) return;
    Object.keys(localStorage).filter((k) => k.startsWith("hub-")).forEach((k) => localStorage.removeItem(k));
    location.hash = "";
    location.reload();
  };

  // ---------- Keys ----------
  // With "Treat top-row keys as function keys" on, the Chromebook top row arrives as F1–F10.
  const LAYOUTS = {
    a: { F1: "back", F2: "forward", F3: "refresh", F4: "fullscreen", F6: "briDown", F7: "briUp", F8: "mute", F9: "volDown", F10: "volUp" },
    b: { F1: "back", F2: "refresh", F3: "fullscreen", F6: "briDown", F7: "briUp", F8: "mute", F9: "volDown", F10: "volUp" },
  };
  const MEDIA_KEYS = {
    AudioVolumeUp: "volUp", AudioVolumeDown: "volDown", AudioVolumeMute: "mute",
    BrightnessUp: "briUp", BrightnessDown: "briDown",
  };
  const ALT_KEYS = { b: "back", r: "refresh", h: "home", f: "fullscreen", m: "mute", t: "newTab", w: "closeTab" };

  const ACTIONS = {
    back:       { label: "Back",            run: () => history.back() },
    forward:    { label: "Forward",         run: () => history.forward() },
    refresh:    { label: "Refresh",         run: refresh },
    fullscreen: { label: "Full screen",     run: toggleFullscreen },
    home:       { label: "Home",            run: goHome },
    newTab:     { label: "New tab",         run: newTab },
    closeTab:   { label: "Close tab",       run: () => activeId && closeTab(activeId) },
    mute:       { label: "Mute",            run: () => toggleMute(true) },
    volUp:      { label: "Volume up",       run: () => setVolume(volume + 10, true) },
    volDown:    { label: "Volume down",     run: () => setVolume(volume - 10, true) },
    briUp:      { label: "Brightness up",   run: () => setBrightness(brightness + 10, true) },
    briDown:    { label: "Brightness down", run: () => setBrightness(brightness - 10, true) },
  };

  let layout = store.get("hub-key-layout", "a");
  $("layoutSel").value = layout;
  $("layoutSel").onchange = (e) => { layout = e.target.value; store.set("hub-key-layout", layout); };

  function actionFor(e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey) return ALT_KEYS[e.key.toLowerCase()];
    return LAYOUTS[layout][e.key] || MEDIA_KEYS[e.key];
  }

  const typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCC(); closeCustomize(); closeAddDialog();
      if (editing && !typing(e.target)) setEditing(false);
      return;
    }
    if (e.key === "/" && !typing(e.target) && currentState.view === "home") {
      e.preventDefault();
      $("bigSearch").focus();
      return;
    }
    if (e.altKey && /^[1-9]$/.test(e.key)) {
      const tab = tabs[Number(e.key) - 1];
      if (tab) { e.preventDefault(); switchTab(tab.id); }
      return;
    }

    const name = actionFor(e);
    if ($("cc").classList.contains("show")) {
      const combo = (e.altKey ? "Alt + " : "") + (e.key === " " ? "Space" : e.key);
      $("keybox").innerHTML = "";
      const k = document.createElement("div");
      k.className = "k";
      k.textContent = combo;
      const a = document.createElement("div");
      a.className = "a";
      a.textContent = name ? "Hub does: " + ACTIONS[name].label : "Key works";
      $("keybox").append(k, a);
    }
    if (!name) return;
    e.preventDefault();
    ACTIONS[name].run();
  });

  // ---------- Clock ----------
  function tick() {
    const now = new Date();
    $("date").textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    const opts = { hour: "numeric", minute: "2-digit", hour12: !settings.clock24 };
    if (settings.seconds) opts.second = "2-digit";
    if (settings.clock24) opts.hour = "2-digit";
    $("time").textContent = now.toLocaleTimeString([], opts).replace(/\s?[AP]M$/i, "");
  }

  // ---------- Keep popups below the toolbar ----------
  const toolbar = document.querySelector(".toolbar");
  function placePopups() {
    const bottom = toolbar.getBoundingClientRect().bottom;
    $("cc").style.top = bottom + 8 + "px";
    $("cc").style.maxHeight = `calc(100vh - ${bottom + 18}px)`;
    $("toast").style.top = bottom + 10 + "px";
  }
  new ResizeObserver(placePopups).observe(toolbar);
  window.addEventListener("resize", placePopups);

  // ---------- Start ----------
  applyTheme();
  applyWallpaper();
  renderCards();
  setBrightness(brightness);
  updateVolumeUI();
  updateFsIcon();
  tick();
  setInterval(tick, 1000);

  if (EXT) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === "hub-open" && msg.tabId === hubTabId) openSite(msg.url);
    });
  }

  const start = initialState();
  history.replaceState({ guard: true }, "", location.pathname + location.search);
  history.pushState(start, "", hashFor(start));
  // With the extension, sites are only allowed in once this tab is registered.
  extReady.then(() => render(start));
})();
