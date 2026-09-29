// Runs in the page itself on Microsoft's sign-in page, which refuses to sign in when it
// sees it's inside a frame. Inside the hub, make its "am I the top page?" check pass and
// turn on its allowFrame setting.
(() => {
  const origins = location.ancestorOrigins;
  if (window.top === window || !origins || !origins.length || !origins[origins.length - 1].startsWith("chrome-extension://")) return;
  const top = window.top;
  Object.defineProperty(window, "self", { configurable: true, get: () => top });
  const fix = (v) => { if (v && typeof v === "object") v.allowFrame = true; return v; };
  for (const name of ["$Config", "ServerData"]) {
    let value;
    Object.defineProperty(window, name, {
      configurable: true,
      get: () => value,
      set: (v) => { value = fix(v); },
    });
  }
})();
