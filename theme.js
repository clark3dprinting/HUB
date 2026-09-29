try {
  const s = JSON.parse(localStorage.getItem("hub-settings") || "{}");
  const dark = s.theme === "dark" || ((!s.theme || s.theme === "auto") && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.mode = dark ? "dark" : "light";
} catch {}
