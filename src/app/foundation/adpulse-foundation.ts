// AUTO-PORTED FROM adpulse-v5.jsx — UI-FIDELITY PORT
// React reference is the source of truth. Do not edit unless React source changes.
// @ts-nocheck
/* eslint-disable */

export const T = {
  bg: "#f4f1ea",
  bgSoft: "#fbf8f2",
  surface: "rgba(255, 255, 255, 0.78)",
  surfaceStrong: "#ffffff",
  surfaceMuted: "rgba(255, 255, 255, 0.56)",
  ink: "#162218",
  inkSoft: "#536357",
  inkMute: "#7c8a80",
  line: "rgba(22, 34, 24, 0.10)",
  lineStrong: "rgba(22, 34, 24, 0.16)",
  accent: "#0f8f66",
  accentSoft: "#dff5ea",
  coral: "#d75d42",
  coralSoft: "#fde9e4",
  amber: "#c79321",
  amberSoft: "#fff4d9",
  sky: "#2d6cdf",
  shadow: "0 18px 48px rgba(25, 36, 29, 0.10)",
  radius: 20,
  radiusSm: 14,
  font: "'Manrope', 'Segoe UI', sans-serif",
  heading: "'Space Grotesk', 'Manrope', sans-serif",
  mono: "'IBM Plex Mono', 'Consolas', monospace",
};

export const CLIENT_TARGET_OPTIONS = [
  "Awareness",
  "Reach",
  "Traffic",
  "Clicks",
  "Engagement",
  "Video Views",
  "Leads",
  "Conversions",
  "Sales",
  "ROAS",
  "App Installs",
  "Store Visits",
];

export const DEFAULT_CLIENT_TARGET = "Conversions";
export const LEGACY_CLIENT_TARGET_LABEL = "Live media account";

export function normalizeClientTarget(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === LEGACY_CLIENT_TARGET_LABEL.toLowerCase()) {
    return DEFAULT_CLIENT_TARGET;
  }

  const matched = CLIENT_TARGET_OPTIONS.find((option) => option.toLowerCase() === raw.toLowerCase());
  return matched || raw;
}

export function buildCalendarWindow(now = new Date()) {
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const spendDay = Math.min(now.getDate(), monthDays);
  const revenueDay = Math.max(1, spendDay - 1);
  const monthLabel = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const monthShort = now.toLocaleDateString("en-US", { month: "short" });
  const year = now.getFullYear();
  const lastYear = year - 1;

  return {
    monthLabel,
    monthDays,
    spendDay,
    revenueDay,
    spendProgress: spendDay / monthDays,
    revenueProgress: revenueDay / monthDays,
    spendRangeLabel: `${monthShort} 1-${spendDay}, ${year} pace window`,
    revenueRangeLabel: `${monthShort} 1-${revenueDay}, ${year} vs ${monthShort} 1-${revenueDay}, ${lastYear}`,
  };
}

export const CALENDAR = buildCalendarWindow();

export const PLATFORM_META = {
  google_ads: { label: "Google Ads", short: "G", color: "#4285F4", tint: "rgba(66, 133, 244, 0.10)" },
  meta_ads: { label: "Meta Ads", short: "M", color: "#1877F2", tint: "rgba(24, 119, 242, 0.10)" },
  tiktok_ads: { label: "TikTok Ads", short: "TT", color: "#FF0050", tint: "rgba(255, 0, 80, 0.10)" },
  ga4: { label: "Google Analytics", short: "GA", color: "#F57C00", tint: "rgba(245, 124, 0, 0.10)" },
};

export const CATEGORIES = [
  { key: "eshop", label: "E-shop", color: "#cf553e", tint: "rgba(207, 85, 62, 0.10)" },
  { key: "lead_gen", label: "Lead Gen", color: "#0f8f66", tint: "rgba(15, 143, 102, 0.10)" },
  { key: "b2b", label: "B2B", color: "#2d6cdf", tint: "rgba(45, 108, 223, 0.10)" },
  { key: "brand", label: "Brand", color: "#9966e8", tint: "rgba(153, 102, 232, 0.10)" },
];

export const USER_ROLE_META = {
  director: { label: "Director", color: "#162218", tint: "rgba(22, 34, 24, 0.10)" },
  account: { label: "Account", color: "#2d6cdf", tint: "rgba(45, 108, 223, 0.10)" },
};

export const USER_BLUEPRINTS = [
  { id: "usr-01", name: "Maria Papadaki", role: "director", title: "Performance Director", email: "director@adpulse.local", password: "demo123", accent: "#162218", accent2: "#2d6cdf" },
  { id: "usr-02", name: "Anna Kosta", role: "account", title: "Senior Account Manager", email: "anna@adpulse.local", password: "demo123", accent: "#0f8f66", accent2: "#78d1ad" },
  { id: "usr-03", name: "Nikos Lazos", role: "account", title: "Account Manager", email: "nikos@adpulse.local", password: "demo123", accent: "#2d6cdf", accent2: "#8db1ff" },
  { id: "usr-04", name: "Eleni Moraitou", role: "account", title: "Paid Media Manager", email: "eleni@adpulse.local", password: "demo123", accent: "#cf553e", accent2: "#f2b07c" },
  { id: "usr-05", name: "Kostas Marinis", role: "account", title: "Growth Account Manager", email: "kostas@adpulse.local", password: "demo123", accent: "#9966e8", accent2: "#c7a8ff" },
];

export const PROVIDER_PROFILE_BLUEPRINTS = [
  { id: "profile-google-core", platform: "google_ads", name: "AdPulse Google MCC", email: "mcc@adpulse.local", externalId: "MCC-458-221-3901", scopeLabel: "Manager account", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:48", note: "Primary Google Ads manager account for always-on clients." },
  { id: "profile-google-growth", platform: "google_ads", name: "Growth Google MCC", email: "growth-mcc@adpulse.local", externalId: "MCC-458-221-3902", scopeLabel: "Manager account", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:37", note: "Used for growth and e-commerce client groups." },
  { id: "profile-meta-core", platform: "meta_ads", name: "AdPulse Meta Business", email: "bm@adpulse.local", externalId: "BM-991-224-76", scopeLabel: "Business Manager", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:44", note: "Main Meta business for prospecting and retargeting stacks." },
  { id: "profile-meta-scale", platform: "meta_ads", name: "Scale Meta Business", email: "scale-bm@adpulse.local", externalId: "BM-991-224-77", scopeLabel: "Business Manager", status: "attention", lastSyncedAt: "Apr 15, 2026 12:58", note: "Secondary Meta profile for scale-up accounts." },
  { id: "profile-ga4-main", platform: "ga4", name: "Main GA4 Portfolio", email: "analytics@adpulse.local", externalId: "GA4-1582", scopeLabel: "Analytics portfolio", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:46", note: "Default GA4 property portfolio for reporting." },
  { id: "profile-ga4-commerce", platform: "ga4", name: "Commerce GA4 Portfolio", email: "commerce-analytics@adpulse.local", externalId: "GA4-2017", scopeLabel: "Analytics portfolio", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:29", note: "GA4 profile used for e-commerce revenue reporting." },
];

export const DEFAULT_ACCOUNT_USER_IDS = USER_BLUEPRINTS.filter((user) => user.role === "account").map((user) => user.id);
export const DEMO_USER_PASSWORD = "demo123";

export const STORAGE_KEYS = {
  session: "adpulse/session",
  users: "adpulse/users",
  clients: "adpulse/liveClients",
  providerProfiles: "adpulse/providerProfiles",
  aiStrategy: "adpulse/aiStrategy",
  aiStrategyChats: "adpulse/aiStrategyChats",
  analyticsCharts: "adpulse/analyticsCharts",
  reportSections: "adpulse/reportSections",
  reportPreset: "adpulse/reportPreset",
  reportSchedulePlans: "adpulse/reportSchedulePlans",
};

export const LEGACY_DEMO_CLIENT_STORAGE_KEY = "adpulse/clients";

export const SEARCH_TERM_DATE_RANGE_OPTIONS = [
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_14_DAYS", label: "Last 14 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

export const ACCOUNT_DATE_RANGE_OPTIONS = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "CUSTOM", label: "Custom range" },
];

export const REPORT_SECTION_OPTIONS = [
  { id: "cover", label: "Cover", description: "Client, window, target and headline KPIs." },
  { id: "executive_summary", label: "Executive summary", description: "Board-ready summary, concerns and focus areas." },
  { id: "strategist", label: "Claude strategist page", description: "Greek AI diagnosis and next steps when Claude is configured." },
  { id: "google_overview", label: "Google overview", description: "Google Ads KPIs, conversion trend and top campaign spend." },
  { id: "google_geo", label: "Google geography", description: "Geographic table when Google Ads grants access." },
  { id: "google_device", label: "Google devices", description: "Device chart and KPI table." },
  { id: "google_impression_share", label: "Google impression share", description: "Search IS and budget lost impression share." },
  { id: "google_campaigns", label: "Google campaign table", description: "Top Google campaign rows." },
  { id: "google_keywords", label: "Google keyword table", description: "Top keyword performance rows." },
  { id: "meta_overview", label: "Meta overview", description: "Meta KPIs, click trend and top campaign spend." },
  { id: "meta_campaigns", label: "Meta campaign table", description: "Top Meta campaign rows." },
  { id: "meta_ads", label: "Meta ad previews", description: "Meta ad-level performance with creative preview cards." },
  { id: "analytics", label: "GA4 analytics", description: "Live GA4 sessions, engagement, revenue/leads and traffic mix." },
  { id: "definitions", label: "Metric definitions", description: "Plain-English KPI definitions for the client." },
];

export const DEFAULT_REPORT_SECTION_IDS = REPORT_SECTION_OPTIONS
  .map((section) => section.id)
  .filter((id) => id !== "strategist");

export const REPORT_PRESETS = [
  {
    id: "full",
    label: "Full client report",
    description: "Everything needed for the monthly performance PDF.",
    sections: DEFAULT_REPORT_SECTION_IDS,
  },
  {
    id: "executive",
    label: "Executive only",
    description: "Short leadership version with KPIs, summary and definitions.",
    sections: ["cover", "executive_summary", "google_overview", "meta_overview", "analytics", "definitions"],
  },
  {
    id: "google_deep_dive",
    label: "Google deep dive",
    description: "Google Ads overview, diagnostics and detailed tables.",
    sections: ["cover", "executive_summary", "google_overview", "google_geo", "google_device", "google_impression_share", "google_campaigns", "google_keywords", "definitions"],
  },
  {
    id: "meta_deep_dive",
    label: "Meta deep dive",
    description: "Meta Ads overview, campaigns, ads and definitions.",
    sections: ["cover", "executive_summary", "meta_overview", "meta_campaigns", "meta_ads", "definitions"],
  },
  {
    id: "analytics_pack",
    label: "Analytics pack",
    description: "GA4 and channel context for measurement reviews.",
    sections: ["cover", "executive_summary", "analytics", "google_overview", "meta_overview", "definitions"],
  },
  {
    id: "strategist",
    label: "Strategist report",
    description: "Adds Claude diagnosis and next steps to the executive report.",
    sections: ["cover", "executive_summary", "strategist", "google_overview", "meta_overview", "analytics", "definitions"],
  },
];

export const DEFAULT_REPORT_SCHEDULE = {
  enabled: false,
  frequency: "monthly",
  weekday: "monday",
  dayOfMonth: "1",
  recipients: "",
  notes: "",
};

export const SEARCH_TERM_TAG_META = {
  good: { label: "Good", color: T.accent, tint: T.accentSoft, border: "rgba(15, 143, 102, 0.18)" },
  bad: { label: "Bad / irrelevant", color: T.coral, tint: T.coralSoft, border: "rgba(215, 93, 66, 0.18)" },
  neutral: { label: "Neutral", color: T.amber, tint: T.amberSoft, border: "rgba(199, 147, 33, 0.18)" },
  untagged: { label: "Untagged", color: T.inkSoft, tint: T.bgSoft, border: T.line },
};

export const SEARCH_TERM_ACTION_META = {
  keep: { label: "Keep", tone: "positive" },
  review: { label: "Review", tone: "warning" },
  consider_negative: { label: "Consider negative", tone: "danger" },
  add_negative: { label: "Add negative", tone: "danger" },
  needs_data: { label: "Needs data", tone: "neutral" },
  already_excluded: { label: "Already excluded", tone: "neutral" },
};

export const SEARCH_TERM_ACTION_SORT_ORDER = {
  add_negative: 0,
  consider_negative: 1,
  review: 2,
  needs_data: 3,
  keep: 4,
  already_excluded: 5,
};

export const SEARCH_TERM_SUGGESTION_STOPWORDS = new Set([
  "a", "an", "and", "are", "for", "from", "how", "into", "near", "not", "the", "this", "that", "with",
  "your", "you", "our", "out", "was", "were", "what", "when", "where", "why", "who",
  "και", "στη", "στο", "των", "τον", "την", "της", "στον", "στος", "στον", "για", "απο", "από",
  "πως", "πώς", "που", "πού", "ένα", "μια", "μία", "των", "τον", "των", "του", "της",
]);

export const KPI_LIBRARY = {
  spend: { label: "Spend", color: "#0f8f66", type: "currency" },
  clicks: { label: "Clicks", color: "#2d6cdf", type: "number" },
  conversions: { label: "Conversions", color: "#d75d42", type: "number" },
  conversionValue: { label: "Conv. Value", color: "#b86b22", type: "currency" },
  cpc: { label: "CPC", color: "#9966e8", type: "currency" },
  cpm: { label: "CPM", color: "#c79321", type: "currency" },
  roas: { label: "ROAS", color: "#1d5b4a", type: "ratio" },
  revenue: { label: "Revenue", color: "#cf553e", type: "currency" },
  sessions: { label: "Sessions", color: "#2a8fce", type: "number" },
  users: { label: "Users", color: "#6b7c3f", type: "number" },
};

export const CONNECTION_GUIDE = {
  google_ads: {
    title: "Login with Google",
    body: "Grant the Google Ads scope once and AdPulse will sync every accessible customer account under that login.",
  },
  meta_ads: {
    title: "Login with Meta",
    body: "Grant Meta ad account and business permissions, then sync every accessible ad account from that user access.",
  },
  tiktok_ads: {
    title: "Login with TikTok",
    body: "Grant TikTok advertiser access and AdPulse will sync every accessible advertiser account from that login.",
  },
  ga4: {
    title: "Login with Google",
    body: "Grant Analytics read access and AdPulse will import all visible GA4 accounts and properties.",
  },
};

export const ADDITIVE_METRICS = new Set(["spend", "clicks", "conversions", "conversionValue", "revenue", "sessions", "users"]);

export const ANALYTICS_CHART_PRESETS = [
  { id: "ga4-growth", label: "GA4 growth", scope: "ga4", metrics: ["sessions", "users"] },
  { id: "conversion-pulse", label: "Conversion pulse", scope: "ga4", metrics: ["conversions", "revenue"] },
  { id: "paid-efficiency", label: "Paid efficiency", scope: "client", metrics: ["spend", "conversionValue", "roas"] },
  { id: "traffic-to-sales", label: "Traffic to sales", scope: "client", metrics: ["clicks", "conversions", "revenue"] },
];

export const CLIENT_BLUEPRINTS = [];

export const GOOGLE_ACCOUNT_NAMES = ["Search Core", "Shopping", "Performance Max", "Brand Defense"];
export const META_ACCOUNT_NAMES = ["Prospecting", "Retargeting", "Creative Testing", "Catalog Sales"];
export const GOOGLE_CAMPAIGNS = ["Search Always On", "Brand Capture", "Performance Max", "Shopping Push"];
export const META_CAMPAIGNS = ["Prospecting", "Retargeting", "Advantage+", "Story Push"];
export const AD_NAMES = ["Hero Static", "Product Carousel", "Video Cutdown", "UGC Variant", "Offer Banner", "Collection Ad"];

export function hashSeed(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function seedUnit(seed, offset = 0) {
  const x = Math.sin(hashSeed(`${seed}-${offset}`)) * 10000;
  return x - Math.floor(x);
}

export function seededInt(seed, min, max, offset = 0) {
  return Math.round(min + seedUnit(seed, offset) * (max - min));
}

export function seededFloat(seed, min, max, offset = 0, decimals = 2) {
  return +(min + seedUnit(seed, offset) * (max - min)).toFixed(decimals);
}

export function formatNumber(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

export function formatCurrency(value) {
  return `EUR ${Math.round(value).toLocaleString()}`;
}

export function formatMetric(metricKey, value) {
  const spec = KPI_LIBRARY[metricKey];
  if (!spec) return formatNumber(value);
  if (spec.type === "currency") return `EUR ${value.toFixed(value >= 100 ? 0 : 2)}`;
  if (spec.type === "ratio") return `${value.toFixed(1)}x`;
  return formatNumber(value);
}

export function getConversionValue(item) {
  const value = Number(item?.conversionValue);
  if (Number.isFinite(value) && value > 0) return value;

  const spend = Number(item?.spend) || 0;
  const roas = Number(item?.roas) || 0;
  return spend > 0 && roas > 0 ? spend * roas : 0;
}

export function formatPercent(value, decimals = 2) {
  return `${Number(value || 0).toFixed(decimals)}%`;
}

export function toDateInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function getDefaultAccountDateRange() {
  const today = new Date();
  return {
    preset: "THIS_MONTH",
    startDate: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: toDateInputValue(today),
  };
}

export function isValidDateInput(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

export function isValidAccountDateRange(value) {
  if (value?.preset !== "CUSTOM") return true;
  return isValidDateInput(value.startDate) && isValidDateInput(value.endDate) && value.startDate <= value.endDate;
}

export function getAccountDateRangePayload(value) {
  if (value?.preset === "CUSTOM" && isValidAccountDateRange(value)) {
    return {
      dateRange: "CUSTOM",
      startDate: value.startDate,
      endDate: value.endDate,
    };
  }

  const preset = ACCOUNT_DATE_RANGE_OPTIONS.some((option) => option.value === value?.preset && option.value !== "CUSTOM")
    ? value.preset
    : "THIS_MONTH";

  return { dateRange: preset };
}

export function getAccountDateRangeLabel(value) {
  if (value?.preset === "CUSTOM") {
    return isValidAccountDateRange(value) ? `${value.startDate} - ${value.endDate}` : "Custom range";
  }

  return ACCOUNT_DATE_RANGE_OPTIONS.find((option) => option.value === value?.preset)?.label || "This month";
}

export function formatSearchTermStatus(status) {
  if (status === "ADDED") return "Added";
  if (status === "ADDED_EXCLUDED") return "Added excluded";
  if (status === "EXCLUDED") return "Excluded";
  if (status === "NONE") return "Not targeted";
  return String(status || "Unknown").replaceAll("_", " ").toLowerCase().replace(/^\w/, (match) => match.toUpperCase());
}

export function formatGoogleAdsEnum(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function normalizeSearchTermKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function buildSearchTermBenchmarks(rows) {
  const impressionValues = rows.map((row) => row.impressions || 0).filter((value) => value > 0);
  const clickValues = rows.map((row) => row.clicks || 0).filter((value) => value > 0);
  const ctrValues = rows.map((row) => row.ctr || 0).filter((value) => value > 0);
  const cpcValues = rows.map((row) => row.averageCpc || 0).filter((value) => value > 0);
  const costValues = rows.map((row) => row.cost || 0).filter((value) => value > 0);
  const convRateValues = rows
    .map((row) => ((row.clicks || 0) > 0 ? (row.conversions || 0) / row.clicks : 0))
    .filter((value) => value > 0);
  const costPerConversionValues = rows
    .map((row) => ((row.conversions || 0) > 0 ? (row.cost || 0) / row.conversions : 0))
    .filter((value) => value > 0);

  return {
    medianImpressions: percentile(impressionValues, 0.5),
    medianClicks: percentile(clickValues, 0.5),
    medianCtr: percentile(ctrValues, 0.5),
    medianCpc: percentile(cpcValues, 0.5),
    medianCost: percentile(costValues, 0.5),
    highCostThreshold: percentile(costValues, 0.75) || percentile(costValues, 0.5),
    medianConvRate: percentile(convRateValues, 0.5),
    medianCostPerConversion: percentile(costPerConversionValues, 0.5),
    averageCtr: average(ctrValues),
    averageCost: average(costValues),
  };
}

export function deriveSearchTermEvaluation(term, benchmarks, { isPerformanceMax = false } = {}) {
  const clicks = Number(term.clicks) || 0;
  const impressions = Number(term.impressions) || 0;
  const conversions = Number(term.conversions) || 0;
  const ctr = Number(term.ctr) || 0;
  const averageCpc = Number(term.averageCpc) || 0;
  const cost = Number(term.cost) || 0;
  const convRate = clicks > 0 ? conversions / clicks : 0;
  const costPerConversion = conversions > 0 ? cost / conversions : 0;
  const confidence = clampNumber(Math.max(clicks / 18, impressions / 350), 0.32, 1);

  let rawPerformance = 50;

  if (conversions > 0) {
    const convRateRatio = benchmarks.medianConvRate > 0 ? convRate / benchmarks.medianConvRate : 1 + Math.min(convRate * 6, 1);
    rawPerformance += clampNumber((convRateRatio - 1) * 24, -6, 24);

    if (benchmarks.medianCostPerConversion > 0 && costPerConversion > 0) {
      const cpaRatio = costPerConversion / benchmarks.medianCostPerConversion;
      rawPerformance += clampNumber((1 - cpaRatio) * 18, -14, 12);
    } else {
      rawPerformance += 10;
    }
  } else {
    if (benchmarks.highCostThreshold > 0 && cost > benchmarks.highCostThreshold) {
      rawPerformance -= 22;
    } else if (benchmarks.medianCost > 0 && cost > benchmarks.medianCost) {
      rawPerformance -= 14;
    }

    if (clicks >= 12) {
      rawPerformance -= 8;
    }
  }

  if (benchmarks.medianCtr > 0) {
    const ctrRatio = ctr / benchmarks.medianCtr;
    rawPerformance += clampNumber((ctrRatio - 1) * 14, -10, 12);
  }

  if (benchmarks.medianCpc > 0 && averageCpc > 0) {
    const cpcRatio = averageCpc / benchmarks.medianCpc;
    rawPerformance += clampNumber((1 - cpcRatio) * 12, -10, 8);
  }

  if (isPerformanceMax) {
    rawPerformance = 50 + (rawPerformance - 50) * 0.92 + (conversions > 0 ? 4 : 0);
  }

  const performanceScore = Math.round(clampNumber(50 + (rawPerformance - 50) * confidence, 0, 100));

  let relevanceRaw = 50;
  if (impressions > 0) {
    if (benchmarks.medianImpressions > 0) {
      const impressionRatio = impressions / benchmarks.medianImpressions;
      relevanceRaw += clampNumber(Math.log2(Math.max(impressionRatio, 0.05)) * 12, -12, 16);
    } else {
      relevanceRaw += clampNumber(impressions / 100 * 8, 0, 12);
    }
  } else {
    relevanceRaw -= 12;
  }

  if (clicks > 0) {
    if (benchmarks.medianClicks > 0) {
      const clickRatio = clicks / benchmarks.medianClicks;
      relevanceRaw += clampNumber(Math.log2(Math.max(clickRatio, 0.05)) * 14, -12, 18);
    } else {
      relevanceRaw += clampNumber(clicks / 8 * 12, 0, 16);
    }
  } else if (impressions >= (benchmarks.medianImpressions || 1)) {
    relevanceRaw -= 10;
  }

  if (benchmarks.medianCtr > 0 && ctr > 0) {
    const ctrRatio = ctr / benchmarks.medianCtr;
    relevanceRaw += clampNumber((ctrRatio - 1) * 24, -20, 24);
  } else if (ctr > 0) {
    relevanceRaw += clampNumber(ctr <= 1 ? ctr * 100 : ctr, 0, 16);
  }

  if (term.manualTag === "good") relevanceRaw += 22;
  if (term.manualTag === "bad") relevanceRaw -= 28;
  if (term.status === "ADDED") relevanceRaw += 6;
  if (term.status === "EXCLUDED" || term.status === "ADDED_EXCLUDED") relevanceRaw -= 18;

  const relevanceConfidence = clampNumber(Math.max(clicks / 8, impressions / 100), 0.45, 1);
  const relevanceScore = Math.round(clampNumber(50 + (relevanceRaw - 50) * relevanceConfidence, 0, 100));
  const negativeCandidate = !conversions
    && cost > 0
    && (
      (benchmarks.highCostThreshold > 0 && cost >= benchmarks.highCostThreshold)
      || clicks >= 12
      || (benchmarks.medianCost > 0 && cost >= benchmarks.medianCost && performanceScore <= 40)
    );

  let recommendedAction = "review";
  if (term.status === "EXCLUDED" || term.status === "ADDED_EXCLUDED") {
    recommendedAction = "already_excluded";
  } else if (term.manualTag === "bad") {
    recommendedAction = "add_negative";
  } else if (term.manualTag === "good" || (performanceScore >= 68 && relevanceScore >= 60) || (conversions > 0 && performanceScore >= 58)) {
    recommendedAction = "keep";
  } else if (term.manualTag === "neutral") {
    recommendedAction = "review";
  } else if (negativeCandidate && relevanceScore <= 48) {
    recommendedAction = "consider_negative";
  } else if (confidence < 0.45 && !term.manualTag) {
    recommendedAction = "needs_data";
  }

  return {
    performanceScore,
    relevanceScore,
    recommendedAction,
    dataConfidence: Math.round(confidence * 100),
    convRate,
    costPerConversion,
  };
}

export function deriveSearchTermAutoTag(term, rules) {
  const config = normalizeSearchTermRules("", rules);
  if (!config.autoTaggingEnabled) return "";
  if (term.status === "EXCLUDED" || term.status === "ADDED_EXCLUDED") return "";

  const clicks = Number(term.clicks) || 0;
  const conversions = Number(term.conversions) || 0;
  const cost = Number(term.cost) || 0;
  const costPerConversion = conversions > 0 ? cost / conversions : 0;

  const qualifiesAsGood = conversions >= config.goodMinConversions
    && (config.goodMaxCostPerConversion <= 0 || costPerConversion <= config.goodMaxCostPerConversion);
  if (qualifiesAsGood) return "good";

  const qualifiesAsBad = conversions <= 0
    && cost > 0
    && (
      (config.badNoConversionSpend > 0 && cost >= config.badNoConversionSpend)
      || (config.badNoConversionClicks > 0 && clicks >= config.badNoConversionClicks)
      || (config.badMaxRelevanceScore > 0 && term.relevanceScore <= config.badMaxRelevanceScore)
    );
  if (qualifiesAsBad) return "bad";

  if (config.neutralMinClicks > 0 && clicks >= config.neutralMinClicks) return "neutral";

  return "";
}

export function isInactiveSearchTerm(term) {
  return term.status === "EXCLUDED" || term.status === "ADDED_EXCLUDED";
}

export function matchesSearchTermStatusFilter(term, filter) {
  if (filter === "active") return !isInactiveSearchTerm(term);
  if (filter === "inactive") return isInactiveSearchTerm(term);
  return true;
}

export function sortSearchTermRows(rows, sort) {
  const direction = sort.direction === "asc" ? 1 : -1;
  const sorted = [...rows];

  sorted.sort((left, right) => {
    let result = 0;

    if (sort.key === "searchTerm") {
      result = left.searchTerm.localeCompare(right.searchTerm);
    } else if (sort.key === "keywordText") {
      result = (left.keywordText || "").localeCompare(right.keywordText || "");
    } else if (sort.key === "matchSource") {
      result = (left.matchSource || "").localeCompare(right.matchSource || "");
    } else if (sort.key === "matchType") {
      result = (left.matchType || "").localeCompare(right.matchType || "");
    } else if (sort.key === "recommendedAction") {
      result = (SEARCH_TERM_ACTION_SORT_ORDER[left.recommendedAction] ?? 999) - (SEARCH_TERM_ACTION_SORT_ORDER[right.recommendedAction] ?? 999);
    } else if (sort.key === "tag") {
      result = (left.effectiveTag || "").localeCompare(right.effectiveTag || "");
    } else {
      result = (Number(left[sort.key]) || 0) - (Number(right[sort.key]) || 0);
    }

    if (result === 0) {
      return left.searchTerm.localeCompare(right.searchTerm) * direction;
    }

    return result * direction;
  });

  return sorted;
}

export function extractSuggestedNegatives(rows) {
  const negativeTerms = rows.filter((row) => (
    row.effectiveTag === "bad"
      || (!row.effectiveTag && (row.recommendedAction === "add_negative" || row.recommendedAction === "consider_negative"))
  ));
  const goodTerms = rows.filter((row) => row.effectiveTag === "good" || row.recommendedAction === "keep");
  const goodWords = new Set(
    goodTerms.flatMap((row) => tokenizeNegativeCandidate(row.searchTerm)),
  );
  const suggestions = new Map();

  negativeTerms.forEach((row) => {
    tokenizeNegativeCandidate(row.searchTerm).forEach((word) => {
      if (goodWords.has(word)) return;
      const current = suggestions.get(word) || { word, termCount: 0, manualBadCount: 0, scoreCandidateCount: 0, wastedSpend: 0 };
      current.termCount += 1;
      if (row.manualTag === "bad") {
        current.manualBadCount += 1;
      } else {
        current.scoreCandidateCount += 1;
      }
      current.wastedSpend += row.cost || 0;
      suggestions.set(word, current);
    });
  });

  return [...suggestions.values()].sort((left, right) => {
    if (right.wastedSpend !== left.wastedSpend) return right.wastedSpend - left.wastedSpend;
    if (right.termCount !== left.termCount) return right.termCount - left.termCount;
    return left.word.localeCompare(right.word);
  });
}

export function getClientTargetMode(target) {
  const normalized = normalizeClientTarget(target).toLowerCase();

  if (normalized === "sales" || normalized === "roas") return "revenue";
  if (normalized === "conversions" || normalized === "leads" || normalized === "app installs" || normalized === "store visits") return "conversion";
  if (normalized === "traffic" || normalized === "clicks" || normalized === "engagement") return "traffic";
  return "awareness";
}

export function getSuggestedKeywordMatchType(target, searchTerm) {
  const targetMode = getClientTargetMode(target);
  const tokenCount = tokenizeNegativeCandidate(searchTerm).length;

  if (targetMode === "revenue" || targetMode === "conversion") return tokenCount >= 4 ? "Phrase" : "Exact";
  if (targetMode === "traffic") return tokenCount >= 4 ? "Broad" : "Phrase";
  return tokenCount >= 4 ? "Phrase" : "Broad";
}

export function buildKeywordOpportunityReason(candidate, target) {
  const targetMode = getClientTargetMode(target);

  if (targetMode === "revenue" || targetMode === "conversion") {
    if (candidate.conversions > 0) {
      return `${formatNumber(candidate.conversions)} conversion${candidate.conversions === 1 ? "" : "s"} from this query with ${candidate.costPerConversion > 0 ? formatCurrency(candidate.costPerConversion) : "efficient"} CPA and ${formatPercent(candidate.ctr)} CTR.`;
    }
    return `${formatNumber(candidate.clicks)} clicks and ${formatPercent(candidate.ctr)} CTR with ${candidate.performanceScore}/100 performance and ${candidate.relevanceScore}/100 relevance.`;
  }

  if (targetMode === "traffic") {
    return `${formatNumber(candidate.clicks)} clicks at ${formatMetric("cpc", candidate.averageCpc)} CPC with ${formatPercent(candidate.ctr)} CTR and ${candidate.relevanceScore}/100 relevance.`;
  }

  return `${formatNumber(candidate.impressions)} impressions with ${formatPercent(candidate.ctr)} CTR and ${candidate.relevanceScore}/100 audience relevance.`;
}

export function extractKeywordOpportunities(rows, benchmarks, clientTarget, rules) {
  const config = normalizeSearchTermRules("", rules);
  const targetMode = getClientTargetMode(clientTarget);
  const suggestions = new Map();
  const minClicks = Math.max(targetMode === "awareness" ? 8 : 6, Number(config.neutralMinClicks) || 0);
  const minCtr = Math.max(Number(benchmarks?.medianCtr) || 0, targetMode === "awareness" ? 3.2 : 2.2);

  rows.forEach((row) => {
    if (isInactiveSearchTerm(row)) return;
    if (row.effectiveTag === "bad" || row.manualTag === "bad") return;
    if (row.recommendedAction === "add_negative" || row.recommendedAction === "consider_negative") return;

    const normalizedTerm = normalizeSearchTermKey(row.searchTerm);
    const normalizedKeyword = normalizeSearchTermKey(row.keywordText || "");
    if (!normalizedTerm || normalizedTerm === normalizedKeyword) return;

    const clicks = Number(row.clicks) || 0;
    const impressions = Number(row.impressions) || 0;
    const conversions = Number(row.conversions) || 0;
    const ctr = Number(row.ctr) || 0;
    const performanceScore = Number(row.performanceScore) || 0;
    const relevanceScore = Number(row.relevanceScore) || 0;
    const averageCpc = Number(row.averageCpc) || 0;
    const cost = Number(row.cost) || 0;
    const costPerConversion = conversions > 0 ? cost / conversions : 0;
    const strongConversionFit = conversions >= Math.max(1, Number(config.goodMinConversions) || 1)
      && (config.goodMaxCostPerConversion <= 0 || costPerConversion <= config.goodMaxCostPerConversion * 1.15);
    const strongTrafficFit = clicks >= minClicks
      && ctr >= minCtr
      && relevanceScore >= (targetMode === "awareness" ? 70 : 66)
      && performanceScore >= (targetMode === "traffic" ? 62 : 68);
    const strongAwarenessFit = impressions >= Math.max(Number(benchmarks?.medianImpressions) || 0, 120)
      && ctr >= minCtr
      && relevanceScore >= 68;

    const qualifies = targetMode === "revenue"
      ? strongConversionFit || (conversions > 0 && performanceScore >= 60)
      : targetMode === "conversion"
        ? strongConversionFit || (conversions > 0 && relevanceScore >= 60)
        : targetMode === "traffic"
          ? strongTrafficFit
          : strongAwarenessFit || strongTrafficFit;

    if (!qualifies) return;

    let priorityScore = performanceScore + relevanceScore;
    if (targetMode === "revenue" || targetMode === "conversion") {
      priorityScore += conversions * 22;
      if (config.goodMaxCostPerConversion > 0 && costPerConversion > 0) {
        priorityScore += clampNumber((1 - costPerConversion / config.goodMaxCostPerConversion) * 18, -12, 18);
      }
    } else if (targetMode === "traffic") {
      priorityScore += clicks * 2 + ctr * 4;
      if (benchmarks?.medianCpc > 0 && averageCpc > 0) {
        priorityScore += clampNumber((1 - averageCpc / benchmarks.medianCpc) * 16, -12, 12);
      }
    } else {
      priorityScore += Math.min(impressions / 30, 24) + ctr * 4;
    }

    const current = suggestions.get(normalizedTerm) || {
      normalizedTerm,
      searchTerm: row.searchTerm,
      sourceKeywordText: row.keywordText || "",
      suggestedMatchType: getSuggestedKeywordMatchType(clientTarget, row.searchTerm),
      clicks: 0,
      impressions: 0,
      conversions: 0,
      cost: 0,
      weightedPerformance: 0,
      weightedRelevance: 0,
      weight: 0,
      priorityScore: -Infinity,
    };
    const weight = Math.max(clicks, 1);

    current.clicks += clicks;
    current.impressions += impressions;
    current.conversions += conversions;
    current.cost += cost;
    current.weightedPerformance += performanceScore * weight;
    current.weightedRelevance += relevanceScore * weight;
    current.weight += weight;

    if (priorityScore >= current.priorityScore) {
      current.priorityScore = priorityScore;
      current.searchTerm = row.searchTerm;
      current.sourceKeywordText = row.keywordText || current.sourceKeywordText;
      current.suggestedMatchType = getSuggestedKeywordMatchType(clientTarget, row.searchTerm);
      current.averageCpc = averageCpc;
      current.ctr = ctr;
    }

    suggestions.set(normalizedTerm, current);
  });

  return [...suggestions.values()]
    .map((candidate) => {
      const performanceScore = candidate.weight ? Math.round(candidate.weightedPerformance / candidate.weight) : 0;
      const relevanceScore = candidate.weight ? Math.round(candidate.weightedRelevance / candidate.weight) : 0;
      const ctr = candidate.impressions > 0 ? candidate.clicks / candidate.impressions * 100 : candidate.ctr || 0;
      const averageCpc = candidate.clicks > 0 ? candidate.cost / candidate.clicks : candidate.averageCpc || 0;
      const costPerConversion = candidate.conversions > 0 ? candidate.cost / candidate.conversions : 0;
      const priority = candidate.priorityScore >= 120 ? "High priority" : candidate.priorityScore >= 92 ? "Promising" : "Test";

      return {
        ...candidate,
        performanceScore,
        relevanceScore,
        ctr: +ctr.toFixed(2),
        averageCpc: +averageCpc.toFixed(2),
        costPerConversion: +costPerConversion.toFixed(2),
        priority,
        reason: buildKeywordOpportunityReason({
          ...candidate,
          performanceScore,
          relevanceScore,
          ctr,
          averageCpc,
          costPerConversion,
        }, clientTarget),
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore || right.conversions - left.conversions || right.clicks - left.clicks)
    .slice(0, 12);
}

export function roundBudgetSuggestionAmount(value) {
  if (value <= 0) return 0;
  if (value < 200) return Math.round(value / 25) * 25;
  if (value < 1000) return Math.round(value / 50) * 50;
  return Math.round(value / 100) * 100;
}

export function describeBudgetPerformance(summary, targetMode) {
  if (targetMode === "revenue") {
    return `${formatMetric("roas", summary.roas)} ROAS on ${formatCurrency(summary.spend)} spend`;
  }
  if (targetMode === "conversion") {
    return `${formatNumber(summary.conversions)} conversions at ${summary.costPerConversion > 0 ? formatCurrency(summary.costPerConversion) : "no CPA yet"}`;
  }
  if (targetMode === "traffic") {
    return `${formatNumber(summary.clicks)} clicks at ${formatMetric("cpc", summary.cpc)} CPC`;
  }
  return `${formatNumber(summary.impressions)} impressions at ${formatMetric("cpm", summary.cpm)} CPM`;
}

export function buildBudgetRecommendations(client) {
  const targetMode = getClientTargetMode(client.focus);
  const connectedPlatforms = ["google_ads", "meta_ads", "tiktok_ads"].filter((platform) => client.connections?.[platform] || (client.budgets?.[platform] || 0) > 0);
  const summaries = connectedPlatforms.map((platform) => {
    const accounts = (client.accounts || []).filter((account) => account.platform === platform);
    const budget = Number(client.budgets?.[platform]) || accounts.reduce((acc, account) => acc + (Number(account.monthlyBudget) || 0), 0);
    const spend = accounts.reduce((acc, account) => acc + (Number(account.spend) || 0), 0);
    const clicks = accounts.reduce((acc, account) => acc + (Number(account.clicks) || 0), 0);
    const impressions = accounts.reduce((acc, account) => acc + (Number(account.impressions) || 0), 0);
    const conversions = accounts.reduce((acc, account) => acc + (Number(account.conversions) || 0), 0);
    const conversionValue = accounts.reduce((acc, account) => acc + getConversionValue(account), 0);
    const paceTarget = Math.max(budget * CALENDAR.spendProgress, 1);
    const paceRatio = budget > 0 ? spend / paceTarget : 0;
    const roas = spend > 0 ? conversionValue / spend : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? spend / impressions * 1000 : 0;
    const ctr = impressions > 0 ? clicks / impressions * 100 : 0;
    const costPerConversion = conversions > 0 ? spend / conversions : 0;

    let efficiencyScore = 50;
    if (targetMode === "revenue") {
      efficiencyScore += clampNumber((roas - 2.5) * 14, -22, 26) + clampNumber(conversions * 1.8, 0, 16);
    } else if (targetMode === "conversion") {
      efficiencyScore += clampNumber(conversions * 2.1, 0, 22);
      if (costPerConversion > 0) efficiencyScore += clampNumber((30 - costPerConversion) * 0.9, -16, 18);
    } else if (targetMode === "traffic") {
      efficiencyScore += clampNumber(clicks / 12, 0, 18) + clampNumber((3.5 - cpc) * 6, -16, 16) + clampNumber((ctr - 2.5) * 6, -12, 16);
    } else {
      efficiencyScore += clampNumber(impressions / 1800, 0, 18) + clampNumber((4 - cpm) * 4, -14, 14) + clampNumber((ctr - 1.5) * 5, -10, 14);
    }

    return {
      platform,
      label: PLATFORM_META[platform]?.label || platform,
      budget,
      spend,
      clicks,
      impressions,
      conversions,
      conversionValue,
      roas: +roas.toFixed(2),
      cpc: +cpc.toFixed(2),
      cpm: +cpm.toFixed(2),
      ctr: +ctr.toFixed(2),
      costPerConversion: +costPerConversion.toFixed(2),
      paceRatio,
      efficiencyScore: clampNumber(efficiencyScore, 0, 100),
    };
  }).filter((summary) => summary.budget > 0 || summary.spend > 0);

  if (!summaries.length) return [];

  const recommendations = [];
  const sortedByEfficiency = [...summaries].sort((left, right) => right.efficiencyScore - left.efficiencyScore);
  const best = sortedByEfficiency[0];
  const weakest = sortedByEfficiency[sortedByEfficiency.length - 1];

  summaries.forEach((summary) => {
    if (summary.paceRatio < 0.82 && summary.efficiencyScore >= 62) {
      const amount = roundBudgetSuggestionAmount(Math.max(summary.budget * 0.1, client.totalBudget * 0.04));
      recommendations.push({
        id: `${summary.platform}-increase`,
        tone: "success",
        title: `Increase ${summary.label} by about ${formatCurrency(amount)}`,
        detail: `${summary.label} is under pace at ${Math.round(summary.paceRatio * 100)}% but still looks strong for ${client.focus}: ${describeBudgetPerformance(summary, targetMode)}.`,
      });
    }

    if (summary.paceRatio > 1.12 && summary.efficiencyScore <= 48) {
      const amount = roundBudgetSuggestionAmount(Math.max(summary.budget * 0.1, client.totalBudget * 0.04));
      recommendations.push({
        id: `${summary.platform}-decrease`,
        tone: "warning",
        title: `Trim ${summary.label} by about ${formatCurrency(amount)}`,
        detail: `${summary.label} is already at ${Math.round(summary.paceRatio * 100)}% of pace with softer efficiency for ${client.focus}: ${describeBudgetPerformance(summary, targetMode)}.`,
      });
    }
  });

  if (summaries.length >= 2 && best && weakest && best.platform !== weakest.platform) {
    const scoreGap = best.efficiencyScore - weakest.efficiencyScore;
    if (scoreGap >= 14 && weakest.budget > 0) {
      const amount = roundBudgetSuggestionAmount(Math.min(weakest.budget * 0.12, Math.max(client.totalBudget * 0.05, 250)));
      recommendations.unshift({
        id: `${weakest.platform}-to-${best.platform}`,
        tone: "info",
        title: `Shift about ${formatCurrency(amount)} from ${weakest.label} to ${best.label}`,
        detail: `${best.label} is the stronger channel for ${client.focus}: ${describeBudgetPerformance(best, targetMode)} versus ${describeBudgetPerformance(weakest, targetMode)}.`,
      });
    }
  }

  return recommendations
    .filter((recommendation, index, current) => current.findIndex((item) => item.id === recommendation.id) === index)
    .slice(0, 3);
}

export function getAiPriorityTone(priority) {
  if (priority === "now") return "warning";
  if (priority === "later") return "neutral";
  return "positive";
}

export function getAiPriorityLabel(priority) {
  if (priority === "now") return "Αμεσα";
  if (priority === "later") return "Αργοτερα";
  return "Επομενο";
}

export function getAiConfidenceLabel(confidence) {
  if (confidence === "high") return "Υψηλη βεβαιοτητα";
  if (confidence === "low") return "Χαμηλη βεβαιοτητα";
  return "Μεσαια βεβαιοτητα";
}

export function getAiAreaLabel(area) {
  const labels = {
    strategy: "Στρατηγικη",
    budget: "Budget",
    keyword: "Keywords",
    negative_keywords: "Negative keywords",
    creative: "Creative",
    bidding: "Bidding",
    audience: "Κοινο",
    landing_page: "Landing page",
    measurement: "Μετρηση",
    structure: "Δομη",
  };

  return labels[area] || "Στρατηγικη";
}

export function formatAiGeneratedAt(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return value;
  }
}

export function summarizeAiCampaign(campaign) {
  const spend = Number(campaign?.spend) || 0;
  const clicks = Number(campaign?.clicks) || 0;
  const impressions = Number(campaign?.impressions) || 0;
  const conversions = Number(campaign?.conversions) || 0;
  const conversionValue = getConversionValue(campaign);
  const ctr = impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : Number(campaign?.ctr) || 0;
  const cpc = clicks > 0 ? +(spend / clicks).toFixed(2) : Number(campaign?.cpc) || 0;
  const roas = spend > 0 ? +(conversionValue / spend).toFixed(2) : Number(campaign?.roas) || 0;
  const costPerConversion = conversions > 0 ? +(spend / conversions).toFixed(2) : 0;

  return {
    platform: campaign?.platform || "",
    name: campaign?.name || "Campaign",
    status: campaign?.status || "",
    objective: campaign?.objective || campaign?.channelType || "",
    spend,
    clicks,
    impressions,
    conversions,
    conversionValue,
    ctr,
    cpc,
    roas,
    costPerConversion,
  };
}

export function buildAccountAiPayload(client, dateRangeLabel) {
  const grouped = ["google_ads", "meta_ads", "tiktok_ads"].map((platform) => {
    const accounts = (client.accounts || []).filter((account) => account.platform === platform);
    const spend = accounts.reduce((acc, account) => acc + (Number(account.spend) || 0), 0);
    const clicks = accounts.reduce((acc, account) => acc + (Number(account.clicks) || 0), 0);
    const impressions = accounts.reduce((acc, account) => acc + (Number(account.impressions) || 0), 0);
    const conversions = accounts.reduce((acc, account) => acc + (Number(account.conversions) || 0), 0);
    const conversionValue = accounts.reduce((acc, account) => acc + getConversionValue(account), 0);
    const budget = Number(client.budgets?.[platform]) || 0;

    return {
      platform,
      label: PLATFORM_META[platform]?.label || platform,
      budget,
      spend,
      clicks,
      impressions,
      conversions,
      conversionValue,
      ctr: impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0,
      cpc: clicks > 0 ? +(spend / clicks).toFixed(2) : 0,
      roas: spend > 0 ? +(conversionValue / spend).toFixed(2) : 0,
      accountCount: accounts.length,
    };
  }).filter((item) => item.budget > 0 || item.spend > 0 || item.accountCount > 0);

  const campaigns = (client.campaigns || []).map(summarizeAiCampaign);
  const topCampaigns = [...campaigns]
    .sort((left, right) => right.spend - left.spend || right.conversions - left.conversions)
    .slice(0, 8);
  const concernCampaigns = [...campaigns]
    .filter((campaign) => campaign.spend > 0)
    .sort((left, right) => {
      const leftScore = (left.conversions > 0 ? left.conversions * 20 : 0) + left.roas * 10 - left.costPerConversion;
      const rightScore = (right.conversions > 0 ? right.conversions * 20 : 0) + right.roas * 10 - right.costPerConversion;
      return leftScore - rightScore || right.spend - left.spend;
    })
    .slice(0, 5);

  return {
    client: {
      id: client.id,
      name: client.name,
      target: normalizeClientTarget(client.focus),
      category: client.category,
      reportingGroup: client.reportingGroup || "Independent",
      dateRange: dateRangeLabel,
      totalBudget: Number(client.totalBudget) || 0,
      spend: Number(client.spend) || 0,
      impressions: Number(client.impressions) || 0,
      clicks: Number(client.clicks) || 0,
      conversions: Number(client.conversions) || 0,
      conversionValue: Number(client.conversionValue) || 0,
      roas: Number(client.roas) || 0,
      activeCampaigns: Number(client.activeCampaigns) || 0,
      stoppedCampaigns: Number(client.stoppedCampaigns) || 0,
      linkedAccounts: Number(client.accounts?.length) || 0,
    },
    channelSummary: grouped,
    healthFlags: (client.health?.flags || []).slice(0, 6).map((flag) => ({
      label: flag.label,
      detail: flag.detail,
      tone: flag.tone,
    })),
    topCampaigns,
    concernCampaigns,
    ga4: client.ga4
      ? {
          propertyName: client.ga4.propertyName,
          sessions: Number(client.ga4.sessions) || 0,
          users: Number(client.ga4.users) || 0,
          engagedRate: Number(client.ga4.engagedRate) || 0,
          conversionRate: Number(client.ga4.conversionRate) || 0,
          revenueCurrentPeriod: Number(client.ga4.revenueCurrentPeriod) || 0,
          purchasesOrLeads: Number(client.ga4.purchasesOrLeads) || 0,
          channels: client.ga4.channels || {},
          insight: client.ga4.insight || "",
        }
      : null,
  };
}

export function buildSearchTermsAiPayload({
  selectedClient,
  selectedAccount,
  selectedCampaign,
  selectedAdGroup,
  isPerformanceMax,
  dateRangeLabel,
  termStatusFilter,
  summary,
  benchmarks,
  autoTagRules,
  evaluatedTerms,
  suggestedNegatives,
}) {
  const activeTerms = evaluatedTerms.filter((term) => !isInactiveSearchTerm(term));
  const positiveTerms = [...activeTerms]
    .filter((term) => term.effectiveTag === "good" || term.recommendedAction === "keep")
    .sort((left, right) => (Number(right.conversions) || 0) - (Number(left.conversions) || 0) || (Number(right.clicks) || 0) - (Number(left.clicks) || 0))
    .slice(0, 10)
    .map((term) => ({
      searchTerm: term.searchTerm,
      keywordText: term.keywordText || "",
      matchType: term.matchType || "",
      clicks: Number(term.clicks) || 0,
      impressions: Number(term.impressions) || 0,
      conversions: Number(term.conversions) || 0,
      ctr: Number(term.ctr) || 0,
      averageCpc: Number(term.averageCpc) || 0,
      cost: Number(term.cost) || 0,
      performanceScore: Number(term.performanceScore) || 0,
      relevanceScore: Number(term.relevanceScore) || 0,
    }));
  const wasteTerms = [...evaluatedTerms]
    .filter((term) => term.effectiveTag === "bad" || term.recommendedAction === "add_negative" || term.recommendedAction === "consider_negative")
    .sort((left, right) => (Number(right.cost) || 0) - (Number(left.cost) || 0) || (Number(right.clicks) || 0) - (Number(left.clicks) || 0))
    .slice(0, 10)
    .map((term) => ({
      searchTerm: term.searchTerm,
      keywordText: term.keywordText || "",
      matchType: term.matchType || "",
      status: term.status || "",
      clicks: Number(term.clicks) || 0,
      impressions: Number(term.impressions) || 0,
      conversions: Number(term.conversions) || 0,
      ctr: Number(term.ctr) || 0,
      averageCpc: Number(term.averageCpc) || 0,
      cost: Number(term.cost) || 0,
      performanceScore: Number(term.performanceScore) || 0,
      relevanceScore: Number(term.relevanceScore) || 0,
      action: term.recommendedAction || "",
      effectiveTag: term.effectiveTag || "",
    }));

  return {
    client: {
      id: selectedClient?.id || "",
      name: selectedClient?.name || "",
      target: normalizeClientTarget(selectedClient?.focus),
      category: selectedClient?.category || "",
      reportingGroup: selectedClient?.reportingGroup || "Independent",
    },
    slice: {
      accountName: selectedAccount?.name || "",
      accountExternalId: selectedAccount?.externalId || "",
      campaignName: selectedCampaign?.name || "",
      campaignType: selectedCampaign?.channelType || "",
      reviewLevel: isPerformanceMax ? "campaign" : "ad_group",
      adGroupName: isPerformanceMax ? "" : selectedAdGroup?.name || "",
      dateRange: dateRangeLabel,
      statusFilter: termStatusFilter,
    },
    summary: {
      totalTerms: Number(summary?.totalTerms) || 0,
      activeTerms: Number(summary?.activeTerms) || 0,
      inactiveTerms: Number(summary?.inactiveTerms) || 0,
      goodCount: Number(summary?.goodCount) || 0,
      badCount: Number(summary?.badCount) || 0,
      neutralCount: Number(summary?.neutralCount) || 0,
      untaggedCount: Number(summary?.untaggedCount) || 0,
      averagePerformanceScore: Number(summary?.averagePerformanceScore) || 0,
      averageRelevanceScore: Number(summary?.averageRelevanceScore) || 0,
      wastedSpend: Number(summary?.wastedSpend) || 0,
      negativeActionCount: Number(summary?.negativeActionCount) || 0,
    },
    benchmarks: {
      medianCtr: Number(benchmarks?.medianCtr) || 0,
      medianCpc: Number(benchmarks?.medianCpc) || 0,
      medianImpressions: Number(benchmarks?.medianImpressions) || 0,
      medianClicks: Number(benchmarks?.medianClicks) || 0,
      medianConversions: Number(benchmarks?.medianConversions) || 0,
    },
    autoTagRules: {
      goodMinConversions: Number(autoTagRules?.goodMinConversions) || 0,
      goodMaxCostPerConversion: Number(autoTagRules?.goodMaxCostPerConversion) || 0,
      badNoConversionSpend: Number(autoTagRules?.badNoConversionSpend) || 0,
      badNoConversionClicks: Number(autoTagRules?.badNoConversionClicks) || 0,
      badMaxRelevanceScore: Number(autoTagRules?.badMaxRelevanceScore) || 0,
      neutralMinClicks: Number(autoTagRules?.neutralMinClicks) || 0,
    },
    positiveTerms,
    wasteTerms,
    negativeCandidates: suggestedNegatives.slice(0, 12).map((item) => ({
      keyword: item.word,
      termCount: Number(item.termCount) || 0,
      wastedSpend: Number(item.wastedSpend) || 0,
      manualBadCount: Number(item.manualBadCount) || 0,
      scoreCandidateCount: Number(item.scoreCandidateCount) || 0,
    })),
  };
}

export function getAccountAiStrategyKey(client, dateRangeLabel) {
  if (!client?.id) return "";
  return ["account", client.id, dateRangeLabel || ""].join(":");
}

export function getSearchTermsAiStrategyKey({
  selectedClient,
  selectedAccount,
  selectedCampaign,
  selectedAdGroup,
  isPerformanceMax,
  dateRange,
  termStatusFilter,
}) {
  if (!selectedClient?.id || !selectedAccount?.externalId || !selectedCampaign?.id) return "";

  return [
    "search_terms",
    selectedClient.id,
    selectedAccount.externalId,
    selectedCampaign.id,
    isPerformanceMax ? "campaign" : selectedAdGroup?.id || "",
    dateRange || "",
    termStatusFilter || "active",
  ].join(":");
}

export function getAiStrategyChatKey(strategyKey) {
  return strategyKey ? `${strategyKey}:chat` : "";
}

export function tokenizeNegativeCandidate(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !SEARCH_TERM_SUGGESTION_STOPWORDS.has(token));
}

export function downloadTextFile(filename, content) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 250);
}

export function sanitizeFileFragment(value) {
  return String(value || "export")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "export";
}

export function getCategoryMeta(key) {
  return CATEGORIES.find((item) => item.key === key) || CATEGORIES[0];
}

export function fitCols(minWidth) {
  return `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`;
}

export function splitTotal(total, count, seed) {
  const weights = Array.from({ length: count }, (_, index) => 0.8 + seedUnit(seed, index) * 0.7);
  const sum = weights.reduce((acc, item) => acc + item, 0);
  let allocated = 0;

  return weights.map((weight, index) => {
    if (index === count - 1) return Math.max(0, total - allocated);
    const value = Math.round(total * (weight / sum));
    allocated += value;
    return value;
  });
}

export function getUserInitials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function getClientLogoText(name) {
  const parts = String(name || "Client").trim().split(/\s+/).filter(Boolean);
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
}

export function defaultScopeForPlatform(platform) {
  if (platform === "google_ads") return "Manager account";
  if (platform === "meta_ads") return "Business Manager";
  if (platform === "tiktok_ads") return "Advertiser access";
  return "Analytics portfolio";
}

export function getEmptyLinkedAssets() {
  return {
    google_ads: [],
    meta_ads: [],
    tiktok_ads: [],
    ga4: [],
  };
}

export function getLinkedAssetExternalId(platform, value) {
  let raw = value && typeof value === "object"
    ? String(value.externalId || "").trim()
    : String(value || "").trim();
  const prefix = `${platform}:`;

  if (raw.startsWith(prefix)) {
    const parts = raw.slice(prefix.length).split(":").filter(Boolean);
    raw = parts.at(-1) || "";
  }

  if (platform === "google_ads" || platform === "meta_ads" || platform === "tiktok_ads" || platform === "ga4") {
    return sanitizeGoogleAdsId(raw);
  }

  return raw.trim();
}

export function getLinkedAssetStableKey(platform, value) {
  const externalId = getLinkedAssetExternalId(platform, value);
  return externalId ? `${platform}:${externalId}` : "";
}

export function sanitizeGoogleAdsId(value) {
  return String(value || "").replace(/\D/g, "");
}

export function createEmptyIntegrationSnapshot() {
  return {
    configured: Object.keys(PLATFORM_META).reduce((acc, key) => ({
      ...acc,
      [key]: { ready: false, missing: [] },
    }), {}),
    connections: [],
  };
}

export function createEmptyGoogleAdsLiveState() {
  return {
    loading: false,
    error: "",
    generatedAt: "",
    accounts: [],
    campaigns: [],
    ads: [],
    errors: [],
  };
}

export function createEmptyGoogleAdsReportState() {
  return {
    loading: false,
    error: "",
    generatedAt: "",
    details: [],
    errors: [],
  };
}

export function createEmptyMetaAdsLiveState() {
  return {
    loading: false,
    error: "",
    generatedAt: "",
    accounts: [],
    campaigns: [],
    ads: [],
    errors: [],
  };
}

export function createEmptyTikTokAdsLiveState() {
  return {
    loading: false,
    error: "",
    generatedAt: "",
    accounts: [],
    campaigns: [],
    ads: [],
    errors: [],
  };
}

export function createEmptyGa4LiveState() {
  return {
    loading: false,
    error: "",
    generatedAt: "",
    properties: [],
    errors: [],
  };
}

export function createEmptyUserDirectoryState() {
  return {
    loading: false,
    savingKey: "",
    error: "",
    notice: "",
  };
}

export function createEmptyClientDirectoryState() {
  return {
    loading: false,
    savingKey: "",
    error: "",
    notice: "",
    lastSavedToken: "",
    lastSavedClientId: "",
  };
}

export function createEmptyAiStrategistState() {
  return {
    loading: false,
    error: "",
    data: null,
    generatedAt: "",
    cached: false,
  };
}

export function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

export function createEmptyUserDraft(role = "account") {
  return {
    name: "",
    title: role === "director" ? "Director" : "Account Manager",
    email: "",
    role,
    password: "",
  };
}

export function buildUsers() {
  return USER_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    initials: getUserInitials(blueprint.name),
    isSeeded: true,
  }));
}

export function getAccountUserIds(users) {
  return (users || []).filter((user) => user.role === "account").map((user) => user.id);
}

export function getDefaultAssignedUserIds(index) {
  const primary = DEFAULT_ACCOUNT_USER_IDS[index % DEFAULT_ACCOUNT_USER_IDS.length];
  const secondary = index % 3 === 0 ? DEFAULT_ACCOUNT_USER_IDS[(index + 1) % DEFAULT_ACCOUNT_USER_IDS.length] : null;
  const tertiary = index % 5 === 0 ? DEFAULT_ACCOUNT_USER_IDS[(index + 2) % DEFAULT_ACCOUNT_USER_IDS.length] : null;

  return Array.from(new Set([primary, secondary, tertiary].filter(Boolean)));
}

export function getDefaultLinkedProfiles(index, gaEnabled) {
  return {
    google_ads: index % 3 === 0 ? "profile-google-growth" : "profile-google-core",
    meta_ads: index % 4 <= 1 ? "profile-meta-core" : "profile-meta-scale",
    ga4: gaEnabled ? (index % 2 === 0 ? "profile-ga4-commerce" : "profile-ga4-main") : null,
  };
}

export function getDefaultSearchTermRules(category) {
  const defaults = {
    eshop: { goodMaxCostPerConversion: 35, badNoConversionSpend: 30, badNoConversionClicks: 12, neutralMinClicks: 4 },
    lead_gen: { goodMaxCostPerConversion: 45, badNoConversionSpend: 45, badNoConversionClicks: 10, neutralMinClicks: 4 },
    b2b: { goodMaxCostPerConversion: 120, badNoConversionSpend: 80, badNoConversionClicks: 8, neutralMinClicks: 3 },
    brand: { goodMaxCostPerConversion: 0, badNoConversionSpend: 60, badNoConversionClicks: 12, neutralMinClicks: 5 },
  };
  const preset = defaults[category] || defaults.brand;

  return {
    autoTaggingEnabled: true,
    goodMinConversions: 1,
    badMaxRelevanceScore: 38,
    ...preset,
  };
}

export function normalizeSearchTermRules(category, rules = {}) {
  const defaults = getDefaultSearchTermRules(category);
  const merged = { ...defaults, ...(rules || {}) };
  const numberFields = [
    "goodMinConversions",
    "goodMaxCostPerConversion",
    "badNoConversionSpend",
    "badNoConversionClicks",
    "badMaxRelevanceScore",
    "neutralMinClicks",
  ];
  const normalized = {
    ...merged,
    autoTaggingEnabled: merged.autoTaggingEnabled !== false,
  };

  numberFields.forEach((field) => {
    const value = Number(merged[field]);
    normalized[field] = Number.isFinite(value) ? value : defaults[field];
  });

  return normalized;
}

export function getDefaultRules(category) {
  const searchTerms = getDefaultSearchTermRules(category);

  if (category === "eshop") {
    return { pacingTolerance: 10, revenueDropTolerance: 5, cpcMax: 2.1, cpmMax: 13.5, stoppedCampaigns: true, searchTerms };
  }
  if (category === "lead_gen") {
    return { pacingTolerance: 10, revenueDropTolerance: 5, cpcMax: 3.2, cpmMax: 16.5, stoppedCampaigns: true, searchTerms };
  }
  if (category === "b2b") {
    return { pacingTolerance: 10, revenueDropTolerance: 5, cpcMax: 4.4, cpmMax: 18.0, stoppedCampaigns: true, searchTerms };
  }
  return { pacingTolerance: 10, revenueDropTolerance: 5, cpcMax: 2.6, cpmMax: 19.0, stoppedCampaigns: true, searchTerms };
}

export const RECENT_STOPPED_CAMPAIGN_WINDOW_MS = 24 * 60 * 60 * 1000;

export function normalizeIssueIdList(items) {
  return Array.isArray(items)
    ? Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)))
    : [];
}

export function normalizeCampaignStatusMemory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(Object.entries(value)
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
}

export function normalizeCampaignStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "stopped" || normalized === "paused" || normalized === "removed" || normalized === "archived") return "stopped";
  if (normalized === "learning") return "learning";
  return "active";
}

export function isStoppedCampaign(campaign) {
  return normalizeCampaignStatus(campaign?.status) === "stopped";
}

export function getCampaignMemoryKey(campaign) {
  return [
    campaign?.platform || "campaign",
    campaign?.accountId || campaign?.requestKey || "",
    campaign?.externalId || campaign?.rawCampaignId || campaign?.id || campaign?.name || "",
  ].filter(Boolean).join(":");
}

export function isWithinRecentStopWindow(value, nowMs = Date.now()) {
  const stoppedAt = Date.parse(value || "");
  return Number.isFinite(stoppedAt) && nowMs - stoppedAt >= 0 && nowMs - stoppedAt <= RECENT_STOPPED_CAMPAIGN_WINDOW_MS;
}

export function createHealthIssueId(type, ...parts) {
  return [type, ...parts.map((part) => String(part || "").trim()).filter(Boolean)].join(":");
}

export function filterResolvedHealthFlags(client, flags) {
  const resolvedIds = new Set(normalizeIssueIdList(client?.resolvedIssueIds));
  const activeFlags = flags.filter((flag) => !resolvedIds.has(flag.id));

  return activeFlags;
}

export function buildClients() {
  return CLIENT_BLUEPRINTS.map((blueprint, index) => {
    const googleBudget = seededInt(`${blueprint.id}-google-budget`, blueprint.category === "b2b" ? 7000 : 5500, blueprint.category === "brand" ? 9500 : 16500);
    const metaBudget = seededInt(`${blueprint.id}-meta-budget`, blueprint.category === "b2b" ? 3500 : 4500, blueprint.category === "brand" ? 12000 : 15000);
    const gaEnabled = blueprint.category !== "brand" || index % 2 === 1;
    const linkedProfiles = getDefaultLinkedProfiles(index, gaEnabled);

    return {
      ...blueprint,
      logoText: `C${String(index + 1).padStart(2, "0")}`,
      owner: `Team ${String.fromCharCode(65 + (index % 4))}`,
      reportingGroup: blueprint.name,
      budgets: {
        google_ads: googleBudget,
        meta_ads: metaBudget,
      },
      connections: {
        google_ads: true,
        meta_ads: true,
        ga4: gaEnabled,
      },
      linkedProfiles,
      linkedAssets: getEmptyLinkedAssets(),
      rules: getDefaultRules(blueprint.category),
      tags: [blueprint.focus, blueprint.category === "eshop" ? "Revenue focus" : "Pipeline focus"],
      assignedUserIds: getDefaultAssignedUserIds(index),
      resolvedIssueIds: [],
      campaignStatusMemory: {},
    };
  });
}

export function createLiveClientDraft(seed = Date.now()) {
  const id = String(seed).startsWith("client-") ? String(seed) : `client-${seed}`;

  return {
    id,
    name: "New client",
    category: "eshop",
    focus: DEFAULT_CLIENT_TARGET,
    accent: "#0f8f66",
    accent2: "#78d1ad",
    healthMode: "healthy",
    logoText: getClientLogoText("New client"),
    logoImage: "",
    owner: "",
    reportingGroup: "New client",
    budgets: {
      google_ads: 0,
      meta_ads: 0,
      tiktok_ads: 0,
    },
    connections: {
      google_ads: false,
      meta_ads: false,
      tiktok_ads: false,
      ga4: false,
    },
    linkedProfiles: {},
    linkedAssets: getEmptyLinkedAssets(),
    rules: getDefaultRules("eshop"),
    tags: ["Live client"],
    assignedUserIds: [],
    resolvedIssueIds: [],
    campaignStatusMemory: {},
  };
}

export function getClientEditorFingerprint(client) {
  if (!client) return "";

  return JSON.stringify({
    id: client.id,
    name: client.name || "",
    focus: normalizeClientTarget(client.focus),
    reportingGroup: client.reportingGroup || "",
    owner: client.owner || "",
    category: client.category || "",
    logoText: client.logoText || "",
    logoImage: client.logoImage || "",
    budgets: {
      google_ads: Number(client?.budgets?.google_ads) || 0,
      meta_ads: Number(client?.budgets?.meta_ads) || 0,
      tiktok_ads: Number(client?.budgets?.tiktok_ads) || 0,
    },
    connections: {
      google_ads: client?.connections?.google_ads === true,
      meta_ads: client?.connections?.meta_ads === true,
      tiktok_ads: client?.connections?.tiktok_ads === true,
      ga4: client?.connections?.ga4 === true,
    },
    linkedAssets: {
      google_ads: [...(client?.linkedAssets?.google_ads || [])].sort(),
      meta_ads: [...(client?.linkedAssets?.meta_ads || [])].sort(),
      tiktok_ads: [...(client?.linkedAssets?.tiktok_ads || [])].sort(),
      ga4: [...(client?.linkedAssets?.ga4 || [])].sort(),
    },
    assignedUserIds: [...(client?.assignedUserIds || [])].sort(),
    rules: client?.rules || {},
  });
}

export function spendFactorForMode(mode, platform, slot) {
  if (mode === "overspend") return platform === "google_ads" ? 1.16 + slot * 0.03 : 1.12 + slot * 0.02;
  if (mode === "underspend") return platform === "meta_ads" ? 0.82 + slot * 0.02 : 0.88 + slot * 0.02;
  return 0.96 + slot * 0.03;
}

export function baseCpc(client, platform) {
  if (client.category === "eshop") return platform === "google_ads" ? 1.08 : 0.84;
  if (client.category === "lead_gen") return platform === "google_ads" ? 2.35 : 1.64;
  if (client.category === "b2b") return platform === "google_ads" ? 3.35 : 2.15;
  return platform === "google_ads" ? 1.42 : 1.12;
}

export function baseCpm(client, platform) {
  if (client.category === "eshop") return platform === "google_ads" ? 6.2 : 8.4;
  if (client.category === "lead_gen") return platform === "google_ads" ? 10.2 : 12.5;
  if (client.category === "b2b") return platform === "google_ads" ? 12.6 : 14.2;
  return platform === "google_ads" ? 11.6 : 15.3;
}

export function buildAccounts(clients) {
  const accounts = [];

  clients.forEach((client, index) => {
    const accountCount = index % 2 === 0 ? 3 : 2;
    const googleCount = accountCount === 3 ? (index % 4 === 0 ? 2 : 1) : 1;
    const metaCount = accountCount - googleCount;
    const googleBudgets = splitTotal(client.budgets.google_ads, googleCount, `${client.id}-google-split`);
    const metaBudgets = splitTotal(client.budgets.meta_ads, metaCount, `${client.id}-meta-split`);

    Array.from({ length: googleCount }).forEach((_, slot) => {
      const monthlyBudget = googleBudgets[slot];
      const spend = Math.round(monthlyBudget * CALENDAR.spendProgress * spendFactorForMode(client.healthMode, "google_ads", slot));
      const cpcBase = baseCpc(client, "google_ads");
      const cpc = client.healthMode === "high_cpc" && slot === 0 ? +(client.rules.cpcMax * 1.25).toFixed(2) : +(cpcBase + slot * 0.14 + seedUnit(client.id, slot) * 0.18).toFixed(2);
      const cpmBase = baseCpm(client, "google_ads");
      const cpm = +(cpmBase + slot * 0.6 + seedUnit(client.id, slot + 10) * 0.9).toFixed(2);
      const clicks = Math.max(110, Math.round(spend / Math.max(cpc, 0.3)));
      const impressions = Math.max(clicks * 9, Math.round((spend / Math.max(cpm, 0.6)) * 1000));
      const conversions = Math.max(12, Math.round(clicks * (client.category === "lead_gen" ? 0.075 : client.category === "b2b" ? 0.048 : 0.11)));
      const roas = client.category === "eshop" ? +(2.6 + seedUnit(client.id, slot + 30) * 2.1).toFixed(2) : +(1.2 + seedUnit(client.id, slot + 30) * 1.8).toFixed(2);
      const conversionValue = Math.round(spend * roas);

      accounts.push({
        id: `${client.id}-g${slot + 1}`,
        clientId: client.id,
        platform: "google_ads",
        name: GOOGLE_ACCOUNT_NAMES[slot],
        status: "active",
        monthlyBudget,
        spend,
        impressions,
        clicks,
        conversions,
        conversionValue,
        ctr: +(clicks / impressions * 100).toFixed(2),
        cpc,
        cpm,
        roas,
        accountLabel: `${client.name} / ${GOOGLE_ACCOUNT_NAMES[slot]}`,
      });
    });

    Array.from({ length: metaCount }).forEach((_, slot) => {
      const monthlyBudget = metaBudgets[slot];
      const spend = Math.round(monthlyBudget * CALENDAR.spendProgress * spendFactorForMode(client.healthMode, "meta_ads", slot));
      const cpcBase = baseCpc(client, "meta_ads");
      const cpc = +(cpcBase + slot * 0.12 + seedUnit(client.id, slot + 60) * 0.22).toFixed(2);
      const cpmBase = baseCpm(client, "meta_ads");
      const cpm = client.healthMode === "high_cpm" && slot === 0 ? +(client.rules.cpmMax * 1.22).toFixed(2) : +(cpmBase + slot * 0.8 + seedUnit(client.id, slot + 70) * 1.3).toFixed(2);
      const clicks = Math.max(120, Math.round(spend / Math.max(cpc, 0.3)));
      const impressions = Math.max(clicks * 10, Math.round((spend / Math.max(cpm, 0.6)) * 1000));
      const conversions = Math.max(10, Math.round(clicks * (client.category === "lead_gen" ? 0.062 : client.category === "b2b" ? 0.034 : 0.095)));
      const roas = client.category === "eshop" ? +(2.1 + seedUnit(client.id, slot + 80) * 1.9).toFixed(2) : +(1.1 + seedUnit(client.id, slot + 80) * 1.4).toFixed(2);
      const conversionValue = Math.round(spend * roas);

      accounts.push({
        id: `${client.id}-m${slot + 1}`,
        clientId: client.id,
        platform: "meta_ads",
        name: META_ACCOUNT_NAMES[slot],
        status: "active",
        monthlyBudget,
        spend,
        impressions,
        clicks,
        conversions,
        conversionValue,
        ctr: +(clicks / impressions * 100).toFixed(2),
        cpc,
        cpm,
        roas,
        accountLabel: `${client.name} / ${META_ACCOUNT_NAMES[slot]}`,
      });
    });
  });

  return accounts;
}

export function buildCampaigns(accounts, clients) {
  const clientMap = Object.fromEntries(clients.map((client) => [client.id, client]));
  const campaigns = [];

  accounts.forEach((account, index) => {
    const client = clientMap[account.clientId];
    const count = account.platform === "google_ads" ? 3 : 2 + (index % 2);
    const budgets = splitTotal(Math.round(account.monthlyBudget * 0.95), count, `${account.id}-campaign-budget`);
    const spends = splitTotal(account.spend, count, `${account.id}-campaign-spend`);
    const conversionValues = splitTotal(Math.round(getConversionValue(account)), count, `${account.id}-campaign-value`);

    Array.from({ length: count }).forEach((_, slot) => {
      const shouldStop = client.healthMode === "stopped_campaign" && slot === 0 && account.id.endsWith("1");
      const objectiveNames = account.platform === "google_ads" ? GOOGLE_CAMPAIGNS : META_CAMPAIGNS;
      const budget = budgets[slot];
      const spend = shouldStop ? 0 : spends[slot];
      const conversionValue = shouldStop ? 0 : conversionValues[slot];
      const clicks = shouldStop ? 0 : Math.max(35, Math.round(account.clicks * (spend / Math.max(account.spend, 1))));
      const impressions = shouldStop ? 0 : Math.max(650, Math.round(account.impressions * (spend / Math.max(account.spend, 1))));
      const conversions = shouldStop ? 0 : Math.max(4, Math.round(account.conversions * (spend / Math.max(account.spend, 1))));

      campaigns.push({
        id: `${account.id}-c${slot + 1}`,
        clientId: account.clientId,
        accountId: account.id,
        platform: account.platform,
        name: objectiveNames[slot % objectiveNames.length],
        objective: account.platform === "google_ads" ? "Search / demand capture" : "Prospecting / remarketing",
        status: shouldStop ? "stopped" : slot === count - 1 && index % 3 === 0 ? "learning" : "active",
        budget,
        spend,
        impressions,
        clicks,
        conversions,
        conversionValue,
        cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
        cpm: impressions ? +(spend / impressions * 1000).toFixed(2) : 0,
      });
    });
  });

  return campaigns;
}

export function buildAds(campaigns) {
  const ads = [];

  campaigns.forEach((campaign, index) => {
    const count = campaign.platform === "google_ads" ? 3 : 2 + (index % 2);
    const spends = splitTotal(Math.max(campaign.spend, 0), count, `${campaign.id}-ad-spend`);
    const conversionValues = splitTotal(Math.round(campaign.conversionValue || 0), count, `${campaign.id}-ad-value`);

    Array.from({ length: count }).forEach((_, slot) => {
      const spend = campaign.status === "stopped" ? 0 : spends[slot];
      const conversionValue = campaign.status === "stopped" ? 0 : conversionValues[slot];
      const clicks = campaign.status === "stopped" ? 0 : Math.max(12, Math.round(campaign.clicks * (spend / Math.max(campaign.spend, 1))));
      const impressions = campaign.status === "stopped" ? 0 : Math.max(220, Math.round(campaign.impressions * (spend / Math.max(campaign.spend, 1))));
      const conversions = campaign.status === "stopped" ? 0 : Math.max(1, Math.round(campaign.conversions * (spend / Math.max(campaign.spend, 1))));

      ads.push({
        id: `${campaign.id}-ad${slot + 1}`,
        clientId: campaign.clientId,
        accountId: campaign.accountId,
        campaignId: campaign.id,
        platform: campaign.platform,
        name: AD_NAMES[(slot + index) % AD_NAMES.length],
        format: slot % 3 === 0 ? "Static" : slot % 3 === 1 ? "Video" : "Carousel",
        status: campaign.status === "stopped" ? "paused" : slot === count - 1 && index % 4 === 0 ? "learning" : "live",
        spend,
        clicks,
        impressions,
        conversions,
        conversionValue,
        ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      });
    });
  });

  return ads;
}

export function buildGa4(clients) {
  return Object.fromEntries(
    clients.map((client, index) => {
      const sessions = seededInt(`${client.id}-sessions`, 12000, client.category === "eshop" ? 145000 : 62000);
      const users = Math.round(sessions * (0.72 + seedUnit(client.id, 101) * 0.08));
      const conversionRate = client.category === "eshop" ? seededFloat(client.id, 1.1, 3.4, 102) : seededFloat(client.id, 2.2, 8.5, 102);
      const revenueLastYearPeriod = client.category === "eshop" ? seededInt(`${client.id}-ly-revenue`, 62000, 198000) : 0;
      let revenueCurrentPeriod = revenueLastYearPeriod;

      if (client.category === "eshop") {
        const modifier = client.healthMode === "revenue_drop" ? 0.90 + seedUnit(client.id, 103) * 0.03 : 0.98 + seedUnit(client.id, 103) * 0.15;
        revenueCurrentPeriod = Math.round(revenueLastYearPeriod * modifier);
      }

      const channels = {
        Organic: seededInt(`${client.id}-organic`, 24, 39),
        Paid: seededInt(`${client.id}-paid`, 18, 34),
        Direct: seededInt(`${client.id}-direct`, 9, 18),
        Social: seededInt(`${client.id}-social`, 7, 16),
      };
      const used = Object.values(channels).reduce((acc, value) => acc + value, 0);
      channels.Referral = Math.max(3, 100 - used);

      return [
        client.id,
        {
          propertyName: `${client.name} GA4`,
          sessions,
          users,
          engagedRate: seededFloat(client.id, 52, 78, 104),
          conversionRate,
          usersPerSession: +(users / sessions).toFixed(2),
          purchasesOrLeads: Math.round(sessions * (conversionRate / 100)),
          revenueCurrentPeriod,
          revenueLastYearPeriod,
          aov: client.category === "eshop" ? seededInt(`${client.id}-aov`, 45, 190) : 0,
          channels,
          insight: index % 2 === 0 ? "Paid and organic are balanced this month." : "Direct traffic is converting above average.",
        },
      ];
    }),
  );
}

export function buildWeights(key) {
  const weights = Array.from({ length: 30 }, (_, index) => {
    const weekdayLift = index % 7 === 5 || index % 7 === 6 ? 0.92 : 1.06;
    return (0.82 + seedUnit(key, index) * 0.38) * weekdayLift;
  });
  const sum = weights.reduce((acc, value) => acc + value, 0);
  return weights.map((value) => value / sum);
}

export function allocateSeries(total, key) {
  const weights = buildWeights(key);
  let used = 0;

  return weights.map((weight, index) => {
    if (index === weights.length - 1) return Math.max(0, Math.round(total - used));
    const value = Math.round(total * weight);
    used += value;
    return value;
  });
}

export function normalizeProvidedSeries(points) {
  return (Array.isArray(points) ? points : [])
    .map((point) => ({
      date: String(point?.date || "").trim(),
      label: String(point?.label || point?.date || "").trim(),
      spend: Number(point?.spend) || 0,
      clicks: Number(point?.clicks) || 0,
      impressions: Number(point?.impressions) || 0,
      conversions: Number(point?.conversions) || 0,
      conversionValue: Number(point?.conversionValue ?? point?.revenue) || 0,
      revenue: Number(point?.revenue ?? point?.conversionValue) || 0,
      cpc: Number(point?.cpc) || 0,
      cpm: Number(point?.cpm) || 0,
      roas: Number(point?.roas) || 0,
    }))
    .filter((point) => point.label || point.date);
}

export function buildSeriesMap(clients, accounts, ga4) {
  const series = {};
  const clientBuckets = Object.fromEntries(clients.map((client) => [client.id, []]));

  accounts.forEach((account) => {
    clientBuckets[account.clientId].push(account);
    const providedSeries = normalizeProvidedSeries(account.series);
    if (providedSeries.length) {
      series[`account:${account.id}`] = providedSeries;
      return;
    }

    if (account.requestKey || String(account.id || "").startsWith("live-")) {
      series[`account:${account.id}`] = [];
      return;
    }

    const spend = allocateSeries(account.spend, `${account.id}-spend`);
    const clicks = allocateSeries(account.clicks, `${account.id}-clicks`);
    const conversions = allocateSeries(account.conversions, `${account.id}-conversions`);
    const conversionValue = allocateSeries(getConversionValue(account), `${account.id}-conversion-value`);

    series[`account:${account.id}`] = Array.from({ length: 30 }, (_, index) => {
      const valueSpend = spend[index];
      const valueClicks = clicks[index];
      const valueConversions = conversions[index];
      const valueConversionValue = conversionValue[index];
      const cpc = valueClicks ? +(valueSpend / valueClicks).toFixed(2) : 0;
      const impressions = Math.max(valueClicks * 8, Math.round((valueSpend / Math.max(account.cpm, 0.5)) * 1000));
      const cpm = impressions ? +(valueSpend / impressions * 1000).toFixed(2) : 0;
      const roas = +(account.roas * (0.92 + seedUnit(account.id, 140 + index) * 0.16)).toFixed(2);

      return {
        label: `Apr ${String(index + 1).padStart(2, "0")}`,
        spend: valueSpend,
        clicks: valueClicks,
        conversions: valueConversions,
        conversionValue: valueConversionValue,
        cpc,
        cpm,
        roas,
        revenue: Math.round(valueSpend * roas),
      };
    });
  });

  clients.forEach((client) => {
    const clientAccounts = clientBuckets[client.id] || [];
    const liveGa4Series = Array.isArray(ga4[client.id]?.series) ? ga4[client.id].series : [];
    const clientSeriesByKey = new Map();
    let hasAccountDailySeries = false;
    const hasLiveAccount = clientAccounts.some((account) => account.requestKey || String(account.id || "").startsWith("live-"));

    clientAccounts.forEach((account) => {
      const accountSeries = series[`account:${account.id}`] || [];
      if (!accountSeries.length) return;

      hasAccountDailySeries = true;
      accountSeries.forEach((point, index) => {
        const key = point.date || point.label || `point-${index}`;
        const current = clientSeriesByKey.get(key) || {
          date: point.date || "",
          label: point.label || point.date || `Point ${index + 1}`,
          spend: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          conversionValue: 0,
          revenue: 0,
          sessions: 0,
          users: 0,
        };

        current.spend += Number(point.spend) || 0;
        current.clicks += Number(point.clicks) || 0;
        current.impressions += Number(point.impressions) || 0;
        current.conversions += Number(point.conversions) || 0;
        current.conversionValue += Number(point.conversionValue) || 0;
        current.revenue += Number(point.revenue) || 0;
        clientSeriesByKey.set(key, current);
      });
    });

    liveGa4Series.forEach((point, index) => {
      const key = point.date || point.label || `ga4-point-${index}`;
      const current = clientSeriesByKey.get(key) || {
        date: point.date || "",
        label: point.label || point.date || `Point ${index + 1}`,
        spend: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
        conversionValue: 0,
        revenue: 0,
        sessions: 0,
        users: 0,
      };

      current.sessions += Number(point.sessions) || 0;
      current.users += Number(point.users) || 0;
      current.revenue += Number(point.revenue) || 0;
      if (!hasAccountDailySeries) {
        current.conversions += Number(point.conversions) || 0;
      }
      clientSeriesByKey.set(key, current);
    });

    if (hasAccountDailySeries || liveGa4Series.length || hasLiveAccount || ga4[client.id]?.isLiveGa4) {
      series[`client:${client.id}`] = Array.from(clientSeriesByKey.values())
        .sort((left, right) => String(left.date || left.label).localeCompare(String(right.date || right.label)))
        .map((point) => ({
          ...point,
          cpc: point.clicks ? +(point.spend / point.clicks).toFixed(2) : 0,
          cpm: point.impressions ? +(point.spend / point.impressions * 1000).toFixed(2) : 0,
          roas: point.spend ? +((point.revenue || point.conversionValue) / point.spend).toFixed(2) : 0,
        }));
      series[`ga4:${client.id}`] = liveGa4Series.map((point) => ({
        date: point.date || "",
        label: point.label || point.date || "",
        sessions: Number(point.sessions) || 0,
        users: Number(point.users) || 0,
        revenue: Number(point.revenue) || 0,
        conversions: Number(point.conversions) || 0,
      }));
      return;
    }

    const spend = clientAccounts.reduce((acc, item) => acc + item.spend, 0);
    const clicks = clientAccounts.reduce((acc, item) => acc + item.clicks, 0);
    const conversions = clientAccounts.reduce((acc, item) => acc + item.conversions, 0);
    const conversionValue = clientAccounts.reduce((acc, item) => acc + getConversionValue(item), 0);
    const revenue = ga4[client.id]?.revenueCurrentPeriod || Math.round(spend * (1.8 + seedUnit(client.id, 160) * 1.8));
    const sessions = ga4[client.id]?.sessions || seededInt(`${client.id}-chart-sessions`, 9000, 35000);
    const users = ga4[client.id]?.users || Math.round(sessions * 0.77);

    const spendSeries = allocateSeries(spend, `${client.id}-client-spend`);
    const clicksSeries = allocateSeries(clicks, `${client.id}-client-clicks`);
    const conversionSeries = allocateSeries(conversions, `${client.id}-client-conversions`);
    const conversionValueSeries = allocateSeries(conversionValue, `${client.id}-client-conversion-value`);
    const revenueSeries = allocateSeries(revenue, `${client.id}-client-revenue`);
    const sessionsSeries = allocateSeries(sessions, `${client.id}-client-sessions`);
    const usersSeries = allocateSeries(users, `${client.id}-client-users`);

    series[`client:${client.id}`] = Array.from({ length: 30 }, (_, index) => {
      const valueSpend = spendSeries[index];
      const valueClicks = clicksSeries[index];
      const valueConversions = conversionSeries[index];
      const valueConversionValue = conversionValueSeries[index];
      const valueRevenue = revenueSeries[index];
      const impressions = Math.max(valueClicks * 8, Math.round(valueSpend * 150));
      const cpc = valueClicks ? +(valueSpend / valueClicks).toFixed(2) : 0;
      const cpm = impressions ? +(valueSpend / impressions * 1000).toFixed(2) : 0;
      const roas = valueSpend ? +(valueRevenue / valueSpend).toFixed(2) : 0;

      return {
        label: `Apr ${String(index + 1).padStart(2, "0")}`,
        spend: valueSpend,
        clicks: valueClicks,
        conversions: valueConversions,
        conversionValue: valueConversionValue,
        cpc,
        cpm,
        roas,
        revenue: valueRevenue,
        sessions: sessionsSeries[index],
        users: usersSeries[index],
      };
    });

    series[`ga4:${client.id}`] = liveGa4Series.length
      ? liveGa4Series.map((point) => ({
        label: point.label || point.date || "",
        sessions: Number(point.sessions) || 0,
        users: Number(point.users) || 0,
        revenue: Number(point.revenue) || 0,
        conversions: Number(point.conversions) || 0,
      }))
      : [];
  });

  return series;
}

export function buildLiveGa4Summary(client, reports, liveState) {
  const propertyReports = Array.isArray(reports) ? reports : [];

  if (!propertyReports.length) {
    return {
      propertyName: liveState?.loading ? "Loading linked GA4 properties" : "Linked GA4 property",
      sessions: 0,
      users: 0,
      engagedRate: 0,
      conversionRate: 0,
      purchasesOrLeads: 0,
      conversions: 0,
      revenueCurrentPeriod: 0,
      revenueLastYearPeriod: 0,
      aov: 0,
      channels: { Unassigned: 0 },
      series: [],
      previousSeries: [],
      previousStartDate: "",
      previousEndDate: "",
      isLiveGa4: true,
      insight: liveState?.error || "Waiting for live GA4 data from the linked property.",
    };
  }

  const sessions = propertyReports.reduce((acc, item) => acc + (Number(item.sessions) || 0), 0);
  const users = propertyReports.reduce((acc, item) => acc + (Number(item.users) || 0), 0);
  const conversions = propertyReports.reduce((acc, item) => acc + (Number(item.conversions || item.purchasesOrLeads) || 0), 0);
  const revenue = propertyReports.reduce((acc, item) => acc + (Number(item.revenueCurrentPeriod) || 0), 0);
  const engagedRate = sessions
    ? propertyReports.reduce((acc, item) => acc + (Number(item.engagedRate) || 0) * (Number(item.sessions) || 0), 0) / sessions
    : 0;
  const channelWeights = new Map();

  propertyReports.forEach((report) => {
    Object.entries(report.channels || {}).forEach(([channel, percent]) => {
      const weightedSessions = (Number(report.sessions) || 0) * (Number(percent) || 0) / 100;
      channelWeights.set(channel, (channelWeights.get(channel) || 0) + weightedSessions);
    });
  });

  const channels = Object.fromEntries(Array.from(channelWeights.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([channel, value]) => [channel, sessions ? Math.round(value / sessions * 100) : 0]));
  const seriesByDate = new Map();
  const previousSeriesByDate = new Map();

  propertyReports.forEach((report) => {
    (Array.isArray(report.series) ? report.series : []).forEach((point) => {
      const key = point.date || point.label || "";
      if (!key) return;
      const current = seriesByDate.get(key) || { date: key, label: key, sessions: 0, users: 0, conversions: 0, revenue: 0 };
      current.sessions += Number(point.sessions) || 0;
      current.users += Number(point.users) || 0;
      current.conversions += Number(point.conversions) || 0;
      current.revenue += Number(point.revenue) || 0;
      seriesByDate.set(key, current);
    });

    (Array.isArray(report.previousSeries) ? report.previousSeries : []).forEach((point) => {
      const key = point.date || point.label || "";
      if (!key) return;
      const current = previousSeriesByDate.get(key) || { date: key, label: point.label || key, sessions: 0, users: 0, conversions: 0, revenue: 0 };
      current.sessions += Number(point.sessions) || 0;
      current.users += Number(point.users) || 0;
      current.conversions += Number(point.conversions) || 0;
      current.revenue += Number(point.revenue) || 0;
      previousSeriesByDate.set(key, current);
    });
  });

  return {
    propertyName: propertyReports.length === 1 ? propertyReports[0].propertyName : `${propertyReports.length} GA4 properties`,
    sessions,
    users,
    engagedRate: +engagedRate.toFixed(1),
    conversionRate: sessions ? +(conversions / sessions * 100).toFixed(2) : 0,
    purchasesOrLeads: +conversions.toFixed(2),
    conversions: +conversions.toFixed(2),
    revenueCurrentPeriod: +revenue.toFixed(2),
    revenueLastYearPeriod: 0,
    aov: conversions ? +(revenue / conversions).toFixed(2) : 0,
    channels: Object.keys(channels).length ? channels : { Unassigned: 0 },
    series: Array.from(seriesByDate.values()).sort((left, right) => String(left.date).localeCompare(String(right.date))),
    previousSeries: Array.from(previousSeriesByDate.values()).sort((left, right) => String(left.date).localeCompare(String(right.date))),
    previousStartDate: propertyReports.find((report) => report.previousStartDate)?.previousStartDate || "",
    previousEndDate: propertyReports.find((report) => report.previousEndDate)?.previousEndDate || "",
    isLiveGa4: true,
    insight: liveState?.errors?.length
      ? `GA4 is partially synced: ${liveState.errors[0].error}`
      : `Live analytics from linked GA4 ${propertyReports.length === 1 ? "property" : "properties"}.`,
  };
}

export const CLIENTS_BASE = buildClients();
export const USERS_BASE = buildUsers();
export const PROVIDER_PROFILES_BASE = PROVIDER_PROFILE_BLUEPRINTS.map((profile) => ({ ...profile }));
export const ACCOUNTS_BASE = buildAccounts(CLIENTS_BASE);
export const CAMPAIGNS_BASE = buildCampaigns(ACCOUNTS_BASE, CLIENTS_BASE);
export const ADS_BASE = buildAds(CAMPAIGNS_BASE);
export const GA4_BASE = buildGa4(CLIENTS_BASE);
export const SERIES_BASE = buildSeriesMap(CLIENTS_BASE, ACCOUNTS_BASE, GA4_BASE);

export function readStoredValue(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function readStoredAiStrategyResult(storageKey) {
  if (!storageKey) return null;
  const stored = readStoredValue(STORAGE_KEYS.aiStrategy, {});
  return stored && typeof stored === "object" ? stored[storageKey] || null : null;
}

export function writeStoredAiStrategyResult(storageKey, result) {
  if (typeof window === "undefined" || !storageKey || !result) return;

  const stored = readStoredValue(STORAGE_KEYS.aiStrategy, {});
  const entries = Object.entries(stored && typeof stored === "object" ? stored : {})
    .filter(([key]) => key !== storageKey)
    .slice(-79);
  const next = Object.fromEntries(entries);

  next[storageKey] = {
    ...result,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEYS.aiStrategy, JSON.stringify(next));
}

export function normalizeAiStrategyChatThread(thread) {
  if (!Array.isArray(thread)) return [];

  return thread
    .map((entry) => {
      const role = entry?.role === "assistant" ? "assistant" : "user";
      const text = String(entry?.text || "").trim();
      if (!text) return null;
      return {
        role,
        text,
        createdAt: String(entry?.createdAt || new Date().toISOString()),
      };
    })
    .filter(Boolean)
    .slice(-24);
}

export function readStoredAiStrategyChatThread(chatKey) {
  if (!chatKey) return [];
  const stored = readStoredValue(STORAGE_KEYS.aiStrategyChats, {});
  return stored && typeof stored === "object"
    ? normalizeAiStrategyChatThread(stored[chatKey] || [])
    : [];
}

export function writeStoredAiStrategyChatThread(chatKey, thread) {
  if (typeof window === "undefined" || !chatKey) return;

  const normalizedThread = normalizeAiStrategyChatThread(thread);
  const stored = readStoredValue(STORAGE_KEYS.aiStrategyChats, {});
  const entries = Object.entries(stored && typeof stored === "object" ? stored : {})
    .filter(([key]) => key !== chatKey)
    .slice(-79);
  const next = Object.fromEntries(entries);

  next[chatKey] = normalizedThread;
  window.localStorage.setItem(STORAGE_KEYS.aiStrategyChats, JSON.stringify(next));
}

export function buildAiStrategistAlignmentNotes(thread) {
  const normalized = normalizeAiStrategyChatThread(thread);
  const userNotes = normalized
    .filter((entry) => entry.role === "user")
    .slice(-6)
    .map((entry) => entry.text);

  return userNotes.join("\n\n");
}

export function hydrateUsers(value) {
  if (!Array.isArray(value)) return USERS_BASE;

  const mergedBase = USERS_BASE.map((baseUser) => {
    const stored = value.find((item) => item.id === baseUser.id);
    return stored ? { ...baseUser, ...stored, initials: getUserInitials(stored.name || baseUser.name) } : baseUser;
  });
  const extras = value
    .filter((item) => item?.id && !USERS_BASE.some((baseUser) => baseUser.id === item.id))
    .map((item) => ({
      accent: USER_ROLE_META[item.role]?.color || T.accent,
      accent2: USER_ROLE_META[item.role]?.color || T.sky,
      title: item.role === "director" ? "Director" : "Account Manager",
      ...item,
      initials: getUserInitials(item.name || item.email || "User"),
    }));

  return [...mergedBase, ...extras];
}

export function hydrateProviderProfiles(value) {
  if (!Array.isArray(value)) return PROVIDER_PROFILES_BASE;

  const mergedBase = PROVIDER_PROFILES_BASE.map((baseProfile) => {
    const stored = value.find((item) => item.id === baseProfile.id);
    return stored ? { ...baseProfile, ...stored } : baseProfile;
  });
  const extras = value.filter((item) => !PROVIDER_PROFILES_BASE.some((baseProfile) => baseProfile.id === item.id));

  return [...mergedBase, ...extras];
}

export function hydrateClients(value) {
  if (!Array.isArray(value)) return CLIENTS_BASE;

  const normalizeClient = (stored, baseClient = null) => {
    const fallback = baseClient || createLiveClientDraft(stored?.id || Date.now());
    const category = stored.category || fallback.category;
    const rules = {
      ...fallback.rules,
      ...stored.rules,
      searchTerms: normalizeSearchTermRules(category, stored.rules?.searchTerms || fallback.rules?.searchTerms),
    };

    return {
      ...fallback,
      ...stored,
      focus: normalizeClientTarget(stored.focus || fallback.focus),
      logoText: String(stored.logoText || fallback.logoText || getClientLogoText(stored.name || fallback.name || "Client")).slice(0, 4),
      logoImage: String(stored.logoImage || fallback.logoImage || ""),
      budgets: { ...fallback.budgets, ...stored.budgets },
      connections: { ...fallback.connections, ...stored.connections },
      linkedProfiles: { ...fallback.linkedProfiles, ...stored.linkedProfiles },
      linkedAssets: {
        ...getEmptyLinkedAssets(),
        ...(fallback.linkedAssets || {}),
        ...Object.fromEntries(Object.entries(stored.linkedAssets || {}).map(([platform, ids]) => [
          platform,
          Array.isArray(ids) ? Array.from(new Set(ids.filter(Boolean))) : [],
        ])),
      },
      rules,
      tags: Array.isArray(stored.tags) ? stored.tags : fallback.tags,
      assignedUserIds: Array.isArray(stored.assignedUserIds)
        ? Array.from(new Set(stored.assignedUserIds.map((userId) => String(userId)).filter(Boolean)))
        : fallback.assignedUserIds,
      resolvedIssueIds: normalizeIssueIdList(stored.resolvedIssueIds || fallback.resolvedIssueIds),
      campaignStatusMemory: normalizeCampaignStatusMemory(stored.campaignStatusMemory || fallback.campaignStatusMemory),
    };
  };

  const mergedBase = CLIENTS_BASE.map((baseClient) => {
    const stored = value.find((item) => item.id === baseClient.id);
    return stored ? normalizeClient(stored, baseClient) : baseClient;
  });
  const extras = value
    .filter((item) => item?.id && !CLIENTS_BASE.some((baseClient) => baseClient.id === item.id))
    .map((item) => normalizeClient(item));

  return [...mergedBase, ...extras];
}

export function evaluateHealth(client, accounts, campaigns, ga4) {
  const flags = [];
  const connectedPlatforms = ["google_ads", "meta_ads", "tiktok_ads"].filter((platform) => client.connections[platform]);
  const totalBudget = connectedPlatforms.reduce((acc, platform) => acc + (client.budgets[platform] || 0), 0);
  const totalSpend = accounts.reduce((acc, account) => acc + account.spend, 0);
  const targetSpend = totalBudget * CALENDAR.spendProgress;
  const activeCampaigns = campaigns.filter((campaign) => !isStoppedCampaign(campaign));
  const campaignStatusMemory = normalizeCampaignStatusMemory(client.campaignStatusMemory);
  const shouldEvaluatePacing = !campaigns.length || activeCampaigns.length > 0;

  if (targetSpend > 0 && shouldEvaluatePacing) {
    const deviation = (totalSpend - targetSpend) / targetSpend;
    if (Math.abs(deviation) > client.rules.pacingTolerance / 100) {
      const pacingDirection = deviation > 0 ? "over" : "under";
      const channelNotes = connectedPlatforms
        .map((platform) => {
          const budget = client.budgets[platform] || 0;
          const spend = accounts.filter((account) => account.platform === platform).reduce((acc, account) => acc + account.spend, 0);
          const planned = budget * CALENDAR.spendProgress;
          if (!planned) return null;
          const delta = (spend - planned) / planned;
          if (Math.abs(delta) <= client.rules.pacingTolerance / 100) return null;
          return `${PLATFORM_META[platform].label} ${delta > 0 ? "+" : ""}${(delta * 100).toFixed(0)}%`;
        })
        .filter(Boolean)
        .join(" | ");

      flags.push({
        id: createHealthIssueId("budget-pace", CALENDAR.spendRangeLabel, pacingDirection),
        tone: "danger",
        label: deviation > 0 ? "Overspend vs month pace" : "Underspend vs month pace",
        detail: `${deviation > 0 ? "+" : ""}${(deviation * 100).toFixed(0)}% versus ${CALENDAR.spendRangeLabel}${channelNotes ? ` | ${channelNotes}` : ""}`,
      });
    }
  }

  const recentlyStoppedCampaigns = client.rules.stoppedCampaigns
    ? campaigns.filter((campaign) => {
      if (!isStoppedCampaign(campaign)) return false;
      const memory = campaignStatusMemory[getCampaignMemoryKey(campaign)];
      return isWithinRecentStopWindow(memory?.stoppedAt);
    })
    : [];
  recentlyStoppedCampaigns.forEach((campaign) => {
    const memory = campaignStatusMemory[getCampaignMemoryKey(campaign)] || {};
    flags.push({
      id: createHealthIssueId("campaign-stopped-24h", getCampaignMemoryKey(campaign), memory.stoppedAt),
      tone: "danger",
      label: "Campaign stopped in the last 24h",
      detail: `${campaign.name || "Campaign"} stopped recently on ${PLATFORM_META[campaign.platform]?.label || "ad platform"}.`,
    });
  });

  const efficiencyRows = activeCampaigns.length ? activeCampaigns : campaigns.length ? [] : accounts;
  const efficiencyUnit = activeCampaigns.length ? "active campaign(s)" : "account(s)";
  const getEfficiencyKey = (item) => activeCampaigns.length ? getCampaignMemoryKey(item) : item.id || item.name || item.platform;
  const highCpc = efficiencyRows.filter((item) => item.cpc > client.rules.cpcMax);
  if (highCpc.length) {
    flags.push({
      id: createHealthIssueId("cpc-threshold", CALENDAR.spendRangeLabel, client.rules.cpcMax, highCpc.map(getEfficiencyKey).sort().join("|")),
      tone: "warning",
      label: "CPC above threshold",
      detail: `${highCpc.length} ${efficiencyUnit} above ${formatMetric("cpc", client.rules.cpcMax)}`,
    });
  }

  const highCpm = efficiencyRows.filter((item) => item.cpm > client.rules.cpmMax);
  if (highCpm.length) {
    flags.push({
      id: createHealthIssueId("cpm-threshold", CALENDAR.spendRangeLabel, client.rules.cpmMax, highCpm.map(getEfficiencyKey).sort().join("|")),
      tone: "warning",
      label: "CPM above threshold",
      detail: `${highCpm.length} ${efficiencyUnit} above ${formatMetric("cpm", client.rules.cpmMax)}`,
    });
  }

  if (client.category === "eshop" && ga4?.revenueLastYearPeriod) {
    const drop = (ga4.revenueCurrentPeriod - ga4.revenueLastYearPeriod) / ga4.revenueLastYearPeriod;
    if (drop < -(client.rules.revenueDropTolerance / 100)) {
      flags.push({
        id: createHealthIssueId("revenue-drop-yoy", CALENDAR.revenueRangeLabel, client.rules.revenueDropTolerance),
        tone: "danger",
        label: "Revenue drop YoY",
        detail: `${(drop * 100).toFixed(1)}% on ${CALENDAR.revenueRangeLabel}`,
      });
    }
  }

  const activeFlags = filterResolvedHealthFlags(client, flags);

  return {
    ok: activeFlags.length === 0,
    flags: activeFlags,
    score: activeFlags.length * 100 + Math.abs(totalSpend - targetSpend),
  };
}

