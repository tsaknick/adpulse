import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || process.env.ADPULSE_API_PORT || 8787);
const HOST = process.env.RENDER ? "0.0.0.0" : process.env.ADPULSE_API_HOST || "127.0.0.1";
const DIST_DIR = path.join(__dirname, "dist");
const STORE_DIR = path.join(__dirname, ".adpulse-data");
const STORE_FILE = path.join(STORE_DIR, "integrations.json");
const AUTH_STATE_TTL = 15 * 60 * 1000;
const GOOGLE_SCOPE_BASE = ["openid", "email", "profile"];
const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v23";
const GOOGLE_ADS_SYNC_CAMPAIGN_CAP = Number(process.env.ADPULSE_GOOGLE_SYNC_CAMPAIGN_CAP || 200);
const GOOGLE_ADS_SYNC_AD_GROUP_CAP = Number(process.env.ADPULSE_GOOGLE_SYNC_AD_GROUP_CAP || 500);
const GOOGLE_ADS_LIVE_CAMPAIGN_LIMIT = Number(process.env.ADPULSE_GOOGLE_LIVE_CAMPAIGN_LIMIT || 1000);
const GOOGLE_ADS_LIVE_AD_LIMIT = Number(process.env.ADPULSE_GOOGLE_LIVE_AD_LIMIT || 1000);
const META_API_VERSION = process.env.META_API_VERSION || "v23.0";
const META_ADS_LIVE_CAMPAIGN_LIMIT = Number(process.env.ADPULSE_META_LIVE_CAMPAIGN_LIMIT || 500);
const META_ADS_LIVE_AD_LIMIT = Number(process.env.ADPULSE_META_LIVE_AD_LIMIT || 500);
const TIKTOK_ADS_LIVE_CAMPAIGN_LIMIT = Number(process.env.ADPULSE_TIKTOK_LIVE_CAMPAIGN_LIMIT || 500);
const TIKTOK_ADS_LIVE_AD_LIMIT = Number(process.env.ADPULSE_TIKTOK_LIVE_AD_LIMIT || 500);
const SEARCH_TERM_ALLOWED_TAGS = new Set(["good", "bad", "neutral"]);
const USER_ALLOWED_ROLES = new Set(["director", "account"]);
const SEARCH_TERM_ALLOWED_SCOPE_LEVELS = new Set(["ad_group", "campaign"]);
const SEARCH_TERM_ALLOWED_DATE_RANGES = new Set([
  "LAST_7_DAYS",
  "LAST_14_DAYS",
  "LAST_30_DAYS",
  "THIS_MONTH",
  "LAST_MONTH",
]);
const GOOGLE_ADS_LIVE_ALLOWED_DATE_RANGES = new Set([
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "THIS_MONTH",
  "LAST_MONTH",
  "CUSTOM",
]);
const DEFAULT_ANTHROPIC_STRATEGIST_MODEL = "claude-sonnet-4-6";
const AI_STRATEGY_CACHE_TTL = Number(process.env.ADPULSE_AI_STRATEGY_CACHE_TTL || 15 * 60 * 1000);

loadEnvFile(path.join(__dirname, ".env.local"));
loadEnvFile(path.join(__dirname, ".env"));

const PROVIDERS = {
  google_ads: {
    platform: "google_ads",
    label: "Google Ads",
    scopeLabel: "Manager account",
    scopes: [...GOOGLE_SCOPE_BASE, "https://www.googleapis.com/auth/adwords"],
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN"],
  },
  ga4: {
    platform: "ga4",
    label: "Google Analytics 4",
    scopeLabel: "Analytics portfolio",
    scopes: [...GOOGLE_SCOPE_BASE, "https://www.googleapis.com/auth/analytics.readonly"],
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  meta_ads: {
    platform: "meta_ads",
    label: "Meta Ads",
    scopeLabel: "Business access",
    scopes: ["ads_read", "ads_management", "business_management", "read_insights"],
    requiredEnv: ["META_APP_ID", "META_APP_SECRET"],
  },
  tiktok_ads: {
    platform: "tiktok_ads",
    label: "TikTok Ads",
    scopeLabel: "Advertiser access",
    scopes: [],
    requiredEnv: ["TIKTOK_APP_ID", "TIKTOK_APP_SECRET"],
  },
};

const pendingStates = new Map();
const aiStrategyCache = new Map();
const DEFAULT_USERS = [
  { id: "usr-01", name: "Maria Papadaki", role: "director", title: "Performance Director", email: "director@adpulse.local", password: "demo123", accent: "#162218", accent2: "#2d6cdf" },
  { id: "usr-02", name: "Anna Kosta", role: "account", title: "Senior Account Manager", email: "anna@adpulse.local", password: "demo123", accent: "#0f8f66", accent2: "#78d1ad" },
  { id: "usr-03", name: "Nikos Lazos", role: "account", title: "Account Manager", email: "nikos@adpulse.local", password: "demo123", accent: "#2d6cdf", accent2: "#8db1ff" },
  { id: "usr-04", name: "Eleni Moraitou", role: "account", title: "Paid Media Manager", email: "eleni@adpulse.local", password: "demo123", accent: "#cf553e", accent2: "#f2b07c" },
  { id: "usr-05", name: "Kostas Marinis", role: "account", title: "Growth Account Manager", email: "kostas@adpulse.local", password: "demo123", accent: "#9966e8", accent2: "#c7a8ff" },
];

ensureStore();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    prunePendingStates();

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, now: new Date().toISOString() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/integrations") {
      sendJson(response, 200, buildSnapshot());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/users") {
      sendJson(response, 200, { users: listStoredUsers() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/clients") {
      sendJson(response, 200, { clients: listStoredClients() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/users/login") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const result = authenticateStoredUser(parsed);
      sendJson(response, result.ok ? 200 : 401, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/users") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const result = createStoredUser(parsed);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    const updateUserMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (request.method === "PATCH" && updateUserMatch) {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const result = updateStoredUser(updateUserMatch[1], parsed);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    if (request.method === "DELETE" && updateUserMatch) {
      const result = deleteStoredUser(updateUserMatch[1]);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    const clientMatch = url.pathname.match(/^\/api\/clients\/([^/]+)$/);
    if (request.method === "PUT" && clientMatch) {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const result = saveStoredClient(clientMatch[1], parsed);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    if (request.method === "DELETE" && clientMatch) {
      const result = deleteStoredClient(clientMatch[1]);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    const authStartMatch = url.pathname.match(/^\/api\/auth\/([^/]+)\/start$/);
    if (request.method === "GET" && authStartMatch) {
      await handleAuthStart(request, response, authStartMatch[1]);
      return;
    }

    const authCallbackMatch = url.pathname.match(/^\/api\/auth\/([^/]+)\/callback$/);
    if (request.method === "GET" && authCallbackMatch) {
      await handleAuthCallback(request, response, authCallbackMatch[1], url);
      return;
    }

    const syncMatch = url.pathname.match(/^\/api\/integrations\/([^/]+)\/sync$/);
    if (request.method === "POST" && syncMatch) {
      const connection = await syncStoredConnection(syncMatch[1]);
      sendJson(response, 200, { ok: true, connection: redactConnection(connection) });
      return;
    }

    const deleteMatch = url.pathname.match(/^\/api\/integrations\/([^/]+)$/);
    if (request.method === "DELETE" && deleteMatch) {
      removeStoredConnection(deleteMatch[1]);
      sendJson(response, 200, { ok: true });
      return;
    }

    // ── Setup Wizard endpoints ──────────────────────────────────
    if (request.method === "POST" && url.pathname === "/api/google-ads/live-overview") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const payload = await fetchGoogleAdsLiveOverview(parsed);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/google-ads/report-details") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const payload = await fetchGoogleAdsReportDetails(parsed);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/meta-ads/live-overview") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const payload = await fetchMetaAdsLiveOverview(parsed);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/tiktok-ads/live-overview") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const payload = await fetchTikTokAdsLiveOverview(parsed);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ga4/live-overview") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const payload = await fetchGa4LiveOverview(parsed);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/strategy") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const payload = await generateAiStrategy(parsed);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/setup") {
      sendJson(response, 200, getSetupStatus());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/setup") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }
      const result = saveSetupCredentials(parsed);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/search-terms/tags") {
      const filters = getSearchTermTagFilters(url.searchParams);
      sendJson(response, 200, { tags: listStoredSearchTermTags(filters) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/search-terms/tags") {
      const body = await readRequestBody(request);
      let parsed;
      try { parsed = JSON.parse(body); } catch (_) {
        sendJson(response, 400, { error: "Invalid JSON body." });
        return;
      }

      const result = saveStoredSearchTermTag(parsed);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    const searchTermHierarchyMatch = url.pathname.match(/^\/api\/search-terms\/([^/]+)\/hierarchy$/);
    if (request.method === "GET" && searchTermHierarchyMatch) {
      const payload = await fetchSearchTermHierarchy(searchTermHierarchyMatch[1], url.searchParams);
      sendJson(response, 200, payload);
      return;
    }

    const searchTermsMatch = url.pathname.match(/^\/api\/search-terms\/([^/]+)$/);
    if (request.method === "GET" && searchTermsMatch) {
      const payload = await fetchSearchTerms(searchTermsMatch[1], url.searchParams);
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      serveStaticAsset(request, response, url);
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: error.message || "Unexpected API error." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AdPulse listening on http://${HOST}:${PORT}`);
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function ensureStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true });

  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ connections: [], searchTermTags: [], users: getDefaultStoredUsers(), clients: [] }, null, 2));
  }
}

function readStore() {
  ensureStore();

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    const users = Array.isArray(parsed.users) && parsed.users.length
      ? parsed.users.map(normalizeStoredUser).filter(Boolean)
      : getDefaultStoredUsers();
    const clients = Array.isArray(parsed.clients)
      ? parsed.clients.map(normalizeStoredClient).filter(Boolean)
      : [];

    return {
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      searchTermTags: Array.isArray(parsed.searchTermTags) ? parsed.searchTermTags : [],
      users,
      clients,
    };
  } catch (error) {
    return { connections: [], searchTermTags: [], users: getDefaultStoredUsers(), clients: [] };
  }
}

function writeStore(store) {
  ensureStore();
  let existingUsers = [];
  let existingClients = [];

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    existingUsers = Array.isArray(parsed.users) ? parsed.users.map(normalizeStoredUser).filter(Boolean) : [];
    existingClients = Array.isArray(parsed.clients) ? parsed.clients.map(normalizeStoredClient).filter(Boolean) : [];
  } catch (error) {
    existingUsers = [];
    existingClients = [];
  }

  fs.writeFileSync(STORE_FILE, JSON.stringify({
    connections: Array.isArray(store.connections) ? store.connections : [],
    searchTermTags: Array.isArray(store.searchTermTags) ? store.searchTermTags : [],
    users: Array.isArray(store.users)
      ? store.users.map(normalizeStoredUser).filter(Boolean)
      : (existingUsers.length ? existingUsers : getDefaultStoredUsers()),
    clients: Array.isArray(store.clients)
      ? store.clients.map(normalizeStoredClient).filter(Boolean)
      : existingClients,
  }, null, 2));
}

function getDefaultStoredUsers() {
  return DEFAULT_USERS.map((user, index) => normalizeStoredUser({
    ...user,
    passwordHash: hashPassword(user.password),
    createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    isSeeded: true,
  })).filter(Boolean);
}

function normalizeStoredUser(value) {
  if (!value || typeof value !== "object") return null;

  const role = USER_ALLOWED_ROLES.has(value.role) ? value.role : "account";
  const email = String(value.email || "").trim().toLowerCase();
  if (!email) return null;

  return {
    id: String(value.id || `usr-${crypto.randomUUID()}`),
    name: String(value.name || "New user").trim() || "New user",
    role,
    title: String(value.title || (role === "director" ? "Director" : "Account Manager")).trim(),
    email,
    passwordHash: normalizePasswordHash(value.passwordHash || value.password),
    accent: String(value.accent || getUserPalette(role).accent),
    accent2: String(value.accent2 || getUserPalette(role).accent2),
    createdAt: value.createdAt || new Date().toISOString(),
    isSeeded: value.isSeeded === true,
  };
}

function normalizePasswordHash(value) {
  const raw = String(value || "").trim();
  if (raw.startsWith("scrypt$")) return raw;
  return hashPassword(raw || "demo123");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, passwordHash) {
  const raw = String(passwordHash || "");
  const [scheme, salt, expected] = raw.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;

  const actual = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
  } catch (error) {
    return false;
  }
}

function getUserPalette(role) {
  return role === "director"
    ? { accent: "#162218", accent2: "#2d6cdf" }
    : { accent: "#0f8f66", accent2: "#78d1ad" };
}

function redactUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    title: user.title,
    email: user.email,
    accent: user.accent,
    accent2: user.accent2,
    createdAt: user.createdAt,
    isSeeded: user.isSeeded === true,
  };
}

function listStoredUsers() {
  const store = readStore();
  return store.users
    .slice()
    .sort((left, right) => {
      if (left.role !== right.role) return left.role === "director" ? -1 : 1;
      return left.name.localeCompare(right.name);
    })
    .map(redactUser);
}

function authenticateStoredUser(input) {
  const email = String(input?.email || "").trim().toLowerCase();
  const password = String(input?.password || "");
  const store = readStore();
  const user = store.users.find((item) => item.email === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Wrong email or password." };
  }

  return { ok: true, user: redactUser(user) };
}

function createStoredUser(input) {
  const store = readStore();
  const parsed = parseUserInput(input, { mode: "create" });
  if (!parsed.ok) return parsed;

  if (store.users.some((user) => user.email === parsed.value.email)) {
    return { ok: false, error: "A user with that email already exists." };
  }

  const created = normalizeStoredUser({
    id: `usr-${crypto.randomUUID()}`,
    ...parsed.value,
    createdAt: new Date().toISOString(),
    isSeeded: false,
  });
  const users = [...store.users, created];
  writeStore({ ...store, users });
  return { ok: true, user: redactUser(created) };
}

function updateStoredUser(userId, input) {
  const store = readStore();
  const index = store.users.findIndex((user) => user.id === userId);
  if (index < 0) {
    return { ok: false, error: "User not found." };
  }

  const current = store.users[index];
  const parsed = parseUserInput(input, { mode: "update", current });
  if (!parsed.ok) return parsed;

  if (store.users.some((user) => user.id !== userId && user.email === parsed.value.email)) {
    return { ok: false, error: "A user with that email already exists." };
  }

  const nextRole = parsed.value.role;
  const directorCount = store.users.filter((user) => user.role === "director").length;
  if (current.role === "director" && nextRole !== "director" && directorCount <= 1) {
    return { ok: false, error: "At least one Director account must remain." };
  }

  const updated = normalizeStoredUser({
    ...current,
    ...parsed.value,
    passwordHash: parsed.value.password ? hashPassword(parsed.value.password) : current.passwordHash,
  });
  const users = store.users.slice();
  users[index] = updated;
  writeStore({ ...store, users });
  return { ok: true, user: redactUser(updated) };
}

function parseUserInput(input, options = {}) {
  const current = options.current || {};
  const mode = options.mode || "create";
  const role = USER_ALLOWED_ROLES.has(input?.role) ? input.role : current.role || "account";
  const name = String(input?.name ?? current.name ?? "").trim();
  const title = String(input?.title ?? current.title ?? "").trim();
  const email = String(input?.email ?? current.email ?? "").trim().toLowerCase();
  const password = String(input?.password || "");

  if (!name) return { ok: false, error: "Name is required." };
  if (!title) return { ok: false, error: "Title is required." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (mode === "create" && password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (mode === "update" && password && password.length < 6) return { ok: false, error: "New password must be at least 6 characters." };

  return {
    ok: true,
    value: {
      name,
      role,
      title,
      email,
      password,
      accent: current.accent || getUserPalette(role).accent,
      accent2: current.accent2 || getUserPalette(role).accent2,
    },
  };
}

function normalizeStoredClient(value) {
  if (!value || typeof value !== "object") return null;

  const id = String(value.id || `client-${crypto.randomUUID()}`).trim();
  if (!id) return null;
  const normalizeClientTarget = (input) => {
    const raw = String(input || "").trim();
    return !raw || raw.toLowerCase() === "live media account" ? "Conversions" : raw;
  };

  const normalizeIdList = (items) => Array.isArray(items)
    ? Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)))
    : [];
  const normalizeCampaignStatus = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (["stopped", "paused", "removed", "archived"].includes(normalized)) return "stopped";
    if (normalized === "learning") return "learning";
    return "active";
  };
  const normalizeCampaignStatusMemory = (items) => {
    if (!items || typeof items !== "object" || Array.isArray(items)) return {};

    return Object.fromEntries(Object.entries(items)
      .map(([key, item]) => {
        if (!key || !item || typeof item !== "object" || Array.isArray(item)) return null;

        return [String(key), {
          status: normalizeCampaignStatus(item.status),
          lastSeenAt: String(item.lastSeenAt || ""),
          lastChangedAt: String(item.lastChangedAt || ""),
          stoppedAt: String(item.stoppedAt || ""),
        }];
      })
      .filter(Boolean));
  };

  return {
    ...value,
    id,
    name: String(value.name || "New client").trim() || "New client",
    category: String(value.category || "eshop").trim() || "eshop",
    focus: normalizeClientTarget(value.focus),
    accent: String(value.accent || "#0f8f66").trim() || "#0f8f66",
    accent2: String(value.accent2 || "#78d1ad").trim() || "#78d1ad",
    healthMode: String(value.healthMode || "healthy").trim() || "healthy",
    logoText: String(value.logoText || "CL").trim().slice(0, 4) || "CL",
    logoImage: String(value.logoImage || "").trim(),
    owner: String(value.owner || "").trim(),
    reportingGroup: String(value.reportingGroup || value.name || "New client").trim() || "New client",
    budgets: {
      google_ads: Number(value?.budgets?.google_ads) || 0,
      meta_ads: Number(value?.budgets?.meta_ads) || 0,
      tiktok_ads: Number(value?.budgets?.tiktok_ads) || 0,
    },
    connections: {
      google_ads: value?.connections?.google_ads === true,
      meta_ads: value?.connections?.meta_ads === true,
      tiktok_ads: value?.connections?.tiktok_ads === true,
      ga4: value?.connections?.ga4 === true,
    },
    linkedProfiles: value?.linkedProfiles && typeof value.linkedProfiles === "object" ? value.linkedProfiles : {},
    linkedAssets: {
      google_ads: normalizeIdList(value?.linkedAssets?.google_ads),
      meta_ads: normalizeIdList(value?.linkedAssets?.meta_ads),
      tiktok_ads: normalizeIdList(value?.linkedAssets?.tiktok_ads),
      ga4: normalizeIdList(value?.linkedAssets?.ga4),
    },
    rules: value?.rules && typeof value.rules === "object" ? value.rules : {},
    tags: Array.isArray(value.tags) ? value.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
    assignedUserIds: normalizeIdList(value.assignedUserIds),
    resolvedIssueIds: normalizeIdList(value.resolvedIssueIds),
    campaignStatusMemory: normalizeCampaignStatusMemory(value.campaignStatusMemory),
  };
}

function listStoredClients() {
  const store = readStore();
  return store.clients
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
}

function saveStoredClient(clientId, input) {
  const store = readStore();
  const normalized = normalizeStoredClient({
    ...(input && typeof input === "object" ? input : {}),
    id: clientId,
  });

  if (!normalized?.name) {
    return { ok: false, error: "Client name is required." };
  }

  const clients = store.clients.slice();
  const existingIndex = clients.findIndex((client) => client.id === normalized.id);

  if (existingIndex >= 0) {
    clients[existingIndex] = normalized;
  } else {
    clients.push(normalized);
  }

  writeStore({ ...store, clients });
  return { ok: true, client: normalized };
}

function deleteStoredClient(clientId) {
  const store = readStore();
  const existing = store.clients.find((client) => client.id === clientId);
  if (!existing) {
    return { ok: false, error: "Client not found." };
  }

  const clients = store.clients.filter((client) => client.id !== clientId);
  writeStore({ ...store, clients });
  return { ok: true };
}

function deleteStoredUser(userId) {
  const store = readStore();
  const existing = store.users.find((user) => user.id === userId);
  if (!existing) {
    return { ok: false, error: "User not found." };
  }

  const directorCount = store.users.filter((user) => user.role === "director").length;
  if (existing.role === "director" && directorCount <= 1) {
    return { ok: false, error: "At least one Director account must remain." };
  }

  const users = store.users.filter((user) => user.id !== userId);
  const clients = store.clients.map((client) => ({
    ...client,
    assignedUserIds: Array.isArray(client.assignedUserIds)
      ? client.assignedUserIds.filter((assignedUserId) => assignedUserId !== userId)
      : [],
  }));

  writeStore({ ...store, users, clients });
  return { ok: true };
}

function getOrigin(request) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedHost = request.headers["x-forwarded-host"];
  const protocol = forwardedProto ? String(forwardedProto).split(",")[0].trim() : request.socket.encrypted ? "https" : "http";
  const host = forwardedHost || request.headers.host;
  return `${protocol}://${host}`;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, status, html) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(html);
}

function serveStaticAsset(request, response, url) {
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
  };

  let pathname = "/";
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    sendJson(response, 400, { error: "Invalid URL path." });
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const distRoot = path.resolve(DIST_DIR);
  let filePath = path.resolve(DIST_DIR, relativePath);

  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
    sendJson(response, 403, { error: "Forbidden." });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    sendHtml(response, 404, "Build output not found. Run npm run build before starting the server.");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function configuredStatus() {
  return Object.fromEntries(Object.keys(PROVIDERS).map((providerKey) => {
    const missing = PROVIDERS[providerKey].requiredEnv.filter((key) => !process.env[key]);
    return [providerKey, { ready: missing.length === 0, missing }];
  }));
}

function buildSnapshot() {
  const store = readStore();

  return {
    configured: configuredStatus(),
    connections: store.connections
      .map(redactConnection)
      .sort((left, right) => (right.lastSyncedAt || "").localeCompare(left.lastSyncedAt || "")),
  };
}

function redactConnection(connection) {
  return {
    id: connection.id,
    platform: connection.platform,
    label: connection.label,
    name: connection.name,
    email: connection.email,
    externalId: connection.externalId,
    scopeLabel: connection.scopeLabel,
    status: connection.status,
    note: connection.note,
    lastError: connection.lastError || "",
    lastSyncedAt: connection.lastSyncedAt,
    createdAt: connection.createdAt,
    assets: Array.isArray(connection.assets) ? connection.assets : [],
    scopes: Array.isArray(connection.scopes) ? connection.scopes : [],
  };
}

function createStateToken() {
  return crypto.randomBytes(18).toString("hex");
}

function prunePendingStates() {
  const now = Date.now();

  for (const [state, value] of pendingStates.entries()) {
    if (now - value.createdAt > AUTH_STATE_TTL) {
      pendingStates.delete(state);
    }
  }
}

async function handleAuthStart(request, response, providerKey) {
  const provider = PROVIDERS[providerKey];
  if (!provider) {
    sendJson(response, 404, { error: "Unknown provider." });
    return;
  }

  const missing = provider.requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    sendHtml(response, 400, renderResultPage({
      ok: false,
      platform: providerKey,
      message: `Missing environment variables: ${missing.join(", ")}`,
    }));
    return;
  }

  const state = createStateToken();
  const origin = getOrigin(request);
  const redirectUri = `${origin}/api/auth/${providerKey}/callback`;
  pendingStates.set(state, { providerKey, createdAt: Date.now(), origin, redirectUri });

  const authUrl = buildAuthorizationUrl(providerKey, state, redirectUri);
  response.writeHead(302, { Location: authUrl });
  response.end();
}

async function handleAuthCallback(request, response, providerKey, url) {
  const provider = PROVIDERS[providerKey];
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("auth_code") || url.searchParams.get("code");
  const oauthError = url.searchParams.get("error") || url.searchParams.get("error_reason");
  const pending = state ? pendingStates.get(state) : null;

  if (!provider || !pending || pending.providerKey !== providerKey) {
    sendHtml(response, 400, renderResultPage({
      ok: false,
      platform: providerKey,
      message: "The login session expired or the OAuth state did not match.",
    }));
    return;
  }

  pendingStates.delete(state);

  if (oauthError) {
    sendHtml(response, 400, renderResultPage({
      ok: false,
      platform: providerKey,
      message: `The provider returned an error: ${oauthError}`,
      origin: pending.origin,
    }));
    return;
  }

  if (!code) {
    sendHtml(response, 400, renderResultPage({
      ok: false,
      platform: providerKey,
      message: "No authorization code was returned by the provider.",
      origin: pending.origin,
    }));
    return;
  }

  try {
    const tokenBundle = await exchangeAuthCode(providerKey, code, pending.redirectUri);
    const synced = await syncConnectionPayload({
      platform: providerKey,
      id: null,
      existingConnection: null,
      tokenBundle,
    });
    upsertConnection(synced);

    sendHtml(response, 200, renderResultPage({
      ok: true,
      platform: providerKey,
      message: `${provider.label} connected and synced successfully.`,
      origin: pending.origin,
      connectionId: synced.id,
    }));
  } catch (error) {
    sendHtml(response, 500, renderResultPage({
      ok: false,
      platform: providerKey,
      message: error.message || "The OAuth callback failed.",
      origin: pending.origin,
    }));
  }
}

function buildAuthorizationUrl(providerKey, state, redirectUri) {
  if (providerKey === "meta_ads") {
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: PROVIDERS.meta_ads.scopes.join(","),
      auth_type: "rerequest",
    });

    if (process.env.META_CONFIG_ID) {
      params.set("config_id", process.env.META_CONFIG_ID);
    }

    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
  }

  if (providerKey === "tiktok_ads") {
    const params = new URLSearchParams({
      app_id: process.env.TIKTOK_APP_ID,
      redirect_uri: redirectUri,
      state,
    });

    return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: PROVIDERS[providerKey].scopes.join(" "),
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeAuthCode(providerKey, code, redirectUri) {
  if (providerKey === "meta_ads") {
    const token = await fetchJson(
      `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${new URLSearchParams({
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      }).toString()}`,
      {},
      "Meta auth token exchange",
    );

    let accessToken = token.access_token;
    let expiresIn = token.expires_in || 0;

    try {
      const longLived = await fetchJson(
        `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: accessToken,
        }).toString()}`,
        {},
        "Meta long-lived token exchange",
      );

      accessToken = longLived.access_token || accessToken;
      expiresIn = longLived.expires_in || expiresIn;
    } catch (error) {
      console.warn("Meta long-lived token exchange failed, continuing with short-lived token.");
    }

    return {
      accessToken,
      refreshToken: "",
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
      tokenType: token.token_type || "bearer",
      scope: PROVIDERS.meta_ads.scopes.join(","),
    };
  }

  if (providerKey === "tiktok_ads") {
    const token = await fetchTikTokBusinessJson("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.TIKTOK_APP_ID,
        secret: process.env.TIKTOK_APP_SECRET,
        auth_code: code,
      }),
    }, "TikTok auth token exchange");
    const data = token?.data && typeof token.data === "object" ? token.data : token;

    return {
      accessToken: String(data?.access_token || "").trim(),
      refreshToken: String(data?.refresh_token || "").trim(),
      expiresAt: toNumber(data?.expires_in) ? Date.now() + toNumber(data.expires_in) * 1000 : null,
      tokenType: String(data?.token_type || "Bearer").trim() || "Bearer",
      scope: "",
    };
  }

  const token = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  }, "Google auth token exchange");

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || "",
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
    tokenType: token.token_type || "Bearer",
    scope: token.scope || PROVIDERS[providerKey].scopes.join(" "),
  };
}

async function syncStoredConnection(connectionId) {
  const store = readStore();
  const current = store.connections.find((connection) => connection.id === connectionId);

  if (!current) {
    throw new Error("Connection not found.");
  }

  try {
    const updated = await syncConnectionPayload({
      platform: current.platform,
      id: current.id,
      existingConnection: current,
      tokenBundle: current.tokens,
    });
    upsertConnection(updated);
    return updated;
  } catch (error) {
    upsertConnection({
      ...current,
      status: "attention",
      lastError: error.message || "Sync failed.",
      updatedAt: new Date().toISOString(),
    });
    throw error;
  }
}

function removeStoredConnection(connectionId) {
  const store = readStore();
  const filtered = store.connections.filter((connection) => connection.id !== connectionId);
  const filteredTags = store.searchTermTags.filter((tag) => tag.connectionId !== connectionId);
  writeStore({ connections: filtered, searchTermTags: filteredTags });
}

function upsertConnection(connection) {
  const store = readStore();
  const nextConnections = [...store.connections];
  const index = nextConnections.findIndex((item) => item.id === connection.id);

  if (index >= 0) {
    nextConnections[index] = connection;
  } else {
    nextConnections.push(connection);
  }

  writeStore({ connections: nextConnections, searchTermTags: store.searchTermTags });
}

async function syncConnectionPayload({ platform, id, existingConnection, tokenBundle }) {
  const provisionalId = existingConnection?.id || id || crypto.randomUUID();
  const refreshed = await ensureProviderToken(platform, existingConnection, tokenBundle);
  const syncResult = platform === "google_ads"
    ? await syncGoogleAds(existingConnection, refreshed)
    : platform === "tiktok_ads"
      ? await syncTikTokAds(existingConnection, refreshed)
    : platform === "ga4"
      ? await syncGa4(existingConnection, refreshed)
      : await syncMetaAds(existingConnection, refreshed);

  const now = new Date().toISOString();
  const existingMatch = existingConnection || findExistingConnection(platform, syncResult);
  const connectionId = existingMatch?.id || provisionalId;
  const assets = (syncResult.assets || []).map((asset) => ({
    ...asset,
    connectionId,
    id: `${platform}:${connectionId}:${asset.externalId || crypto.randomUUID()}`,
  }));

  return {
    id: connectionId,
    platform,
    label: PROVIDERS[platform].label,
    name: syncResult.name,
    email: syncResult.email,
    externalId: syncResult.externalId,
    scopeLabel: syncResult.scopeLabel || PROVIDERS[platform].scopeLabel,
    status: syncResult.status || "healthy",
    note: syncResult.note,
    lastError: syncResult.lastError || "",
    lastSyncedAt: now,
    createdAt: existingMatch?.createdAt || now,
    updatedAt: now,
    scopes: PROVIDERS[platform].scopes,
    assets,
    ...(platform === "google_ads" ? { loginCustomerId: syncResult.loginCustomerId || sanitizeGoogleAdsId(existingMatch?.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || existingMatch?.externalId) || "" } : {}),
    ...(platform === "google_ads" ? { googleAdsCatalogs: syncResult.googleAdsCatalogs || {} } : {}),
    tokens: refreshed,
  };
}

function findExistingConnection(platform, syncResult) {
  const store = readStore();
  const email = (syncResult.email || "").toLowerCase();

  return store.connections.find((connection) => (
    connection.platform === platform
      && ((email && connection.email?.toLowerCase() === email)
        || (syncResult.externalId && connection.externalId === syncResult.externalId))
  ));
}

async function ensureProviderToken(platform, existingConnection, tokenBundle) {
  if (!existingConnection) {
    return tokenBundle;
  }

  if (platform === "meta_ads" || platform === "tiktok_ads") {
    if (tokenBundle?.expiresAt && tokenBundle.expiresAt < Date.now() + 60_000) {
      const providerLabel = PROVIDERS[platform]?.label || "This";
      throw new Error(`The ${providerLabel} token expired. Reconnect this login from the Connections screen.`);
    }

    return tokenBundle;
  }

  if (tokenBundle?.accessToken && (!tokenBundle.expiresAt || tokenBundle.expiresAt > Date.now() + 60_000)) {
    return tokenBundle;
  }

  if (!tokenBundle?.refreshToken) {
    throw new Error("Missing Google refresh token. Reconnect this login with consent.");
  }

  const token = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokenBundle.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  }, "Google refresh token exchange");

  return {
    ...tokenBundle,
    accessToken: token.access_token,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : tokenBundle.expiresAt,
    tokenType: token.token_type || tokenBundle.tokenType || "Bearer",
    scope: token.scope || tokenBundle.scope,
  };
}

async function syncGoogleAds(existingConnection, tokenBundle) {
  const user = await fetchGoogleUser(tokenBundle.accessToken);
  const initialLoginCustomerId = sanitizeGoogleAdsId(existingConnection?.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || existingConnection?.externalId);
  const accessible = await fetchJson(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`, {
    method: "GET",
    headers: getGoogleAdsHeaders(tokenBundle),
  }, "Google Ads accessible customers");
  const customerIds = (accessible.resourceNames || []).map((name) => String(name).split("/").pop()).filter(Boolean);

  const directDetails = await Promise.allSettled(customerIds.map((customerId) => syncGoogleAdsCustomer({
    customerId,
    tokenBundle,
    connectionId: existingConnection?.id || null,
    loginCustomerIds: initialLoginCustomerId ? [initialLoginCustomerId] : [],
  })));
  const managerLoginIds = Array.from(new Set(directDetails
    .filter((result) => result.status === "fulfilled" && result.value?.asset?.type === "Manager account")
    .map((result) => sanitizeGoogleAdsId(result.value.asset.externalId))
    .filter(Boolean)));
  const details = await Promise.all(directDetails.map(async (result, index) => {
    if (result.status === "fulfilled" || !managerLoginIds.length) {
      return result;
    }

    try {
      const retryValue = await syncGoogleAdsCustomer({
        customerId: customerIds[index],
        tokenBundle,
        connectionId: existingConnection?.id || null,
        loginCustomerIds: managerLoginIds,
      });
      return { status: "fulfilled", value: retryValue };
    } catch (error) {
      return result;
    }
  }));

  const assets = [];
  const googleAdsCatalogs = {};
  let syncedAdAccountCount = 0;
  let syncedCampaignCount = 0;
  let syncedAdGroupCount = 0;
  let hasPartialCatalogs = false;
  let successfulCustomerLookups = 0;
  let firstCatalogError = "";

  details.forEach((result, index) => {
    const customerId = customerIds[index];

    if (result.status !== "fulfilled") {
      assets.push({
        id: `google_ads:${existingConnection?.id || "pending"}:${customerId}`,
        platform: "google_ads",
        externalId: customerId,
        name: `Google Ads ${customerId}`,
        subtitle: "Could not fetch descriptive name",
        type: "Customer account",
        connectionId: existingConnection?.id || null,
        health: "attention",
        campaignCount: 0,
        adGroupCount: 0,
        catalogStatus: "error",
        catalogNote: result.reason?.message || "Could not fetch the Google Ads hierarchy for this customer.",
      });
      return;
    }

    assets.push(result.value.asset);
    if (result.value.asset.health === "healthy") {
      successfulCustomerLookups += 1;
    } else if (!firstCatalogError && result.value.asset.catalogNote) {
      firstCatalogError = result.value.asset.catalogNote;
    }

    if (result.value.catalog) {
      googleAdsCatalogs[result.value.asset.externalId] = result.value.catalog;
    }

    if (result.value.asset.type === "Ad account") {
      syncedAdAccountCount += 1;
      syncedCampaignCount += Number(result.value.asset.campaignCount) || 0;
      syncedAdGroupCount += Number(result.value.asset.adGroupCount) || 0;
      if (result.value.asset.catalogStatus === "partial") {
        hasPartialCatalogs = true;
      }
    }
  });

  // Expand manager (MCC) accounts: enumerate child ad accounts via customer_client,
  // then sync any that aren't already in the directly-accessible list.
  const managerAssets = assets.filter((asset) => asset.type === "Manager account");
  const knownCustomerIds = new Set(assets.map((asset) => sanitizeGoogleAdsId(asset.externalId)).filter(Boolean));
  const managerChildMap = new Map(); // managerExternalId -> Set of child IDs
  const childToManager = new Map();  // childId -> managerExternalId (first seen)

  for (const managerAsset of managerAssets) {
    const managerId = sanitizeGoogleAdsId(managerAsset.externalId);
    if (!managerId) continue;

    let children = [];
    try {
      children = await fetchGoogleAdsManagerChildren({ managerCustomerId: managerId, tokenBundle });
    } catch (error) {
      managerAsset.catalogNote = `Could not enumerate child accounts under this manager: ${error.message || "Google Ads API error"}`;
      continue;
    }

    const nonManagerChildren = children.filter((child) => !child.manager);
    managerChildMap.set(managerId, new Set(children.map((child) => child.id)));

    // Update manager asset with a useful summary.
    const childCount = nonManagerChildren.length;
    managerAsset.managedAdAccountCount = childCount;
    managerAsset.catalogNote = childCount
      ? `Manager account aggregating ${childCount} child ad account${childCount === 1 ? "" : "s"}.`
      : "Manager account with no enabled child ad accounts.";

    const toSync = nonManagerChildren
      .map((child) => child.id)
      .filter((childId) => childId && !knownCustomerIds.has(childId));

    if (!toSync.length) continue;

    const childResults = await Promise.allSettled(toSync.map((childId) => syncGoogleAdsCustomer({
      customerId: childId,
      tokenBundle,
      connectionId: existingConnection?.id || null,
      loginCustomerIds: [managerId, ...managerLoginIds, initialLoginCustomerId].filter(Boolean),
    })));

    childResults.forEach((result, i) => {
      const childId = toSync[i];
      knownCustomerIds.add(childId);
      childToManager.set(childId, managerId);

      if (result.status !== "fulfilled") {
        assets.push({
          id: `google_ads:${existingConnection?.id || "pending"}:${childId}`,
          platform: "google_ads",
          externalId: childId,
          name: `Google Ads ${childId}`,
          subtitle: "Could not fetch descriptive name",
          type: "Customer account",
          connectionId: existingConnection?.id || null,
          health: "attention",
          parentManagerId: managerId,
          campaignCount: 0,
          adGroupCount: 0,
          catalogStatus: "error",
          catalogNote: result.reason?.message || "Could not fetch the Google Ads hierarchy for this managed customer.",
        });
        if (!firstCatalogError && result.reason?.message) {
          firstCatalogError = result.reason.message;
        }
        return;
      }

      const childAsset = { ...result.value.asset, parentManagerId: managerId };
      assets.push(childAsset);

      if (childAsset.health === "healthy") {
        successfulCustomerLookups += 1;
      } else if (!firstCatalogError && childAsset.catalogNote) {
        firstCatalogError = childAsset.catalogNote;
      }

      if (result.value.catalog) {
        googleAdsCatalogs[childAsset.externalId] = result.value.catalog;
      }

      if (childAsset.type === "Ad account") {
        syncedAdAccountCount += 1;
        syncedCampaignCount += Number(childAsset.campaignCount) || 0;
        syncedAdGroupCount += Number(childAsset.adGroupCount) || 0;
        if (childAsset.catalogStatus === "partial") {
          hasPartialCatalogs = true;
        }
      }
    });
  }

  const externalId = assets.find((asset) => asset.type === "Manager account")?.externalId || assets[0]?.externalId || user.id || "";
  const loginCustomerId = sanitizeGoogleAdsId(managerLoginIds[0] || initialLoginCustomerId || externalId);
  const allLookupsFailed = assets.length > 0 && successfulCustomerLookups === 0;
  const catalogNote = syncedAdAccountCount
    ? ` Catalog sync ${hasPartialCatalogs ? "previewed" : "found"} ${syncedCampaignCount} campaign${syncedCampaignCount === 1 ? "" : "s"} and ${syncedAdGroupCount} ad group${syncedAdGroupCount === 1 ? "" : "s"} across ${syncedAdAccountCount} ad account${syncedAdAccountCount === 1 ? "" : "s"}.`
    : allLookupsFailed
      ? ` Google Ads API lookups failed for all accessible customers. ${firstCatalogError || "The caller does not have permission."}`
      : " No ad-account hierarchy was synced from this login yet.";

  return {
    name: existingConnection?.name || `${user.name || user.email} Google Ads`,
    email: user.email || existingConnection?.email || "",
    externalId,
    loginCustomerId,
    status: allLookupsFailed ? "attention" : "healthy",
    lastError: allLookupsFailed ? (firstCatalogError || "Google Ads API customer lookups failed.") : "",
    note: `${assets.length} accessible Google Ads account${assets.length === 1 ? "" : "s"} synced from consented login.${catalogNote}`,
    assets,
    googleAdsCatalogs,
  };
}

async function syncGoogleAdsCustomer({ customerId, tokenBundle, connectionId, loginCustomerIds = [] }) {
  const detailResponse = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager FROM customer LIMIT 1",
    label: `Google Ads customer lookup ${customerId}`,
  });

  const row = detailResponse?.results?.[0]?.customer || {};
  const resolvedCustomerId = sanitizeGoogleAdsId(row.id) || customerId;
  const isManager = Boolean(row.manager);
  const asset = {
    id: `google_ads:${connectionId || "pending"}:${resolvedCustomerId}`,
    platform: "google_ads",
    externalId: resolvedCustomerId,
    name: row.descriptiveName || `Google Ads ${resolvedCustomerId}`,
    subtitle: `${isManager ? "Manager account" : "Ad account"}${row.currencyCode ? ` | ${row.currencyCode}` : ""}`,
    type: isManager ? "Manager account" : "Ad account",
    connectionId,
    health: "healthy",
    timezone: row.timeZone || "",
    campaignCount: 0,
    adGroupCount: 0,
    catalogStatus: isManager ? "not_applicable" : "pending",
    catalogNote: isManager ? "Manager accounts do not expose campaign or ad-group delivery hierarchies directly." : "",
  };

  if (isManager) {
    return { asset, catalog: null };
  }

  try {
    const catalog = await fetchGoogleAdsCustomerCatalog({
      customerId: resolvedCustomerId,
      tokenBundle,
      loginCustomerIds,
    });

    return {
      asset: {
        ...asset,
        campaignCount: catalog.campaignCount,
        adGroupCount: catalog.adGroupCount,
        catalogStatus: catalog.status,
        catalogNote: catalog.note,
      },
      catalog,
    };
  } catch (error) {
    return {
      asset: {
        ...asset,
        health: "attention",
        catalogStatus: "error",
        catalogNote: error.message || "Could not sync the campaign and ad-group hierarchy for this ad account.",
      },
      catalog: null,
    };
  }
}

async function fetchGoogleAdsCustomerCatalog({ customerId, tokenBundle, loginCustomerIds = [] }) {
  const campaignLimit = GOOGLE_ADS_SYNC_CAMPAIGN_CAP + 1;
  const adGroupLimit = GOOGLE_ADS_SYNC_AD_GROUP_CAP + 1;
  const [campaignResponse, adGroupResponse] = await Promise.all([
    fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  campaign.id,",
        "  campaign.name,",
        "  campaign.status,",
        "  campaign.advertising_channel_type",
        "FROM campaign",
        "WHERE campaign.status != REMOVED",
        "ORDER BY campaign.name",
        `LIMIT ${campaignLimit}`,
      ].join(" "),
      label: `Google Ads synced campaigns ${customerId}`,
    }),
    fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  ad_group.id,",
        "  ad_group.name,",
        "  ad_group.status,",
        "  campaign.id,",
        "  campaign.name",
        "FROM ad_group",
        "WHERE ad_group.status != REMOVED",
        "ORDER BY campaign.id, ad_group.name",
        `LIMIT ${adGroupLimit}`,
      ].join(" "),
      label: `Google Ads synced ad groups ${customerId}`,
    }),
  ]);

  const rawCampaigns = (campaignResponse.results || [])
    .map((row) => {
      const id = sanitizeGoogleAdsId(row.campaign?.id);
      if (!id) return null;

      return {
        id,
        name: row.campaign?.name || `Campaign ${id}`,
        status: row.campaign?.status || "UNKNOWN",
        channelType: row.campaign?.advertisingChannelType || "UNKNOWN",
      };
    })
    .filter(Boolean);

  const rawAdGroups = (adGroupResponse.results || [])
    .map((row) => {
      const id = sanitizeGoogleAdsId(row.adGroup?.id);
      const campaignId = sanitizeGoogleAdsId(row.campaign?.id);
      if (!id || !campaignId) return null;

      return {
        id,
        name: row.adGroup?.name || `Ad group ${id}`,
        status: row.adGroup?.status || "UNKNOWN",
        campaignId,
        campaignName: row.campaign?.name || `Campaign ${campaignId}`,
      };
    })
    .filter(Boolean);

  const hasMoreCampaigns = rawCampaigns.length > GOOGLE_ADS_SYNC_CAMPAIGN_CAP;
  const hasMoreAdGroups = rawAdGroups.length > GOOGLE_ADS_SYNC_AD_GROUP_CAP;
  const campaigns = rawCampaigns.slice(0, GOOGLE_ADS_SYNC_CAMPAIGN_CAP);
  const adGroups = rawAdGroups.slice(0, GOOGLE_ADS_SYNC_AD_GROUP_CAP);
  const adGroupCounts = adGroups.reduce((acc, adGroup) => {
    acc.set(adGroup.campaignId, (acc.get(adGroup.campaignId) || 0) + 1);
    return acc;
  }, new Map());
  const enrichedCampaigns = campaigns.map((campaign) => ({
    ...campaign,
    adGroupCount: adGroupCounts.get(campaign.id) || 0,
  }));
  const status = hasMoreCampaigns || hasMoreAdGroups ? "partial" : "ready";
  const note = hasMoreCampaigns || hasMoreAdGroups
    ? `Synced a preview of ${campaigns.length}${hasMoreCampaigns ? "+" : ""} campaigns and ${adGroups.length}${hasMoreAdGroups ? "+" : ""} ad groups for this ad account.`
    : `Synced ${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} and ${adGroups.length} ad group${adGroups.length === 1 ? "" : "s"} for this ad account.`;

  return {
    customerId,
    syncedAt: new Date().toISOString(),
    status,
    note,
    campaignCount: campaigns.length,
    adGroupCount: adGroups.length,
    hasMoreCampaigns,
    hasMoreAdGroups,
    campaigns: enrichedCampaigns,
    adGroups,
  };
}

async function fetchGoogleAdsManagerChildren({ managerCustomerId, tokenBundle }) {
  // customer_client returns the MCC itself (level 0) plus every descendant.
  // Query must be run against the manager account with it set as login-customer-id.
  const query = [
    "SELECT",
    "  customer_client.client_customer,",
    "  customer_client.id,",
    "  customer_client.level,",
    "  customer_client.manager,",
    "  customer_client.descriptive_name,",
    "  customer_client.currency_code,",
    "  customer_client.time_zone,",
    "  customer_client.status",
    "FROM customer_client",
    "WHERE customer_client.status = 'ENABLED'",
    "  AND customer_client.level <= 5",
  ].join(" ");

  const response = await fetchGoogleAdsRows({
    customerId: managerCustomerId,
    headers: getGoogleAdsHeaders(tokenBundle, managerCustomerId),
    query,
    label: `Google Ads customer_client under ${managerCustomerId}`,
  });

  return (response.results || [])
    .map((row) => {
      const client = row.customerClient || {};
      const id = sanitizeGoogleAdsId(client.id);
      if (!id) return null;

      return {
        id,
        level: Number(client.level) || 0,
        manager: Boolean(client.manager),
        descriptiveName: client.descriptiveName || "",
        currencyCode: client.currencyCode || "",
        timeZone: client.timeZone || "",
      };
    })
    .filter((child) => child && child.id !== sanitizeGoogleAdsId(managerCustomerId));
}

async function syncGa4(existingConnection, tokenBundle) {
  const headers = {
    Authorization: `Bearer ${tokenBundle.accessToken}`,
    Accept: "application/json",
  };
  const user = await fetchGoogleUser(tokenBundle.accessToken);
  const summaries = [];
  let pageToken = "";

  while (pageToken !== null) {
    const query = new URLSearchParams({ pageSize: "200" });
    if (pageToken) query.set("pageToken", pageToken);

    const page = await fetchJson(`https://analyticsadmin.googleapis.com/v1beta/accountSummaries?${query.toString()}`, {
      method: "GET",
      headers,
    }, "GA4 account summaries");

    summaries.push(...(page.accountSummaries || []));
    pageToken = page.nextPageToken || null;
  }

  const assets = summaries.flatMap((summary) => {
    const accountId = String(summary.account || "").split("/").pop() || "";
    const properties = Array.isArray(summary.propertySummaries) ? summary.propertySummaries : [];

    return properties.map((property) => {
      const propertyId = String(property.property || "").split("/").pop() || "";

      return {
        id: `ga4:${existingConnection?.id || "pending"}:${propertyId}`,
        platform: "ga4",
        externalId: propertyId,
        name: property.displayName || `GA4 property ${propertyId}`,
        subtitle: summary.displayName || `Account ${accountId}`,
        type: "GA4 property",
        parentExternalId: accountId,
        connectionId: existingConnection?.id || null,
        health: "healthy",
      };
    });
  });

  const firstAccountId = String(summaries[0]?.account || "").split("/").pop() || "";

  return {
    name: existingConnection?.name || `${user.name || user.email} GA4`,
    email: user.email || existingConnection?.email || "",
    externalId: firstAccountId,
    note: `${assets.length} GA4 propert${assets.length === 1 ? "y" : "ies"} synced across ${summaries.length} account${summaries.length === 1 ? "" : "s"}.`,
    assets,
  };
}

async function syncMetaAds(existingConnection, tokenBundle) {
  const accessToken = tokenBundle.accessToken;
  const user = await fetchJson(
    `https://graph.facebook.com/${META_API_VERSION}/me?${new URLSearchParams({
      fields: "id,name,email",
      access_token: accessToken,
    }).toString()}`,
    {},
    "Meta user profile",
  );

  const accounts = [];
  let nextUrl = `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?${new URLSearchParams({
    fields: "id,account_id,name,account_status,currency,business{id,name},timezone_name",
    limit: "200",
    access_token: accessToken,
  }).toString()}`;

  while (nextUrl) {
    const page = await fetchJson(nextUrl, {}, "Meta ad accounts");
    accounts.push(...(page.data || []));
    nextUrl = page.paging?.next || "";
  }

  const assets = accounts.map((account) => ({
    id: `meta_ads:${existingConnection?.id || "pending"}:${account.account_id || account.id}`,
    platform: "meta_ads",
    externalId: String(account.account_id || account.id || "").replace(/^act_/, ""),
    name: account.name || `Meta account ${account.account_id || account.id}`,
    subtitle: account.business?.name || account.timezone_name || "Meta ad account",
    type: "Ad account",
    parentExternalId: account.business?.id || "",
    connectionId: existingConnection?.id || null,
    health: Number(account.account_status) === 1 ? "healthy" : "attention",
    currency: account.currency || "",
    timezone: account.timezone_name || "",
  }));

  return {
    name: existingConnection?.name || `${user.name || user.email} Meta`,
    email: user.email || existingConnection?.email || "",
    externalId: accounts[0]?.business?.id || accounts[0]?.account_id || user.id || "",
    note: `${assets.length} Meta ad account${assets.length === 1 ? "" : "s"} synced from the consented business login.`,
    assets,
  };
}

async function syncTikTokAds(existingConnection, tokenBundle) {
  const accessToken = String(tokenBundle?.accessToken || "").trim();
  if (!accessToken) {
    throw new Error("Missing TikTok Ads access token.");
  }

  const advertiserPayload = await fetchTikTokBusinessJson(buildTikTokBusinessUrl("/open_api/v1.3/oauth2/advertiser/get/", {
    app_id: process.env.TIKTOK_APP_ID,
    secret: process.env.TIKTOK_APP_SECRET,
  }), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Access-Token": accessToken,
    },
  }, "TikTok advertiser list");
  const advertiserRows = getTikTokResponseRows(advertiserPayload);
  const advertiserIds = Array.from(new Set(advertiserRows
    .map((row) => sanitizeTikTokAdvertiserId(row?.advertiser_id || row?.id || row))
    .filter(Boolean)));

  if (!advertiserIds.length) {
    return {
      name: existingConnection?.name || "TikTok Ads",
      email: existingConnection?.email || "",
      externalId: existingConnection?.externalId || "",
      note: "No TikTok advertiser accounts were returned for this login yet.",
      assets: [],
      status: "attention",
      lastError: "No TikTok advertiser access was returned for this login.",
    };
  }

  let advertiserInfoRows = [];
  try {
    const advertiserInfoPayload = await fetchTikTokBusinessJson(buildTikTokBusinessUrl("/open_api/v1.3/advertiser/info/", {
      advertiser_ids: JSON.stringify(advertiserIds),
    }), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Access-Token": accessToken,
      },
    }, "TikTok advertiser info");
    advertiserInfoRows = getTikTokResponseRows(advertiserInfoPayload);
  } catch (_) {
    advertiserInfoRows = advertiserIds.map((advertiserId) => ({ advertiser_id: advertiserId }));
  }

  const assets = advertiserInfoRows.map((row) => {
    const advertiserId = sanitizeTikTokAdvertiserId(row?.advertiser_id || row?.id || row);
    if (!advertiserId) return null;

    return {
      id: `tiktok_ads:${existingConnection?.id || "pending"}:${advertiserId}`,
      platform: "tiktok_ads",
      externalId: advertiserId,
      name: String(row?.advertiser_name || row?.name || `TikTok advertiser ${advertiserId}`).trim() || `TikTok advertiser ${advertiserId}`,
      subtitle: String(row?.bc_name || row?.business_name || row?.timezone || "TikTok ad account").trim() || "TikTok ad account",
      type: "Ad account",
      parentExternalId: String(row?.bc_id || row?.business_center_id || "").trim(),
      connectionId: existingConnection?.id || null,
      health: "healthy",
      currency: String(row?.currency || "").trim(),
      timezone: String(row?.timezone || row?.timezone_name || "").trim(),
    };
  }).filter(Boolean);

  const primaryAsset = assets[0] || null;

  return {
    name: existingConnection?.name || (primaryAsset ? `${primaryAsset.name} TikTok` : "TikTok Ads"),
    email: existingConnection?.email || "",
    externalId: primaryAsset?.parentExternalId || primaryAsset?.externalId || existingConnection?.externalId || "",
    note: `${assets.length} TikTok ad account${assets.length === 1 ? "" : "s"} synced from the consented advertiser access.`,
    assets,
  };
}

async function fetchSearchTermHierarchy(connectionId, searchParams) {
  const customerId = sanitizeGoogleAdsId(searchParams.get("customerId"));
  const campaignId = sanitizeGoogleAdsId(searchParams.get("campaignId"));
  const dateRange = sanitizeSearchTermDateRange(searchParams.get("dateRange"));

  if (!customerId) {
    throw new Error("customerId is required.");
  }

  const { connection, tokenBundle, loginCustomerIds } = await getGoogleAdsConnectionContext(connectionId);
  assertGoogleAdsCustomerAccess(connection, customerId);

  const campaignResponse = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: [
      "SELECT",
      "  campaign.id,",
      "  campaign.name,",
      "  campaign.status,",
      "  campaign.advertising_channel_type",
      "FROM campaign",
      "WHERE campaign.status != REMOVED",
      "ORDER BY campaign.name",
    ].join(" "),
    label: `Google Ads campaigns ${customerId}`,
  });

  const campaigns = (campaignResponse.results || [])
    .map((row) => {
      const id = sanitizeGoogleAdsId(row.campaign?.id);
      if (!id) return null;

      return {
        id,
        name: row.campaign?.name || `Campaign ${id}`,
        status: row.campaign?.status || "UNKNOWN",
        channelType: row.campaign?.advertisingChannelType || "UNKNOWN",
      };
    })
    .filter(Boolean);

  let adGroups = [];
  if (campaignId) {
    const adGroupResponse = await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  ad_group.id,",
        "  ad_group.name,",
        "  ad_group.status,",
        "  campaign.id,",
        "  campaign.name",
        "FROM ad_group",
        `WHERE campaign.id = ${campaignId}`,
        "  AND ad_group.status != REMOVED",
        "ORDER BY ad_group.name",
      ].join(" "),
      label: `Google Ads ad groups ${customerId}/${campaignId}`,
    });

    adGroups = (adGroupResponse.results || [])
      .map((row) => {
        const id = sanitizeGoogleAdsId(row.adGroup?.id);
        if (!id) return null;

        return {
          id,
          name: row.adGroup?.name || `Ad group ${id}`,
          status: row.adGroup?.status || "UNKNOWN",
          campaignId: sanitizeGoogleAdsId(row.campaign?.id) || campaignId,
          campaignName: row.campaign?.name || "",
        };
      })
      .filter(Boolean);
  }

  return {
    connectionId: connection.id,
    customerId,
    campaignId,
    dateRange,
    campaigns,
    adGroups,
    note: "Search campaigns are reviewed per ad group. Performance Max campaigns are reviewed per campaign.",
  };
}

async function fetchSearchTerms(connectionId, searchParams) {
  const customerId = sanitizeGoogleAdsId(searchParams.get("customerId"));
  const campaignId = sanitizeGoogleAdsId(searchParams.get("campaignId"));
  const adGroupId = sanitizeGoogleAdsId(searchParams.get("adGroupId"));
  const dateRange = sanitizeSearchTermDateRange(searchParams.get("dateRange"));
  const requestedScopeLevel = normalizeSearchTermScopeLevel(searchParams.get("scopeLevel"), adGroupId);

  if (!customerId || !campaignId) {
    throw new Error("customerId and campaignId are required.");
  }

  const { connection, tokenBundle, loginCustomerIds } = await getGoogleAdsConnectionContext(connectionId);
  assertGoogleAdsCustomerAccess(connection, customerId);
  const campaign = await fetchGoogleAdsCampaignDetails({ customerId, campaignId, tokenBundle, loginCustomerIds });
  const scopeLevel = campaign.channelType === "PERFORMANCE_MAX" ? "campaign" : requestedScopeLevel;

  if (scopeLevel === "ad_group" && !adGroupId) {
    throw new Error("adGroupId is required for non-Performance Max campaigns.");
  }

  const storedTags = listStoredSearchTermTags({
    connectionId: connection.id,
    customerId,
    campaignId,
    adGroupId: scopeLevel === "ad_group" ? adGroupId : "",
    scopeLevel,
  });
  const tagLookup = buildStoredSearchTermTagLookup(storedTags);

  const response = scopeLevel === "campaign"
    ? await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  campaign_search_term_view.search_term,",
        "  campaign.id,",
        "  campaign.name,",
        "  campaign.advertising_channel_type,",
        "  segments.search_term_match_source,",
        "  segments.search_term_match_type,",
        "  segments.search_term_targeting_status,",
        "  metrics.impressions,",
        "  metrics.clicks,",
        "  metrics.ctr,",
        "  metrics.average_cpc,",
        "  metrics.conversions,",
        "  metrics.cost_micros",
        "FROM campaign_search_term_view",
        `WHERE segments.date DURING ${dateRange}`,
        `  AND campaign.id = ${campaignId}`,
        "ORDER BY metrics.impressions DESC",
        "LIMIT 1000",
      ].join(" "),
      label: `Google Ads campaign search terms ${customerId}/${campaignId}`,
    })
    : await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  search_term_view.search_term,",
        "  search_term_view.status,",
        "  segments.keyword.info.text,",
        "  segments.keyword.info.match_type,",
        "  ad_group.id,",
        "  ad_group.name,",
        "  campaign.id,",
        "  campaign.name,",
        "  metrics.impressions,",
        "  metrics.clicks,",
        "  metrics.ctr,",
        "  metrics.average_cpc,",
        "  metrics.conversions,",
        "  metrics.cost_micros",
        "FROM search_term_view",
        `WHERE segments.date DURING ${dateRange}`,
        `  AND campaign.id = ${campaignId}`,
        `  AND ad_group.id = ${adGroupId}`,
        "ORDER BY metrics.impressions DESC",
        "LIMIT 1000",
      ].join(" "),
      label: `Google Ads search terms ${customerId}/${campaignId}/${adGroupId}`,
    });

  const terms = (response.results || []).map((row) => {
    const rawSearchTerm = (
      scopeLevel === "campaign"
        ? row.campaignSearchTermView?.searchTerm
        : row.searchTermView?.searchTerm
    ) || "";
    const searchTerm = String(rawSearchTerm).trim();
    const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
    const storedTag = tagLookup.get(normalizedSearchTerm) || null;

    return {
      scopeLevel,
      searchTerm,
      status: scopeLevel === "campaign"
        ? row.segments?.searchTermTargetingStatus || "UNKNOWN"
        : row.searchTermView?.status || "UNKNOWN",
      keywordText: scopeLevel === "campaign" ? "" : row.segments?.keyword?.info?.text || "",
      matchType: scopeLevel === "campaign"
        ? row.segments?.searchTermMatchType || "UNKNOWN"
        : row.segments?.keyword?.info?.matchType || "UNKNOWN",
      matchSource: scopeLevel === "campaign" ? row.segments?.searchTermMatchSource || "UNKNOWN" : "",
      campaignId: sanitizeGoogleAdsId(row.campaign?.id) || campaignId,
      campaignName: row.campaign?.name || campaign.name || "",
      campaignChannelType: row.campaign?.advertisingChannelType || campaign.channelType,
      adGroupId: scopeLevel === "campaign" ? "" : sanitizeGoogleAdsId(row.adGroup?.id) || adGroupId,
      adGroupName: scopeLevel === "campaign" ? "" : row.adGroup?.name || "",
      impressions: toNumber(row.metrics?.impressions),
      clicks: toNumber(row.metrics?.clicks),
      ctr: toNumber(row.metrics?.ctr),
      averageCpc: toNumber(row.metrics?.averageCpc) / 1_000_000,
      conversions: toNumber(row.metrics?.conversions),
      cost: toNumber(row.metrics?.costMicros) / 1_000_000,
      manualTag: storedTag?.tag || "",
      manualTagUpdatedAt: storedTag?.updatedAt || "",
    };
  });

  return {
    connectionId: connection.id,
    customerId,
    campaignId,
    adGroupId: scopeLevel === "ad_group" ? adGroupId : "",
    dateRange,
    scopeLevel,
    campaignChannelType: campaign.channelType,
    terms,
    tags: storedTags,
    note: scopeLevel === "campaign"
      ? "Performance Max terms are reviewed at campaign level."
      : "Search terms are reviewed at ad-group level.",
  };
}

async function fetchGoogleAdsLiveOverview(payload) {
  const dateRange = normalizeLiveDateRange(payload);
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(normalizeGoogleAdsLiveRequest).filter(Boolean)
    : [];

  if (!requests.length) {
    return {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange.id,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      accounts: [],
      campaigns: [],
      ads: [],
      errors: [],
    };
  }

  const connectionIds = Array.from(new Set(requests.map((item) => item.connectionId)));
  const contextEntries = await Promise.all(connectionIds.map(async (connectionId) => ([
    connectionId,
    await getGoogleAdsConnectionContext(connectionId),
  ])));
  const contextMap = new Map(contextEntries);

  const uniqueTargets = [];
  const targetKeys = new Set();
  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.customerId}`;
    if (targetKeys.has(targetKey)) return;
    targetKeys.add(targetKey);
    uniqueTargets.push({
      connectionId: request.connectionId,
      customerId: request.customerId,
    });
  });

  const settledTargets = await Promise.allSettled(uniqueTargets.map(async (target) => {
    const context = contextMap.get(target.connectionId);
    return {
      targetKey: `${target.connectionId}:${target.customerId}`,
      report: await fetchGoogleAdsLiveCustomerReport({
        context,
        customerId: target.customerId,
        dateRange,
      }),
    };
  }));

  const reportMap = new Map();
  settledTargets.forEach((result, index) => {
    const target = uniqueTargets[index];
    const targetKey = `${target.connectionId}:${target.customerId}`;

    if (result.status === "fulfilled") {
      reportMap.set(targetKey, result.value.report);
      return;
    }

    reportMap.set(targetKey, {
      customerId: target.customerId,
      asset: null,
      dataStatus: "error",
      dataError: result.reason?.message || "Could not fetch Google Ads live data.",
      account: null,
      campaigns: [],
      ads: [],
    });
  });

  const response = {
    generatedAt: new Date().toISOString(),
    dateRange: dateRange.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    accounts: [],
    campaigns: [],
    ads: [],
    errors: [],
  };

  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.customerId}`;
    const report = reportMap.get(targetKey) || null;
    const context = contextMap.get(request.connectionId);
    const fallbackAsset = context?.connection?.assets?.find((asset) => sanitizeGoogleAdsId(asset.externalId) === request.customerId) || null;
    const asset = report?.asset || fallbackAsset;
    const accountId = `live-google-account:${request.key}`;
    const monthlyBudget = request.budgetHint;

    response.accounts.push({
      id: accountId,
      clientId: request.clientId,
      platform: "google_ads",
      name: report?.account?.name || asset?.name || `Google Ads ${request.customerId}`,
      status: report?.account?.status || "active",
      monthlyBudget,
      spend: toNumber(report?.account?.spend),
      impressions: toNumber(report?.account?.impressions),
      clicks: toNumber(report?.account?.clicks),
      conversions: toNumber(report?.account?.conversions),
      allConversions: toNumber(report?.account?.allConversions),
      conversionValue: toNumber(report?.account?.conversionValue),
      allConversionValue: toNumber(report?.account?.allConversionValue),
      ctr: toNumber(report?.account?.ctr),
      cpc: toNumber(report?.account?.cpc),
      cpm: toNumber(report?.account?.cpm),
      roas: toNumber(report?.account?.roas),
      series: Array.isArray(report?.account?.series) ? report.account.series : [],
      accountLabel: report?.account?.name || asset?.name || `Google Ads ${request.customerId}`,
      requestKey: request.key,
      connectionId: request.connectionId,
      assetId: request.assetId,
      customerId: request.customerId,
      currency: report?.account?.currency || asset?.currency || "",
      timezone: report?.account?.timezone || asset?.timezone || "",
      dataStatus: report?.dataStatus || "ready",
      dataError: report?.dataError || "",
    });

    (report?.campaigns || []).forEach((campaign) => {
      const campaignId = `live-google-campaign:${request.key}:${campaign.rawCampaignId}`;
      response.campaigns.push({
        id: campaignId,
        clientId: request.clientId,
        accountId,
        platform: "google_ads",
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        budget: campaign.budget,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        allConversions: campaign.allConversions,
        conversionValue: campaign.conversionValue,
        allConversionValue: campaign.allConversionValue,
        cpc: campaign.cpc,
        cpm: campaign.cpm,
        channelType: campaign.channelType,
        requestKey: request.key,
        connectionId: request.connectionId,
        customerId: request.customerId,
        externalId: campaign.rawCampaignId,
        dataStatus: report?.dataStatus || "ready",
        dataError: report?.dataError || "",
      });
    });

    (report?.ads || []).forEach((ad) => {
      response.ads.push({
        id: `live-google-ad:${request.key}:${ad.rawAdId}`,
        clientId: request.clientId,
        accountId,
        campaignId: `live-google-campaign:${request.key}:${ad.rawCampaignId}`,
        platform: "google_ads",
        name: ad.name,
        format: ad.format,
        status: ad.status,
        spend: ad.spend,
        clicks: ad.clicks,
        impressions: ad.impressions,
        conversions: ad.conversions,
        allConversions: ad.allConversions,
        conversionValue: ad.conversionValue,
        allConversionValue: ad.allConversionValue,
        ctr: ad.ctr,
        requestKey: request.key,
        connectionId: request.connectionId,
        customerId: request.customerId,
        externalId: ad.rawAdId,
      });
    });

    if (report?.dataError) {
      response.errors.push({
        requestKey: request.key,
        connectionId: request.connectionId,
        customerId: request.customerId,
        error: report.dataError,
      });
    }
  });

  return response;
}

async function fetchGoogleAdsReportDetails(payload) {
  const dateRange = normalizeLiveDateRange(payload);
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(normalizeGoogleAdsLiveRequest).filter(Boolean)
    : [];

  // Optional GA4 requests — used as geo fallback when Google Ads geo views return 403
  const ga4Requests = Array.isArray(payload?.ga4Requests)
    ? payload.ga4Requests.map(normalizeGa4ReportRequest).filter(Boolean)
    : [];

  if (!requests.length) {
    return {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange.id,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      details: [],
      errors: [],
    };
  }

  // Build Google Ads connection context map
  const connectionIds = Array.from(new Set(requests.map((item) => item.connectionId)));
  const contextEntries = await Promise.all(connectionIds.map(async (connectionId) => ([
    connectionId,
    await getGoogleAdsConnectionContext(connectionId),
  ])));
  const contextMap = new Map(contextEntries);

  // Build GA4 connection context map (for geo fallback — failures are non-fatal)
  const ga4ConnectionIds = Array.from(new Set(ga4Requests.map((r) => r.connectionId)));
  const ga4ContextEntries = await Promise.all(ga4ConnectionIds.map(async (connectionId) => {
    try {
      return [connectionId, await getGa4ConnectionContext(connectionId)];
    } catch (_) {
      return [connectionId, null];
    }
  }));
  const ga4ContextMap = new Map(ga4ContextEntries.filter(([, ctx]) => ctx !== null));

  const uniqueTargets = [];
  const targetKeys = new Set();

  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.customerId}`;
    if (targetKeys.has(targetKey)) return;
    targetKeys.add(targetKey);
    uniqueTargets.push({
      connectionId: request.connectionId,
      customerId: request.customerId,
    });
  });

  // Fetch Google Ads reports and GA4 geo data in parallel
  const [settledTargets, ga4GeoSettled] = await Promise.all([
    Promise.allSettled(uniqueTargets.map(async (target) => {
      const context = contextMap.get(target.connectionId);
      return {
        targetKey: `${target.connectionId}:${target.customerId}`,
        report: await fetchGoogleAdsReportDetailForCustomer({
          context,
          customerId: target.customerId,
          dateRange,
        }),
      };
    })),
    Promise.allSettled(ga4Requests.map(async (r) => {
      const context = ga4ContextMap.get(r.connectionId);
      if (!context) throw new Error(`No GA4 context for connection ${r.connectionId}.`);
      return {
        clientId: r.clientId,
        rows: await fetchGa4GeographyReport({ context, propertyId: r.propertyId, dateRange }),
      };
    })),
  ]);

  // Build GA4 geo map keyed by clientId
  const ga4GeoByClientId = new Map();
  ga4GeoSettled.forEach((result) => {
    if (result.status === "fulfilled" && result.value.rows?.length) {
      ga4GeoByClientId.set(result.value.clientId, result.value.rows);
    }
  });

  const reportMap = new Map();

  settledTargets.forEach((result, index) => {
    const target = uniqueTargets[index];
    const targetKey = `${target.connectionId}:${target.customerId}`;

    if (result.status === "fulfilled") {
      reportMap.set(targetKey, result.value.report);
      return;
    }

    reportMap.set(targetKey, {
      customerId: target.customerId,
      dataStatus: "error",
      dataError: result.reason?.message || "Could not fetch Google Ads report details.",
      devices: [],
      geographies: [],
      keywords: [],
      impressionShare: [],
      errors: [result.reason?.message || "Could not fetch Google Ads report details."],
    });
  });

  const response = {
    generatedAt: new Date().toISOString(),
    dateRange: dateRange.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    details: [],
    errors: [],
  };

  // Track which clients have already received GA4 geo rows to prevent double-counting
  // when a client has multiple Google Ads accounts linked.
  const clientIdsWithGa4Geo = new Set();

  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.customerId}`;
    const report = reportMap.get(targetKey) || null;

    let geographies = Array.isArray(report?.geographies) ? report.geographies : [];

    // Inject GA4 city data when Google Ads geo is unavailable or country-level only
    const geoIsUseless = !geographies.length ||
      geographies.every((row) => row.source === "location_view");

    if (geoIsUseless && request.clientId && !clientIdsWithGa4Geo.has(request.clientId)) {
      const ga4Rows = ga4GeoByClientId.get(request.clientId);
      if (ga4Rows?.length) {
        geographies = ga4Rows;
        clientIdsWithGa4Geo.add(request.clientId); // only inject once per client
      }
    }

    response.details.push({
      requestKey: request.key,
      clientId: request.clientId,
      connectionId: request.connectionId,
      assetId: request.assetId,
      customerId: request.customerId,
      dataStatus: report?.dataStatus || "ready",
      dataError: report?.dataError || "",
      devices: Array.isArray(report?.devices) ? report.devices : [],
      geographies,
      keywords: Array.isArray(report?.keywords) ? report.keywords : [],
      impressionShare: Array.isArray(report?.impressionShare) ? report.impressionShare : [],
    });

    (report?.errors || []).forEach((error) => {
      response.errors.push({
        requestKey: request.key,
        connectionId: request.connectionId,
        customerId: request.customerId,
        error,
      });
    });
  });

  return response;
}

async function fetchMetaAdsLiveOverview(payload) {
  const dateRange = normalizeLiveDateRange(payload);
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(normalizeMetaAdsLiveRequest).filter(Boolean)
    : [];

  if (!requests.length) {
    return {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange.id,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      accounts: [],
      campaigns: [],
      ads: [],
      errors: [],
    };
  }

  const connectionIds = Array.from(new Set(requests.map((item) => item.connectionId)));
  const contextEntries = await Promise.all(connectionIds.map(async (connectionId) => ([
    connectionId,
    await getMetaAdsConnectionContext(connectionId),
  ])));
  const contextMap = new Map(contextEntries);

  const uniqueTargets = [];
  const targetKeys = new Set();
  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.adAccountId}`;
    if (targetKeys.has(targetKey)) return;
    targetKeys.add(targetKey);
    uniqueTargets.push({
      connectionId: request.connectionId,
      adAccountId: request.adAccountId,
    });
  });

  const settledTargets = await Promise.allSettled(uniqueTargets.map(async (target) => {
    const context = contextMap.get(target.connectionId);
    return {
      targetKey: `${target.connectionId}:${target.adAccountId}`,
      report: await fetchMetaAdsLiveAccountReport({
        context,
        adAccountId: target.adAccountId,
        dateRange,
      }),
    };
  }));

  const reportMap = new Map();
  settledTargets.forEach((result, index) => {
    const target = uniqueTargets[index];
    const targetKey = `${target.connectionId}:${target.adAccountId}`;

    if (result.status === "fulfilled") {
      reportMap.set(targetKey, result.value.report);
      return;
    }

    reportMap.set(targetKey, {
      adAccountId: target.adAccountId,
      asset: null,
      dataStatus: "error",
      dataError: result.reason?.message || "Could not fetch Meta Ads live data.",
      account: null,
      campaigns: [],
      ads: [],
    });
  });

  const response = {
    generatedAt: new Date().toISOString(),
    dateRange: dateRange.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    accounts: [],
    campaigns: [],
    ads: [],
    errors: [],
  };

  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.adAccountId}`;
    const report = reportMap.get(targetKey) || null;
    const context = contextMap.get(request.connectionId);
    const fallbackAsset = context?.connection?.assets?.find((asset) => sanitizeMetaAdAccountId(asset.externalId) === request.adAccountId) || null;
    const asset = report?.asset || fallbackAsset;
    const accountId = `live-meta-account:${request.key}`;
    const monthlyBudget = request.budgetHint;

    response.accounts.push({
      id: accountId,
      clientId: request.clientId,
      platform: "meta_ads",
      name: report?.account?.name || asset?.name || `Meta Ads ${request.adAccountId}`,
      status: report?.account?.status || "active",
      monthlyBudget,
      spend: toNumber(report?.account?.spend),
      impressions: toNumber(report?.account?.impressions),
      clicks: toNumber(report?.account?.clicks),
      conversions: toNumber(report?.account?.conversions),
      conversionValue: toNumber(report?.account?.conversionValue),
      ctr: toNumber(report?.account?.ctr),
      cpc: toNumber(report?.account?.cpc),
      cpm: toNumber(report?.account?.cpm),
      roas: toNumber(report?.account?.roas),
      series: Array.isArray(report?.account?.series) ? report.account.series : [],
      accountLabel: report?.account?.name || asset?.name || `Meta Ads ${request.adAccountId}`,
      requestKey: request.key,
      connectionId: request.connectionId,
      assetId: request.assetId,
      adAccountId: request.adAccountId,
      currency: report?.account?.currency || asset?.currency || "",
      timezone: report?.account?.timezone || asset?.timezone || "",
      dataStatus: report?.dataStatus || "ready",
      dataError: report?.dataError || "",
    });

    (report?.campaigns || []).forEach((campaign) => {
      const campaignId = `live-meta-campaign:${request.key}:${campaign.rawCampaignId}`;
      response.campaigns.push({
        id: campaignId,
        clientId: request.clientId,
        accountId,
        platform: "meta_ads",
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        budget: campaign.budget,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        conversionValue: campaign.conversionValue,
        reach: campaign.reach,
        cpc: campaign.cpc,
        cpm: campaign.cpm,
        requestKey: request.key,
        connectionId: request.connectionId,
        adAccountId: request.adAccountId,
        externalId: campaign.rawCampaignId,
        dataStatus: report?.dataStatus || "ready",
        dataError: report?.dataError || "",
      });
    });

    (report?.ads || []).forEach((ad) => {
      response.ads.push({
        id: `live-meta-ad:${request.key}:${ad.rawAdId}`,
        clientId: request.clientId,
        accountId,
        campaignId: `live-meta-campaign:${request.key}:${ad.rawCampaignId}`,
        platform: "meta_ads",
        name: ad.name,
        format: ad.format,
        status: ad.status,
        spend: ad.spend,
        clicks: ad.clicks,
        impressions: ad.impressions,
        conversions: ad.conversions,
        conversionValue: ad.conversionValue,
        reach: ad.reach,
        ctr: ad.ctr,
        previewImageUrl: ad.previewImageUrl || "",
        previewHeadline: ad.previewHeadline || "",
        previewBody: ad.previewBody || "",
        previewCaption: ad.previewCaption || "",
        previewCallToAction: ad.previewCallToAction || "",
        requestKey: request.key,
        connectionId: request.connectionId,
        adAccountId: request.adAccountId,
        externalId: ad.rawAdId,
      });
    });

    if (report?.dataError) {
      response.errors.push({
        requestKey: request.key,
        connectionId: request.connectionId,
        adAccountId: request.adAccountId,
        error: report.dataError,
      });
    }
  });

  return response;
}

async function fetchMetaAdRowsWithCreativePreview({ actId, accessToken, adAccountId }) {
  const fieldAttempts = [
    "id,name,status,effective_status,creative{object_type,image_url,thumbnail_url,object_story_spec,asset_feed_spec,title,body},campaign{id,name}",
    "id,name,status,effective_status,creative{object_type,image_url,thumbnail_url,object_story_spec,title,body},campaign{id,name}",
    "id,name,status,effective_status,creative{object_type},campaign{id,name}",
  ];
  let lastError = null;

  for (const fields of fieldAttempts) {
    try {
      return await fetchMetaGraphPages(buildMetaGraphUrl(`${actId}/ads`, {
        fields,
        limit: String(META_ADS_LIVE_AD_LIMIT),
        access_token: accessToken,
      }), `Meta ads ${adAccountId}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Could not fetch Meta ads for ${adAccountId}.`);
}

async function fetchTikTokAdsLiveOverview(payload) {
  const dateRange = normalizeLiveDateRange(payload);
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(normalizeTikTokAdsLiveRequest).filter(Boolean)
    : [];

  if (!requests.length) {
    return {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange.id,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      accounts: [],
      campaigns: [],
      ads: [],
      errors: [],
    };
  }

  const connectionIds = Array.from(new Set(requests.map((item) => item.connectionId)));
  const contextEntries = await Promise.all(connectionIds.map(async (connectionId) => ([
    connectionId,
    await getTikTokAdsConnectionContext(connectionId),
  ])));
  const contextMap = new Map(contextEntries);

  const uniqueTargets = [];
  const targetKeys = new Set();
  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.advertiserId}`;
    if (targetKeys.has(targetKey)) return;
    targetKeys.add(targetKey);
    uniqueTargets.push({
      connectionId: request.connectionId,
      advertiserId: request.advertiserId,
    });
  });

  const settledTargets = await Promise.allSettled(uniqueTargets.map(async (target) => {
    const context = contextMap.get(target.connectionId);
    return {
      targetKey: `${target.connectionId}:${target.advertiserId}`,
      report: await fetchTikTokAdsLiveAdvertiserReport({
        context,
        advertiserId: target.advertiserId,
        dateRange,
      }),
    };
  }));

  const reportMap = new Map();
  settledTargets.forEach((result, index) => {
    const target = uniqueTargets[index];
    const targetKey = `${target.connectionId}:${target.advertiserId}`;

    if (result.status === "fulfilled") {
      reportMap.set(targetKey, result.value.report);
      return;
    }

    reportMap.set(targetKey, {
      advertiserId: target.advertiserId,
      asset: null,
      dataStatus: "error",
      dataError: result.reason?.message || "Could not fetch TikTok Ads live data.",
      account: null,
      campaigns: [],
      ads: [],
    });
  });

  const response = {
    generatedAt: new Date().toISOString(),
    dateRange: dateRange.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    accounts: [],
    campaigns: [],
    ads: [],
    errors: [],
  };

  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.advertiserId}`;
    const report = reportMap.get(targetKey) || null;
    const context = contextMap.get(request.connectionId);
    const fallbackAsset = context?.connection?.assets?.find((asset) => sanitizeTikTokAdvertiserId(asset.externalId) === request.advertiserId) || null;
    const asset = report?.asset || fallbackAsset;
    const accountId = `live-tiktok-account:${request.key}`;
    const monthlyBudget = request.budgetHint;

    response.accounts.push({
      id: accountId,
      clientId: request.clientId,
      platform: "tiktok_ads",
      name: report?.account?.name || asset?.name || `TikTok Ads ${request.advertiserId}`,
      status: report?.account?.status || "active",
      monthlyBudget,
      spend: toNumber(report?.account?.spend),
      impressions: toNumber(report?.account?.impressions),
      clicks: toNumber(report?.account?.clicks),
      conversions: toNumber(report?.account?.conversions),
      conversionValue: toNumber(report?.account?.conversionValue),
      ctr: toNumber(report?.account?.ctr),
      cpc: toNumber(report?.account?.cpc),
      cpm: toNumber(report?.account?.cpm),
      roas: toNumber(report?.account?.roas),
      series: Array.isArray(report?.account?.series) ? report.account.series : [],
      accountLabel: report?.account?.name || asset?.name || `TikTok Ads ${request.advertiserId}`,
      requestKey: request.key,
      connectionId: request.connectionId,
      assetId: request.assetId,
      advertiserId: request.advertiserId,
      currency: report?.account?.currency || asset?.currency || "",
      timezone: report?.account?.timezone || asset?.timezone || "",
      dataStatus: report?.dataStatus || "ready",
      dataError: report?.dataError || "",
    });

    (report?.campaigns || []).forEach((campaign) => {
      const campaignId = `live-tiktok-campaign:${request.key}:${campaign.rawCampaignId}`;
      response.campaigns.push({
        id: campaignId,
        clientId: request.clientId,
        accountId,
        platform: "tiktok_ads",
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        budget: campaign.budget,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        conversionValue: campaign.conversionValue,
        reach: campaign.reach,
        cpc: campaign.cpc,
        cpm: campaign.cpm,
        requestKey: request.key,
        connectionId: request.connectionId,
        advertiserId: request.advertiserId,
        externalId: campaign.rawCampaignId,
        dataStatus: report?.dataStatus || "ready",
        dataError: report?.dataError || "",
      });
    });

    (report?.ads || []).forEach((ad) => {
      response.ads.push({
        id: `live-tiktok-ad:${request.key}:${ad.rawAdId}`,
        clientId: request.clientId,
        accountId,
        campaignId: `live-tiktok-campaign:${request.key}:${ad.rawCampaignId}`,
        platform: "tiktok_ads",
        name: ad.name,
        format: ad.format,
        status: ad.status,
        spend: ad.spend,
        clicks: ad.clicks,
        impressions: ad.impressions,
        conversions: ad.conversions,
        conversionValue: ad.conversionValue,
        reach: ad.reach,
        ctr: ad.ctr,
        requestKey: request.key,
        connectionId: request.connectionId,
        advertiserId: request.advertiserId,
        externalId: ad.rawAdId,
      });
    });

    if (report?.dataError) {
      response.errors.push({
        requestKey: request.key,
        connectionId: request.connectionId,
        advertiserId: request.advertiserId,
        error: report.dataError,
      });
    }
  });

  return response;
}

async function fetchGa4LiveOverview(payload) {
  const dateRange = normalizeLiveDateRange(payload);
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(normalizeGa4LiveRequest).filter(Boolean)
    : [];

  if (!requests.length) {
    return {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange.id,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      properties: [],
      errors: [],
    };
  }

  const connectionIds = Array.from(new Set(requests.map((item) => item.connectionId)));
  const contextEntries = await Promise.all(connectionIds.map(async (connectionId) => ([
    connectionId,
    await getGa4ConnectionContext(connectionId),
  ])));
  const contextMap = new Map(contextEntries);

  const uniqueTargets = [];
  const targetKeys = new Set();
  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.propertyId}`;
    if (targetKeys.has(targetKey)) return;
    targetKeys.add(targetKey);
    uniqueTargets.push({
      connectionId: request.connectionId,
      propertyId: request.propertyId,
    });
  });

  const settledTargets = await Promise.allSettled(uniqueTargets.map(async (target) => {
    const context = contextMap.get(target.connectionId);
    return {
      targetKey: `${target.connectionId}:${target.propertyId}`,
      report: await fetchGa4LivePropertyReport({
        context,
        propertyId: target.propertyId,
        dateRange,
      }),
    };
  }));

  const reportMap = new Map();
  settledTargets.forEach((result, index) => {
    const target = uniqueTargets[index];
    const targetKey = `${target.connectionId}:${target.propertyId}`;

    if (result.status === "fulfilled") {
      reportMap.set(targetKey, result.value.report);
      return;
    }

    reportMap.set(targetKey, {
      propertyId: target.propertyId,
      asset: null,
      dataStatus: "error",
      dataError: result.reason?.message || "Could not fetch GA4 live data.",
      series: [],
    });
  });

  const response = {
    generatedAt: new Date().toISOString(),
    dateRange: dateRange.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    properties: [],
    errors: [],
  };

  requests.forEach((request) => {
    const targetKey = `${request.connectionId}:${request.propertyId}`;
    const report = reportMap.get(targetKey) || null;
    const context = contextMap.get(request.connectionId);
    const fallbackAsset = context?.connection?.assets?.find((asset) => sanitizeGoogleAdsId(asset.externalId) === request.propertyId) || null;
    const asset = report?.asset || fallbackAsset;

    response.properties.push({
      id: `live-ga4-property:${request.key}`,
      clientId: request.clientId,
      platform: "ga4",
      propertyId: request.propertyId,
      propertyName: report?.propertyName || asset?.name || `GA4 property ${request.propertyId}`,
      accountName: report?.accountName || asset?.subtitle || "",
      sessions: toNumber(report?.sessions),
      users: toNumber(report?.users),
      engagedRate: toNumber(report?.engagedRate),
      conversionRate: toNumber(report?.conversionRate),
      purchasesOrLeads: toNumber(report?.purchasesOrLeads),
      conversions: toNumber(report?.conversions),
      revenueCurrentPeriod: toNumber(report?.revenueCurrentPeriod),
      revenueLastYearPeriod: toNumber(report?.revenueLastYearPeriod),
      aov: toNumber(report?.aov),
      channels: report?.channels || {},
      series: Array.isArray(report?.series) ? report.series : [],
      previousSeries: Array.isArray(report?.previousSeries) ? report.previousSeries : [],
      previousStartDate: report?.previousStartDate || "",
      previousEndDate: report?.previousEndDate || "",
      insight: report?.insight || "Live GA4 property linked.",
      requestKey: request.key,
      connectionId: request.connectionId,
      assetId: request.assetId,
      dataStatus: report?.dataStatus || "ready",
      dataError: report?.dataError || "",
    });

    if (report?.dataError) {
      response.errors.push({
        requestKey: request.key,
        connectionId: request.connectionId,
        propertyId: request.propertyId,
        error: report.dataError,
      });
    }
  });

  return response;
}

function normalizeGoogleAdsLiveRequest(value) {
  const connectionId = String(value?.connectionId || "").trim();
  const customerId = sanitizeGoogleAdsId(value?.customerId);

  if (!connectionId || !customerId) {
    return null;
  }

  return {
    key: String(value?.key || `${connectionId}:${customerId}`).trim(),
    clientId: String(value?.clientId || "").trim(),
    connectionId,
    assetId: String(value?.assetId || "").trim(),
    customerId,
    budgetHint: Math.max(0, toNumber(value?.budgetHint)),
  };
}

function normalizeGa4ReportRequest(value) {
  const connectionId = String(value?.connectionId || "").trim();
  const propertyId = sanitizeGoogleAdsId(value?.propertyId);
  const clientId = String(value?.clientId || "").trim();

  if (!connectionId || !propertyId || !clientId) return null;

  return { connectionId, propertyId, clientId };
}

function normalizeMetaAdsLiveRequest(value) {
  const connectionId = String(value?.connectionId || "").trim();
  const adAccountId = sanitizeMetaAdAccountId(value?.adAccountId || value?.accountId || value?.externalId);

  if (!connectionId || !adAccountId) {
    return null;
  }

  return {
    key: String(value?.key || `${connectionId}:${adAccountId}`).trim(),
    clientId: String(value?.clientId || "").trim(),
    connectionId,
    assetId: String(value?.assetId || "").trim(),
    adAccountId,
    budgetHint: Math.max(0, toNumber(value?.budgetHint)),
  };
}

function normalizeTikTokAdsLiveRequest(value) {
  const connectionId = String(value?.connectionId || "").trim();
  const advertiserId = sanitizeTikTokAdvertiserId(value?.advertiserId || value?.accountId || value?.externalId);

  if (!connectionId || !advertiserId) {
    return null;
  }

  return {
    key: String(value?.key || `${connectionId}:${advertiserId}`).trim(),
    clientId: String(value?.clientId || "").trim(),
    connectionId,
    assetId: String(value?.assetId || "").trim(),
    advertiserId,
    budgetHint: Math.max(0, toNumber(value?.budgetHint)),
  };
}

function normalizeGa4LiveRequest(value) {
  const connectionId = String(value?.connectionId || "").trim();
  const propertyId = sanitizeGoogleAdsId(value?.propertyId || value?.externalId);

  if (!connectionId || !propertyId) {
    return null;
  }

  return {
    key: String(value?.key || `${connectionId}:${propertyId}`).trim(),
    clientId: String(value?.clientId || "").trim(),
    connectionId,
    assetId: String(value?.assetId || "").trim(),
    propertyId,
  };
}

async function fetchGa4LivePropertyReport({ context, propertyId, dateRange }) {
  if (!context?.connection) {
    throw new Error("GA4 connection context is missing.");
  }

  const { connection, tokenBundle } = context;
  assertGa4PropertyAccess(connection, propertyId);

  const asset = connection.assets?.find((item) => sanitizeGoogleAdsId(item.externalId) === propertyId) || null;
  const channelResult = await fetchGa4RunReportWithMetricFallback({
    tokenBundle,
    propertyId,
    dateRange,
    dimensions: ["sessionDefaultChannelGroup"],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
    label: `GA4 channel report ${propertyId}`,
  });

  let dailyReport = null;
  let previousDailyReport = null;
  let dailyError = "";
  let previousDailyError = "";
  const previousDateRange = getPreviousLiveDateRange(dateRange);

  try {
    dailyReport = await fetchGa4RunReport({
      tokenBundle,
      propertyId,
      dateRange,
      dimensions: ["date"],
      metricNames: channelResult.metricNames,
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 400,
      label: `GA4 daily report ${propertyId}`,
    });
  } catch (error) {
    dailyError = error.message || "Could not fetch GA4 daily trend.";
  }

  try {
    previousDailyReport = await fetchGa4RunReport({
      tokenBundle,
      propertyId,
      dateRange: previousDateRange,
      dimensions: ["date"],
      metricNames: channelResult.metricNames,
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 400,
      label: `GA4 previous daily report ${propertyId}`,
    });
  } catch (error) {
    previousDailyError = error.message || "Could not fetch GA4 previous period trend.";
  }

  const summary = normalizeGa4PropertySummary({
    report: channelResult.report,
    metricNames: channelResult.metricNames,
    asset,
    propertyId,
  });

  return {
    ...summary,
    asset,
    dataStatus: dailyError || previousDailyError ? "partial" : "ready",
    dataError: [dailyError, previousDailyError].filter(Boolean).join(" | "),
    series: dailyReport ? normalizeGa4DailySeries(dailyReport, dateRange) : [],
    previousSeries: previousDailyReport ? normalizeGa4DailySeries(previousDailyReport, previousDateRange) : [],
    previousStartDate: previousDateRange.startDate,
    previousEndDate: previousDateRange.endDate,
  };
}

async function fetchGa4GeographyReport({ context, propertyId, dateRange }) {
  if (!context?.connection) throw new Error("GA4 connection context is missing.");

  const { connection, tokenBundle } = context;
  assertGa4PropertyAccess(connection, propertyId);

  // Try richer metric sets first, fall back to basics
  const metricAttempts = [
    ["sessions", "totalUsers", "keyEvents", "totalRevenue"],
    ["sessions", "totalUsers", "conversions", "totalRevenue"],
    ["sessions", "totalUsers", "keyEvents"],
    ["sessions", "totalUsers", "conversions"],
    ["sessions", "totalUsers"],
  ];

  let report = null;
  for (const metricNames of metricAttempts) {
    try {
      report = await fetchGa4RunReport({
        tokenBundle,
        propertyId,
        dateRange,
        dimensions: ["city", "region"],
        metricNames,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 50,
        label: `GA4 geography report ${propertyId}`,
      });
      break;
    } catch (_) { /* try next metric set */ }
  }

  if (!report) throw new Error(`Could not fetch GA4 geography for property ${propertyId}.`);

  return (Array.isArray(report?.rows) ? report.rows : [])
    .map((row) => {
      const city = String(row.dimensionValues?.[0]?.value || "").trim();
      const region = String(row.dimensionValues?.[1]?.value || "").trim();

      if (!city || city === "(not set)") return null;

      const location = (region && region !== "(not set)" && region !== city)
        ? `${city}, ${region}`
        : city;

      const sessions = Math.round(getGa4MetricValue(report, row, [], "sessions"));
      const users = Math.round(getGa4MetricValue(report, row, [], "totalUsers"));
      const keyEvents = +(
        getGa4MetricValue(report, row, [], "keyEvents") ||
        getGa4MetricValue(report, row, [], "conversions")
      ).toFixed(2);
      const revenue = +getGa4MetricValue(report, row, [], "totalRevenue").toFixed(2);

      return {
        location,
        sessions,
        users,
        keyEvents,
        revenue,
        // Mirror into Google Ads field names so existing aggregation logic works
        clicks: sessions,
        conversions: keyEvents,
        allConversions: keyEvents,
        cost: 0,
        conversionValue: revenue,
        allConversionValue: revenue,
        costPerConversion: 0,
        source: "ga4",
      };
    })
    .filter(Boolean);
}

async function fetchGa4RunReportWithMetricFallback({ tokenBundle, propertyId, dateRange, dimensions, orderBys, limit, label }) {
  const metricAttempts = [
    ["sessions", "totalUsers", "engagementRate", "totalRevenue", "transactions", "keyEvents"],
    ["sessions", "totalUsers", "engagementRate", "totalRevenue", "transactions", "conversions"],
    ["sessions", "totalUsers", "engagementRate", "totalRevenue", "keyEvents"],
    ["sessions", "totalUsers", "engagementRate", "totalRevenue", "conversions"],
    ["sessions", "totalUsers", "engagementRate", "totalRevenue", "transactions"],
    ["sessions", "totalUsers", "engagementRate", "totalRevenue"],
  ];
  let lastError = null;

  for (const metricNames of metricAttempts) {
    try {
      return {
        metricNames,
        report: await fetchGa4RunReport({
          tokenBundle,
          propertyId,
          dateRange,
          dimensions,
          metricNames,
          orderBys,
          limit,
          label,
        }),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Could not fetch GA4 report for property ${propertyId}.`);
}

async function fetchGa4RunReport({ tokenBundle, propertyId, dateRange, dimensions = [], metricNames = [], orderBys = [], limit = 50, label = "GA4 report" }) {
  return fetchJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenBundle.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [buildGa4ReportDateRange(dateRange)],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metricNames.map((name) => ({ name })),
      metricAggregations: ["TOTAL"],
      keepEmptyRows: false,
      limit: String(limit),
      orderBys,
    }),
  }, label);
}

function normalizeGa4PropertySummary({ report, metricNames, asset, propertyId }) {
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const totalRow = Array.isArray(report?.totals) && report.totals[0] ? report.totals[0] : null;
  const sessions = Math.round(getGa4MetricValue(report, totalRow, rows, "sessions"));
  const users = Math.round(getGa4MetricValue(report, totalRow, rows, "totalUsers"));
  const engagementRateRaw = getGa4MetricValue(report, totalRow, rows, "engagementRate", { average: true });
  const revenue = getGa4MetricValue(report, totalRow, rows, "totalRevenue");
  const transactions = getGa4MetricValue(report, totalRow, rows, "transactions");
  const keyEvents = getGa4MetricValue(report, totalRow, rows, "keyEvents") || getGa4MetricValue(report, totalRow, rows, "conversions");
  const conversions = keyEvents || transactions;
  const channelSessions = rows.reduce((acc, row) => {
    const channel = String(row.dimensionValues?.[0]?.value || "Unassigned").trim() || "Unassigned";
    acc.set(channel, (acc.get(channel) || 0) + getGa4MetricValue(report, row, [], "sessions"));
    return acc;
  }, new Map());
  const channels = Object.fromEntries(Array.from(channelSessions.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([channel, value]) => [channel, sessions ? Math.round(value / sessions * 100) : 0]));

  return {
    propertyId,
    propertyName: asset?.name || `GA4 property ${propertyId}`,
    accountName: asset?.subtitle || "",
    sessions,
    users,
    engagedRate: engagementRateRaw <= 1 ? +(engagementRateRaw * 100).toFixed(1) : +engagementRateRaw.toFixed(1),
    conversionRate: sessions ? +(conversions / sessions * 100).toFixed(2) : 0,
    purchasesOrLeads: +conversions.toFixed(2),
    conversions: +conversions.toFixed(2),
    revenueCurrentPeriod: +revenue.toFixed(2),
    revenueLastYearPeriod: 0,
    aov: transactions ? +(revenue / transactions).toFixed(2) : 0,
    channels: Object.keys(channels).length ? channels : { Unassigned: 0 },
    insight: `Live GA4 data from ${asset?.name || `property ${propertyId}`}.`,
    metricNames,
  };
}

function normalizeGa4DailySeries(report, dateRange) {
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const byDate = new Map();

  rows.forEach((row) => {
    const rawDate = String(row.dimensionValues?.[0]?.value || "");
    const date = rawDate.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
    if (!sanitizeIsoDate(date)) return;
    const sessions = Math.round(getGa4MetricValue(report, row, [], "sessions"));
    const users = Math.round(getGa4MetricValue(report, row, [], "totalUsers"));
    const revenue = getGa4MetricValue(report, row, [], "totalRevenue");
    const transactions = getGa4MetricValue(report, row, [], "transactions");
    const keyEvents = getGa4MetricValue(report, row, [], "keyEvents") || getGa4MetricValue(report, row, [], "conversions");
    const conversions = keyEvents || transactions;

    byDate.set(date, {
      date,
      label: formatDailySeriesLabel(date),
      sessions,
      users,
      conversions: +conversions.toFixed(2),
      revenue: +revenue.toFixed(2),
    });
  });

  const dates = buildDailySeriesDates(dateRange);
  if (!dates.length) {
    return Array.from(byDate.values()).sort((left, right) => String(left.date).localeCompare(String(right.date)));
  }

  return dates.map((date) => byDate.get(date) || {
    date,
    label: formatDailySeriesLabel(date),
    sessions: 0,
    users: 0,
    conversions: 0,
    revenue: 0,
  });
}

function buildDailySeriesDates(dateRange) {
  const startDate = sanitizeIsoDate(dateRange?.startDate);
  const endDate = sanitizeIsoDate(dateRange?.endDate);
  if (!startDate || !endDate || endDate < startDate) return [];

  const dates = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const final = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= final) {
    dates.push(formatUtcDate(cursor));
    cursor = addUtcDays(cursor, 1);
  }

  return dates;
}

function formatDailySeriesLabel(value) {
  const normalized = sanitizeIsoDate(value);
  if (!normalized) return String(value || "");

  const [, month, day] = normalized.split("-");
  const monthIndex = Number(month) - 1;
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (monthIndex < 0 || monthIndex >= monthLabels.length) return normalized;
  return `${monthLabels[monthIndex]} ${day}`;
}

function normalizeGoogleAdsDailySeriesRows(rows, dateRange) {
  const byDate = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const date = sanitizeIsoDate(row?.segments?.date || row?.date || "");
    if (!date) return;

    const spend = toNumber(row.metrics?.costMicros) / 1_000_000;
    const impressions = toNumber(row.metrics?.impressions);
    const clicks = toNumber(row.metrics?.clicks);
    const conversions = toNumber(row.metrics?.conversions);
    const allConversions = toNumber(row.metrics?.allConversions);
    const conversionValue = normalizeGoogleAdsConversionValue(row.metrics?.conversionsValue);
    const allConversionValue = normalizeGoogleAdsConversionValue(row.metrics?.allConversionsValue);

    byDate.set(date, {
      date,
      label: formatDailySeriesLabel(date),
      spend: +spend.toFixed(2),
      impressions,
      clicks,
      conversions: +conversions.toFixed(2),
      allConversions: +allConversions.toFixed(2),
      conversionValue: +conversionValue.toFixed(2),
      allConversionValue: +allConversionValue.toFixed(2),
      cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
      cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
      ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      roas: spend ? +(conversionValue / spend).toFixed(2) : 0,
      revenue: +conversionValue.toFixed(2),
    });
  });

  const dates = buildDailySeriesDates(dateRange);
  if (!dates.length) {
    return Array.from(byDate.values()).sort((left, right) => String(left.date).localeCompare(String(right.date)));
  }

  return dates.map((date) => byDate.get(date) || {
    date,
    label: formatDailySeriesLabel(date),
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    allConversions: 0,
    conversionValue: 0,
    allConversionValue: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    roas: 0,
    revenue: 0,
  });
}

function normalizeMetaDailySeriesRows(rows, dateRange) {
  const byDate = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const date = sanitizeIsoDate(row?.date_start || row?.date || "");
    if (!date) return;

    const spend = toNumber(row.spend);
    const impressions = toNumber(row.impressions);
    const clicks = toNumber(row.clicks);
    const reach = toNumber(row.reach);
    const conversions = extractMetaConversionCount(row.actions);
    const conversionValue = extractMetaConversionValue(row.action_values, row.purchase_roas, spend);

    byDate.set(date, {
      date,
      label: formatDailySeriesLabel(date),
      spend: +spend.toFixed(2),
      impressions,
      clicks,
      reach,
      conversions: +conversions.toFixed(2),
      conversionValue: +conversionValue.toFixed(2),
      cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
      cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
      ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      roas: spend ? +(conversionValue / spend).toFixed(2) : 0,
      revenue: +conversionValue.toFixed(2),
    });
  });

  const dates = buildDailySeriesDates(dateRange);
  if (!dates.length) {
    return Array.from(byDate.values()).sort((left, right) => String(left.date).localeCompare(String(right.date)));
  }

  return dates.map((date) => byDate.get(date) || {
    date,
    label: formatDailySeriesLabel(date),
    spend: 0,
    impressions: 0,
    clicks: 0,
    reach: 0,
    conversions: 0,
    conversionValue: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    roas: 0,
    revenue: 0,
  });
}

function getGa4MetricValue(report, row, fallbackRows, metricName, options = {}) {
  const index = (report?.metricHeaders || []).findIndex((header) => header.name === metricName);
  if (index < 0) return 0;

  if (row) {
    return toNumber(row.metricValues?.[index]?.value);
  }

  const values = (Array.isArray(fallbackRows) ? fallbackRows : []).map((item) => toNumber(item.metricValues?.[index]?.value));
  if (options.average) {
    const nonEmpty = values.filter((value) => value > 0);
    return nonEmpty.reduce((acc, value) => acc + value, 0) / Math.max(nonEmpty.length, 1);
  }

  return values.reduce((acc, value) => acc + value, 0);
}

async function fetchGoogleAdsLiveCustomerReport({ context, customerId, dateRange }) {
  if (!context?.connection) {
    throw new Error("Google Ads connection context is missing.");
  }

  const { connection, tokenBundle, loginCustomerIds } = context;
  const customerLoginCustomerIds = getGoogleAdsScopedLoginCustomerIds(connection, customerId, loginCustomerIds);
  assertGoogleAdsCustomerAccess(connection, customerId);

  const asset = connection.assets?.find((item) => sanitizeGoogleAdsId(item.externalId) === customerId) || null;
  const catalog = await getGoogleAdsCatalogForCustomer({
    connection,
    customerId,
    tokenBundle,
    loginCustomerIds: customerLoginCustomerIds,
    asset,
  });
  const errors = [];
  let accountSummary = null;
  let campaignMetricsResponse = null;
  let adMetricsResponse = null;
  let dailySeries = [];

  try {
    accountSummary = await fetchGoogleAdsAccountSummary({
      customerId,
      tokenBundle,
      loginCustomerIds: customerLoginCustomerIds,
      dateRange,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch account totals for ${customerId}.`);
  }

  try {
    campaignMetricsResponse = await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds: customerLoginCustomerIds,
      query: [
        "SELECT",
        "  campaign.id,",
        "  campaign.name,",
        "  campaign.status,",
        "  campaign.advertising_channel_type,",
        "  campaign_budget.id,",
        "  campaign_budget.amount_micros,",
        "  metrics.impressions,",
        "  metrics.clicks,",
        "  metrics.conversions,",
        "  metrics.all_conversions,",
        "  metrics.conversions_value,",
        "  metrics.all_conversions_value,",
        "  metrics.cost_micros",
        "FROM campaign",
        "WHERE campaign.status != REMOVED",
        dateRange.googleCondition,
        "ORDER BY metrics.cost_micros DESC",
        `LIMIT ${GOOGLE_ADS_LIVE_CAMPAIGN_LIMIT}`,
      ].join(" "),
      label: `Google Ads live campaigns ${customerId}`,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch campaign metrics for ${customerId}.`);
  }

  try {
    adMetricsResponse = await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds: customerLoginCustomerIds,
      query: [
        "SELECT",
        "  ad_group_ad.ad.id,",
        "  ad_group_ad.ad.type,",
        "  ad_group_ad.status,",
        "  ad_group.id,",
        "  ad_group.name,",
        "  campaign.id,",
        "  campaign.name,",
        "  metrics.impressions,",
        "  metrics.clicks,",
        "  metrics.conversions,",
        "  metrics.all_conversions,",
        "  metrics.conversions_value,",
        "  metrics.all_conversions_value,",
        "  metrics.cost_micros",
        "FROM ad_group_ad",
        "WHERE ad_group_ad.status != REMOVED",
        "  AND campaign.status != REMOVED",
        dateRange.googleCondition,
        "ORDER BY metrics.cost_micros DESC",
        `LIMIT ${GOOGLE_ADS_LIVE_AD_LIMIT}`,
      ].join(" "),
      label: `Google Ads live ads ${customerId}`,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch ad metrics for ${customerId}.`);
  }

  try {
    dailySeries = await fetchGoogleAdsDailySeriesReport({
      customerId,
      tokenBundle,
      loginCustomerIds: customerLoginCustomerIds,
      dateRange,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch daily series for ${customerId}.`);
  }

  const metricCampaigns = (campaignMetricsResponse?.results || [])
    .map(normalizeGoogleAdsLiveCampaignMetricRow)
    .filter(Boolean);
  const ads = (adMetricsResponse?.results || [])
    .map(normalizeGoogleAdsLiveAdRow)
    .filter(Boolean)
    .filter((ad) => ad.spend > 0 || ad.impressions > 0 || ad.clicks > 0 || ad.conversions > 0)
    .sort((left, right) => right.spend - left.spend || left.name.localeCompare(right.name));
  const campaignMap = new Map();

  (Array.isArray(catalog?.campaigns) ? catalog.campaigns : [])
    .map(createGoogleAdsLiveCatalogCampaign)
    .filter(Boolean)
    .forEach((campaign) => {
      campaignMap.set(campaign.rawCampaignId, campaign);
    });

  metricCampaigns.forEach((campaign) => {
    const existing = campaignMap.get(campaign.rawCampaignId);
    campaignMap.set(campaign.rawCampaignId, mergeGoogleAdsLiveCampaign(existing, campaign));
  });

  const adCampaignAggregates = ads.reduce((acc, ad) => {
    const current = acc.get(ad.rawCampaignId) || {
      rawCampaignId: ad.rawCampaignId,
      name: ad.campaignName || `Campaign ${ad.rawCampaignId}`,
      status: ad.status === "paused" ? "stopped" : "active",
      channelType: "UNKNOWN",
      objective: "Google Ads",
      budgetId: "",
      dailyBudget: 0,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      allConversions: 0,
      conversionValue: 0,
      allConversionValue: 0,
    };

    current.spend += ad.spend;
    current.impressions += ad.impressions;
    current.clicks += ad.clicks;
    current.conversions += ad.conversions;
    current.allConversions += ad.allConversions;
    current.conversionValue += ad.conversionValue;
    current.allConversionValue += ad.allConversionValue;
    if (ad.status !== "paused") {
      current.status = "active";
    }
    acc.set(ad.rawCampaignId, current);
    return acc;
  }, new Map());

  adCampaignAggregates.forEach((campaign, campaignId) => {
    if (!campaignMap.has(campaignId)) {
      campaignMap.set(campaignId, buildGoogleAdsLiveCampaign(campaign, getGoogleAdsBudgetDayCount(dateRange)));
    }
  });

  const budgetDayCount = getGoogleAdsBudgetDayCount(dateRange);
  const campaigns = Array.from(campaignMap.values())
    .map((campaign) => buildGoogleAdsLiveCampaign(campaign, budgetDayCount))
    .sort((left, right) => right.spend - left.spend || left.name.localeCompare(right.name));
  const budgetKeys = new Set();
  const monthlyBudget = campaigns.reduce((acc, campaign) => {
    const dailyBudget = toNumber(campaign.dailyBudget);
    if (dailyBudget <= 0) return acc;

    const budgetKey = campaign.budgetId || `campaign:${campaign.rawCampaignId}`;
    if (budgetKeys.has(budgetKey)) return acc;
    budgetKeys.add(budgetKey);
    return acc + dailyBudget * budgetDayCount;
  }, 0);
  const fallbackSpend = campaigns.reduce((acc, campaign) => acc + campaign.spend, 0);
  const fallbackImpressions = campaigns.reduce((acc, campaign) => acc + campaign.impressions, 0);
  const fallbackClicks = campaigns.reduce((acc, campaign) => acc + campaign.clicks, 0);
  const fallbackConversions = campaigns.reduce((acc, campaign) => acc + campaign.conversions, 0);
  const fallbackAllConversions = campaigns.reduce((acc, campaign) => acc + toNumber(campaign.allConversions), 0);
  const fallbackConversionValue = campaigns.reduce((acc, campaign) => acc + campaign.conversionValue, 0);
  const fallbackAllConversionValue = campaigns.reduce((acc, campaign) => acc + toNumber(campaign.allConversionValue), 0);
  const spend = accountSummary ? toNumber(accountSummary.spend) : fallbackSpend;
  const impressions = accountSummary ? toNumber(accountSummary.impressions) : fallbackImpressions;
  const clicks = accountSummary ? toNumber(accountSummary.clicks) : fallbackClicks;
  const conversions = accountSummary ? toNumber(accountSummary.conversions) : fallbackConversions;
  const allConversions = accountSummary ? toNumber(accountSummary.allConversions) : fallbackAllConversions;
  const conversionValue = accountSummary ? toNumber(accountSummary.conversionValue) : fallbackConversionValue;
  const allConversionValue = accountSummary ? toNumber(accountSummary.allConversionValue) : fallbackAllConversionValue;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status !== "stopped").length;
  const dataStatus = errors.length ? (campaigns.length || ads.length ? "partial" : "error") : "ready";

  return {
    customerId,
    asset,
    dataStatus,
    dataError: errors.join(" | "),
    account: {
      name: asset?.name || `Google Ads ${customerId}`,
      status: activeCampaigns ? "active" : "paused",
      monthlyBudget: +monthlyBudget.toFixed(2),
      spend: +spend.toFixed(2),
      impressions,
      clicks,
      conversions: +conversions.toFixed(2),
      allConversions: +allConversions.toFixed(2),
      conversionValue: +conversionValue.toFixed(2),
      allConversionValue: +allConversionValue.toFixed(2),
      ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
      cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
      roas: spend ? +(conversionValue / spend).toFixed(2) : 0,
      currency: asset?.currency || "",
      timezone: asset?.timezone || "",
      series: dailySeries,
    },
    campaigns,
    ads,
  };
}

async function fetchGoogleAdsAccountSummary({ customerId, tokenBundle, loginCustomerIds, dateRange }) {
  const response = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: [
      "SELECT",
      "  metrics.impressions,",
      "  metrics.clicks,",
      "  metrics.conversions,",
      "  metrics.all_conversions,",
      "  metrics.conversions_value,",
      "  metrics.all_conversions_value,",
      "  metrics.cost_micros",
      "FROM customer",
      getGoogleAdsDateWhereClause(dateRange),
      "LIMIT 1",
    ].join(" "),
    label: `Google Ads account totals ${customerId}`,
  });

  return normalizeGoogleAdsAccountSummaryRow(response.results?.[0] || null);
}

async function fetchGoogleAdsDailySeriesReport({ customerId, tokenBundle, loginCustomerIds, dateRange }) {
  const response = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: [
      "SELECT",
      "  segments.date,",
      "  metrics.impressions,",
      "  metrics.clicks,",
      "  metrics.conversions,",
      "  metrics.all_conversions,",
      "  metrics.conversions_value,",
      "  metrics.all_conversions_value,",
      "  metrics.cost_micros",
      "FROM customer",
      getGoogleAdsDateWhereClause(dateRange),
      "ORDER BY segments.date ASC",
      "LIMIT 400",
    ].join(" "),
    label: `Google Ads daily series ${customerId}`,
  });

  return normalizeGoogleAdsDailySeriesRows(response.results || [], dateRange);
}

async function fetchGoogleAdsReportDetailForCustomer({ context, customerId, dateRange }) {
  if (!context?.connection) {
    throw new Error("Google Ads connection context is missing.");
  }

  const { connection, tokenBundle, loginCustomerIds } = context;
  const customerLoginCustomerIds = getGoogleAdsScopedLoginCustomerIds(connection, customerId, loginCustomerIds);
  assertGoogleAdsCustomerAccess(connection, customerId);

  const errors = [];
  const [deviceResult, geographyResult, keywordResult, impressionShareResult] = await Promise.allSettled([
    fetchGoogleAdsDeviceReport({ customerId, tokenBundle, loginCustomerIds: customerLoginCustomerIds, dateRange }),
    fetchGoogleAdsGeographyReport({ customerId, tokenBundle, loginCustomerIds: customerLoginCustomerIds, dateRange }),
    fetchGoogleAdsKeywordReport({ customerId, tokenBundle, loginCustomerIds: customerLoginCustomerIds, dateRange }),
    fetchGoogleAdsImpressionShareReport({ customerId, tokenBundle, loginCustomerIds: customerLoginCustomerIds, dateRange }),
  ]);

  if (deviceResult.status === "rejected") errors.push(deviceResult.reason?.message || "Could not fetch device performance.");
  if (geographyResult.status === "rejected") errors.push(geographyResult.reason?.message || "Could not fetch geographic performance.");
  if (keywordResult.status === "rejected") errors.push(keywordResult.reason?.message || "Could not fetch keyword performance.");
  if (impressionShareResult.status === "rejected") errors.push(impressionShareResult.reason?.message || "Could not fetch impression share performance.");

  return {
    customerId,
    dataStatus: errors.length ? "partial" : "ready",
    dataError: errors.join(" | "),
    devices: deviceResult.status === "fulfilled" ? deviceResult.value : [],
    geographies: geographyResult.status === "fulfilled" ? geographyResult.value : [],
    keywords: keywordResult.status === "fulfilled" ? keywordResult.value : [],
    impressionShare: impressionShareResult.status === "fulfilled" ? impressionShareResult.value : [],
    errors,
  };
}

async function fetchGoogleAdsDeviceReport({ customerId, tokenBundle, loginCustomerIds, dateRange }) {
  const response = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: [
      "SELECT",
      "  segments.device,",
      "  metrics.impressions,",
      "  metrics.clicks,",
      "  metrics.conversions,",
      "  metrics.all_conversions,",
      "  metrics.conversions_value,",
      "  metrics.all_conversions_value,",
      "  metrics.cost_micros",
      "FROM customer",
      "WHERE metrics.impressions > 0",
      dateRange.googleCondition,
      "ORDER BY metrics.impressions DESC",
      "LIMIT 10",
    ].join(" "),
    label: `Google Ads device report ${customerId}`,
  });

  return (response.results || []).map(normalizeGoogleAdsDeviceReportRow).filter(Boolean);
}

async function fetchGoogleAdsGeographyReport({ customerId, tokenBundle, loginCustomerIds, dateRange }) {
  const fetchRows = async (viewName, labelSuffix, extraConditions = []) => {
    const response = await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  segments.geo_target_most_specific_location,",
        "  segments.geo_target_country,",
        "  segments.geo_target_region,",
        "  segments.geo_target_city,",
        "  metrics.clicks,",
        "  metrics.conversions,",
        "  metrics.all_conversions,",
        "  metrics.conversions_value,",
        "  metrics.all_conversions_value,",
        "  metrics.cost_micros",
        `FROM ${viewName}`,
        "WHERE metrics.clicks > 0",
        ...extraConditions,
        dateRange.googleCondition,
        "ORDER BY metrics.clicks DESC",
        "LIMIT 50",
      ].join(" "),
      label: `Google Ads geography report ${labelSuffix} ${customerId}`,
    });

    return (response.results || []).map(normalizeGoogleAdsGeographyReportRow).filter(Boolean);
  };

  const fetchLocationViewRows = async () => {
    const response = await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  campaign_criterion.location.geo_target_constant,",
        "  metrics.clicks,",
        "  metrics.conversions,",
        "  metrics.all_conversions,",
        "  metrics.conversions_value,",
        "  metrics.all_conversions_value,",
        "  metrics.cost_micros",
        "FROM location_view",
        "WHERE campaign.status != REMOVED",
        "  AND metrics.clicks > 0",
        dateRange.googleCondition,
        "ORDER BY metrics.clicks DESC",
        "LIMIT 100",
      ].join(" "),
      label: `Google Ads geography report location-view ${customerId}`,
    });

    return (response.results || []).map(normalizeGoogleAdsLocationViewReportRow).filter(Boolean);
  };

  // Returns true when every row resolves to a country-level constant with no
  // region or city granularity — i.e. the API collapsed everything into one
  // country bucket, which happens when campaigns target a whole country and
  // geographic_view matches at the same coarse level.
  const isCountryLevelOnly = (rows) =>
    rows.length > 0 &&
    rows.every(
      (row) =>
        row.mostSpecificResource &&
        row.mostSpecificResource === row.countryResource &&
        !row.regionResource &&
        !row.cityResource
    );

  // user_location_view reports the PHYSICAL location of the user at click time —
  // it always provides city/municipality granularity regardless of campaign
  // targeting, so try it first.
  // geographic_view includes "location of interest" and collapses to country
  // level when the campaign targets a whole country (e.g. Greece), so it is
  // tried second and skipped if it only returns country-level rows.
  const attempts = [
    { viewName: "user_location_view", labelSuffix: "user-location", extraConditions: [] },
    { viewName: "geographic_view", labelSuffix: "geo-target", extraConditions: [] },
    { viewName: "campaign", labelSuffix: "campaign-segments", extraConditions: ["  AND campaign.status != REMOVED"] },
    { viewName: "customer", labelSuffix: "customer-segments", extraConditions: [] },
  ];
  const messages = [];
  let rows = [];
  let countryLevelFallback = []; // best country-level result in case nothing more granular is found

  for (const attempt of attempts) {
    try {
      const fetched = await fetchRows(attempt.viewName, attempt.labelSuffix, attempt.extraConditions);
      console.log(`[geo] ${attempt.viewName} returned ${fetched.length} rows for customer ${customerId}`);
      if (fetched.length && !isCountryLevelOnly(fetched)) {
        // Got municipality/city/region data — use it
        rows = fetched;
        break;
      } else if (fetched.length && !countryLevelFallback.length) {
        // Only country-level data so far — save as fallback and keep trying
        console.log(`[geo] ${attempt.viewName} is country-level only — continuing to next source`);
        countryLevelFallback = fetched;
      }
    } catch (error) {
      const msg = error.message || `Could not fetch ${attempt.labelSuffix} geography rows for ${customerId}.`;
      console.error(`[geo] ${attempt.viewName} failed for customer ${customerId}:`, msg);
      messages.push(msg);
    }
  }

  // If no granular rows were found, use the best country-level result we saw
  if (!rows.length && countryLevelFallback.length) {
    console.log(`[geo] using country-level fallback rows for customer ${customerId}`);
    rows = countryLevelFallback;
  }

  // Last resort: location_view shows the locations the advertiser targeted.
  // If campaigns target specific municipalities this will contain them.
  if (!rows.length) {
    try {
      rows = await fetchLocationViewRows();
      console.log(`[geo] location_view returned ${rows.length} rows for customer ${customerId}`);
    } catch (error) {
      const msg = error.message || `Could not fetch location-view geography rows for ${customerId}.`;
      console.error(`[geo] location_view failed for customer ${customerId}:`, msg);
      messages.push(msg);
    }
  }

  if (!rows.length && messages.length) {
    throw new Error(messages.join(" | "));
  }

  const names = await fetchGoogleAdsGeoTargetNames({
    customerId,
    tokenBundle,
    loginCustomerIds,
    resourceNames: Array.from(new Set(rows.flatMap((row) => [row.mostSpecificResource, row.cityResource, row.regionResource, row.countryResource]).filter(Boolean))),
  });

  return rows.map((row) => ({
    ...row,
    location: formatGoogleAdsLocationName(row, names),
  }));
}

async function fetchGoogleAdsKeywordReport({ customerId, tokenBundle, loginCustomerIds, dateRange }) {
  const response = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: [
      "SELECT",
      "  ad_group_criterion.keyword.text,",
      "  ad_group_criterion.keyword.match_type,",
      "  metrics.clicks,",
      "  metrics.impressions,",
      "  metrics.average_cpc,",
      "  metrics.ctr,",
      "  metrics.conversions,",
      "  metrics.all_conversions,",
      "  metrics.conversions_value,",
      "  metrics.all_conversions_value,",
      "  metrics.cost_micros",
      "FROM keyword_view",
      "WHERE ad_group_criterion.status != REMOVED",
      "  AND metrics.clicks > 0",
      dateRange.googleCondition,
      "ORDER BY metrics.clicks DESC",
      "LIMIT 10",
    ].join(" "),
    label: `Google Ads keyword report ${customerId}`,
  });

  return (response.results || []).map(normalizeGoogleAdsKeywordReportRow).filter(Boolean);
}

async function fetchGoogleAdsImpressionShareReport({ customerId, tokenBundle, loginCustomerIds, dateRange }) {
  const response = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: [
      "SELECT",
      "  segments.date,",
      "  metrics.search_impression_share,",
      "  metrics.search_budget_lost_impression_share",
      "FROM campaign",
      "WHERE campaign.status != REMOVED",
      "  AND campaign.advertising_channel_type = SEARCH",
      dateRange.googleCondition,
      "ORDER BY segments.date ASC",
      "LIMIT 500",
    ].join(" "),
    label: `Google Ads impression share report ${customerId}`,
  });

  const dateMap = new Map();
  (response.results || []).forEach((row) => {
    const date = String(row.segments?.date || "").trim();
    if (!date) return;
    const current = dateMap.get(date) || { date, searchImpressionShare: 0, searchBudgetLostImpressionShare: 0, count: 0 };
    current.searchImpressionShare += normalizeGoogleAdsRatioMetric(row.metrics?.searchImpressionShare);
    current.searchBudgetLostImpressionShare += normalizeGoogleAdsRatioMetric(row.metrics?.searchBudgetLostImpressionShare);
    current.count += 1;
    dateMap.set(date, current);
  });

  return Array.from(dateMap.values()).map((row) => ({
    date: row.date,
    label: row.date.slice(5),
    searchImpressionShare: row.count ? +(row.searchImpressionShare / row.count).toFixed(2) : 0,
    searchBudgetLostImpressionShare: row.count ? +(row.searchBudgetLostImpressionShare / row.count).toFixed(2) : 0,
  }));
}

async function fetchGoogleAdsGeoTargetNames({ customerId, tokenBundle, loginCustomerIds, resourceNames }) {
  if (!resourceNames.length) return new Map();

  const quoted = resourceNames.map((name) => `'${String(name).replaceAll("'", "\\'")}'`).join(", ");

  try {
    const response = await fetchGoogleAdsRowsWithLoginFallback({
      customerId,
      tokenBundle,
      loginCustomerIds,
      query: [
        "SELECT",
        "  geo_target_constant.resource_name,",
        "  geo_target_constant.name,",
        "  geo_target_constant.country_code,",
        "  geo_target_constant.target_type",
        "FROM geo_target_constant",
        `WHERE geo_target_constant.resource_name IN (${quoted})`,
        "LIMIT 500",
      ].join(" "),
      label: `Google Ads geo target names ${customerId}`,
    });

    return new Map((response.results || []).map((row) => [
      row.geoTargetConstant?.resourceName,
      {
        name: row.geoTargetConstant?.name || "",
        countryCode: row.geoTargetConstant?.countryCode || "",
        targetType: row.geoTargetConstant?.targetType || "",
      },
    ]));
  } catch (error) {
    return new Map();
  }
}

async function fetchMetaAdsLiveAccountReport({ context, adAccountId, dateRange }) {
  if (!context?.connection) {
    throw new Error("Meta Ads connection context is missing.");
  }

  const { connection, tokenBundle } = context;
  assertMetaAdAccountAccess(connection, adAccountId);

  const accessToken = tokenBundle.accessToken;
  const actId = `act_${adAccountId}`;
  const asset = connection.assets?.find((item) => sanitizeMetaAdAccountId(item.externalId) === adAccountId) || null;
  const metaDateParams = getMetaDateParams(dateRange);
  const errors = [];
  let accountDetails = null;
  let campaignRows = [];
  let campaignInsightRows = [];
  let adRows = [];
  let adInsightRows = [];
  let dailyInsightRows = [];

  try {
    accountDetails = await fetchJson(buildMetaGraphUrl(actId, {
      fields: "id,account_id,name,account_status,currency,timezone_name",
      access_token: accessToken,
    }), {}, `Meta ad account ${adAccountId}`);
  } catch (error) {
    errors.push(error.message || `Could not fetch Meta ad account ${adAccountId}.`);
  }

  try {
    campaignRows = await fetchMetaGraphPages(buildMetaGraphUrl(`${actId}/campaigns`, {
      fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget",
      limit: String(META_ADS_LIVE_CAMPAIGN_LIMIT),
      access_token: accessToken,
    }), `Meta campaigns ${adAccountId}`);
  } catch (error) {
    errors.push(error.message || `Could not fetch Meta campaigns for ${adAccountId}.`);
  }

  try {
    campaignInsightRows = await fetchMetaGraphPages(buildMetaGraphUrl(`${actId}/insights`, {
      fields: "campaign_id,campaign_name,reach,impressions,clicks,spend,actions,action_values,purchase_roas",
      level: "campaign",
      ...metaDateParams,
      limit: String(META_ADS_LIVE_CAMPAIGN_LIMIT),
      access_token: accessToken,
    }), `Meta campaign insights ${adAccountId}`);
  } catch (error) {
    errors.push(error.message || `Could not fetch Meta campaign insights for ${adAccountId}.`);
  }

  try {
    adRows = await fetchMetaAdRowsWithCreativePreview({
      actId,
      accessToken,
      adAccountId,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch Meta ads for ${adAccountId}.`);
  }

  try {
    adInsightRows = await fetchMetaGraphPages(buildMetaGraphUrl(`${actId}/insights`, {
      fields: "ad_id,ad_name,campaign_id,campaign_name,reach,impressions,clicks,spend,actions,action_values",
      level: "ad",
      ...metaDateParams,
      limit: String(META_ADS_LIVE_AD_LIMIT),
      access_token: accessToken,
    }), `Meta ad insights ${adAccountId}`);
  } catch (error) {
    errors.push(error.message || `Could not fetch Meta ad insights for ${adAccountId}.`);
  }

  try {
    dailyInsightRows = await fetchMetaGraphPages(buildMetaGraphUrl(`${actId}/insights`, {
      fields: "date_start,reach,impressions,clicks,spend,actions,action_values,purchase_roas",
      time_increment: "1",
      ...metaDateParams,
      limit: "400",
      access_token: accessToken,
    }), `Meta daily insights ${adAccountId}`);
  } catch (error) {
    errors.push(error.message || `Could not fetch Meta daily insights for ${adAccountId}.`);
  }

  const currency = accountDetails?.currency || asset?.currency || "";
  const timezone = accountDetails?.timezone_name || asset?.timezone || "";
  const campaignMap = new Map();

  campaignRows
    .map((row) => normalizeMetaCampaignRow(row, currency, dateRange))
    .filter(Boolean)
    .forEach((campaign) => {
      campaignMap.set(campaign.rawCampaignId, campaign);
    });

  campaignInsightRows
    .map(normalizeMetaCampaignInsightRow)
    .filter(Boolean)
    .forEach((campaign) => {
      const existing = campaignMap.get(campaign.rawCampaignId);
      campaignMap.set(campaign.rawCampaignId, mergeMetaLiveCampaign(existing, campaign));
    });

  const adStatusMap = new Map(
    adRows
      .map(normalizeMetaAdRow)
      .filter(Boolean)
      .map((ad) => [ad.rawAdId, ad])
  );
  const ads = adInsightRows
    .map((row) => normalizeMetaAdInsightRow(row, adStatusMap))
    .filter(Boolean)
    .filter((ad) => ad.spend > 0 || ad.impressions > 0 || ad.clicks > 0 || ad.conversions > 0)
    .sort((left, right) => right.spend - left.spend || left.name.localeCompare(right.name));

  const adCampaignAggregates = ads.reduce((acc, ad) => {
    const current = acc.get(ad.rawCampaignId) || {
      rawCampaignId: ad.rawCampaignId,
      name: ad.campaignName || `Campaign ${ad.rawCampaignId}`,
      status: ad.status === "paused" ? "stopped" : "active",
      objective: "Meta Ads",
      budget: 0,
      reach: 0,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
    };

    current.spend += ad.spend;
    current.reach += ad.reach;
    current.impressions += ad.impressions;
    current.clicks += ad.clicks;
    current.conversions += ad.conversions;
    current.conversionValue += ad.conversionValue;
    if (ad.status !== "paused") {
      current.status = "active";
    }
    acc.set(ad.rawCampaignId, current);
    return acc;
  }, new Map());

  adCampaignAggregates.forEach((campaign, campaignId) => {
    if (!campaignMap.has(campaignId)) {
      campaignMap.set(campaignId, buildMetaLiveCampaign(campaign));
    }
  });

  const campaigns = Array.from(campaignMap.values())
    .map(buildMetaLiveCampaign)
    .sort((left, right) => right.spend - left.spend || left.name.localeCompare(right.name));
  const monthlyBudget = campaigns.reduce((acc, campaign) => acc + toNumber(campaign.budget), 0);
  const spend = campaigns.reduce((acc, campaign) => acc + campaign.spend, 0);
  const impressions = campaigns.reduce((acc, campaign) => acc + campaign.impressions, 0);
  const clicks = campaigns.reduce((acc, campaign) => acc + campaign.clicks, 0);
  const reach = campaigns.reduce((acc, campaign) => acc + (campaign.reach || 0), 0);
  const conversions = campaigns.reduce((acc, campaign) => acc + campaign.conversions, 0);
  const conversionValue = campaigns.reduce((acc, campaign) => acc + campaign.conversionValue, 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status !== "stopped").length;
  const dataStatus = errors.length ? (campaigns.length || ads.length ? "partial" : "error") : "ready";
  const dailySeries = normalizeMetaDailySeriesRows(dailyInsightRows, dateRange);

  return {
    adAccountId,
    asset,
    dataStatus,
    dataError: errors.join(" | "),
    account: {
      name: accountDetails?.name || asset?.name || `Meta Ads ${adAccountId}`,
      status: mapMetaAccountStatus(accountDetails?.account_status, activeCampaigns),
      monthlyBudget: +monthlyBudget.toFixed(2),
      spend: +spend.toFixed(2),
      reach,
      impressions,
      clicks,
      conversions: +conversions.toFixed(2),
      conversionValue: +conversionValue.toFixed(2),
      ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
      cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
      roas: spend ? +(conversionValue / spend).toFixed(2) : 0,
      currency,
      timezone,
      series: dailySeries,
    },
    campaigns,
    ads,
  };
}

function getTikTokMetricValue(source, keys) {
  for (const key of keys) {
    if (source && source[key] != null && source[key] !== "") {
      return toNumber(source[key]);
    }
  }

  return 0;
}

async function fetchTikTokReportWithFallback({ accessToken, advertiserId, dataLevel, dimensionAttempts, dateRange, pageSize, label }) {
  const metricAttempts = [
    ["spend", "impressions", "clicks", "ctr", "cpc", "cpm", "conversions", "conversion_value"],
    ["spend", "impressions", "clicks", "ctr", "cpc", "cpm", "conversion", "conversion_value"],
    ["spend", "impressions", "clicks", "ctr", "cpc", "cpm", "conversions"],
    ["spend", "impressions", "clicks", "ctr", "cpc", "cpm", "conversion"],
    ["spend", "impressions", "clicks", "ctr", "cpc", "cpm"],
  ];
  let lastError = null;

  for (const dimensions of dimensionAttempts) {
    for (const metricNames of metricAttempts) {
      try {
        const report = await fetchTikTokIntegratedReport({
          accessToken,
          advertiserId,
          dataLevel,
          dimensions,
          metricNames,
          dateRange,
          pageSize,
          label,
        });

        return {
          ...report,
          dimensions,
          metricNames,
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error(`${label} could not be fetched.`);
}

async function fetchTikTokIntegratedReport({ accessToken, advertiserId, dataLevel, dimensions, metricNames, dateRange, pageSize, label }) {
  const rows = [];
  let totalMetrics = {};
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await fetchTikTokBusinessJson(buildTikTokBusinessUrl("/open_api/v1.3/report/integrated/get/", {
      advertiser_id: advertiserId,
      service_type: "AUCTION",
      report_type: "BASIC",
      data_level: dataLevel,
      dimensions: JSON.stringify(dimensions),
      metrics: JSON.stringify(metricNames),
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      page,
      page_size: pageSize,
      enable_total_metrics: "true",
      multi_adv_report_in_utc_time: "true",
    }), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Access-Token": accessToken,
      },
    }, `${label} page ${page}`);
    const pageRows = getTikTokResponseRows(payload);

    rows.push(...pageRows);
    if (!Object.keys(totalMetrics).length) {
      totalMetrics = getTikTokTotalMetrics(payload);
    }

    const pageInfo = getTikTokPageInfo(payload);
    totalPages = Math.max(
      1,
      toNumber(pageInfo?.total_page)
      || toNumber(pageInfo?.total_pages)
      || toNumber(pageInfo?.page_total)
      || toNumber(pageInfo?.total_page_number)
      || 1,
    );

    if (!pageRows.length || page >= totalPages) {
      break;
    }

    page += 1;
  }

  return {
    rows,
    totalMetrics,
  };
}

function buildTikTokLiveCampaign(campaign) {
  const spend = toNumber(campaign.spend);
  const impressions = Math.round(toNumber(campaign.impressions));
  const clicks = Math.round(toNumber(campaign.clicks));
  const conversions = toNumber(campaign.conversions);
  const conversionValue = toNumber(campaign.conversionValue);
  const budget = toNumber(campaign.budget);
  const reach = Math.round(toNumber(campaign.reach));

  return {
    rawCampaignId: campaign.rawCampaignId,
    name: campaign.name || `Campaign ${campaign.rawCampaignId}`,
    status: campaign.status || "active",
    objective: campaign.objective || "TikTok Ads",
    budget: +budget.toFixed(2),
    spend: +spend.toFixed(2),
    impressions,
    clicks,
    conversions: +conversions.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    reach,
    cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
    cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
  };
}

function normalizeTikTokCampaignReportRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const rawCampaignId = sanitizeTikTokAdvertiserId(row?.campaign_id || row?.campaignId || row?.campaign);
      if (!rawCampaignId) return null;

      const spend = getTikTokMetricValue(row, ["spend", "stat_cost", "cost"]);
      const impressions = getTikTokMetricValue(row, ["impressions", "show_cnt"]);
      const clicks = getTikTokMetricValue(row, ["clicks", "click_cnt"]);
      const conversions = getTikTokMetricValue(row, ["conversions", "conversion", "convert_cnt", "results"]);
      const conversionValue = getTikTokMetricValue(row, ["conversion_value", "total_conversion_value", "stat_pay_amount"]);
      const reach = getTikTokMetricValue(row, ["reach", "reach_cnt"]);

      return buildTikTokLiveCampaign({
        rawCampaignId,
        name: String(row?.campaign_name || row?.campaignName || `Campaign ${rawCampaignId}`).trim() || `Campaign ${rawCampaignId}`,
        status: "active",
        objective: String(row?.objective_type || row?.objective || "TikTok Ads").trim() || "TikTok Ads",
        budget: 0,
        spend,
        impressions,
        clicks,
        conversions,
        conversionValue,
        reach,
      });
    })
    .filter((campaign) => campaign && (campaign.spend > 0 || campaign.impressions > 0 || campaign.clicks > 0 || campaign.conversions > 0))
    .sort((left, right) => right.spend - left.spend || left.name.localeCompare(right.name));
}

function normalizeTikTokAdReportRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const rawAdId = sanitizeTikTokAdvertiserId(row?.ad_id || row?.adId || row?.ad);
      const rawCampaignId = sanitizeTikTokAdvertiserId(row?.campaign_id || row?.campaignId || row?.campaign);
      if (!rawAdId || !rawCampaignId) return null;

      const spend = getTikTokMetricValue(row, ["spend", "stat_cost", "cost"]);
      const impressions = getTikTokMetricValue(row, ["impressions", "show_cnt"]);
      const clicks = getTikTokMetricValue(row, ["clicks", "click_cnt"]);
      const conversions = getTikTokMetricValue(row, ["conversions", "conversion", "convert_cnt", "results"]);
      const conversionValue = getTikTokMetricValue(row, ["conversion_value", "total_conversion_value", "stat_pay_amount"]);
      const reach = getTikTokMetricValue(row, ["reach", "reach_cnt"]);

      return {
        rawAdId,
        rawCampaignId,
        campaignName: String(row?.campaign_name || row?.campaignName || `Campaign ${rawCampaignId}`).trim() || `Campaign ${rawCampaignId}`,
        name: String(row?.ad_name || row?.adName || `Ad ${rawAdId}`).trim() || `Ad ${rawAdId}`,
        format: String(row?.ad_format || row?.placement_type || row?.ad_type || "TikTok ad").trim() || "TikTok ad",
        status: "live",
        spend: +spend.toFixed(2),
        impressions: Math.round(impressions),
        clicks: Math.round(clicks),
        conversions: +conversions.toFixed(2),
        conversionValue: +conversionValue.toFixed(2),
        reach: Math.round(reach),
        ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      };
    })
    .filter((ad) => ad && (ad.spend > 0 || ad.impressions > 0 || ad.clicks > 0 || ad.conversions > 0))
    .sort((left, right) => right.spend - left.spend || left.name.localeCompare(right.name));
}

function normalizeTikTokDailySeriesRows(rows, dateRange) {
  const byDate = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const date = sanitizeIsoDate(row?.stat_time_day || row?.date || row?.stat_time_day_start || "");
    if (!date) return;

    const spend = getTikTokMetricValue(row, ["spend", "stat_cost", "cost"]);
    const impressions = getTikTokMetricValue(row, ["impressions", "show_cnt"]);
    const clicks = getTikTokMetricValue(row, ["clicks", "click_cnt"]);
    const conversions = getTikTokMetricValue(row, ["conversions", "conversion", "convert_cnt", "results"]);
    const conversionValue = getTikTokMetricValue(row, ["conversion_value", "total_conversion_value", "stat_pay_amount"]);

    byDate.set(date, {
      date,
      label: formatDailySeriesLabel(date),
      spend: +spend.toFixed(2),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      conversions: +conversions.toFixed(2),
      conversionValue: +conversionValue.toFixed(2),
      cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
      cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
      ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      roas: spend ? +(conversionValue / spend).toFixed(2) : 0,
      revenue: +conversionValue.toFixed(2),
    });
  });

  const dates = buildDailySeriesDates(dateRange);
  if (!dates.length) {
    return Array.from(byDate.values()).sort((left, right) => String(left.date).localeCompare(String(right.date)));
  }

  return dates.map((date) => byDate.get(date) || {
    date,
    label: formatDailySeriesLabel(date),
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    conversionValue: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    roas: 0,
    revenue: 0,
  });
}

function mapTikTokAccountStatus(spend, activeCampaigns) {
  return spend > 0 || activeCampaigns > 0 ? "active" : "paused";
}

async function fetchTikTokAdsLiveAdvertiserReport({ context, advertiserId, dateRange }) {
  if (!context?.connection) {
    throw new Error("TikTok Ads connection context is missing.");
  }

  const { connection, tokenBundle } = context;
  assertTikTokAdvertiserAccess(connection, advertiserId);

  const accessToken = tokenBundle.accessToken;
  const asset = connection.assets?.find((item) => sanitizeTikTokAdvertiserId(item.externalId) === advertiserId) || null;
  const errors = [];
  let advertiserInfo = null;
  let advertiserSummary = null;
  let campaignReport = null;
  let adReport = null;
  let dailyReport = null;

  try {
    const advertiserInfoPayload = await fetchTikTokBusinessJson(buildTikTokBusinessUrl("/open_api/v1.3/advertiser/info/", {
      advertiser_ids: JSON.stringify([advertiserId]),
    }), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Access-Token": accessToken,
      },
    }, `TikTok advertiser info ${advertiserId}`);
    advertiserInfo = getTikTokResponseRows(advertiserInfoPayload)[0] || null;
  } catch (error) {
    errors.push(error.message || `Could not fetch TikTok advertiser ${advertiserId}.`);
  }

  try {
    advertiserSummary = await fetchTikTokReportWithFallback({
      accessToken,
      advertiserId,
      dataLevel: "ADVERTISER",
      dimensionAttempts: [["advertiser_id"]],
      dateRange,
      pageSize: 10,
      label: `TikTok advertiser summary ${advertiserId}`,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch TikTok advertiser summary for ${advertiserId}.`);
  }

  try {
    campaignReport = await fetchTikTokReportWithFallback({
      accessToken,
      advertiserId,
      dataLevel: "CAMPAIGN",
      dimensionAttempts: [["campaign_id", "campaign_name"], ["campaign_id"]],
      dateRange,
      pageSize: TIKTOK_ADS_LIVE_CAMPAIGN_LIMIT,
      label: `TikTok campaigns ${advertiserId}`,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch TikTok campaigns for ${advertiserId}.`);
  }

  try {
    adReport = await fetchTikTokReportWithFallback({
      accessToken,
      advertiserId,
      dataLevel: "AD",
      dimensionAttempts: [["campaign_id", "campaign_name", "ad_id", "ad_name"], ["campaign_id", "ad_id", "ad_name"], ["campaign_id", "ad_id"]],
      dateRange,
      pageSize: TIKTOK_ADS_LIVE_AD_LIMIT,
      label: `TikTok ads ${advertiserId}`,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch TikTok ads for ${advertiserId}.`);
  }

  try {
    dailyReport = await fetchTikTokReportWithFallback({
      accessToken,
      advertiserId,
      dataLevel: "ADVERTISER",
      dimensionAttempts: [["stat_time_day"], ["date"]],
      dateRange,
      pageSize: 400,
      label: `TikTok daily summary ${advertiserId}`,
    });
  } catch (error) {
    errors.push(error.message || `Could not fetch TikTok daily trend for ${advertiserId}.`);
  }

  const ads = normalizeTikTokAdReportRows(adReport?.rows || []);
  const campaignMap = new Map(
    normalizeTikTokCampaignReportRows(campaignReport?.rows || [])
      .map((campaign) => [campaign.rawCampaignId, campaign])
  );
  const adCampaignAggregates = ads.reduce((acc, ad) => {
    const current = acc.get(ad.rawCampaignId) || {
      rawCampaignId: ad.rawCampaignId,
      name: ad.campaignName || `Campaign ${ad.rawCampaignId}`,
      status: "active",
      objective: "TikTok Ads",
      budget: 0,
      reach: 0,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
    };

    current.spend += ad.spend;
    current.reach += ad.reach;
    current.impressions += ad.impressions;
    current.clicks += ad.clicks;
    current.conversions += ad.conversions;
    current.conversionValue += ad.conversionValue;
    acc.set(ad.rawCampaignId, current);
    return acc;
  }, new Map());

  adCampaignAggregates.forEach((campaign, campaignId) => {
    if (!campaignMap.has(campaignId)) {
      campaignMap.set(campaignId, buildTikTokLiveCampaign(campaign));
    }
  });

  const campaigns = Array.from(campaignMap.values())
    .map(buildTikTokLiveCampaign)
    .sort((left, right) => right.spend - left.spend || left.name.localeCompare(right.name));
  const summarySource = Object.keys(advertiserSummary?.totalMetrics || {}).length
    ? advertiserSummary.totalMetrics
    : advertiserSummary?.rows?.[0] || {};
  const spend = Object.keys(summarySource).length
    ? getTikTokMetricValue(summarySource, ["spend", "stat_cost", "cost"])
    : campaigns.reduce((acc, campaign) => acc + campaign.spend, 0);
  const impressions = Object.keys(summarySource).length
    ? getTikTokMetricValue(summarySource, ["impressions", "show_cnt"])
    : campaigns.reduce((acc, campaign) => acc + campaign.impressions, 0);
  const clicks = Object.keys(summarySource).length
    ? getTikTokMetricValue(summarySource, ["clicks", "click_cnt"])
    : campaigns.reduce((acc, campaign) => acc + campaign.clicks, 0);
  const conversions = Object.keys(summarySource).length
    ? getTikTokMetricValue(summarySource, ["conversions", "conversion", "convert_cnt", "results"])
    : campaigns.reduce((acc, campaign) => acc + campaign.conversions, 0);
  const conversionValue = Object.keys(summarySource).length
    ? getTikTokMetricValue(summarySource, ["conversion_value", "total_conversion_value", "stat_pay_amount"])
    : campaigns.reduce((acc, campaign) => acc + campaign.conversionValue, 0);
  const reach = Object.keys(summarySource).length
    ? getTikTokMetricValue(summarySource, ["reach", "reach_cnt"])
    : campaigns.reduce((acc, campaign) => acc + (campaign.reach || 0), 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status !== "stopped").length;
  const dataStatus = errors.length ? (campaigns.length || ads.length || spend > 0 ? "partial" : "error") : "ready";
  const dailySeries = normalizeTikTokDailySeriesRows(dailyReport?.rows || [], dateRange);

  return {
    advertiserId,
    asset,
    dataStatus,
    dataError: errors.join(" | "),
    account: {
      name: advertiserInfo?.advertiser_name || advertiserInfo?.name || asset?.name || `TikTok Ads ${advertiserId}`,
      status: mapTikTokAccountStatus(spend, activeCampaigns),
      monthlyBudget: 0,
      spend: +spend.toFixed(2),
      reach: Math.round(reach),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      conversions: +conversions.toFixed(2),
      conversionValue: +conversionValue.toFixed(2),
      ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
      cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
      roas: spend ? +(conversionValue / spend).toFixed(2) : 0,
      currency: String(advertiserInfo?.currency || asset?.currency || "").trim(),
      timezone: String(advertiserInfo?.timezone || advertiserInfo?.timezone_name || asset?.timezone || "").trim(),
      series: dailySeries,
    },
    campaigns,
    ads,
  };
}

async function getGoogleAdsCatalogForCustomer({ connection, customerId, tokenBundle, loginCustomerIds, asset }) {
  const storedCatalog = connection.googleAdsCatalogs?.[customerId];
  if (storedCatalog?.campaigns?.length || storedCatalog?.adGroups?.length) {
    return storedCatalog;
  }

  if (asset?.type === "Manager account") {
    return null;
  }

  try {
    return await fetchGoogleAdsCustomerCatalog({
      customerId,
      tokenBundle,
      loginCustomerIds,
    });
  } catch (error) {
    return storedCatalog || null;
  }
}

function createGoogleAdsLiveCatalogCampaign(campaign) {
  const rawCampaignId = sanitizeGoogleAdsId(campaign?.id);
  if (!rawCampaignId) return null;

  return {
    rawCampaignId,
    name: campaign.name || `Campaign ${rawCampaignId}`,
    status: mapGoogleAdsCampaignStatus(campaign.status),
    channelType: String(campaign.channelType || "UNKNOWN"),
    objective: describeGoogleAdsChannelType(campaign.channelType),
    budgetId: "",
    dailyBudget: 0,
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    allConversions: 0,
    conversionValue: 0,
    allConversionValue: 0,
  };
}

function normalizeGoogleAdsLiveCampaignMetricRow(row) {
  const rawCampaignId = sanitizeGoogleAdsId(row.campaign?.id);
  if (!rawCampaignId) return null;

  return {
    rawCampaignId,
    name: row.campaign?.name || `Campaign ${rawCampaignId}`,
    status: mapGoogleAdsCampaignStatus(row.campaign?.status),
    channelType: String(row.campaign?.advertisingChannelType || "UNKNOWN"),
    objective: describeGoogleAdsChannelType(row.campaign?.advertisingChannelType),
    budgetId: sanitizeGoogleAdsId(row.campaignBudget?.id),
    dailyBudget: toNumber(row.campaignBudget?.amountMicros) / 1_000_000,
    spend: toNumber(row.metrics?.costMicros) / 1_000_000,
    impressions: toNumber(row.metrics?.impressions),
    clicks: toNumber(row.metrics?.clicks),
    conversions: toNumber(row.metrics?.conversions),
    allConversions: toNumber(row.metrics?.allConversions),
    conversionValue: normalizeGoogleAdsConversionValue(row.metrics?.conversionsValue),
    allConversionValue: normalizeGoogleAdsConversionValue(row.metrics?.allConversionsValue),
  };
}

function mergeGoogleAdsLiveCampaign(base, overlay) {
  if (!base) {
    return { ...overlay };
  }

  return {
    ...base,
    ...overlay,
    name: overlay.name || base.name,
    status: overlay.status || base.status,
    channelType: overlay.channelType || base.channelType,
    objective: overlay.objective || base.objective,
    budgetId: overlay.budgetId || base.budgetId,
    dailyBudget: toNumber(overlay.dailyBudget) || toNumber(base.dailyBudget),
    spend: toNumber(overlay.spend),
    impressions: toNumber(overlay.impressions),
    clicks: toNumber(overlay.clicks),
    conversions: toNumber(overlay.conversions),
    allConversions: toNumber(overlay.allConversions),
    conversionValue: toNumber(overlay.conversionValue),
    allConversionValue: toNumber(overlay.allConversionValue),
  };
}

function buildGoogleAdsLiveCampaign(campaign, budgetDayCount) {
  const spend = toNumber(campaign.spend);
  const impressions = toNumber(campaign.impressions);
  const clicks = toNumber(campaign.clicks);
  const conversions = toNumber(campaign.conversions);
  const allConversions = toNumber(campaign.allConversions);
  const conversionValue = toNumber(campaign.conversionValue);
  const allConversionValue = toNumber(campaign.allConversionValue);
  const dailyBudget = toNumber(campaign.dailyBudget);

  return {
    rawCampaignId: campaign.rawCampaignId,
    name: campaign.name || `Campaign ${campaign.rawCampaignId}`,
    status: campaign.status || "active",
    objective: campaign.objective || "Google Ads",
    channelType: campaign.channelType || "UNKNOWN",
    budgetId: campaign.budgetId || "",
    dailyBudget: +dailyBudget.toFixed(2),
    budget: +(dailyBudget * budgetDayCount).toFixed(2),
    spend: +spend.toFixed(2),
    impressions,
    clicks,
    conversions: +conversions.toFixed(2),
    allConversions: +allConversions.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    allConversionValue: +allConversionValue.toFixed(2),
    cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
    cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
  };
}

function normalizeGoogleAdsLiveAdRow(row) {
  const rawAdId = sanitizeGoogleAdsId(row.adGroupAd?.ad?.id);
  const rawCampaignId = sanitizeGoogleAdsId(row.campaign?.id);
  if (!rawAdId || !rawCampaignId) return null;

  const spend = toNumber(row.metrics?.costMicros) / 1_000_000;
  const impressions = toNumber(row.metrics?.impressions);
  const clicks = toNumber(row.metrics?.clicks);
  const conversions = toNumber(row.metrics?.conversions);
  const allConversions = toNumber(row.metrics?.allConversions);
  const conversionValue = normalizeGoogleAdsConversionValue(row.metrics?.conversionsValue);
  const allConversionValue = normalizeGoogleAdsConversionValue(row.metrics?.allConversionsValue);
  const format = describeGoogleAdsAdType(row.adGroupAd?.ad?.type);
  const adGroupName = row.adGroup?.name || "";
  const campaignName = row.campaign?.name || `Campaign ${rawCampaignId}`;

  return {
    rawAdId,
    rawCampaignId,
    campaignName,
    name: adGroupName ? `${format} | ${adGroupName}` : `${format} #${rawAdId}`,
    format,
    status: mapGoogleAdsAdStatus(row.adGroupAd?.status),
    spend: +spend.toFixed(2),
    impressions,
    clicks,
    conversions: +conversions.toFixed(2),
    allConversions: +allConversions.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    allConversionValue: +allConversionValue.toFixed(2),
    ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
  };
}

function formatGoogleAdsEnum(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeGoogleAdsDeviceReportRow(row) {
  const impressions = toNumber(row.metrics?.impressions);
  const clicks = toNumber(row.metrics?.clicks);
  const cost = toNumber(row.metrics?.costMicros) / 1_000_000;
  const conversions = toNumber(row.metrics?.conversions);
  const allConversions = toNumber(row.metrics?.allConversions);
  const conversionValue = normalizeGoogleAdsConversionValue(row.metrics?.conversionsValue);
  const allConversionValue = normalizeGoogleAdsConversionValue(row.metrics?.allConversionsValue);

  return {
    device: formatGoogleAdsEnum(row.segments?.device),
    impressions,
    clicks,
    ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
    cost: +cost.toFixed(2),
    conversions: +conversions.toFixed(2),
    allConversions: +allConversions.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    allConversionValue: +allConversionValue.toFixed(2),
  };
}

function normalizeGoogleAdsGeographyReportRow(row) {
  const clicks = toNumber(row.metrics?.clicks);
  const cost = toNumber(row.metrics?.costMicros) / 1_000_000;
  const conversions = toNumber(row.metrics?.conversions);
  const allConversions = toNumber(row.metrics?.allConversions);
  const conversionValue = normalizeGoogleAdsConversionValue(row.metrics?.conversionsValue);
  const allConversionValue = normalizeGoogleAdsConversionValue(row.metrics?.allConversionsValue);

  return {
    location: "",
    mostSpecificResource: row.segments?.geoTargetMostSpecificLocation || "",
    countryResource: row.segments?.geoTargetCountry || "",
    regionResource: row.segments?.geoTargetRegion || "",
    cityResource: row.segments?.geoTargetCity || "",
    clicks,
    conversions: +conversions.toFixed(2),
    allConversions: +allConversions.toFixed(2),
    cost: +cost.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    allConversionValue: +allConversionValue.toFixed(2),
    costPerConversion: conversions ? +(cost / conversions).toFixed(2) : 0,
  };
}

function normalizeGoogleAdsLocationViewReportRow(row) {
  const normalized = normalizeGoogleAdsGeographyReportRow(row);
  return {
    ...normalized,
    mostSpecificResource: row.campaignCriterion?.location?.geoTargetConstant || normalized.mostSpecificResource,
    countryResource: "",
    regionResource: "",
    cityResource: "",
    source: "location_view",
  };
}

function normalizeGoogleAdsKeywordReportRow(row) {
  const clicks = toNumber(row.metrics?.clicks);
  const impressions = toNumber(row.metrics?.impressions);
  const cost = toNumber(row.metrics?.costMicros) / 1_000_000;
  const conversions = toNumber(row.metrics?.conversions);
  const allConversions = toNumber(row.metrics?.allConversions);
  const conversionValue = normalizeGoogleAdsConversionValue(row.metrics?.conversionsValue);
  const allConversionValue = normalizeGoogleAdsConversionValue(row.metrics?.allConversionsValue);

  return {
    keyword: row.adGroupCriterion?.keyword?.text || "Keyword",
    matchType: formatGoogleAdsEnum(row.adGroupCriterion?.keyword?.matchType),
    clicks,
    impressions,
    averageCpc: toNumber(row.metrics?.averageCpc) / 1_000_000,
    ctr: toNumber(row.metrics?.ctr) * 100,
    cost: +cost.toFixed(2),
    conversions: +conversions.toFixed(2),
    allConversions: +allConversions.toFixed(2),
    costPerConversion: conversions ? +(cost / conversions).toFixed(2) : 0,
    valuePerConversion: conversions ? +(conversionValue / conversions).toFixed(2) : 0,
    conversionValue: +conversionValue.toFixed(2),
    allConversionValue: +allConversionValue.toFixed(2),
  };
}

function normalizeGoogleAdsConversionValue(value) {
  // Google Ads exposes metrics.conversions_value as a currency DOUBLE, unlike cost_micros.
  return toNumber(value);
}

function normalizeGoogleAdsAccountSummaryRow(row) {
  const spend = toNumber(row?.metrics?.costMicros) / 1_000_000;
  const impressions = toNumber(row?.metrics?.impressions);
  const clicks = toNumber(row?.metrics?.clicks);
  const conversions = toNumber(row?.metrics?.conversions);
  const allConversions = toNumber(row?.metrics?.allConversions);
  const conversionValue = normalizeGoogleAdsConversionValue(row?.metrics?.conversionsValue);
  const allConversionValue = normalizeGoogleAdsConversionValue(row?.metrics?.allConversionsValue);

  return {
    spend: +spend.toFixed(2),
    impressions,
    clicks,
    conversions: +conversions.toFixed(2),
    allConversions: +allConversions.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    allConversionValue: +allConversionValue.toFixed(2),
  };
}

function normalizeGoogleAdsRatioMetric(value) {
  const raw = toNumber(value);
  if (raw <= 0) return 0;
  return raw <= 1 ? raw * 100 : raw;
}

function formatGoogleAdsLocationName(row, names) {
  const specificName = names.get(row.mostSpecificResource)?.name || "";
  if (specificName) return specificName;

  const parts = [row.cityResource, row.regionResource, row.countryResource]
    .map((resourceName) => names.get(resourceName)?.name || "")
    .filter(Boolean);

  if (parts.length) return Array.from(new Set(parts)).join(", ");

  const fallback = row.mostSpecificResource || row.cityResource || row.regionResource || row.countryResource;
  return fallback ? `Geo target ${String(fallback).split("/").pop()}` : "Unknown location";
}

function normalizeLiveDateRange(payload = {}) {
  const requested = sanitizeGoogleAdsLiveDateRange(payload?.dateRange);

  if (requested === "CUSTOM") {
    const startDate = sanitizeIsoDate(payload?.startDate);
    const endDate = sanitizeIsoDate(payload?.endDate);

    if (startDate && endDate && startDate <= endDate) {
      return {
        id: "CUSTOM",
        startDate,
        endDate,
        googleCondition: `  AND segments.date BETWEEN '${startDate}' AND '${endDate}'`,
        dayCount: countInclusiveDays(startDate, endDate),
      };
    }
  }

  const fallbackId = requested === "CUSTOM" ? "THIS_MONTH" : requested;
  const window = getPresetDateWindow(fallbackId);

  return {
    id: fallbackId,
    startDate: window.startDate,
    endDate: window.endDate,
    googleCondition: `  AND segments.date DURING ${fallbackId}`,
    dayCount: getGoogleAdsBudgetDayCount(fallbackId),
  };
}

function getPreviousLiveDateRange(dateRange) {
  const startDate = sanitizeIsoDate(dateRange?.startDate);
  const endDate = sanitizeIsoDate(dateRange?.endDate);
  const dayCount = Math.max(1, Number(dateRange?.dayCount) || countInclusiveDays(startDate, endDate));
  const currentStart = new Date(`${startDate}T00:00:00Z`);
  const previousEnd = addUtcDays(currentStart, -1);
  const previousStart = addUtcDays(previousEnd, -(dayCount - 1));
  const previousStartDate = formatUtcDate(previousStart);
  const previousEndDate = formatUtcDate(previousEnd);

  return {
    id: "PREVIOUS_PERIOD",
    startDate: previousStartDate,
    endDate: previousEndDate,
    googleCondition: `  AND segments.date BETWEEN '${previousStartDate}' AND '${previousEndDate}'`,
    dayCount,
  };
}

function getGoogleAdsDateWhereClause(dateRange) {
  return String(dateRange?.googleCondition || "").replace(/^\s*AND\s+/i, "WHERE ");
}

function sanitizeGoogleAdsLiveDateRange(value) {
  const normalized = String(value || "THIS_MONTH").trim().toUpperCase();
  return GOOGLE_ADS_LIVE_ALLOWED_DATE_RANGES.has(normalized) ? normalized : "THIS_MONTH";
}

function sanitizeIsoDate(value) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";

  const date = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : normalized;
}

function countInclusiveDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function buildGa4ReportDateRange(dateRange) {
  const startDate = sanitizeIsoDate(dateRange?.startDate);
  const endDate = sanitizeIsoDate(dateRange?.endDate);
  const fallback = getPresetDateWindow(dateRange?.id || "THIS_MONTH");

  return {
    startDate: startDate || fallback.startDate,
    endDate: endDate || fallback.endDate,
  };
}

function getPresetDateWindow(dateRange) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let start = new Date(today);
  let end = new Date(today);

  switch (dateRange) {
    case "LAST_7_DAYS":
      start = addUtcDays(today, -6);
      break;
    case "LAST_30_DAYS":
      start = addUtcDays(today, -29);
      break;
    case "LAST_MONTH":
      start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      break;
    case "THIS_MONTH":
    default:
      start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      break;
  }

  return {
    startDate: formatUtcDate(start),
    endDate: formatUtcDate(end),
  };
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcDate(date) {
  return date.toISOString().slice(0, 10);
}

function getGoogleAdsBudgetDayCount(dateRange) {
  if (dateRange && typeof dateRange === "object") return dateRange.dayCount || 1;

  if (dateRange === "LAST_7_DAYS") return 7;
  if (dateRange === "LAST_30_DAYS") return 30;

  const now = new Date();
  if (dateRange === "LAST_MONTH") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).getUTCDate();
  }

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
}

function describeGoogleAdsChannelType(channelType) {
  const normalized = String(channelType || "UNKNOWN").trim().toUpperCase();
  if (normalized === "PERFORMANCE_MAX") return "Performance Max";
  if (normalized === "SEARCH") return "Search";
  if (normalized === "DISPLAY") return "Display";
  if (normalized === "VIDEO") return "Video";
  if (normalized === "SHOPPING") return "Shopping";
  if (normalized === "DEMAND_GEN") return "Demand Gen";
  if (normalized === "DISCOVERY") return "Discovery";
  if (normalized === "LOCAL") return "Local";
  return "Google Ads";
}

function describeGoogleAdsAdType(adType) {
  const normalized = String(adType || "UNKNOWN").trim().toUpperCase();
  if (normalized === "RESPONSIVE_SEARCH_AD") return "Responsive search ad";
  if (normalized === "RESPONSIVE_DISPLAY_AD") return "Responsive display ad";
  if (normalized === "EXPANDED_TEXT_AD") return "Expanded text ad";
  if (normalized === "TEXT_AD") return "Text ad";
  if (normalized === "IMAGE_AD") return "Image ad";
  if (normalized === "VIDEO_AD") return "Video ad";
  if (normalized === "SHOPPING_PRODUCT_AD") return "Shopping ad";
  if (normalized === "DEMAND_GEN_MULTI_ASSET_AD") return "Demand Gen ad";
  if (normalized === "APP_AD") return "App ad";
  return "Ad";
}

function mapGoogleAdsCampaignStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "PAUSED" || normalized === "REMOVED" ? "stopped" : "active";
}

function mapGoogleAdsAdStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "PAUSED" || normalized === "REMOVED" ? "paused" : "live";
}

async function getMetaAdsConnectionContext(connectionId) {
  const store = readStore();
  const connection = store.connections.find((item) => item.id === connectionId);

  if (!connection) {
    throw new Error("Connection not found.");
  }

  if (connection.platform !== "meta_ads") {
    throw new Error("This endpoint is only available for Meta Ads connections.");
  }

  const refreshedTokens = await ensureProviderToken("meta_ads", connection, connection.tokens);
  const tokenChanged = JSON.stringify(refreshedTokens || null) !== JSON.stringify(connection.tokens || null);
  const hydratedConnection = tokenChanged
    ? { ...connection, tokens: refreshedTokens, updatedAt: new Date().toISOString() }
    : connection;

  if (tokenChanged) {
    upsertConnection(hydratedConnection);
  }

  return {
    connection: hydratedConnection,
    tokenBundle: refreshedTokens,
  };
}

async function getTikTokAdsConnectionContext(connectionId) {
  const store = readStore();
  const connection = store.connections.find((item) => item.id === connectionId);

  if (!connection) {
    throw new Error("Connection not found.");
  }

  if (connection.platform !== "tiktok_ads") {
    throw new Error("This endpoint is only available for TikTok Ads connections.");
  }

  const refreshedTokens = await ensureProviderToken("tiktok_ads", connection, connection.tokens);
  const tokenChanged = JSON.stringify(refreshedTokens || null) !== JSON.stringify(connection.tokens || null);
  const hydratedConnection = tokenChanged
    ? { ...connection, tokens: refreshedTokens, updatedAt: new Date().toISOString() }
    : connection;

  if (tokenChanged) {
    upsertConnection(hydratedConnection);
  }

  return {
    connection: hydratedConnection,
    tokenBundle: refreshedTokens,
  };
}

async function getGa4ConnectionContext(connectionId) {
  const store = readStore();
  const connection = store.connections.find((item) => item.id === connectionId);

  if (!connection) {
    throw new Error("Connection not found.");
  }

  if (connection.platform !== "ga4") {
    throw new Error("This endpoint is only available for GA4 connections.");
  }

  const refreshedTokens = await ensureProviderToken("ga4", connection, connection.tokens);
  const tokenChanged = JSON.stringify(refreshedTokens || null) !== JSON.stringify(connection.tokens || null);
  const hydratedConnection = tokenChanged
    ? { ...connection, tokens: refreshedTokens, updatedAt: new Date().toISOString() }
    : connection;

  if (tokenChanged) {
    upsertConnection(hydratedConnection);
  }

  return {
    connection: hydratedConnection,
    tokenBundle: refreshedTokens,
  };
}

function assertMetaAdAccountAccess(connection, adAccountId) {
  const allowedAdAccountIds = new Set((connection.assets || []).map((asset) => sanitizeMetaAdAccountId(asset.externalId)).filter(Boolean));
  if (allowedAdAccountIds.size && !allowedAdAccountIds.has(adAccountId)) {
    throw new Error("This Meta ad account is not available under the selected connection.");
  }
}

function assertTikTokAdvertiserAccess(connection, advertiserId) {
  const allowedAdvertiserIds = new Set((connection.assets || []).map((asset) => sanitizeTikTokAdvertiserId(asset.externalId)).filter(Boolean));
  if (allowedAdvertiserIds.size && !allowedAdvertiserIds.has(advertiserId)) {
    throw new Error("This TikTok advertiser is not available under the selected connection.");
  }
}

function assertGa4PropertyAccess(connection, propertyId) {
  const allowedPropertyIds = new Set((connection.assets || []).map((asset) => sanitizeGoogleAdsId(asset.externalId)).filter(Boolean));
  if (allowedPropertyIds.size && !allowedPropertyIds.has(propertyId)) {
    throw new Error("This GA4 property is not available under the selected connection.");
  }
}

function buildMetaGraphUrl(pathname, params = {}) {
  const cleanPath = String(pathname || "").replace(/^\/+/, "");
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });

  return `https://graph.facebook.com/${META_API_VERSION}/${cleanPath}?${query.toString()}`;
}

function buildTikTokBusinessUrl(pathname, params = {}) {
  const cleanPath = String(pathname || "").replace(/^\/+/, "");
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });

  const serialized = query.toString();
  return `https://business-api.tiktok.com/${cleanPath}${serialized ? `?${serialized}` : ""}`;
}

async function fetchMetaGraphPages(initialUrl, label) {
  const rows = [];
  let nextUrl = initialUrl;

  while (nextUrl) {
    const page = await fetchJson(nextUrl, {}, label);
    rows.push(...(Array.isArray(page?.data) ? page.data : []));
    nextUrl = page?.paging?.next || "";
  }

  return rows;
}

function normalizeMetaCampaignRow(row, currency, dateRange) {
  const rawCampaignId = String(row?.id || "").trim();
  if (!rawCampaignId) return null;

  const dailyBudget = normalizeMetaBudgetAmount(row.daily_budget, currency);
  const lifetimeBudget = normalizeMetaBudgetAmount(row.lifetime_budget, currency);

  return {
    rawCampaignId,
    name: row.name || `Campaign ${rawCampaignId}`,
    status: mapMetaDeliveryStatus(row.effective_status || row.status),
    objective: describeMetaObjective(row.objective),
    budget: dailyBudget > 0 ? dailyBudget * getGoogleAdsBudgetDayCount(dateRange) : lifetimeBudget,
    reach: 0,
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    conversionValue: 0,
  };
}

function normalizeMetaCampaignInsightRow(row) {
  const rawCampaignId = String(row?.campaign_id || "").trim();
  if (!rawCampaignId) return null;

  const spend = toNumber(row.spend);
  const reach = toNumber(row.reach);
  const impressions = toNumber(row.impressions);
  const clicks = toNumber(row.clicks);
  const conversions = extractMetaConversionCount(row.actions);
  const conversionValue = extractMetaConversionValue(row.action_values, row.purchase_roas, spend);

  return {
    rawCampaignId,
    name: row.campaign_name || `Campaign ${rawCampaignId}`,
    status: "",
    objective: "Meta Ads",
    budget: 0,
    reach,
    spend,
    impressions,
    clicks,
    conversions,
    conversionValue,
  };
}

function mergeMetaLiveCampaign(base, overlay) {
  if (!base) {
    return { ...overlay };
  }

  return {
    ...base,
    ...overlay,
    name: overlay.name || base.name,
    status: overlay.status || base.status,
    objective: base.objective && base.objective !== "Meta Ads" ? base.objective : overlay.objective,
    budget: toNumber(base.budget) || toNumber(overlay.budget),
    reach: toNumber(overlay.reach) || toNumber(base.reach),
    spend: toNumber(overlay.spend),
    impressions: toNumber(overlay.impressions),
    clicks: toNumber(overlay.clicks),
    conversions: toNumber(overlay.conversions),
    conversionValue: toNumber(overlay.conversionValue),
  };
}

function buildMetaLiveCampaign(campaign) {
  const spend = toNumber(campaign.spend);
  const reach = toNumber(campaign.reach);
  const impressions = toNumber(campaign.impressions);
  const clicks = toNumber(campaign.clicks);
  const conversions = toNumber(campaign.conversions);
  const conversionValue = toNumber(campaign.conversionValue);
  const budget = toNumber(campaign.budget);

  return {
    rawCampaignId: campaign.rawCampaignId,
    name: campaign.name || `Campaign ${campaign.rawCampaignId}`,
    status: campaign.status || "active",
    objective: campaign.objective || "Meta Ads",
    budget: +budget.toFixed(2),
    spend: +spend.toFixed(2),
    reach,
    impressions,
    clicks,
    conversions: +conversions.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
    cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
  };
}

function normalizeMetaAdRow(row) {
  const rawAdId = String(row?.id || "").trim();
  if (!rawAdId) return null;

  const creative = row.creative && typeof row.creative === "object" ? row.creative : {};

  return {
    rawAdId,
    name: row.name || `Ad ${rawAdId}`,
    status: mapMetaAdStatus(row.effective_status || row.status),
    format: describeMetaCreativeFormat(creative.object_type),
    rawCampaignId: String(row.campaign?.id || "").trim(),
    campaignName: row.campaign?.name || "",
    previewImageUrl: pickMetaCreativePreviewImage(creative),
    previewHeadline: pickMetaCreativeHeadline(creative),
    previewBody: pickMetaCreativeBody(creative),
    previewCaption: pickMetaCreativeCaption(creative),
    previewCallToAction: pickMetaCreativeCallToAction(creative),
  };
}

function normalizeMetaAdInsightRow(row, adStatusMap) {
  const rawAdId = String(row?.ad_id || "").trim();
  const rawCampaignId = String(row?.campaign_id || "").trim();
  if (!rawAdId || !rawCampaignId) return null;

  const statusRecord = adStatusMap.get(rawAdId) || {};
  const spend = toNumber(row.spend);
  const reach = toNumber(row.reach);
  const impressions = toNumber(row.impressions);
  const clicks = toNumber(row.clicks);
  const conversions = extractMetaConversionCount(row.actions);
  const conversionValue = extractMetaConversionValue(row.action_values, null, spend);

  return {
    rawAdId,
    rawCampaignId,
    campaignName: row.campaign_name || statusRecord.campaignName || `Campaign ${rawCampaignId}`,
    name: row.ad_name || statusRecord.name || `Ad ${rawAdId}`,
    format: statusRecord.format || "Ad",
    status: statusRecord.status || "live",
    previewImageUrl: statusRecord.previewImageUrl || "",
    previewHeadline: statusRecord.previewHeadline || "",
    previewBody: statusRecord.previewBody || "",
    previewCaption: statusRecord.previewCaption || "",
    previewCallToAction: statusRecord.previewCallToAction || "",
    spend: +spend.toFixed(2),
    reach,
    impressions,
    clicks,
    conversions: +conversions.toFixed(2),
    conversionValue: +conversionValue.toFixed(2),
    ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
  };
}

function extractMetaConversionCount(actions) {
  const rows = Array.isArray(actions) ? actions : [];
  const purchaseCount = pickMetaActionMetric(rows, META_PURCHASE_ACTION_PRIORITY);
  if (purchaseCount > 0) return purchaseCount;

  return pickMetaActionMetric(rows, META_LEAD_ACTION_PRIORITY);
}

function extractMetaConversionValue(actionValues, purchaseRoas, spend) {
  const explicitValue = pickMetaActionMetric(Array.isArray(actionValues) ? actionValues : [], META_PURCHASE_ACTION_PRIORITY);

  if (explicitValue > 0) return explicitValue;

  const roasValue = Array.isArray(purchaseRoas) ? toNumber(purchaseRoas[0]?.value) : toNumber(purchaseRoas);
  return roasValue > 0 ? roasValue * toNumber(spend) : 0;
}

const META_PURCHASE_ACTION_PRIORITY = [
  "omni_purchase",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_web_purchase",
  "web_in_store_purchase",
  "catalog_segment_purchase",
];

const META_LEAD_ACTION_PRIORITY = [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "complete_registration",
  "submit_application",
  "schedule",
  "contact",
];

function pickMetaActionMetric(actions, priority) {
  const byType = (Array.isArray(actions) ? actions : []).reduce((acc, action) => {
    const type = String(action?.action_type || "").toLowerCase();
    if (!type) return acc;
    acc.set(type, (acc.get(type) || 0) + toNumber(action.value));
    return acc;
  }, new Map());

  for (const type of priority) {
    const value = byType.get(type);
    if (value > 0) return value;
  }

  for (const [type, value] of byType.entries()) {
    if (priority.some((candidate) => type.includes(candidate)) && value > 0) {
      return value;
    }
  }

  return 0;
}

function mapMetaDatePreset(dateRange) {
  const normalized = dateRange && typeof dateRange === "object" ? dateRange.id : dateRange;
  if (normalized === "LAST_7_DAYS") return "last_7d";
  if (normalized === "LAST_30_DAYS") return "last_30d";
  if (normalized === "LAST_MONTH") return "last_month";
  return "this_month";
}

function getMetaDateParams(dateRange) {
  if (dateRange?.id === "CUSTOM" && dateRange.startDate && dateRange.endDate) {
    return {
      time_range: JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      }),
    };
  }

  return { date_preset: mapMetaDatePreset(dateRange) };
}

function mapMetaAccountStatus(status, activeCampaigns) {
  if (Number(status) === 1) return "active";
  if (status == null || status === "") return activeCampaigns ? "active" : "paused";
  return "paused";
}

function mapMetaDeliveryStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized.includes("PAUSED") || normalized === "DELETED" || normalized === "ARCHIVED") return "stopped";
  if (normalized === "IN_PROCESS" || normalized === "PENDING_REVIEW") return "learning";
  return "active";
}

function mapMetaAdStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized.includes("PAUSED") || normalized === "DELETED" || normalized === "ARCHIVED") return "paused";
  if (normalized === "IN_PROCESS" || normalized === "PENDING_REVIEW") return "learning";
  return "live";
}

function describeMetaObjective(objective) {
  const normalized = String(objective || "").trim().toLowerCase();
  if (!normalized) return "Meta Ads";
  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function describeMetaCreativeFormat(objectType) {
  const normalized = String(objectType || "").trim().toUpperCase();
  if (normalized.includes("VIDEO")) return "Video";
  if (normalized.includes("CAROUSEL")) return "Carousel";
  if (normalized.includes("PHOTO") || normalized.includes("IMAGE")) return "Static";
  if (normalized.includes("SHARE")) return "Post";
  return "Ad";
}

function pickMetaCreativePreviewImage(creative) {
  const objectStorySpec = creative?.object_story_spec && typeof creative.object_story_spec === "object"
    ? creative.object_story_spec
    : {};
  const assetFeedSpec = creative?.asset_feed_spec && typeof creative.asset_feed_spec === "object"
    ? creative.asset_feed_spec
    : {};
  const linkData = objectStorySpec.link_data && typeof objectStorySpec.link_data === "object"
    ? objectStorySpec.link_data
    : {};
  const photoData = objectStorySpec.photo_data && typeof objectStorySpec.photo_data === "object"
    ? objectStorySpec.photo_data
    : {};
  const videoData = objectStorySpec.video_data && typeof objectStorySpec.video_data === "object"
    ? objectStorySpec.video_data
    : {};
  const templateData = objectStorySpec.template_data && typeof objectStorySpec.template_data === "object"
    ? objectStorySpec.template_data
    : {};
  const carouselChildren = Array.isArray(linkData.child_attachments) ? linkData.child_attachments : [];
  const assetImages = Array.isArray(assetFeedSpec.images) ? assetFeedSpec.images : [];
  const photoImages = Array.isArray(photoData.images) ? photoData.images : [];

  const candidates = [
    creative?.image_url,
    creative?.thumbnail_url,
    linkData.picture,
    photoData.image_url,
    photoImages[0]?.url,
    videoData.image_url,
    videoData.thumbnail_url,
    templateData.picture,
    carouselChildren[0]?.picture,
    assetImages[0]?.url,
  ];

  return candidates
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

function pickMetaCreativeHeadline(creative) {
  const objectStorySpec = creative?.object_story_spec && typeof creative.object_story_spec === "object"
    ? creative.object_story_spec
    : {};
  const linkData = objectStorySpec.link_data && typeof objectStorySpec.link_data === "object"
    ? objectStorySpec.link_data
    : {};
  const videoData = objectStorySpec.video_data && typeof objectStorySpec.video_data === "object"
    ? objectStorySpec.video_data
    : {};
  const templateData = objectStorySpec.template_data && typeof objectStorySpec.template_data === "object"
    ? objectStorySpec.template_data
    : {};

  return [
    linkData.name,
    templateData.name,
    videoData.title,
    creative?.title,
  ].map((value) => String(value || "").trim()).find(Boolean) || "";
}

function pickMetaCreativeBody(creative) {
  const objectStorySpec = creative?.object_story_spec && typeof creative.object_story_spec === "object"
    ? creative.object_story_spec
    : {};
  const linkData = objectStorySpec.link_data && typeof objectStorySpec.link_data === "object"
    ? objectStorySpec.link_data
    : {};
  const videoData = objectStorySpec.video_data && typeof objectStorySpec.video_data === "object"
    ? objectStorySpec.video_data
    : {};
  const templateData = objectStorySpec.template_data && typeof objectStorySpec.template_data === "object"
    ? objectStorySpec.template_data
    : {};

  return [
    linkData.message,
    templateData.message,
    videoData.message,
    creative?.body,
  ].map((value) => String(value || "").trim()).find(Boolean) || "";
}

function pickMetaCreativeCaption(creative) {
  const objectStorySpec = creative?.object_story_spec && typeof creative.object_story_spec === "object"
    ? creative.object_story_spec
    : {};
  const linkData = objectStorySpec.link_data && typeof objectStorySpec.link_data === "object"
    ? objectStorySpec.link_data
    : {};
  const templateData = objectStorySpec.template_data && typeof objectStorySpec.template_data === "object"
    ? objectStorySpec.template_data
    : {};

  return [
    linkData.caption,
    templateData.caption,
    linkData.link,
  ].map((value) => String(value || "").trim()).find(Boolean) || "";
}

function pickMetaCreativeCallToAction(creative) {
  const objectStorySpec = creative?.object_story_spec && typeof creative.object_story_spec === "object"
    ? creative.object_story_spec
    : {};
  const linkData = objectStorySpec.link_data && typeof objectStorySpec.link_data === "object"
    ? objectStorySpec.link_data
    : {};
  const videoData = objectStorySpec.video_data && typeof objectStorySpec.video_data === "object"
    ? objectStorySpec.video_data
    : {};
  const templateData = objectStorySpec.template_data && typeof objectStorySpec.template_data === "object"
    ? objectStorySpec.template_data
    : {};

  return [
    linkData.call_to_action?.type,
    templateData.call_to_action?.type,
    videoData.call_to_action?.type,
  ].map((value) => String(value || "").trim()).find(Boolean) || "";
}

function normalizeMetaBudgetAmount(value, currency = "") {
  const amount = toNumber(value);
  if (!amount) return 0;

  const zeroDecimalCurrencies = new Set([
    "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW",
    "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
  ]);

  return zeroDecimalCurrencies.has(String(currency || "").trim().toUpperCase()) ? amount : amount / 100;
}

async function getGoogleAdsConnectionContext(connectionId) {
  const store = readStore();
  const connection = store.connections.find((item) => item.id === connectionId);

  if (!connection) {
    throw new Error("Connection not found.");
  }

  if (connection.platform !== "google_ads") {
    throw new Error("This endpoint is only available for Google Ads connections.");
  }

  const refreshedTokens = await ensureProviderToken("google_ads", connection, connection.tokens);
  const tokenChanged = JSON.stringify(refreshedTokens || null) !== JSON.stringify(connection.tokens || null);
  const hydratedConnection = tokenChanged
    ? { ...connection, tokens: refreshedTokens, updatedAt: new Date().toISOString() }
    : connection;

  if (tokenChanged) {
    upsertConnection(hydratedConnection);
  }

  return {
    connection: hydratedConnection,
    headers: getGoogleAdsHeaders(refreshedTokens, hydratedConnection.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || hydratedConnection.externalId),
    tokenBundle: refreshedTokens,
    loginCustomerIds: getGoogleAdsLoginCustomerIds(hydratedConnection),
  };
}

function getGoogleAdsScopedLoginCustomerIds(connection, customerId, loginCustomerIds = []) {
  const normalizedCustomerId = sanitizeGoogleAdsId(customerId);
  const asset = (connection?.assets || []).find((item) => sanitizeGoogleAdsId(item.externalId) === normalizedCustomerId);

  return Array.from(new Set([
    sanitizeGoogleAdsId(asset?.parentManagerId),
    ...loginCustomerIds.map((value) => sanitizeGoogleAdsId(value)),
  ].filter(Boolean)));
}

function getGoogleAdsLoginCustomerIds(connection) {
  return Array.from(new Set([
    sanitizeGoogleAdsId(connection?.loginCustomerId),
    sanitizeGoogleAdsId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
    sanitizeGoogleAdsId(connection?.externalId),
    ...(connection?.assets || [])
      .filter((asset) => asset.type === "Manager account")
      .map((asset) => sanitizeGoogleAdsId(asset.externalId)),
  ].filter(Boolean)));
}

function getGoogleAdsHeaders(tokenBundle, loginCustomerId = "") {
  const headers = {
    Authorization: `Bearer ${tokenBundle.accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const normalizedLoginCustomerId = sanitizeGoogleAdsId(loginCustomerId);
  if (normalizedLoginCustomerId) {
    headers["login-customer-id"] = normalizedLoginCustomerId;
  }

  return headers;
}

async function fetchGoogleAdsRows({ customerId, headers, query, label }) {
  return fetchJson(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    },
    label,
  );
}

async function fetchGoogleAdsRowsWithLoginFallback({ customerId, tokenBundle, query, label, loginCustomerIds = [] }) {
  const candidates = ["", ...loginCustomerIds, customerId];
  const tried = new Set();
  let lastError = null;

  for (const candidate of candidates) {
    const normalizedLoginCustomerId = sanitizeGoogleAdsId(candidate);
    const cacheKey = normalizedLoginCustomerId || "__direct__";
    if (tried.has(cacheKey)) continue;
    tried.add(cacheKey);

    try {
      return await fetchGoogleAdsRows({
        customerId,
        headers: getGoogleAdsHeaders(tokenBundle, normalizedLoginCustomerId),
        query,
        label: normalizedLoginCustomerId ? `${label} via ${normalizedLoginCustomerId}` : label,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Google Ads lookup failed for customer ${customerId}.`);
}

async function fetchGoogleAdsCampaignDetails({ customerId, campaignId, tokenBundle, loginCustomerIds = [] }) {
  const response = await fetchGoogleAdsRowsWithLoginFallback({
    customerId,
    tokenBundle,
    loginCustomerIds,
    query: [
      "SELECT",
      "  campaign.id,",
      "  campaign.name,",
      "  campaign.status,",
      "  campaign.advertising_channel_type",
      "FROM campaign",
      `WHERE campaign.id = ${campaignId}`,
      "LIMIT 1",
    ].join(" "),
    label: `Google Ads campaign lookup ${customerId}/${campaignId}`,
  });

  const campaign = response.results?.[0]?.campaign;
  if (!campaign?.id) {
    throw new Error("Campaign not found.");
  }

  return {
    id: sanitizeGoogleAdsId(campaign.id) || campaignId,
    name: campaign.name || `Campaign ${campaignId}`,
    status: campaign.status || "UNKNOWN",
    channelType: campaign.advertisingChannelType || "UNKNOWN",
  };
}

function assertGoogleAdsCustomerAccess(connection, customerId) {
  const allowedCustomerIds = new Set((connection.assets || []).map((asset) => sanitizeGoogleAdsId(asset.externalId)).filter(Boolean));
  if (allowedCustomerIds.size && !allowedCustomerIds.has(customerId)) {
    throw new Error("This Google Ads customer is not available under the selected connection.");
  }
}

function getSearchTermTagFilters(searchParams) {
  const adGroupId = sanitizeGoogleAdsId(searchParams.get("adGroupId"));
  return {
    connectionId: String(searchParams.get("connectionId") || "").trim(),
    customerId: sanitizeGoogleAdsId(searchParams.get("customerId")),
    campaignId: sanitizeGoogleAdsId(searchParams.get("campaignId")),
    adGroupId,
    scopeLevel: normalizeSearchTermScopeLevel(searchParams.get("scopeLevel"), adGroupId),
  };
}

function listStoredSearchTermTags(filters = {}) {
  const store = readStore();
  return store.searchTermTags
    .filter((tag) => {
      if (filters.connectionId && tag.connectionId !== filters.connectionId) return false;
      if (filters.customerId && tag.customerId !== filters.customerId) return false;
      if (filters.campaignId && tag.campaignId !== filters.campaignId) return false;
      if (filters.scopeLevel && (tag.scopeLevel || "ad_group") !== filters.scopeLevel) return false;
      if (filters.adGroupId && tag.adGroupId !== filters.adGroupId) return false;
      return true;
    })
    .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""));
}

function buildStoredSearchTermTagLookup(tags) {
  return new Map(tags.map((tag) => [tag.normalizedSearchTerm, tag]));
}

function saveStoredSearchTermTag(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Expected a JSON object body." };
  }

  const connectionId = String(input.connectionId || "").trim();
  const customerId = sanitizeGoogleAdsId(input.customerId);
  const campaignId = sanitizeGoogleAdsId(input.campaignId);
  const adGroupId = sanitizeGoogleAdsId(input.adGroupId);
  const scopeLevel = normalizeSearchTermScopeLevel(input.scopeLevel, adGroupId);
  const searchTerm = String(input.searchTerm || "").trim().replace(/\s+/g, " ");
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
  const tag = normalizeSearchTermTag(input.tag);

  if (!connectionId || !customerId || !campaignId || !normalizedSearchTerm) {
    return { ok: false, error: "connectionId, customerId, campaignId and searchTerm are required." };
  }

  if (scopeLevel === "ad_group" && !adGroupId) {
    return { ok: false, error: "adGroupId is required when tagging ad-group search terms." };
  }

  if (input.tag != null && input.tag !== "" && !tag) {
    return { ok: false, error: "Tag must be good, bad, neutral or empty." };
  }

  const store = readStore();
  const key = buildSearchTermTagKey({ connectionId, customerId, campaignId, adGroupId: scopeLevel === "ad_group" ? adGroupId : "", scopeLevel, normalizedSearchTerm });
  const nextTags = store.searchTermTags.filter((entry) => entry.key !== key);

  if (!tag) {
    writeStore({ connections: store.connections, searchTermTags: nextTags });
    return {
      ok: true,
      removed: true,
      tag: null,
      tags: listStoredSearchTermTags({ connectionId, customerId, campaignId, adGroupId: scopeLevel === "ad_group" ? adGroupId : "", scopeLevel }),
    };
  }

  const entry = {
    key,
    connectionId,
    customerId,
    campaignId,
    adGroupId: scopeLevel === "ad_group" ? adGroupId : "",
    scopeLevel,
    searchTerm,
    normalizedSearchTerm,
    tag,
    updatedAt: new Date().toISOString(),
  };

  nextTags.push(entry);
  writeStore({ connections: store.connections, searchTermTags: nextTags });

  return {
    ok: true,
    removed: false,
    tag: entry,
    tags: listStoredSearchTermTags({ connectionId, customerId, campaignId, adGroupId: scopeLevel === "ad_group" ? adGroupId : "", scopeLevel }),
  };
}

function buildSearchTermTagKey({ connectionId, customerId, campaignId, adGroupId, scopeLevel, normalizedSearchTerm }) {
  return [connectionId, customerId, campaignId, scopeLevel || "ad_group", adGroupId || "", normalizedSearchTerm].join("::");
}

function normalizeSearchTerm(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeSearchTermTag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SEARCH_TERM_ALLOWED_TAGS.has(normalized) ? normalized : "";
}

function normalizeSearchTermScopeLevel(value, adGroupId = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (SEARCH_TERM_ALLOWED_SCOPE_LEVELS.has(normalized)) return normalized;
  return adGroupId ? "ad_group" : "campaign";
}

function sanitizeGoogleAdsId(value) {
  const normalized = String(value || "").replace(/\D/g, "");
  return normalized || "";
}

function sanitizeMetaAdAccountId(value) {
  const normalized = String(value || "").replace(/^act_/i, "").replace(/\D/g, "");
  return normalized || "";
}

function sanitizeTikTokAdvertiserId(value) {
  const normalized = String(value || "").replace(/\D/g, "");
  return normalized || "";
}

function sanitizeSearchTermDateRange(value) {
  const normalized = String(value || "LAST_30_DAYS").trim().toUpperCase();
  return SEARCH_TERM_ALLOWED_DATE_RANGES.has(normalized) ? normalized : "LAST_30_DAYS";
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTikTokResponseData(payload) {
  return payload?.data && typeof payload.data === "object" ? payload.data : payload;
}

function getTikTokResponseRows(payload) {
  const data = getTikTokResponseData(payload);

  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.stats_data)) return data.stats_data;
  if (Array.isArray(data?.advertiser_ids)) return data.advertiser_ids.map((advertiserId) => ({ advertiser_id: advertiserId }));
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.stats_data)) return payload.stats_data;
  return [];
}

function getTikTokPageInfo(payload) {
  const data = getTikTokResponseData(payload);
  return data?.page_info && typeof data.page_info === "object" ? data.page_info : {};
}

function getTikTokTotalMetrics(payload) {
  const data = getTikTokResponseData(payload);
  return data?.total_metrics && typeof data.total_metrics === "object" ? data.total_metrics : {};
}

async function fetchGoogleUser(accessToken) {
  return fetchJson("https://www.googleapis.com/oauth2/v2/userinfo", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  }, "Google user profile");
}

async function fetchJson(url, options = {}, label = "Request") {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${formatRemoteError(payload)}`);
  }

  return payload;
}

async function fetchTikTokBusinessJson(url, options = {}, label = "TikTok request") {
  const payload = await fetchJson(url, options, label);
  const code = toNumber(payload?.code);

  if (code && code !== 0) {
    throw new Error(`${label} failed: ${formatRemoteError(payload)}`);
  }

  return payload;
}

function formatRemoteError(payload) {
  if (!payload) return "No response body.";
  if (typeof payload === "string") return payload;
  if (payload.error?.message) return payload.error.message;
  if (payload.error_description) return payload.error_description;
  if (payload.code && payload.message) return `${payload.message} (code ${payload.code})`;
  if (payload.message) return payload.message;
  return JSON.stringify(payload);
}

function renderResultPage({ ok, platform, message, origin = "*", connectionId = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${ok ? "Connection complete" : "Connection failed"}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f4f1ea;
        color: #162218;
        font-family: "Segoe UI", sans-serif;
      }
      .card {
        width: min(92vw, 440px);
        padding: 28px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(22, 34, 24, 0.12);
        box-shadow: 0 24px 60px rgba(25, 36, 29, 0.12);
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 800;
        color: ${ok ? "#0f8f66" : "#d75d42"};
      }
      h1 {
        margin: 10px 0 0;
        font-size: 26px;
      }
      p {
        margin: 12px 0 0;
        line-height: 1.55;
        color: #536357;
      }
      button {
        margin-top: 18px;
        padding: 11px 14px;
        border-radius: 12px;
        border: none;
        background: #162218;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="eyebrow">${platform.replace("_", " ")}</div>
      <h1>${ok ? "Login synced" : "Connection stopped"}</h1>
      <p>${escapeHtml(message)}</p>
      <button onclick="window.close()">Close window</button>
    </div>
    <script>
      const payload = {
        source: "adpulse-oauth",
        ok: ${ok ? "true" : "false"},
        platform: ${JSON.stringify(platform)},
        connectionId: ${JSON.stringify(connectionId)},
        error: ${JSON.stringify(ok ? "" : message)}
      };

      if (window.opener) {
        try {
          window.opener.postMessage(payload, ${JSON.stringify(origin)});
        } catch (error) {
          window.opener.postMessage(payload, "*");
        }
      }

      setTimeout(() => window.close(), 1200);
    </script>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ── Setup Wizard helpers ──────────────────────────────────────

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function getSetupStatus() {
  const mask = (value) => (value ? "••••" + value.slice(-4) : "");
  return {
    configured: {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_ADS_DEVELOPER_TOKEN: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      META_APP_ID: !!process.env.META_APP_ID,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      TIKTOK_APP_ID: !!process.env.TIKTOK_APP_ID,
      TIKTOK_APP_SECRET: !!process.env.TIKTOK_APP_SECRET,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    },
    masked: {
      GOOGLE_CLIENT_ID: mask(process.env.GOOGLE_CLIENT_ID || ""),
      GOOGLE_CLIENT_SECRET: mask(process.env.GOOGLE_CLIENT_SECRET || ""),
      GOOGLE_ADS_DEVELOPER_TOKEN: mask(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ""),
      META_APP_ID: mask(process.env.META_APP_ID || ""),
      META_APP_SECRET: mask(process.env.META_APP_SECRET || ""),
      TIKTOK_APP_ID: mask(process.env.TIKTOK_APP_ID || ""),
      TIKTOK_APP_SECRET: mask(process.env.TIKTOK_APP_SECRET || ""),
      ANTHROPIC_API_KEY: mask(process.env.ANTHROPIC_API_KEY || ""),
      ANTHROPIC_STRATEGIST_MODEL: String(process.env.ANTHROPIC_STRATEGIST_MODEL || "").trim(),
    },
    allReady: !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.META_APP_ID &&
      process.env.META_APP_SECRET
    ),
  };
}

const ALLOWED_SETUP_KEYS = new Set([
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN",
  "META_APP_ID", "META_APP_SECRET", "META_CONFIG_ID", "META_API_VERSION",
  "TIKTOK_APP_ID", "TIKTOK_APP_SECRET",
  "ANTHROPIC_API_KEY", "ANTHROPIC_STRATEGIST_MODEL",
]);

function saveSetupCredentials(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Expected an object with credential keys." };
  }

  const ENV_FILE = path.join(__dirname, ".env.local");

  const existingMap = new Map();
  const orderedKeys = [];

  if (fs.existsSync(ENV_FILE)) {
    for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep < 0) continue;
      const key = trimmed.slice(0, sep).trim();
      existingMap.set(key, trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, ""));
      orderedKeys.push(key);
    }
  }

  let changed = 0;
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_SETUP_KEYS.has(key)) continue;
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    if (existingMap.get(key) !== trimmed) {
      existingMap.set(key, trimmed);
      if (!orderedKeys.includes(key)) orderedKeys.push(key);
      changed++;
    }
  }

  if (changed === 0) {
    return { ok: true, changed: 0, message: "No changes detected." };
  }

  const lines = [
    "# AdPulse OAuth credentials",
    "# Saved via Setup Wizard — " + new Date().toISOString(),
    "",
    ...orderedKeys.map((key) => `${key}=${existingMap.get(key)}`),
    "",
  ];
  fs.writeFileSync(ENV_FILE, lines.join("\n"), "utf8");

  for (const key of orderedKeys) {
    process.env[key] = existingMap.get(key);
  }

  return {
    ok: true,
    changed,
    message: `Saved ${changed} setting${changed === 1 ? "" : "s"}.`,
    status: getSetupStatus(),
  };
}

function getAiStrategistModel() {
  const configured = String(process.env.ANTHROPIC_STRATEGIST_MODEL || "").trim();
  return configured || DEFAULT_ANTHROPIC_STRATEGIST_MODEL;
}

function pruneAiStrategyCache() {
  const now = Date.now();

  for (const [key, entry] of aiStrategyCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      aiStrategyCache.delete(key);
    }
  }
}

function getAiStrategyCacheKey(payload) {
  return crypto.createHash("sha1").update(JSON.stringify(payload || {})).digest("hex");
}

function extractAnthropicStrategyInput(payload) {
  for (const block of payload?.content || []) {
    if (block?.type === "tool_use" && block.name === "record_adpulse_strategy" && block.input && typeof block.input === "object") {
      return block.input;
    }
  }

  const text = (payload?.content || [])
    .filter((block) => block?.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (text) {
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error("Claude AI strategist returned text instead of structured strategy JSON.");
    }
  }

  throw new Error("Claude AI strategist returned no structured output.");
}

function normalizeAiStrategyPayload(payload) {
  const recommendationDefaults = {
    title: "",
    area: "strategy",
    priority: "next",
    action: "",
    why: "",
    expectedImpact: "",
    confidence: "medium",
  };
  const keywordDefaults = {
    keyword: "",
    suggestedMatchType: "",
    why: "",
    priority: "next",
  };
  const experimentDefaults = {
    title: "",
    hypothesis: "",
    successMetric: "",
  };
  const budgetDefaults = {
    channel: "",
    direction: "",
    amountText: "",
    why: "",
    priority: "next",
  };

  return {
    strategySummary: String(payload?.strategySummary || "").trim(),
    performanceDiagnosis: String(payload?.performanceDiagnosis || "").trim(),
    nextBestAction: {
      ...recommendationDefaults,
      ...(payload?.nextBestAction || {}),
    },
    recommendations: Array.isArray(payload?.recommendations)
      ? payload.recommendations.map((item) => ({
          ...recommendationDefaults,
          ...(item || {}),
        }))
      : [],
    keywordOpportunities: Array.isArray(payload?.keywordOpportunities)
      ? payload.keywordOpportunities.map((item) => ({
          ...keywordDefaults,
          ...(item || {}),
        }))
      : [],
    negativeKeywordSuggestions: Array.isArray(payload?.negativeKeywordSuggestions)
      ? payload.negativeKeywordSuggestions.map((item) => ({
          ...keywordDefaults,
          ...(item || {}),
        }))
      : [],
    budgetActions: Array.isArray(payload?.budgetActions)
      ? payload.budgetActions.map((item) => ({
          ...budgetDefaults,
          ...(item || {}),
        }))
      : [],
    experiments: Array.isArray(payload?.experiments)
      ? payload.experiments.map((item) => ({
          ...experimentDefaults,
          ...(item || {}),
        }))
      : [],
    watchouts: Array.isArray(payload?.watchouts)
      ? payload.watchouts.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
}

async function generateAiStrategy(input) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("AI strategist is not configured. Add ANTHROPIC_API_KEY from the Connections screen.");
  }

  if (!input || typeof input !== "object") {
    throw new Error("AI strategist expected a JSON object.");
  }

  const scope = String(input.scope || "account").trim().toLowerCase() || "account";
  const context = input.context && typeof input.context === "object" ? input.context : {};
  const forceRefresh = !!input.forceRefresh;
  const cachePayload = { scope, context };

  pruneAiStrategyCache();
  const cacheKey = getAiStrategyCacheKey(cachePayload);
  const cached = aiStrategyCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.value,
      cached: true,
    };
  }

  const model = getAiStrategistModel();
  const systemPrompt = [
    "You are AdPulse Strategist, a senior paid media strategist.",
    "Write every user-facing string in Greek.",
    "Do not start with or include a general explanation of the campaign strategy.",
    "Focus only on what is wrong with the current state, why it matters, and the next steps.",
    "Recommend the single highest-leverage next action first, then short follow-up actions.",
    "Use only the supplied data. If evidence is missing, say so instead of inventing facts.",
    "Respect the stated client target, date range, and connected channels.",
    "Keep recommendations operational and specific.",
  ].join(" ");

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      performanceDiagnosis: {
        type: "string",
        description: "In Greek, summarize only what is wrong with the current account or search-term state. Do not explain the strategy.",
      },
      nextBestAction: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          area: {
            type: "string",
            enum: ["strategy", "budget", "keyword", "negative_keywords", "creative", "bidding", "audience", "landing_page", "measurement", "structure"],
          },
          priority: { type: "string", enum: ["now", "next", "later"] },
          action: { type: "string" },
          why: { type: "string" },
          expectedImpact: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["title", "area", "priority", "action", "why", "expectedImpact", "confidence"],
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            area: {
              type: "string",
              enum: ["strategy", "budget", "keyword", "negative_keywords", "creative", "bidding", "audience", "landing_page", "measurement", "structure"],
            },
            priority: { type: "string", enum: ["now", "next", "later"] },
            action: { type: "string" },
            why: { type: "string" },
            expectedImpact: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["title", "area", "priority", "action", "why", "expectedImpact", "confidence"],
        },
      },
      keywordOpportunities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            keyword: { type: "string" },
            suggestedMatchType: { type: "string" },
            why: { type: "string" },
            priority: { type: "string", enum: ["now", "next", "later"] },
          },
          required: ["keyword", "suggestedMatchType", "why", "priority"],
        },
      },
      negativeKeywordSuggestions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            keyword: { type: "string" },
            suggestedMatchType: { type: "string" },
            why: { type: "string" },
            priority: { type: "string", enum: ["now", "next", "later"] },
          },
          required: ["keyword", "suggestedMatchType", "why", "priority"],
        },
      },
      budgetActions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            channel: { type: "string" },
            direction: { type: "string" },
            amountText: { type: "string" },
            why: { type: "string" },
            priority: { type: "string", enum: ["now", "next", "later"] },
          },
          required: ["channel", "direction", "amountText", "why", "priority"],
        },
      },
      experiments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            hypothesis: { type: "string" },
            successMetric: { type: "string" },
          },
          required: ["title", "hypothesis", "successMetric"],
        },
      },
      watchouts: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "performanceDiagnosis",
      "nextBestAction",
      "recommendations",
      "keywordOpportunities",
      "negativeKeywordSuggestions",
      "budgetActions",
      "experiments",
      "watchouts",
    ],
  };

  const response = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this AdPulse ${scope} context. Reply in Greek. Do not explain the strategy. Identify what is wrong right now, what is limiting performance, and the highest-leverage next step plus short follow-ups. Ground every point in the supplied live data.`,
            },
            {
              type: "text",
              text: JSON.stringify(context, null, 2),
            },
          ],
        },
      ],
      tools: [
        {
          name: "record_adpulse_strategy",
          description: "Return the AdPulse strategy analysis using the exact structured schema. Every user-facing string value must be Greek.",
          input_schema: schema,
        },
      ],
      tool_choice: {
        type: "tool",
        name: "record_adpulse_strategy",
      },
    }),
  }, "Claude AI strategist");

  const parsed = extractAnthropicStrategyInput(response);
  const strategy = normalizeAiStrategyPayload(parsed);
  const payload = {
    ok: true,
    cached: false,
    model,
    generatedAt: new Date().toISOString(),
    strategy,
  };

  aiStrategyCache.set(cacheKey, {
    expiresAt: Date.now() + AI_STRATEGY_CACHE_TTL,
    value: payload,
  });

  return payload;
}
