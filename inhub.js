// Runs in the page itself, in every website frame inside the hub. Scripts in a frame
// can only see cookies marked SameSite=None, so cookies a site sets from its own
// scripts get that mark. Without this, some sites think cookies are turned off.
(() => {
  const origins = location.ancestorOrigins;
  if (window.top === window || !origins || !origins.length || location.protocol !== "https:") return;
  if (!origins[origins.length - 1].startsWith("chrome-extension://")) return;

  const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
  if (!desc || !desc.set) return;
  Object.defineProperty(Document.prototype, "cookie", {
    configurable: true,
    enumerable: desc.enumerable,
    get() { return desc.get.call(this); },
    set(value) {
      let v = String(value);
      if (/;\s*samesite\s*=/i.test(v)) v = v.replace(/;\s*samesite\s*=\s*(lax|strict)/i, "; SameSite=None");
      else v += "; SameSite=None";
      if (!/;\s*secure\b/i.test(v)) v += "; Secure";
      desc.set.call(this, v);
    },
  });
})();
