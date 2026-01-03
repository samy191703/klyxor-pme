// server/swagger.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express, Request, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

type SwaggerSetupOptions = {
  route?: string;
  jsonRoute?: string;
  apiPrefix?: string;
  apis?: string[];
  title?: string;
  version?: string;
};

// ----- ESM-safe __dirname / __filename -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the real project root (where package.json lives), not relying on cwd
function findProjectRoot(startDir = __dirname): string {
  let dir = startDir;
  while (true) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // fallback: cwd
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

// Absolutize a glob relative to the project root
function absGlob(rel: string): string {
  return path.resolve(PROJECT_ROOT, rel);
}

function inferServerUrl(req: Request, apiPrefix: string) {
  const proto =
    (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    req.get("host") ||
    "localhost:5000";
  const override = process.env.SWAGGER_SERVER_URL;
  return (override || `${proto}://${host}`) + apiPrefix;
}

function makeSpec(
  serverUrl: string,
  opts: Required<Pick<SwaggerSetupOptions, "apis" | "title" | "version">>
) {
  return swaggerJsdoc({
    definition: {
      openapi: "3.0.3",
      info: {
        title: opts.title,
        version: opts.version,
        description:
          "API documentation. Use the top-right Login button for username/password (Passport).",
      },
      servers: [{ url: serverUrl }],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: process.env.SESSION_COOKIE_NAME || "klyxor.sid",
            description:
              "Session cookie set by /api/auth/login (Passport local). UI sends it via fetch credentials = 'include'.",
          },
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
      security: [{ cookieAuth: [] }],
    },
    apis: opts.apis,
  });
}

export function setupSwagger(app: Express, options: SwaggerSetupOptions = {}) {
  if (process.env.SWAGGER_ENABLED === "false") return;

  const route = options.route ?? "/api/docs";
  const jsonRoute = options.jsonRoute ?? "/api/docs.json";
  const apiPrefix = options.apiPrefix ?? "";

  // Always cover TS and JS; ALWAYS absolutize (even if caller passed 'apis')
  const apiGlobs =
    options.apis && options.apis.length
      ? options.apis
      : [
          // Source files (dev or prod if TS is shipped)
          "server/routes/**/*.ts",
          "server/models/**/*.ts",
          // Transpiled JS (common in prod)
          "dist/server/routes/**/*.js",
          "dist/server/models/**/*.js",
        ];
  const apis = apiGlobs.map(absGlob);

  const title = options.title ?? "EngieIndexation API";
  const version = options.version ?? "1.0.0";

  // Helpful debug to confirm what’s scanned in dev/prod logs
  console.log("[Swagger] Using API globs:", apis);

  // 1) JSON endpoint – must NOT be protected/redirected
  app.get(jsonRoute, (req: Request, res: Response) => {
    const serverUrl = inferServerUrl(req, apiPrefix);
    const spec = makeSpec(serverUrl, { apis, title, version });
    res.type("application/json; charset=utf-8").send(spec);
  });

  // 2) UI cosmetics
  const customCss = `
  .topbar { background-color: rgba(175, 170, 102, 1) !important; }
  .topbar-wrapper a {display : none !important}
  .topbar-wrapper .auth-status { margin-left: 12px; font-size: 13px; opacity: .9; }
  .topbar .btn.kx-auth { margin-left: 8px; }
  .auth-wrapper {display:none !important;}
  `;

  // 3) Custom JS: login modal + session check + logout + requestInterceptor(credentials='include')
  app.get(`${route}/auth-ui.js`, (_req, res) => {
    res.type("application/javascript; charset=utf-8").send(
      `
(function () {
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { typeof c === 'string' ? n.appendChild(document.createTextNode(c)) : n.appendChild(c); });
    return n;
  }
  var currentUser = null;
  var uiInterval = null;
  function getUi() { return window.ui; }
  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ credentials: 'include' }, opts || {}));
    if (!res.ok) throw new Error(await res.text().catch(()=>'HTTP ' + res.status));
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }
  async function checkSession() {
    try {
      const data = await api('/api/auth/check', { method: 'GET' });
      currentUser = (data && (data.user || data)) || null;
    } catch (e) { currentUser = null; }
    renderTopbar();
  }
  async function doLogin(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
    if (!res.ok) { const txt = await res.text().catch(()=> ''); throw new Error(txt || ('HTTP ' + res.status)); }
    let token = null, data = null;
    try {
      data = await res.json();
      token = data && (data.token || data.accessToken || data.jwt || null);
      currentUser = (data && (data.user || data.profile)) || null;
    } catch (e) { /* cookie-only */ }
    try { if (token && getUi() && getUi().preauthorizeApiKey) { getUi().preauthorizeApiKey('bearerAuth', token); } } catch (e) {}
    renderTopbar();
    return data || { ok: true };
  }
  async function doLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    currentUser = null;
    try { if (getUi() && getUi().authActions && getUi().authActions.logout) { getUi().authActions.logout(['bearerAuth']); } } catch (e) {}
    renderTopbar();
  }
  function showLoginModal() {
    var overlay = el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;' });
    var modal = el('div', { style: 'background:#fff;min-width:320px;max-width:420px;padding:16px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.2);' }, [
      el('h3', { style: 'margin:0 0 12px 0' }, ['Login']),
    ]);
    var form = el('form', { style: 'display:flex;flex-direction:column;gap:8px;' });
    var u = el('input', { type: 'text', placeholder: 'Username', style: 'padding:8px;border:1px solid #ddd;border-radius:6px;' });
    var p = el('input', { type: 'password', placeholder: 'Password', style: 'padding:8px;border:1px solid #ddd;border-radius:6px;' });
    var errBox = el('div', { style: 'color:#c00;font-size:13px;min-height:18px;' });
    var row = el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px;' });
    var cancelBtn = el('button', { type: 'button', class: 'btn', style: 'padding:6px 12px;' }, ['Cancel']);
    var loginBtn = el('button', { type: 'submit', class: 'btn authorize unlocked', style: 'padding:6px 12px;' }, ['Login']);
    cancelBtn.onclick = function(){ document.body.removeChild(overlay); };
    form.onsubmit = async function(ev){
      ev.preventDefault();
      errBox.textContent = ''; loginBtn.disabled = true;
      try { await doLogin(u.value, p.value); document.body.removeChild(overlay); alert('Login successful'); }
      catch (e) { errBox.textContent = (e && e.message) || 'Login failed'; }
      finally { loginBtn.disabled = false; }
    };
    row.appendChild(cancelBtn); row.appendChild(loginBtn);
    form.appendChild(u); form.appendChild(p); form.appendChild(errBox); form.appendChild(row);
    modal.appendChild(form); overlay.appendChild(modal); document.body.appendChild(overlay); u.focus();
  }
  function renderTopbar() {
    var topbar = document.querySelector('.topbar'); if (!topbar) return;
    var old = topbar.querySelector('.kx-auth-wrap'); if (old) old.remove();
    var wrap = el('div', { class: 'kx-auth-wrap', style: "display:flex;align-items:center;margin-left:12px;gap:12px;font-family:sans-serif;" });
    var status = el('div', { class: 'auth-status', style: "color:#FFFFFF;font-size:14px;padding:4px 8px;background-color:#0F2A43;border-radius:6px;" }, [
      currentUser ? ("Signed in as " + (currentUser.username || currentUser.email || "user")) : "Not signed in"
    ]);
    var loginBtn = el('button', { type: 'button', class: 'btn kx-auth', style: "background-color:#C9A646;color:#0F2A43;font-weight:bold;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;transition:all 0.2s ease-in-out;" }, ["Login"]);
    loginBtn.onmouseenter = () => loginBtn.style.opacity = "0.85";
    loginBtn.onmouseleave = () => loginBtn.style.opacity = "1";
    loginBtn.onclick = showLoginModal;
    var logoutBtn = el('button', { type: 'button', class: 'btn kx-auth', style: "background-color:#0F2A43;color:#FFFFFF;font-weight:bold;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;transition:all 0.2s ease-in-out;" }, ["Logout"]);
    logoutBtn.onmouseenter = () => logoutBtn.style.opacity = "0.85";
    logoutBtn.onmouseleave = () => logoutBtn.style.opacity = "1";
    logoutBtn.onclick = async function () { await doLogout(); alert("Logged out"); };
    wrap.appendChild(status); wrap.appendChild(currentUser ? logoutBtn : loginBtn); topbar.appendChild(wrap);
  }
  function patchTryItOutCredentials() {
    try {
      if (!window.ui || !window.ui.getConfigs) return;
      window.ui.getConfigs().requestInterceptor = function (r) { r.credentials = 'include'; return r; };
    } catch (e) {}
  }
  renderTopbar(); patchTryItOutCredentials(); checkSession();
  uiInterval = setInterval(function(){ renderTopbar(); patchTryItOutCredentials(); }, 1500);
  window.addEventListener('beforeunload', function(){ clearInterval(uiInterval); });
})();
        `.trim()
    );
  });

  // 4) Swagger UI
  app.use(
    route,
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: jsonRoute,
        persistAuthorization: true,
        requestInterceptor: (r: any) => {
          r.credentials = "include";
          return r;
        },
      },
      customJs: `${route}/auth-ui.js`,
      customCss,
    })
  );
}
