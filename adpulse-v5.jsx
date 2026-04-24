import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createUser,
  deleteClientRecord,
  deleteUser,
  disconnectIntegrationProfile,
  fetchAiStrategy,
  fetchClients,
  fetchGa4LiveOverview,
  fetchGoogleAdsLiveOverview,
  fetchGoogleAdsReportDetails,
  fetchIntegrationSnapshot,
  fetchMetaAdsLiveOverview,
  fetchUsers,
  fetchSearchTermHierarchy,
  fetchSearchTermTags,
  fetchSearchTerms,
  fetchSetupStatus,
  getProviderStartUrl,
  loginUser,
  saveSearchTermTag,
  saveSetupCredentials,
  saveClientRecord,
  syncIntegrationProfile,
  updateUser,
} from "./src/integration-api.js";

const T = {
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

const CLIENT_TARGET_OPTIONS = [
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

const DEFAULT_CLIENT_TARGET = "Conversions";
const LEGACY_CLIENT_TARGET_LABEL = "Live media account";

function normalizeClientTarget(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === LEGACY_CLIENT_TARGET_LABEL.toLowerCase()) {
    return DEFAULT_CLIENT_TARGET;
  }

  const matched = CLIENT_TARGET_OPTIONS.find((option) => option.toLowerCase() === raw.toLowerCase());
  return matched || raw;
}

function buildCalendarWindow(now = new Date()) {
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

const CALENDAR = buildCalendarWindow();

const PLATFORM_META = {
  google_ads: { label: "Google Ads", short: "G", color: "#4285F4", tint: "rgba(66, 133, 244, 0.10)" },
  meta_ads: { label: "Meta Ads", short: "M", color: "#1877F2", tint: "rgba(24, 119, 242, 0.10)" },
  ga4: { label: "Google Analytics", short: "GA", color: "#F57C00", tint: "rgba(245, 124, 0, 0.10)" },
};

const CATEGORIES = [
  { key: "eshop", label: "E-shop", color: "#cf553e", tint: "rgba(207, 85, 62, 0.10)" },
  { key: "lead_gen", label: "Lead Gen", color: "#0f8f66", tint: "rgba(15, 143, 102, 0.10)" },
  { key: "b2b", label: "B2B", color: "#2d6cdf", tint: "rgba(45, 108, 223, 0.10)" },
  { key: "brand", label: "Brand", color: "#9966e8", tint: "rgba(153, 102, 232, 0.10)" },
];

const USER_ROLE_META = {
  director: { label: "Director", color: "#162218", tint: "rgba(22, 34, 24, 0.10)" },
  account: { label: "Account", color: "#2d6cdf", tint: "rgba(45, 108, 223, 0.10)" },
};

const USER_BLUEPRINTS = [
  { id: "usr-01", name: "Maria Papadaki", role: "director", title: "Performance Director", email: "director@adpulse.local", password: "demo123", accent: "#162218", accent2: "#2d6cdf" },
  { id: "usr-02", name: "Anna Kosta", role: "account", title: "Senior Account Manager", email: "anna@adpulse.local", password: "demo123", accent: "#0f8f66", accent2: "#78d1ad" },
  { id: "usr-03", name: "Nikos Lazos", role: "account", title: "Account Manager", email: "nikos@adpulse.local", password: "demo123", accent: "#2d6cdf", accent2: "#8db1ff" },
  { id: "usr-04", name: "Eleni Moraitou", role: "account", title: "Paid Media Manager", email: "eleni@adpulse.local", password: "demo123", accent: "#cf553e", accent2: "#f2b07c" },
  { id: "usr-05", name: "Kostas Marinis", role: "account", title: "Growth Account Manager", email: "kostas@adpulse.local", password: "demo123", accent: "#9966e8", accent2: "#c7a8ff" },
];

const PROVIDER_PROFILE_BLUEPRINTS = [
  { id: "profile-google-core", platform: "google_ads", name: "AdPulse Google MCC", email: "mcc@adpulse.local", externalId: "MCC-458-221-3901", scopeLabel: "Manager account", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:48", note: "Primary Google Ads manager account for always-on clients." },
  { id: "profile-google-growth", platform: "google_ads", name: "Growth Google MCC", email: "growth-mcc@adpulse.local", externalId: "MCC-458-221-3902", scopeLabel: "Manager account", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:37", note: "Used for growth and e-commerce client groups." },
  { id: "profile-meta-core", platform: "meta_ads", name: "AdPulse Meta Business", email: "bm@adpulse.local", externalId: "BM-991-224-76", scopeLabel: "Business Manager", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:44", note: "Main Meta business for prospecting and retargeting stacks." },
  { id: "profile-meta-scale", platform: "meta_ads", name: "Scale Meta Business", email: "scale-bm@adpulse.local", externalId: "BM-991-224-77", scopeLabel: "Business Manager", status: "attention", lastSyncedAt: "Apr 15, 2026 12:58", note: "Secondary Meta profile for scale-up accounts." },
  { id: "profile-ga4-main", platform: "ga4", name: "Main GA4 Portfolio", email: "analytics@adpulse.local", externalId: "GA4-1582", scopeLabel: "Analytics portfolio", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:46", note: "Default GA4 property portfolio for reporting." },
  { id: "profile-ga4-commerce", platform: "ga4", name: "Commerce GA4 Portfolio", email: "commerce-analytics@adpulse.local", externalId: "GA4-2017", scopeLabel: "Analytics portfolio", status: "healthy", lastSyncedAt: "Apr 15, 2026 13:29", note: "GA4 profile used for e-commerce revenue reporting." },
];

const DEFAULT_ACCOUNT_USER_IDS = USER_BLUEPRINTS.filter((user) => user.role === "account").map((user) => user.id);
const DEMO_USER_PASSWORD = "demo123";

const STORAGE_KEYS = {
  session: "adpulse/session",
  users: "adpulse/users",
  clients: "adpulse/liveClients",
  providerProfiles: "adpulse/providerProfiles",
  aiStrategy: "adpulse/aiStrategy",
  analyticsCharts: "adpulse/analyticsCharts",
  reportSections: "adpulse/reportSections",
  reportPreset: "adpulse/reportPreset",
  reportSchedulePlans: "adpulse/reportSchedulePlans",
};

const LEGACY_DEMO_CLIENT_STORAGE_KEY = "adpulse/clients";

const SEARCH_TERM_DATE_RANGE_OPTIONS = [
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_14_DAYS", label: "Last 14 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

const ACCOUNT_DATE_RANGE_OPTIONS = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "CUSTOM", label: "Custom range" },
];

const REPORT_SECTION_OPTIONS = [
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
  { id: "meta_ads", label: "Meta ads table", description: "Meta ad-level performance rows." },
  { id: "analytics", label: "GA4 analytics", description: "Live GA4 sessions, engagement, revenue/leads and traffic mix." },
  { id: "definitions", label: "Metric definitions", description: "Plain-English KPI definitions for the client." },
];

const DEFAULT_REPORT_SECTION_IDS = REPORT_SECTION_OPTIONS
  .map((section) => section.id)
  .filter((id) => id !== "strategist");

const REPORT_PRESETS = [
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

const DEFAULT_REPORT_SCHEDULE = {
  enabled: false,
  frequency: "monthly",
  weekday: "monday",
  dayOfMonth: "1",
  recipients: "",
  notes: "",
};

const SEARCH_TERM_TAG_META = {
  good: { label: "Good", color: T.accent, tint: T.accentSoft, border: "rgba(15, 143, 102, 0.18)" },
  bad: { label: "Bad / irrelevant", color: T.coral, tint: T.coralSoft, border: "rgba(215, 93, 66, 0.18)" },
  neutral: { label: "Neutral", color: T.amber, tint: T.amberSoft, border: "rgba(199, 147, 33, 0.18)" },
  untagged: { label: "Untagged", color: T.inkSoft, tint: T.bgSoft, border: T.line },
};

const SEARCH_TERM_ACTION_META = {
  keep: { label: "Keep", tone: "positive" },
  review: { label: "Review", tone: "warning" },
  consider_negative: { label: "Consider negative", tone: "danger" },
  add_negative: { label: "Add negative", tone: "danger" },
  needs_data: { label: "Needs data", tone: "neutral" },
  already_excluded: { label: "Already excluded", tone: "neutral" },
};

const SEARCH_TERM_ACTION_SORT_ORDER = {
  add_negative: 0,
  consider_negative: 1,
  review: 2,
  needs_data: 3,
  keep: 4,
  already_excluded: 5,
};

const SEARCH_TERM_SUGGESTION_STOPWORDS = new Set([
  "a", "an", "and", "are", "for", "from", "how", "into", "near", "not", "the", "this", "that", "with",
  "your", "you", "our", "out", "was", "were", "what", "when", "where", "why", "who",
  "και", "στη", "στο", "των", "τον", "την", "της", "στον", "στος", "στον", "για", "απο", "από",
  "πως", "πώς", "που", "πού", "ένα", "μια", "μία", "των", "τον", "των", "του", "της",
]);

const KPI_LIBRARY = {
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

const CONNECTION_GUIDE = {
  google_ads: {
    title: "Login with Google",
    body: "Grant the Google Ads scope once and AdPulse will sync every accessible customer account under that login.",
  },
  meta_ads: {
    title: "Login with Meta",
    body: "Grant Meta ad account and business permissions, then sync every accessible ad account from that user access.",
  },
  ga4: {
    title: "Login with Google",
    body: "Grant Analytics read access and AdPulse will import all visible GA4 accounts and properties.",
  },
};

const ADDITIVE_METRICS = new Set(["spend", "clicks", "conversions", "conversionValue", "revenue", "sessions", "users"]);

const ANALYTICS_CHART_PRESETS = [
  { id: "ga4-growth", label: "GA4 growth", scope: "ga4", metrics: ["sessions", "users"] },
  { id: "conversion-pulse", label: "Conversion pulse", scope: "ga4", metrics: ["conversions", "revenue"] },
  { id: "paid-efficiency", label: "Paid efficiency", scope: "client", metrics: ["spend", "conversionValue", "roas"] },
  { id: "traffic-to-sales", label: "Traffic to sales", scope: "client", metrics: ["clicks", "conversions", "revenue"] },
];

const CLIENT_BLUEPRINTS = [];

const GOOGLE_ACCOUNT_NAMES = ["Search Core", "Shopping", "Performance Max", "Brand Defense"];
const META_ACCOUNT_NAMES = ["Prospecting", "Retargeting", "Creative Testing", "Catalog Sales"];
const GOOGLE_CAMPAIGNS = ["Search Always On", "Brand Capture", "Performance Max", "Shopping Push"];
const META_CAMPAIGNS = ["Prospecting", "Retargeting", "Advantage+", "Story Push"];
const AD_NAMES = ["Hero Static", "Product Carousel", "Video Cutdown", "UGC Variant", "Offer Banner", "Collection Ad"];

function hashSeed(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seedUnit(seed, offset = 0) {
  const x = Math.sin(hashSeed(`${seed}-${offset}`)) * 10000;
  return x - Math.floor(x);
}

function seededInt(seed, min, max, offset = 0) {
  return Math.round(min + seedUnit(seed, offset) * (max - min));
}

function seededFloat(seed, min, max, offset = 0, decimals = 2) {
  return +(min + seedUnit(seed, offset) * (max - min)).toFixed(decimals);
}

function formatNumber(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function formatCurrency(value) {
  return `EUR ${Math.round(value).toLocaleString()}`;
}

function formatMetric(metricKey, value) {
  const spec = KPI_LIBRARY[metricKey];
  if (!spec) return formatNumber(value);
  if (spec.type === "currency") return `EUR ${value.toFixed(value >= 100 ? 0 : 2)}`;
  if (spec.type === "ratio") return `${value.toFixed(1)}x`;
  return formatNumber(value);
}

function getConversionValue(item) {
  const value = Number(item?.conversionValue);
  if (Number.isFinite(value) && value > 0) return value;

  const spend = Number(item?.spend) || 0;
  const roas = Number(item?.roas) || 0;
  return spend > 0 && roas > 0 ? spend * roas : 0;
}

function formatPercent(value, decimals = 2) {
  return `${Number(value || 0).toFixed(decimals)}%`;
}

function toDateInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getDefaultAccountDateRange() {
  const today = new Date();
  return {
    preset: "THIS_MONTH",
    startDate: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: toDateInputValue(today),
  };
}

function isValidDateInput(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidAccountDateRange(value) {
  if (value?.preset !== "CUSTOM") return true;
  return isValidDateInput(value.startDate) && isValidDateInput(value.endDate) && value.startDate <= value.endDate;
}

function getAccountDateRangePayload(value) {
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

function getAccountDateRangeLabel(value) {
  if (value?.preset === "CUSTOM") {
    return isValidAccountDateRange(value) ? `${value.startDate} - ${value.endDate}` : "Custom range";
  }

  return ACCOUNT_DATE_RANGE_OPTIONS.find((option) => option.value === value?.preset)?.label || "This month";
}

function formatSearchTermStatus(status) {
  if (status === "ADDED") return "Added";
  if (status === "ADDED_EXCLUDED") return "Added excluded";
  if (status === "EXCLUDED") return "Excluded";
  if (status === "NONE") return "Not targeted";
  return String(status || "Unknown").replaceAll("_", " ").toLowerCase().replace(/^\w/, (match) => match.toUpperCase());
}

function formatGoogleAdsEnum(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeSearchTermKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function buildSearchTermBenchmarks(rows) {
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

function deriveSearchTermEvaluation(term, benchmarks, { isPerformanceMax = false } = {}) {
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

function deriveSearchTermAutoTag(term, rules) {
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

function isInactiveSearchTerm(term) {
  return term.status === "EXCLUDED" || term.status === "ADDED_EXCLUDED";
}

function matchesSearchTermStatusFilter(term, filter) {
  if (filter === "active") return !isInactiveSearchTerm(term);
  if (filter === "inactive") return isInactiveSearchTerm(term);
  return true;
}

function sortSearchTermRows(rows, sort) {
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

function extractSuggestedNegatives(rows) {
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

function getClientTargetMode(target) {
  const normalized = normalizeClientTarget(target).toLowerCase();

  if (normalized === "sales" || normalized === "roas") return "revenue";
  if (normalized === "conversions" || normalized === "leads" || normalized === "app installs" || normalized === "store visits") return "conversion";
  if (normalized === "traffic" || normalized === "clicks" || normalized === "engagement") return "traffic";
  return "awareness";
}

function getSuggestedKeywordMatchType(target, searchTerm) {
  const targetMode = getClientTargetMode(target);
  const tokenCount = tokenizeNegativeCandidate(searchTerm).length;

  if (targetMode === "revenue" || targetMode === "conversion") return tokenCount >= 4 ? "Phrase" : "Exact";
  if (targetMode === "traffic") return tokenCount >= 4 ? "Broad" : "Phrase";
  return tokenCount >= 4 ? "Phrase" : "Broad";
}

function buildKeywordOpportunityReason(candidate, target) {
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

function extractKeywordOpportunities(rows, benchmarks, clientTarget, rules) {
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

function roundBudgetSuggestionAmount(value) {
  if (value <= 0) return 0;
  if (value < 200) return Math.round(value / 25) * 25;
  if (value < 1000) return Math.round(value / 50) * 50;
  return Math.round(value / 100) * 100;
}

function describeBudgetPerformance(summary, targetMode) {
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

function buildBudgetRecommendations(client) {
  const targetMode = getClientTargetMode(client.focus);
  const connectedPlatforms = ["google_ads", "meta_ads"].filter((platform) => client.connections?.[platform] || (client.budgets?.[platform] || 0) > 0);
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

function getAiPriorityTone(priority) {
  if (priority === "now") return "warning";
  if (priority === "later") return "neutral";
  return "positive";
}

function getAiPriorityLabel(priority) {
  if (priority === "now") return "Αμεσα";
  if (priority === "later") return "Αργοτερα";
  return "Επομενο";
}

function getAiConfidenceLabel(confidence) {
  if (confidence === "high") return "Υψηλη βεβαιοτητα";
  if (confidence === "low") return "Χαμηλη βεβαιοτητα";
  return "Μεσαια βεβαιοτητα";
}

function getAiAreaLabel(area) {
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

function formatAiGeneratedAt(value) {
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

function summarizeAiCampaign(campaign) {
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

function buildAccountAiPayload(client, dateRangeLabel) {
  const grouped = ["google_ads", "meta_ads"].map((platform) => {
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

function buildSearchTermsAiPayload({
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

function getAccountAiStrategyKey(client, dateRangeLabel) {
  if (!client?.id) return "";
  return ["account", client.id, dateRangeLabel || ""].join(":");
}

function getSearchTermsAiStrategyKey({
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

function tokenizeNegativeCandidate(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !SEARCH_TERM_SUGGESTION_STOPWORDS.has(token));
}

function downloadTextFile(filename, content) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 250);
}

function sanitizeFileFragment(value) {
  return String(value || "export")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "export";
}

function getCategoryMeta(key) {
  return CATEGORIES.find((item) => item.key === key) || CATEGORIES[0];
}

function fitCols(minWidth) {
  return `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`;
}

function splitTotal(total, count, seed) {
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

function getUserInitials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function getClientLogoText(name) {
  const parts = String(name || "Client").trim().split(/\s+/).filter(Boolean);
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
}

function defaultScopeForPlatform(platform) {
  if (platform === "google_ads") return "Manager account";
  if (platform === "meta_ads") return "Business Manager";
  return "Analytics portfolio";
}

function getEmptyLinkedAssets() {
  return {
    google_ads: [],
    meta_ads: [],
    ga4: [],
  };
}

function getLinkedAssetExternalId(platform, value) {
  let raw = value && typeof value === "object"
    ? String(value.externalId || "").trim()
    : String(value || "").trim();
  const prefix = `${platform}:`;

  if (raw.startsWith(prefix)) {
    const parts = raw.slice(prefix.length).split(":").filter(Boolean);
    raw = parts.at(-1) || "";
  }

  if (platform === "google_ads" || platform === "meta_ads" || platform === "ga4") {
    return sanitizeGoogleAdsId(raw);
  }

  return raw.trim();
}

function getLinkedAssetStableKey(platform, value) {
  const externalId = getLinkedAssetExternalId(platform, value);
  return externalId ? `${platform}:${externalId}` : "";
}

function sanitizeGoogleAdsId(value) {
  return String(value || "").replace(/\D/g, "");
}

function createEmptyIntegrationSnapshot() {
  return {
    configured: Object.keys(PLATFORM_META).reduce((acc, key) => ({
      ...acc,
      [key]: { ready: false, missing: [] },
    }), {}),
    connections: [],
  };
}

function createEmptyGoogleAdsLiveState() {
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

function createEmptyGoogleAdsReportState() {
  return {
    loading: false,
    error: "",
    generatedAt: "",
    details: [],
    errors: [],
  };
}

function createEmptyMetaAdsLiveState() {
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

function createEmptyGa4LiveState() {
  return {
    loading: false,
    error: "",
    generatedAt: "",
    properties: [],
    errors: [],
  };
}

function createEmptyUserDirectoryState() {
  return {
    loading: false,
    savingKey: "",
    error: "",
    notice: "",
  };
}

function createEmptyClientDirectoryState() {
  return {
    loading: false,
    savingKey: "",
    error: "",
    notice: "",
    lastSavedToken: "",
    lastSavedClientId: "",
  };
}

function createEmptyAiStrategistState() {
  return {
    loading: false,
    error: "",
    data: null,
    generatedAt: "",
    cached: false,
  };
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function createEmptyUserDraft(role = "account") {
  return {
    name: "",
    title: role === "director" ? "Director" : "Account Manager",
    email: "",
    role,
    password: "",
  };
}

function buildUsers() {
  return USER_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    initials: getUserInitials(blueprint.name),
    isSeeded: true,
  }));
}

function getAccountUserIds(users) {
  return (users || []).filter((user) => user.role === "account").map((user) => user.id);
}

function getDefaultAssignedUserIds(index) {
  const primary = DEFAULT_ACCOUNT_USER_IDS[index % DEFAULT_ACCOUNT_USER_IDS.length];
  const secondary = index % 3 === 0 ? DEFAULT_ACCOUNT_USER_IDS[(index + 1) % DEFAULT_ACCOUNT_USER_IDS.length] : null;
  const tertiary = index % 5 === 0 ? DEFAULT_ACCOUNT_USER_IDS[(index + 2) % DEFAULT_ACCOUNT_USER_IDS.length] : null;

  return Array.from(new Set([primary, secondary, tertiary].filter(Boolean)));
}

function getDefaultLinkedProfiles(index, gaEnabled) {
  return {
    google_ads: index % 3 === 0 ? "profile-google-growth" : "profile-google-core",
    meta_ads: index % 4 <= 1 ? "profile-meta-core" : "profile-meta-scale",
    ga4: gaEnabled ? (index % 2 === 0 ? "profile-ga4-commerce" : "profile-ga4-main") : null,
  };
}

function getDefaultSearchTermRules(category) {
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

function normalizeSearchTermRules(category, rules = {}) {
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

function getDefaultRules(category) {
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

const RECENT_STOPPED_CAMPAIGN_WINDOW_MS = 24 * 60 * 60 * 1000;

function normalizeIssueIdList(items) {
  return Array.isArray(items)
    ? Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)))
    : [];
}

function normalizeCampaignStatusMemory(value) {
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

function normalizeCampaignStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "stopped" || normalized === "paused" || normalized === "removed" || normalized === "archived") return "stopped";
  if (normalized === "learning") return "learning";
  return "active";
}

function isStoppedCampaign(campaign) {
  return normalizeCampaignStatus(campaign?.status) === "stopped";
}

function getCampaignMemoryKey(campaign) {
  return [
    campaign?.platform || "campaign",
    campaign?.accountId || campaign?.requestKey || "",
    campaign?.externalId || campaign?.rawCampaignId || campaign?.id || campaign?.name || "",
  ].filter(Boolean).join(":");
}

function isWithinRecentStopWindow(value, nowMs = Date.now()) {
  const stoppedAt = Date.parse(value || "");
  return Number.isFinite(stoppedAt) && nowMs - stoppedAt >= 0 && nowMs - stoppedAt <= RECENT_STOPPED_CAMPAIGN_WINDOW_MS;
}

function createHealthIssueId(type, ...parts) {
  return [type, ...parts.map((part) => String(part || "").trim()).filter(Boolean)].join(":");
}

function filterResolvedHealthFlags(client, flags) {
  const resolvedIds = new Set(normalizeIssueIdList(client?.resolvedIssueIds));
  const activeFlags = flags.filter((flag) => !resolvedIds.has(flag.id));

  return activeFlags;
}

function buildClients() {
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

function createLiveClientDraft(seed = Date.now()) {
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
    },
    connections: {
      google_ads: false,
      meta_ads: false,
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

function getClientEditorFingerprint(client) {
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
    },
    connections: {
      google_ads: client?.connections?.google_ads === true,
      meta_ads: client?.connections?.meta_ads === true,
      ga4: client?.connections?.ga4 === true,
    },
    linkedAssets: {
      google_ads: [...(client?.linkedAssets?.google_ads || [])].sort(),
      meta_ads: [...(client?.linkedAssets?.meta_ads || [])].sort(),
      ga4: [...(client?.linkedAssets?.ga4 || [])].sort(),
    },
    assignedUserIds: [...(client?.assignedUserIds || [])].sort(),
    rules: client?.rules || {},
  });
}

function spendFactorForMode(mode, platform, slot) {
  if (mode === "overspend") return platform === "google_ads" ? 1.16 + slot * 0.03 : 1.12 + slot * 0.02;
  if (mode === "underspend") return platform === "meta_ads" ? 0.82 + slot * 0.02 : 0.88 + slot * 0.02;
  return 0.96 + slot * 0.03;
}

function baseCpc(client, platform) {
  if (client.category === "eshop") return platform === "google_ads" ? 1.08 : 0.84;
  if (client.category === "lead_gen") return platform === "google_ads" ? 2.35 : 1.64;
  if (client.category === "b2b") return platform === "google_ads" ? 3.35 : 2.15;
  return platform === "google_ads" ? 1.42 : 1.12;
}

function baseCpm(client, platform) {
  if (client.category === "eshop") return platform === "google_ads" ? 6.2 : 8.4;
  if (client.category === "lead_gen") return platform === "google_ads" ? 10.2 : 12.5;
  if (client.category === "b2b") return platform === "google_ads" ? 12.6 : 14.2;
  return platform === "google_ads" ? 11.6 : 15.3;
}

function buildAccounts(clients) {
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

function buildCampaigns(accounts, clients) {
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

function buildAds(campaigns) {
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

function buildGa4(clients) {
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

function buildWeights(key) {
  const weights = Array.from({ length: 30 }, (_, index) => {
    const weekdayLift = index % 7 === 5 || index % 7 === 6 ? 0.92 : 1.06;
    return (0.82 + seedUnit(key, index) * 0.38) * weekdayLift;
  });
  const sum = weights.reduce((acc, value) => acc + value, 0);
  return weights.map((value) => value / sum);
}

function allocateSeries(total, key) {
  const weights = buildWeights(key);
  let used = 0;

  return weights.map((weight, index) => {
    if (index === weights.length - 1) return Math.max(0, Math.round(total - used));
    const value = Math.round(total * weight);
    used += value;
    return value;
  });
}

function normalizeProvidedSeries(points) {
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

function buildSeriesMap(clients, accounts, ga4) {
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

function buildLiveGa4Summary(client, reports, liveState) {
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

const CLIENTS_BASE = buildClients();
const USERS_BASE = buildUsers();
const PROVIDER_PROFILES_BASE = PROVIDER_PROFILE_BLUEPRINTS.map((profile) => ({ ...profile }));
const ACCOUNTS_BASE = buildAccounts(CLIENTS_BASE);
const CAMPAIGNS_BASE = buildCampaigns(ACCOUNTS_BASE, CLIENTS_BASE);
const ADS_BASE = buildAds(CAMPAIGNS_BASE);
const GA4_BASE = buildGa4(CLIENTS_BASE);
const SERIES_BASE = buildSeriesMap(CLIENTS_BASE, ACCOUNTS_BASE, GA4_BASE);

function readStoredValue(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function readStoredAiStrategyResult(storageKey) {
  if (!storageKey) return null;
  const stored = readStoredValue(STORAGE_KEYS.aiStrategy, {});
  return stored && typeof stored === "object" ? stored[storageKey] || null : null;
}

function writeStoredAiStrategyResult(storageKey, result) {
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

function hydrateUsers(value) {
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

function hydrateProviderProfiles(value) {
  if (!Array.isArray(value)) return PROVIDER_PROFILES_BASE;

  const mergedBase = PROVIDER_PROFILES_BASE.map((baseProfile) => {
    const stored = value.find((item) => item.id === baseProfile.id);
    return stored ? { ...baseProfile, ...stored } : baseProfile;
  });
  const extras = value.filter((item) => !PROVIDER_PROFILES_BASE.some((baseProfile) => baseProfile.id === item.id));

  return [...mergedBase, ...extras];
}

function hydrateClients(value) {
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

function evaluateHealth(client, accounts, campaigns, ga4) {
  const flags = [];
  const connectedPlatforms = ["google_ads", "meta_ads"].filter((platform) => client.connections[platform]);
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

function LogoMark({ client, size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.34),
        background: `linear-gradient(135deg, ${client.accent}, ${client.accent2})`,
        color: "#fff",
        fontFamily: T.heading,
        fontWeight: 700,
        fontSize: size * 0.28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 10px 22px ${client.accent}33`,
        letterSpacing: "-0.04em",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {client.logoImage ? (
        <img
          src={client.logoImage}
          alt={`${client.name} logo`}
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff", padding: Math.max(4, Math.round(size * 0.08)) }}
        />
      ) : (
        client.logoText || getClientLogoText(client.name)
      )}
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 999,
        background: ok ? T.accentSoft : T.coralSoft,
        color: ok ? T.accent : T.coral,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: ok ? T.accent : T.coral,
          boxShadow: `0 0 0 4px ${ok ? "rgba(15, 143, 102, 0.14)" : "rgba(215, 93, 66, 0.14)"}`,
        }}
      />
      {label || (ok ? "Green / healthy" : "Red / needs focus")}
    </div>
  );
}

function CategoryChip({ category }) {
  const meta = getCategoryMeta(category);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: meta.tint,
        color: meta.color,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {meta.label}
    </span>
  );
}

function RoleChip({ role }) {
  const meta = USER_ROLE_META[role] || USER_ROLE_META.account;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: meta.tint,
        color: meta.color,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {meta.label}
    </span>
  );
}

function UserAvatar({ user, size = 32 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.38),
        background: `linear-gradient(135deg, ${user.accent}, ${user.accent2})`,
        color: "#fff",
        fontFamily: T.heading,
        fontWeight: 800,
        fontSize: Math.max(11, size * 0.3),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        letterSpacing: "-0.04em",
        boxShadow: `0 10px 20px ${user.accent}24`,
        flexShrink: 0,
      }}
    >
      {user.initials}
    </div>
  );
}

function PlatformChip({ platform }) {
  const meta = PLATFORM_META[platform];
  if (!meta) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: meta.tint,
        color: meta.color,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 7,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${meta.color}18`,
          border: `1px solid ${meta.color}22`,
        }}
      >
        {meta.short}
      </span>
      {meta.label}
    </span>
  );
}

function AssignedUsersStrip({ client, users, label = "Assigned" }) {
  const assignedUsers = users.filter((user) => client.assignedUserIds?.includes(user.id));

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 10, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>{label}</div>
      {assignedUsers.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {assignedUsers.map((user) => (
            <div
              key={user.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                background: T.surfaceStrong,
                border: `1px solid ${T.line}`,
              }}
            >
              <UserAvatar user={user} size={24} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>{user.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <ToneBadge tone="warning">Unassigned</ToneBadge>
      )}
    </div>
  );
}

function ProviderProfilePill({ profile }) {
  const tone = profile.status === "attention" || profile.status === "error" ? "warning" : "positive";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <PlatformChip platform={profile.platform} />
      <ToneBadge tone={tone}>{profile.name}</ToneBadge>
    </div>
  );
}

function IntegrationHub({
  providerProfiles,
  clients,
  configured,
  loading,
  error,
  busyMap,
  onConnect,
  onSync,
  onDisconnect,
  layoutColumns,
  setupStatus,
  aiForm,
  onAiFormChange,
  onSaveAiConfig,
  aiSetupState,
}) {
  const byPlatform = {
    google_ads: providerProfiles.filter((profile) => profile.platform === "google_ads"),
    meta_ads: providerProfiles.filter((profile) => profile.platform === "meta_ads"),
    ga4: providerProfiles.filter((profile) => profile.platform === "ga4"),
  };
  const totalAssets = providerProfiles.reduce((acc, profile) => acc + (profile.assets?.length || 0), 0);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: fitCols(180), gap: 12 }}>
        <MetricTile label="Connected Logins" value={providerProfiles.length} subValue="OAuth sessions stored server-side" />
        <MetricTile label="Synced Assets" value={totalAssets} subValue="Ad accounts and GA4 properties" />
        <MetricTile label="Google Ads" value={byPlatform.google_ads.reduce((acc, profile) => acc + (profile.assets?.length || 0), 0)} subValue={`${byPlatform.google_ads.length} Google login${byPlatform.google_ads.length === 1 ? "" : "s"}`} />
        <MetricTile label="Meta + GA4" value={byPlatform.meta_ads.reduce((acc, profile) => acc + (profile.assets?.length || 0), 0) + byPlatform.ga4.reduce((acc, profile) => acc + (profile.assets?.length || 0), 0)} subValue="Cross-channel asset catalog" />
      </div>

      {error ? (
        <div style={{ padding: 14, borderRadius: 18, background: T.coralSoft, color: T.coral, border: `1px solid rgba(215, 93, 66, 0.16)`, fontSize: 12, fontWeight: 700 }}>
          {error}
        </div>
      ) : null}

      <div
        style={{
          padding: 20,
          borderRadius: 24,
          background: T.surface,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <ToneBadge tone={setupStatus?.configured?.ANTHROPIC_API_KEY ? "positive" : "warning"}>
              {setupStatus?.configured?.ANTHROPIC_API_KEY ? "AI strategist enabled" : "AI strategist optional"}
            </ToneBadge>
            <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, fontFamily: T.heading }}>AI strategist</div>
            <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>
              Connect an Anthropic API key to enable Claude Sonnet strategy recommendations on the Accounts and Search Terms screens. This layer reasons over the live dashboard context instead of using a fixed recommendation rule list.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {setupStatus?.masked?.ANTHROPIC_API_KEY ? <ToneBadge tone="neutral">{setupStatus.masked.ANTHROPIC_API_KEY}</ToneBadge> : null}
            <ToneBadge tone="neutral">{setupStatus?.masked?.ANTHROPIC_STRATEGIST_MODEL || "claude-sonnet-4-6"}</ToneBadge>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: fitCols(240), gap: 12 }}>
          <div>
            <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Anthropic API key</div>
            <input
              value={aiForm.ANTHROPIC_API_KEY}
              onChange={(event) => onAiFormChange("ANTHROPIC_API_KEY", event.target.value)}
              placeholder="sk-ant-..."
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 13px", borderRadius: 14, border: `1px solid ${T.line}`, background: T.surfaceStrong, color: T.ink, fontSize: 13, outline: "none", fontFamily: T.mono }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Model</div>
            <input
              value={aiForm.ANTHROPIC_STRATEGIST_MODEL}
              onChange={(event) => onAiFormChange("ANTHROPIC_STRATEGIST_MODEL", event.target.value)}
              placeholder="claude-sonnet-4-6"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 13px", borderRadius: 14, border: `1px solid ${T.line}`, background: T.surfaceStrong, color: T.ink, fontSize: 13, outline: "none", fontFamily: T.mono }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button onClick={onSaveAiConfig} tone="primary" disabled={aiSetupState?.saving}>
            {aiSetupState?.saving ? "Saving..." : "Save AI settings"}
          </Button>
          <div style={{ fontSize: 12, color: T.inkSoft }}>
            Leave the model blank to use the default strategist model.
          </div>
        </div>

        {aiSetupState?.error ? (
          <div style={{ padding: 12, borderRadius: 16, background: T.coralSoft, border: `1px solid rgba(215, 93, 66, 0.16)`, color: T.coral, fontSize: 12, fontWeight: 700 }}>
            {aiSetupState.error}
          </div>
        ) : null}
        {aiSetupState?.success ? (
          <div style={{ padding: 12, borderRadius: 16, background: T.accentSoft, border: `1px solid rgba(15, 143, 102, 0.16)`, color: T.accent, fontSize: 12, fontWeight: 700 }}>
            {aiSetupState.success}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: layoutColumns, gap: 18 }}>
        {Object.keys(PLATFORM_META).map((platform) => {
          const platformProfiles = byPlatform[platform];
          const config = configured?.[platform] || { ready: false, missing: [] };

          return (
            <div
              key={platform}
              style={{
                padding: 20,
                borderRadius: 24,
                background: T.surface,
                border: `1px solid ${T.line}`,
                boxShadow: T.shadow,
                display: "grid",
                gap: 16,
                alignContent: "start",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <PlatformChip platform={platform} />
                  <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, fontFamily: T.heading }}>{CONNECTION_GUIDE[platform].title}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{CONNECTION_GUIDE[platform].body}</div>
                </div>
                <ToneBadge tone={config.ready ? "positive" : "warning"}>
                  {config.ready ? "Ready to connect" : "Needs credentials"}
                </ToneBadge>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: fitCols(120), gap: 10 }}>
                <MetricTile label="Connected logins" value={platformProfiles.length} subValue="One login can sync many assets" />
                <MetricTile label="Synced assets" value={platformProfiles.reduce((acc, profile) => acc + (profile.assets?.length || 0), 0)} subValue={platform === "ga4" ? "Properties available to link" : "Accounts available to link"} />
              </div>

              {!config.ready ? (
                <div style={{ padding: 12, borderRadius: 16, background: T.amberSoft, color: T.amber, fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
                  Missing env vars: {config.missing.join(", ")}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button onClick={() => onConnect(platform)} tone="primary" disabled={!config.ready || !!busyMap[`connect-${platform}`]}>
                  {platformProfiles.length ? "Connect another login" : "Start login flow"}
                </Button>
              </div>

              {platformProfiles.length ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {platformProfiles.map((profile) => {
                    const assetIds = new Set((profile.assets || []).map((asset) => asset.id));
                    const linkedClients = clients.filter((client) => (client.linkedAssets?.[platform] || []).some((assetId) => assetIds.has(assetId)));

                    return (
                      <div
                        key={profile.id}
                        style={{
                          padding: 14,
                          borderRadius: 18,
                          background: T.surfaceStrong,
                          border: `1px solid ${T.line}`,
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <ProviderProfilePill profile={profile} />
                            <div style={{ marginTop: 8, fontSize: 12, color: T.inkSoft }}>{profile.scopeLabel} | {profile.email || "Email unavailable"}</div>
                            <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>{profile.externalId || "No external ID yet"}</div>
                          </div>
                          <ToneBadge tone={profile.status === "attention" || profile.lastError ? "warning" : "positive"}>
                            {profile.status === "attention" || profile.lastError ? "Needs attention" : "Healthy"}
                          </ToneBadge>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: fitCols(120), gap: 10 }}>
                          <MetricTile label="Assets" value={profile.assets?.length || 0} subValue={platform === "ga4" ? "GA4 properties" : "Ad accounts"} />
                          <MetricTile label="Clients linked" value={linkedClients.length} subValue="Matched from Client Studio" />
                        </div>

                        <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>
                          {profile.note || "Connected successfully."}
                          {profile.lastSyncedAt ? ` Last sync: ${profile.lastSyncedAt}.` : ""}
                          {profile.lastError ? ` Error: ${profile.lastError}` : ""}
                        </div>

                        {profile.assets?.length ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {profile.assets.slice(0, 6).map((asset) => (
                              <div key={asset.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, background: T.bgSoft, border: `1px solid ${T.line}`, maxWidth: "100%" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.name}</span>
                                <span style={{ fontSize: 10, color: T.inkSoft }}>{asset.externalId}</span>
                              </div>
                            ))}
                            {profile.assets.length > 6 ? <ToneBadge tone="neutral">+{profile.assets.length - 6} more</ToneBadge> : null}
                          </div>
                        ) : (
                          <ToneBadge tone="warning">No synced assets yet</ToneBadge>
                        )}

                        {linkedClients.length ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {linkedClients.map((client) => (
                              <div key={`${profile.id}-${client.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, background: T.surfaceMuted, border: `1px solid ${T.line}` }}>
                                <LogoMark client={client} size={20} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>{client.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <Button onClick={() => onSync(profile.id)} tone="primary" disabled={!!busyMap[profile.id]}>
                            Sync now
                          </Button>
                          <Button onClick={() => onDisconnect(profile.id)} disabled={!!busyMap[`${profile.id}-disconnect`]}>
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: 12, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}`, color: T.inkSoft, fontSize: 12 }}>
                  {loading ? "Checking existing logins..." : `No ${PLATFORM_META[platform].label} login connected yet.`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricTile({ label, value, subValue, accent }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: T.surfaceMuted,
        border: `1px solid ${T.line}`,
        display: "grid",
        alignContent: "start",
        minHeight: 92,
      }}
    >
      <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: "clamp(1.2rem, 1.7vw, 1.75rem)", color: accent || T.ink, fontWeight: 800, fontFamily: T.heading, letterSpacing: "-0.05em", lineHeight: 1.05 }}>{value}</div>
      {subValue ? <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>{subValue}</div> : null}
    </div>
  );
}

function ProgressRail({ current, target }) {
  const ratio = target > 0 ? current / target : 1;
  const tone = ratio > 1.1 || ratio < 0.9 ? T.coral : T.accent;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 999, background: "rgba(22, 34, 24, 0.08)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "100%", top: -2, width: 2, height: 12, background: T.inkMute, opacity: 0.45 }} />
        <div style={{ width: `${Math.min(ratio, 1.28) * 100}%`, height: "100%", borderRadius: 999, background: tone }} />
      </div>
      <span style={{ minWidth: 52, textAlign: "right", fontSize: 11, fontWeight: 800, color: tone, fontFamily: T.mono }}>{(ratio * 100).toFixed(0)}%</span>
    </div>
  );
}

function AlertList({ health, clientId, onResolveIssue }) {
  if (health.ok) {
    return (
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          background: T.accentSoft,
          color: T.accent,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        No red flags. This client is clean at a glance.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {health.flags.slice(0, 3).map((flag) => (
        <div
          key={flag.id || `${flag.label}-${flag.detail}`}
          style={{
            padding: 12,
            borderRadius: 14,
            background: flag.tone === "warning" ? T.amberSoft : T.coralSoft,
            color: flag.tone === "warning" ? T.amber : T.coral,
            border: `1px solid ${flag.tone === "warning" ? "rgba(199, 147, 33, 0.12)" : "rgba(215, 93, 66, 0.10)"}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 180px" }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>{flag.label}</div>
              <div style={{ marginTop: 3, fontSize: 11, color: T.inkSoft }}>{flag.detail}</div>
            </div>
            {clientId && flag.id && onResolveIssue ? (
              <button
                type="button"
                onClick={() => onResolveIssue(clientId, flag.id)}
                style={{
                  border: `1px solid ${flag.tone === "warning" ? "rgba(199, 147, 33, 0.22)" : "rgba(215, 93, 66, 0.22)"}`,
                  background: T.surfaceStrong,
                  color: flag.tone === "warning" ? T.amber : T.coral,
                  borderRadius: 10,
                  padding: "6px 9px",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: T.font,
                  whiteSpace: "nowrap",
                }}
              >
                Mark resolved
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 18,
        background: T.surface,
        border: `1px dashed ${T.lineStrong}`,
        color: T.inkSoft,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 12 }}>{body}</div>
    </div>
  );
}

function ReportingGroupSection({ group, children, showRollup = true }) {
  return (
    <section
      style={{
        padding: 18,
        borderRadius: 24,
        background: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Reporting Group</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, fontFamily: T.heading, letterSpacing: "-0.05em", color: T.ink }}>{group.label}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft }}>
            {group.clientsCount} client{group.clientsCount === 1 ? "" : "s"} | {group.accounts} account{group.accounts === 1 ? "" : "s"} | {group.activeCampaigns} active campaign{group.activeCampaigns === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusPill ok={group.needsAttention === 0} label={group.needsAttention === 0 ? "All clients healthy" : `${group.needsAttention} client${group.needsAttention === 1 ? "" : "s"} need attention`} />
        </div>
      </div>

      {showRollup ? (
        <div style={{ display: "grid", gridTemplateColumns: fitCols(132), gap: 10 }}>
          <MetricTile label="Group Budget" value={formatCurrency(group.totalBudget)} />
          <MetricTile label="Group Spend" value={formatCurrency(group.spend)} />
          <MetricTile label="Conv. Value" value={formatCurrency(group.conversionValue)} />
          <MetricTile label="ROAS" value={formatMetric("roas", group.roas)} accent={group.roas >= 3 ? T.accent : T.ink} />
          <MetricTile label="Conversions" value={formatNumber(group.conversions)} />
        </div>
      ) : null}

      {children}
    </section>
  );
}

function LoginScreen({ users, demoUsers, form, onFormChange, onSubmit, onQuickLogin, error }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: T.font, letterSpacing: "-0.01em", padding: "clamp(16px, 3vw, 36px)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: fitCols(360), gap: 22, alignItems: "start" }}>
        <div
          style={{
            position: "relative",
            padding: "clamp(24px, 3vw, 34px)",
            borderRadius: 30,
            overflow: "hidden",
            background: "linear-gradient(135deg, #fff7ea 0%, #f7efe5 42%, #edf6f1 100%)",
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            display: "grid",
            gap: 18,
            minHeight: 460,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at top right, rgba(15, 143, 102, 0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(45, 108, 223, 0.10), transparent 36%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", display: "grid", gap: 18 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #0f8f66, #2d6cdf)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontFamily: T.heading }}>
                AP
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: T.heading }}>AdPulse</div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>Director + Account access for client-based ad operations</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "clamp(2.1rem, 4vw, 3.4rem)", lineHeight: 1.02, fontWeight: 800, fontFamily: T.heading, letterSpacing: "-0.05em" }}>
                Login for role-based visibility and client assignment control.
              </div>
              <div style={{ marginTop: 12, fontSize: 15, color: T.inkSoft, maxWidth: 620, lineHeight: 1.5 }}>
                Directors get full access across all customers. Account users only see the clients assigned to them, across overview, accounts, analytics and alerts.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: fitCols(150), gap: 12 }}>
              <MetricTile label="Roles" value="2" subValue="Director + Account" />
              <MetricTile label="Assignments" value="Multi-user" subValue="One client can belong to multiple account users" />
              <MetricTile label="Profile" value="Included" subValue="Each user gets profile + access summary" />
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "clamp(22px, 2.5vw, 28px)",
            borderRadius: 28,
            background: T.surface,
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Sign in</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, fontFamily: T.heading }}>Welcome back</div>
            <div style={{ marginTop: 6, fontSize: 13, color: T.inkSoft }}>
              Use your saved credentials. Seeded demo users still use password <span style={{ fontFamily: T.mono, color: T.ink }}>{DEMO_USER_PASSWORD}</span>.
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            style={{ display: "grid", gap: 12 }}
          >
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Email</div>
              <input
                value={form.email}
                onChange={(event) => onFormChange("email", event.target.value)}
                placeholder="director@adpulse.local"
                style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 16, border: `1px solid ${T.line}`, background: T.surfaceStrong, color: T.ink, fontSize: 13, outline: "none", fontFamily: T.font }}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Password</div>
              <input
                type="password"
                value={form.password}
                onChange={(event) => onFormChange("password", event.target.value)}
                placeholder="demo123"
                style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 16, border: `1px solid ${T.line}`, background: T.surfaceStrong, color: T.ink, fontSize: 13, outline: "none", fontFamily: T.font }}
              />
            </div>

            {error ? (
              <div style={{ padding: "11px 12px", borderRadius: 14, background: T.coralSoft, color: T.coral, fontSize: 12, fontWeight: 700 }}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              style={{
                padding: "11px 14px",
                borderRadius: 12,
                border: "none",
                background: T.ink,
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Login
            </button>
          </form>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Quick demo access</div>
            {(demoUsers || []).length ? demoUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => onQuickLogin(user.id)}
                style={{
                  padding: 12,
                  borderRadius: 18,
                  border: `1px solid ${T.line}`,
                  background: T.surfaceStrong,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: T.font,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <UserAvatar user={user} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{user.name}</div>
                      <RoleChip role={user.role} />
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.inkSoft, whiteSpace: "nowrap" }}>Use demo</div>
              </button>
            )) : (
              <div style={{ padding: 12, borderRadius: 16, background: T.bgSoft, color: T.inkSoft, fontSize: 12 }}>
                No seeded demo users are available in this environment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ user, draft, onDraftChange, onSave, onClose, onLogout, assignedClients }) {
  return (
    <div
      style={{
        width: "min(100%, 420px)",
        padding: 20,
        borderRadius: 24,
        background: "rgba(255, 252, 247, 0.98)",
        border: `1px solid ${T.lineStrong}`,
        boxShadow: "0 24px 60px rgba(25, 36, 29, 0.18)",
        backdropFilter: "blur(20px) saturate(1.08)",
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <UserAvatar user={user} size={42} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>{user.name}</div>
              <RoleChip role={user.role} />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>{user.email}</div>
          </div>
        </div>
        <Button onClick={onClose}>Close</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: fitCols(120), gap: 10 }}>
        <MetricTile label="Access" value={user.role === "director" ? "All" : assignedClients.length} subValue={user.role === "director" ? "Full client portfolio" : "Assigned clients"} />
        <MetricTile label="Role" value={USER_ROLE_META[user.role]?.label || user.role} subValue={user.title} />
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Display name</div>
          <input value={draft.name} onChange={(event) => onDraftChange("name", event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "12px 13px", borderRadius: 14, border: `1px solid ${T.line}`, background: T.surfaceStrong, color: T.ink, fontSize: 13, outline: "none", fontFamily: T.font }} />
        </div>
        <div>
          <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Title</div>
          <input value={draft.title} onChange={(event) => onDraftChange("title", event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "12px 13px", borderRadius: 14, border: `1px solid ${T.line}`, background: T.surfaceStrong, color: T.ink, fontSize: 13, outline: "none", fontFamily: T.font }} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Client access</div>
        {user.role === "director" ? (
          <div style={{ padding: 12, borderRadius: 16, background: T.accentSoft, color: T.accent, fontSize: 12, fontWeight: 700 }}>
            Directors can view and manage every client, every account and all assignments.
          </div>
        ) : assignedClients.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {assignedClients.map((client) => (
              <div key={client.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, background: T.surfaceStrong, border: `1px solid ${T.line}` }}>
                <LogoMark client={client} size={24} />
                <span style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>{client.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <ToneBadge tone="warning">No clients assigned yet</ToneBadge>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={onSave} tone="primary">Save profile</Button>
          <Button onClick={onLogout}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}

function UserAdminPanel({ users, clients, currentUserId, state, onCreateUser, onUpdateUser, onDeleteUser }) {
  const [createDraft, setCreateDraft] = useState(() => createEmptyUserDraft());
  const [editDrafts, setEditDrafts] = useState(() => Object.fromEntries((users || []).map((user) => [user.id, { ...createEmptyUserDraft(user.role), ...user, password: "" }])));
  const totalDirectors = users.filter((user) => user.role === "director").length;
  const totalAccounts = users.filter((user) => user.role === "account").length;

  useEffect(() => {
    setEditDrafts(Object.fromEntries((users || []).map((user) => [user.id, { ...createEmptyUserDraft(user.role), ...user, password: "" }])));
  }, [users]);

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: 14,
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: 13,
    outline: "none",
    fontFamily: T.font,
  };
  const labelStyle = { marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" };

  async function handleCreate() {
    const created = await onCreateUser(createDraft);
    if (created) {
      setCreateDraft(createEmptyUserDraft());
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: fitCols(180), gap: 12 }}>
        <MetricTile label="Total users" value={users.length} subValue="Persisted server-side" />
        <MetricTile label="Directors" value={totalDirectors} subValue="Full portfolio access" />
        <MetricTile label="Account users" value={totalAccounts} subValue="Client-assigned visibility" />
      </div>

      {state.error ? (
        <div style={{ padding: "12px 14px", borderRadius: 16, background: T.coralSoft, color: T.coral, fontSize: 12, fontWeight: 700 }}>
          {state.error}
        </div>
      ) : null}
      {state.notice ? (
        <div style={{ padding: "12px 14px", borderRadius: 16, background: T.accentSoft, color: T.accent, fontSize: 12, fontWeight: 700 }}>
          {state.notice}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 380px) minmax(0, 1fr)", gap: 18 }}>
        <div style={{ padding: 18, borderRadius: 24, background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow, display: "grid", gap: 14, alignSelf: "start" }}>
          <div>
            <div style={{ fontSize: 12, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Create user</div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, fontFamily: T.heading }}>New login account</div>
            <div style={{ marginTop: 6, fontSize: 13, color: T.inkSoft }}>Create either a Director or an Account user. Account users can then be assigned to clients in Client Studio.</div>
          </div>

          <div>
            <div style={labelStyle}>Role</div>
            <select value={createDraft.role} onChange={(event) => setCreateDraft((current) => ({ ...current, role: event.target.value, title: event.target.value === "director" ? "Director" : current.title || "Account Manager" }))} style={fieldStyle}>
              <option value="account">Account</option>
              <option value="director">Director</option>
            </select>
          </div>
          <div>
            <div style={labelStyle}>Full name</div>
            <input value={createDraft.name} onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Jane Doe" style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Title</div>
            <input value={createDraft.title} onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))} placeholder={createDraft.role === "director" ? "Director" : "Account Manager"} style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Email</div>
            <input value={createDraft.email} onChange={(event) => setCreateDraft((current) => ({ ...current, email: event.target.value }))} placeholder="jane@company.com" style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Password</div>
            <input type="password" value={createDraft.password} onChange={(event) => setCreateDraft((current) => ({ ...current, password: event.target.value }))} placeholder="At least 6 characters" style={fieldStyle} />
          </div>
          <Button onClick={handleCreate} tone="primary" disabled={state.savingKey === "__create__"}>{state.savingKey === "__create__" ? "Creating..." : "Create account"}</Button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {users.map((user) => {
            const draft = editDrafts[user.id] || { ...createEmptyUserDraft(user.role), ...user, password: "" };
            const assignedClients = clients.filter((client) => client.assignedUserIds?.includes(user.id));
            const canDelete = user.id !== currentUserId && !(user.role === "director" && totalDirectors <= 1);

            return (
              <div key={user.id} style={{ padding: 18, borderRadius: 24, background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <UserAvatar user={user} size={40} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{user.name}</div>
                        <RoleChip role={user.role} />
                        {user.id === currentUserId ? <ToneBadge tone="positive">Current session</ToneBadge> : null}
                        {user.isSeeded ? <ToneBadge tone="neutral">Seeded demo</ToneBadge> : null}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>{user.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <MetricTile label="Clients" value={user.role === "director" ? "All" : assignedClients.length} subValue={user.role === "director" ? "Full access" : "Assigned"} />
                    <MetricTile label="Role" value={USER_ROLE_META[user.role]?.label || user.role} subValue={draft.title} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 12 }}>
                  <div>
                    <div style={labelStyle}>Full name</div>
                    <input value={draft.name} onChange={(event) => setEditDrafts((current) => ({ ...current, [user.id]: { ...draft, name: event.target.value } }))} style={fieldStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>Title</div>
                    <input value={draft.title} onChange={(event) => setEditDrafts((current) => ({ ...current, [user.id]: { ...draft, title: event.target.value } }))} style={fieldStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>Email</div>
                    <input value={draft.email} onChange={(event) => setEditDrafts((current) => ({ ...current, [user.id]: { ...draft, email: event.target.value } }))} style={fieldStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>Role</div>
                    <select value={draft.role} onChange={(event) => setEditDrafts((current) => ({ ...current, [user.id]: { ...draft, role: event.target.value } }))} style={fieldStyle}>
                      <option value="account">Account</option>
                      <option value="director">Director</option>
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>New password</div>
                    <input type="password" value={draft.password} onChange={(event) => setEditDrafts((current) => ({ ...current, [user.id]: { ...draft, password: event.target.value } }))} placeholder="Leave blank to keep current password" style={fieldStyle} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {user.role === "director" ? (
                      <ToneBadge tone="positive">Directors can access all clients</ToneBadge>
                    ) : assignedClients.length ? assignedClients.map((client) => (
                      <ToneBadge key={`${user.id}-${client.id}`} tone="neutral">{client.name}</ToneBadge>
                    )) : (
                      <ToneBadge tone="warning">No clients assigned yet</ToneBadge>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button onClick={() => onDeleteUser(user)} tone="danger" disabled={!canDelete || state.savingKey === `delete:${user.id}`}>
                      {state.savingKey === `delete:${user.id}` ? "Deleting..." : "Delete user"}
                    </Button>
                    <Button onClick={() => onUpdateUser(user.id, draft)} tone="primary" disabled={state.savingKey === user.id}>
                      {state.savingKey === user.id ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Button({ children, onClick, active, tone = "soft", disabled = false, buttonRef = null, emphasize = false }) {
  const isPrimary = tone === "primary";
  const isDanger = tone === "danger";
  const isSuccess = tone === "success";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: isPrimary || isDanger || isSuccess ? "none" : `1px solid ${active ? T.lineStrong : T.line}`,
        background: disabled ? T.bgSoft : isSuccess ? T.accent : isPrimary ? T.ink : isDanger ? T.coral : active ? T.accentSoft : T.surfaceStrong,
        color: disabled ? T.inkMute : isPrimary || isDanger || isSuccess ? "#fff" : active ? T.accent : T.inkSoft,
        fontSize: 12,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: T.font,
        maxWidth: "100%",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.7 : 1,
        transform: emphasize ? "translateY(-1px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: emphasize ? `0 14px 30px ${isSuccess ? "rgba(15, 143, 102, 0.28)" : "rgba(22, 34, 24, 0.12)"}` : "none",
        transition: "transform 180ms ease, box-shadow 220ms ease, background 220ms ease, color 220ms ease, border-color 220ms ease, opacity 220ms ease",
      }}
    >
      {children}
    </button>
  );
}

function ToneBadge({ tone = "neutral", children }) {
  const tones = {
    neutral: { background: T.surfaceStrong, color: T.inkSoft, border: T.line },
    positive: { background: T.accentSoft, color: T.accent, border: "rgba(15, 143, 102, 0.14)" },
    danger: { background: T.coralSoft, color: T.coral, border: "rgba(215, 93, 66, 0.14)" },
    warning: { background: T.amberSoft, color: T.amber, border: "rgba(199, 147, 33, 0.16)" },
  };
  const theme = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: theme.background,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function ActionCue({ tone = "neutral", children }) {
  const tones = {
    neutral: { background: T.surfaceStrong, color: T.inkSoft, border: T.line, dot: T.inkMute },
    success: { background: T.accentSoft, color: T.accent, border: "rgba(15, 143, 102, 0.16)", dot: T.accent },
    info: { background: "rgba(45, 108, 223, 0.10)", color: T.sky, border: "rgba(45, 108, 223, 0.16)", dot: T.sky },
    warning: { background: T.amberSoft, color: T.amber, border: "rgba(199, 147, 33, 0.16)", dot: T.amber },
    danger: { background: T.coralSoft, color: T.coral, border: "rgba(215, 93, 66, 0.16)", dot: T.coral },
  };
  const theme = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 11px",
        borderRadius: 999,
        background: theme.background,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        maxWidth: "100%",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.dot, flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
    </span>
  );
}

function AiRecommendationCard({ item }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: T.surfaceStrong,
        border: `1px solid ${T.line}`,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{item.title}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ToneBadge tone={getAiPriorityTone(item.priority)}>{getAiPriorityLabel(item.priority)}</ToneBadge>
          <ToneBadge tone="neutral">{getAiAreaLabel(item.area)}</ToneBadge>
          <ToneBadge tone={item.confidence === "high" ? "positive" : item.confidence === "low" ? "warning" : "neutral"}>
            {getAiConfidenceLabel(item.confidence)}
          </ToneBadge>
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.6 }}>{item.action}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{item.why}</div>
      <div style={{ fontSize: 11, color: T.inkMute, lineHeight: 1.5 }}>
        Αναμενομενο αποτελεσμα: {item.expectedImpact}
      </div>
    </div>
  );
}

function AiStrategyOutput({ result }) {
  const strategy = result?.strategy;
  if (!strategy) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {result?.model ? <ToneBadge tone="neutral">{result.model}</ToneBadge> : null}
          {result?.generatedAt ? <ToneBadge tone="neutral">{formatAiGeneratedAt(result.generatedAt)}</ToneBadge> : null}
          {result?.cached ? <ToneBadge tone="warning">Cached result</ToneBadge> : null}
        </div>
      </div>

      <div style={{ padding: 14, borderRadius: 16, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Τι δεν παει καλα</div>
          <div style={{ marginTop: 6, fontSize: 13, color: T.ink, lineHeight: 1.65 }}>{strategy.performanceDiagnosis}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, fontFamily: T.heading }}>Επομενη κινηση</div>
        <AiRecommendationCard item={strategy.nextBestAction} />
      </div>

      {strategy.recommendations?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, fontFamily: T.heading }}>Επομενα βηματα</div>
          <div style={{ display: "grid", gap: 10 }}>
            {strategy.recommendations.map((item, index) => (
              <AiRecommendationCard key={`${item.title}-${index}`} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      {strategy.keywordOpportunities?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, fontFamily: T.heading }}>Προτασεις keywords</div>
          <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 10 }}>
            {strategy.keywordOpportunities.map((item, index) => (
              <div key={`${item.keyword}-${index}`} style={{ padding: 14, borderRadius: 16, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{item.keyword}</div>
                  <ToneBadge tone={getAiPriorityTone(item.priority)}>{getAiPriorityLabel(item.priority)}</ToneBadge>
                </div>
                <div style={{ fontSize: 11, color: T.inkMute }}>Match type: {item.suggestedMatchType || "Για review"}</div>
                <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{item.why}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {strategy.negativeKeywordSuggestions?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, fontFamily: T.heading }}>Προτασεις negative keywords</div>
          <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 10 }}>
            {strategy.negativeKeywordSuggestions.map((item, index) => (
              <div key={`${item.keyword}-${index}`} style={{ padding: 14, borderRadius: 16, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{item.keyword}</div>
                  <ToneBadge tone={getAiPriorityTone(item.priority)}>{getAiPriorityLabel(item.priority)}</ToneBadge>
                </div>
                <div style={{ fontSize: 11, color: T.inkMute }}>Προταση: {item.suggestedMatchType || "Negative keyword"}</div>
                <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{item.why}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {strategy.budgetActions?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, fontFamily: T.heading }}>Ενεργειες budget</div>
          <div style={{ display: "grid", gap: 10 }}>
            {strategy.budgetActions.map((item, index) => (
              <div key={`${item.channel}-${index}`} style={{ padding: 14, borderRadius: 16, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{item.channel || "Channel budget"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {item.amountText ? <ToneBadge tone="neutral">{item.amountText}</ToneBadge> : null}
                    <ToneBadge tone={getAiPriorityTone(item.priority)}>{getAiPriorityLabel(item.priority)}</ToneBadge>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.ink }}>{item.direction}</div>
                <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{item.why}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {strategy.experiments?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, fontFamily: T.heading }}>Πειραματα</div>
          <div style={{ display: "grid", gridTemplateColumns: fitCols(240), gap: 10 }}>
            {strategy.experiments.map((item, index) => (
              <div key={`${item.title}-${index}`} style={{ padding: 14, borderRadius: 16, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{item.title}</div>
                <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{item.hypothesis}</div>
                <div style={{ fontSize: 11, color: T.inkMute }}>Metric επιτυχιας: {item.successMetric}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {strategy.watchouts?.length ? (
        <div style={{ padding: 14, borderRadius: 16, background: T.amberSoft, border: `1px solid rgba(199, 147, 33, 0.16)`, display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.amber, fontFamily: T.heading }}>Προσοχη</div>
          <div style={{ display: "grid", gap: 6 }}>
            {strategy.watchouts.map((item, index) => (
              <div key={`${item}-${index}`} style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{item}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToastStack({ items, onDismiss }) {
  if (!items.length) return null;

  return (
    <div style={{ position: "fixed", top: 18, right: 18, zIndex: 50, display: "grid", gap: 10, width: "min(360px, calc(100vw - 24px))" }}>
      {items.map((toast) => {
        const tone = toast.tone === "danger" ? "danger" : toast.tone === "warning" ? "warning" : toast.tone === "info" ? "info" : "success";
        return (
          <div key={toast.id} style={{ padding: 14, borderRadius: 18, background: "#fff", border: `1px solid ${T.line}`, boxShadow: T.shadow, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <ActionCue tone={tone}>{toast.title || (tone === "danger" ? "Action failed" : "Saved")}</ActionCue>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              style={{ border: "none", background: "transparent", color: T.inkMute, cursor: "pointer", fontFamily: T.font, fontSize: 12, fontWeight: 800, padding: 0 }}
            >
              Close
            </button>
          </div>
        );
      })}
    </div>
  );
}

function formatInlineList(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getClientLinkedPlatforms(client) {
  return Object.entries(client?.linkedAssetCounts || {})
    .filter(([, count]) => count > 0)
    .map(([platform]) => platform);
}

function getClientSummaryText(client, { includeAds = false } = {}) {
  const parts = [client.focus ? `Target: ${client.focus}` : ""].filter(Boolean);

  if (client.accounts.length) {
    parts.push(`${client.accounts.length} account${client.accounts.length === 1 ? "" : "s"}`);
    parts.push(`${client.activeCampaigns} live campaign${client.activeCampaigns === 1 ? "" : "s"}`);
    if (includeAds) parts.push(`${client.liveAds} live ad${client.liveAds === 1 ? "" : "s"}`);
    return parts.join(" | ");
  }

  if (client.linkedAssetCount) {
    parts.push(`${client.linkedAssetCount} linked asset${client.linkedAssetCount === 1 ? "" : "s"}`);
    parts.push(client.syncingPlatforms?.length ? "syncing live data" : "waiting for live data");
    return parts.join(" | ");
  }

  parts.push("no linked assets yet");
  return parts.join(" | ");
}

function getClientLiveDataMessage(client) {
  const linkedAssetCount = client.linkedAssetCount || 0;
  if (!linkedAssetCount) return "";

  const platformLabels = formatInlineList(
    (client.syncingPlatforms?.length ? client.syncingPlatforms : getClientLinkedPlatforms(client))
      .map((platform) => PLATFORM_META[platform]?.label || platform)
      .filter(Boolean)
  );
  const assetLabel = `${linkedAssetCount} linked asset${linkedAssetCount === 1 ? "" : "s"}`;
  const verb = linkedAssetCount === 1 ? "is" : "are";

  if (client.syncingPlatforms?.length) {
    return `${assetLabel} ${verb} syncing${platformLabels ? ` from ${platformLabels}` : ""}. The client board will fill in as live data arrives.`;
  }

  return `${assetLabel} ${verb} connected${platformLabels ? ` from ${platformLabels}` : ""}, but no live rows have arrived yet for this date range.`;
}

function LiveDataCue({ client, compact = false }) {
  const message = getClientLiveDataMessage(client);
  if (!message) return null;

  if (compact) {
    return (
      <ActionCue tone="info">
        {client.syncingPlatforms?.length
          ? `${client.linkedAssetCount} linked asset${client.linkedAssetCount === 1 ? "" : "s"} syncing`
          : `${client.linkedAssetCount} linked asset${client.linkedAssetCount === 1 ? "" : "s"} connected`}
      </ActionCue>
    );
  }

  return (
    <div style={{ padding: "16px 16px", borderRadius: 16, background: "rgba(45, 108, 223, 0.08)", border: "1px solid rgba(45, 108, 223, 0.14)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.sky }}>
        {client.syncingPlatforms?.length ? "Live data is syncing" : "Linked assets are ready"}
      </div>
      <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>{message}</div>
    </div>
  );
}

function getReportingGroupLabel(client) {
  return String(client?.reportingGroup || client?.name || "Ungrouped").trim() || "Ungrouped";
}

function groupClientsByReportingGroup(clients) {
  const map = new Map();

  (clients || []).forEach((client) => {
    const key = getReportingGroupLabel(client);
    const current = map.get(key) || {
      id: key,
      label: key,
      clients: [],
      totalBudget: 0,
      spend: 0,
      conversionValue: 0,
      conversions: 0,
      activeCampaigns: 0,
      accounts: 0,
      healthyClients: 0,
    };

    current.clients.push(client);
    current.totalBudget += Number(client.totalBudget) || 0;
    current.spend += Number(client.spend) || 0;
    current.conversionValue += Number(client.conversionValue) || 0;
    current.conversions += Number(client.conversions) || 0;
    current.activeCampaigns += Number(client.activeCampaigns) || 0;
    current.accounts += Array.isArray(client.accounts) ? client.accounts.length : 0;
    current.healthyClients += client.health?.ok ? 1 : 0;
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      roas: group.spend ? +(group.conversionValue / group.spend).toFixed(2) : 0,
      clientsCount: group.clients.length,
      needsAttention: group.clients.length - group.healthyClients,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getSearchTermScoreTone(score) {
  if (score >= 70) return "positive";
  if (score <= 34) return "danger";
  return "warning";
}

function SearchTermScoreBadge({ score, confidence }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <ToneBadge tone={getSearchTermScoreTone(score)}>
        {Math.round(score || 0)}/100
      </ToneBadge>
      {typeof confidence === "number" ? (
        <div style={{ fontSize: 10, color: T.inkSoft }}>
          Conf. {confidence}%
        </div>
      ) : null}
    </div>
  );
}

function formatConnectedAssetSummary(platform, asset) {
  if (platform !== "google_ads") {
    return asset.subtitle || asset.connectionName || asset.type || "";
  }

  const campaignCount = Number(asset.campaignCount) || 0;
  const adGroupCount = Number(asset.adGroupCount) || 0;
  const campaignLabel = `${campaignCount} campaign${campaignCount === 1 ? "" : "s"}`;
  const adGroupLabel = `${adGroupCount} ad group${adGroupCount === 1 ? "" : "s"}`;

  if (asset.type === "Manager account") {
    const managed = Number(asset.managedAdAccountCount) || 0;
    if (managed > 0) {
      return `Manager account aggregating ${managed} child ad account${managed === 1 ? "" : "s"}.`;
    }
    return asset.catalogNote || "Manager account — links all ad accounts under this MCC.";
  }

  if (asset.catalogStatus === "error") {
    return asset.catalogNote || "Could not sync campaign or ad-group hierarchy.";
  }

  if (asset.catalogStatus === "partial") {
    return `${campaignLabel} and ${adGroupLabel} synced as a preview.`;
  }

  return `${campaignLabel} and ${adGroupLabel} synced.`;
}

function ConnectedAssetDropdown({ platform, assets, selectedAssetIds, selectedAssets, onToggleAsset, onClearSelection, helperText, onOpenConnections, canEditCoreSettings }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return assets;

    return assets.filter((asset) => (
      [asset.name, asset.externalId, asset.connectionName, asset.subtitle, asset.type, asset.catalogNote]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedQuery))
    ));
  }, [assets, query]);

  useEffect(() => {
    if (!assets.length) {
      setOpen(false);
      setQuery("");
    }
  }, [assets.length]);

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: T.surfaceStrong,
        border: `1px solid ${T.line}`,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <PlatformChip platform={platform} />
        <ToneBadge tone={selectedAssets.length ? "positive" : "warning"}>
          {selectedAssets.length ? `${selectedAssets.length} asset${selectedAssets.length === 1 ? "" : "s"} linked` : "No assets linked"}
        </ToneBadge>
      </div>

      {!assets.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 11, color: T.inkSoft }}>
            No synced {PLATFORM_META[platform].label} assets are available yet.
          </div>
          {canEditCoreSettings ? (
            <Button onClick={onOpenConnections}>Open Connections</Button>
          ) : (
            <div style={{ fontSize: 11, color: T.inkSoft }}>
              Ask a director to connect and sync this platform from the Connections screen.
            </div>
          )}
        </div>
      ) : (
        <>
          {selectedAssets.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedAssets.map((asset) => (
                <button
                  key={`${platform}-selected-${asset.id}`}
                  type="button"
                  onClick={() => onToggleAsset(asset.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 999,
                    background: T.accentSoft,
                    border: "1px solid rgba(15, 143, 102, 0.16)",
                    color: T.accent,
                    fontFamily: T.font,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800 }}>{asset.name}</span>
                  <span style={{ fontSize: 10, color: T.inkSoft }}>{asset.externalId}</span>
                  <span style={{ fontSize: 10, fontWeight: 800 }}>Remove</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: T.inkSoft }}>
              Select the synced assets that belong to this client.
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${open ? "rgba(15, 143, 102, 0.18)" : T.line}`,
              background: open ? T.accentSoft : T.bgSoft,
              color: T.ink,
              textAlign: "left",
              cursor: "pointer",
              fontFamily: T.font,
              display: "grid",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: open ? T.accent : T.ink }}>
                {PLATFORM_META[platform].label} selector
              </div>
              <div style={{ fontSize: 11, color: T.inkSoft }}>
                {open ? "Hide options" : "Open dropdown"}
              </div>
            </div>
            <div style={{ fontSize: 11, color: T.inkSoft }}>
              {selectedAssets.length
                ? `${selectedAssets.length} selected | ${selectedAssets.slice(0, 2).map((asset) => asset.name).join(", ")}${selectedAssets.length > 2 ? ` +${selectedAssets.length - 2} more` : ""}`
                : `Search ${assets.length} synced ${platform === "ga4" ? "properties" : "accounts"}`}
            </div>
          </button>

          {open ? (
            <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}` }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search by name, ID or connection`}
                  style={{
                    flex: "1 1 220px",
                    minWidth: 0,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${T.line}`,
                    background: T.surfaceStrong,
                    color: T.ink,
                    fontSize: 12,
                    fontFamily: T.font,
                    outline: "none",
                  }}
                />
                <ToneBadge tone="neutral">{filteredAssets.length} match{filteredAssets.length === 1 ? "" : "es"}</ToneBadge>
                <Button onClick={() => setQuery("")} disabled={!query}>Clear search</Button>
                <Button onClick={onClearSelection} disabled={!selectedAssets.length}>Clear selected</Button>
              </div>

              <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", paddingRight: 2 }}>
                {filteredAssets.length ? filteredAssets.map((asset) => {
                  const selected = selectedAssetIds.includes(asset.id);
                  const isManagerAccount = platform === "google_ads" && asset.type === "Manager account";
                  const summary = formatConnectedAssetSummary(platform, asset);
                  const typeBadgeLabel = selected
                    ? "Selected"
                    : isManagerAccount
                      ? "Manager (MCC)"
                      : asset.type || "Available";
                  const typeBadgeTone = selected ? "positive" : isManagerAccount ? "neutral" : "neutral";

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => onToggleAsset(asset.id)}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: `1px solid ${selected ? "rgba(15, 143, 102, 0.20)" : T.line}`,
                        background: selected ? T.accentSoft : T.surfaceStrong,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: T.font,
                        display: "grid",
                        gap: 4,
                        opacity: 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: selected ? T.accent : T.ink }}>{asset.name}</div>
                        <ToneBadge tone={typeBadgeTone}>{typeBadgeLabel}</ToneBadge>
                      </div>
                      <div style={{ fontSize: 11, color: T.inkSoft }}>{asset.subtitle || asset.connectionName}</div>
                      <div style={{ fontSize: 10, color: T.inkSoft }}>{summary}</div>
                      <div style={{ fontSize: 10, color: T.inkMute }}>{asset.externalId}</div>
                    </button>
                  );
                }) : (
                  <div style={{ padding: 12, borderRadius: 14, background: T.surfaceStrong, border: `1px solid ${T.line}`, fontSize: 11, color: T.inkSoft }}>
                    No {PLATFORM_META[platform].label} assets match this search yet.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div style={{ fontSize: 11, color: T.inkSoft }}>
            {helperText}
          </div>
        </>
      )}
    </div>
  );
}

function LedgerMetric({ label, value, tone, compact = false }) {
  return (
    <div style={{ display: "grid", gap: 3, minWidth: compact ? 62 : 76 }}>
      <div style={{ fontSize: 10, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: compact ? 12 : 13, color: tone || T.ink, fontWeight: 800, fontFamily: compact ? T.font : T.heading, letterSpacing: compact ? 0 : "-0.03em" }}>{value}</div>
    </div>
  );
}

function Sparkline({ values, color }) {
  if (!values.length) return null;
  const width = 280;
  const height = 72;
  const topPad = 8;
  const bottomPad = 10;
  const innerHeight = height - topPad - bottomPad;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = topPad + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `${path} L ${width} ${height - bottomPad} L 0 ${height - bottomPad} Z`;
  const gradientId = `spark-${hashSeed(`${color}-${values.length}-${Math.round(max)}`)}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill={color} />
    </svg>
  );
}

function summarizeSeriesMetric(series, metricKey) {
  const values = (Array.isArray(series) ? series : []).map((point) => Number(point?.[metricKey]) || 0);
  if (!values.length) return 0;

  return ADDITIVE_METRICS.has(metricKey)
    ? values.reduce((acc, value) => acc + value, 0)
    : values.reduce((acc, value) => acc + value, 0) / values.length;
}

function comparePeriodSeries(currentSeries, previousSeries, metricKey) {
  const current = summarizeSeriesMetric(currentSeries, metricKey);
  const previous = summarizeSeriesMetric(previousSeries, metricKey);
  const delta = previous ? ((current - previous) / previous) * 100 : current ? 100 : 0;

  return {
    current,
    previous,
    delta,
    currentSeries: Array.isArray(currentSeries) ? currentSeries : [],
    previousSeries: Array.isArray(previousSeries) ? previousSeries : [],
  };
}

function getAdsGa4ValueComparison(client, ga4) {
  const accounts = Array.isArray(client?.accounts) ? client.accounts : [];
  const adsConversionValue = accounts.reduce((acc, account) => acc + (Number(account.conversionValue) || 0), 0);
  const adsAllConversionValue = accounts.reduce((acc, account) => acc + (Number(account.allConversionValue) || 0), 0);
  const ga4Revenue = Number(ga4?.revenueCurrentPeriod) || 0;
  const gapPercent = ga4Revenue ? ((adsConversionValue - ga4Revenue) / ga4Revenue) * 100 : 0;

  return {
    adsConversionValue,
    adsAllConversionValue,
    ga4Revenue,
    gapPercent,
  };
}

function InteractiveLineChart({
  series,
  metricKey,
  color,
  previousSeries = [],
  currentLabel = "Selected period",
  previousLabel = "Previous period",
  height = 300,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const points = Array.isArray(series) ? series : [];
  const previousPoints = Array.isArray(previousSeries) ? previousSeries : [];
  const currentValues = points.map((point) => Number(point?.[metricKey]) || 0);
  const previousValues = previousPoints.map((point) => Number(point?.[metricKey]) || 0);
  const allValues = [...currentValues, ...previousValues];
  const metric = KPI_LIBRARY[metricKey] || { type: "number", label: metricKey };

  if (!points.length) {
    return (
      <div style={{ padding: 18, borderRadius: 16, background: T.bgSoft, border: `1px dashed ${T.lineStrong}`, color: T.inkSoft, fontSize: 12, textAlign: "center" }}>
        No live daily points returned for this chart.
      </div>
    );
  }

  const width = 940;
  const padLeft = 84;
  const padRight = 28;
  const padTop = 24;
  const padBottom = 56;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(0, ...allValues);
  const range = maxValue - minValue || 1;
  const yTicks = buildChartTicks(maxValue, 4);
  const xLabels = getSeriesAxisLabels(points);
  const gradientId = `axis-chart-${hashSeed(`${metricKey}-${color}-${points.length}-${Math.round(maxValue)}`)}`;
  const xFor = (index, length = points.length) => padLeft + (index / Math.max(length - 1, 1)) * chartWidth;
  const yFor = (value) => padTop + chartHeight - ((value - minValue) / range) * chartHeight;
  const buildPath = (values) => values.map((value, index) => {
    const x = xFor(index, values.length);
    const y = yFor(value);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  const currentPath = buildPath(currentValues);
  const previousPath = previousValues.length ? buildPath(previousValues) : "";
  const areaPath = `${currentPath} L ${xFor(currentValues.length - 1)} ${height - padBottom} L ${padLeft} ${height - padBottom} Z`;
  const safeHoverIndex = hoverIndex == null ? null : Math.max(0, Math.min(points.length - 1, hoverIndex));
  const hoverX = safeHoverIndex == null ? null : xFor(safeHoverIndex);
  const hoverValue = safeHoverIndex == null ? null : currentValues[safeHoverIndex];
  const previousHoverIndex = safeHoverIndex == null || !previousValues.length
    ? null
    : Math.max(0, Math.min(previousValues.length - 1, Math.round(safeHoverIndex / Math.max(points.length - 1, 1) * Math.max(previousValues.length - 1, 0))));
  const previousHoverValue = previousHoverIndex == null ? null : previousValues[previousHoverIndex];
  const hoverLabel = safeHoverIndex == null ? "" : points[safeHoverIndex]?.label || points[safeHoverIndex]?.date || `Point ${safeHoverIndex + 1}`;

  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1)));
    const svgX = ratio * width;
    const index = Math.round((svgX - padLeft) / Math.max(chartWidth, 1) * Math.max(points.length - 1, 0));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", display: "block", touchAction: "none", overflow: "visible" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={`${metricKey}-ytick-${tick}`}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="rgba(22, 34, 24, 0.08)" />
              <text x={padLeft - 12} y={y + 4} fontSize="12" fill={T.inkSoft} textAnchor="end">
                {formatChartAxisValue(tick, metric.type)}
              </text>
            </g>
          );
        })}

        <line x1={padLeft} x2={padLeft} y1={padTop} y2={height - padBottom} stroke="rgba(22, 34, 24, 0.16)" />
        <line x1={padLeft} x2={width - padRight} y1={height - padBottom} y2={height - padBottom} stroke="rgba(22, 34, 24, 0.16)" />

        {previousPath ? <path d={previousPath} fill="none" stroke={T.inkMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 6" opacity="0.72" /> : null}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={currentPath} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

        {xLabels.map((item) => (
          <text key={`${metricKey}-xlabel-${item.index}`} x={xFor(item.index)} y={height - 18} fontSize="12" fill={T.inkSoft} textAnchor={item.index === 0 ? "start" : item.index === points.length - 1 ? "end" : "middle"}>
            {item.label}
          </text>
        ))}

        {hoverX != null ? (
          <g>
            <line x1={hoverX} x2={hoverX} y1={padTop} y2={height - padBottom} stroke={T.ink} strokeOpacity="0.28" strokeDasharray="4 4" />
            <circle cx={hoverX} cy={yFor(hoverValue)} r="5.5" fill={color} stroke="#fff" strokeWidth="2.5" />
            <rect
              x={Math.min(width - 392, Math.max(padLeft, hoverX + 18))}
              y={Math.max(8, yFor(hoverValue) - 78)}
              width="374"
              height={previousHoverValue == null ? 82 : 112}
              rx="16"
              fill={T.surfaceStrong}
              stroke="rgba(22, 34, 24, 0.18)"
            />
            <text x={Math.min(width - 366, Math.max(padLeft + 24, hoverX + 38))} y={Math.max(36, yFor(hoverValue) - 48)} fontSize="15" fill={T.inkSoft} fontWeight="800">
              {hoverLabel}
            </text>
            <text x={Math.min(width - 366, Math.max(padLeft + 24, hoverX + 38))} y={Math.max(60, yFor(hoverValue) - 24)} fontSize="17" fill={color} fontWeight="900">
              {currentLabel}: {formatMetric(metricKey, hoverValue)}
            </text>
            {previousHoverValue != null ? (
              <text x={Math.min(width - 366, Math.max(padLeft + 24, hoverX + 38))} y={Math.max(84, yFor(hoverValue))} fontSize="17" fill={T.inkSoft} fontWeight="900">
                {previousLabel}: {formatMetric(metricKey, previousHoverValue)}
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
      {previousValues.length ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: T.inkSoft, fontWeight: 700 }}>
          <span><span style={{ display: "inline-block", width: 18, height: 3, borderRadius: 999, background: color, marginRight: 6 }} />{currentLabel}</span>
          <span><span style={{ display: "inline-block", width: 18, height: 3, borderRadius: 999, background: T.inkMute, marginRight: 6, opacity: 0.7 }} />{previousLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function AnalyticsDeltaBadge({ delta }) {
  const positive = delta >= 0;
  const tone = positive ? T.accent : T.coral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 8px",
        borderRadius: 999,
        background: positive ? T.accentSoft : T.coralSoft,
        color: tone,
        fontSize: 11,
        fontWeight: 900,
        fontFamily: T.mono,
      }}
    >
      {positive ? "+" : ""}{delta.toFixed(Math.abs(delta) >= 10 ? 0 : 1)}%
    </span>
  );
}

function AnalyticsTrendTile({ label, metricKey, comparison }) {
  const metric = KPI_LIBRARY[metricKey] || { color: T.accent };

  return (
    <div style={{ padding: 18, borderRadius: 22, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 900 }}>{label}</div>
        <AnalyticsDeltaBadge delta={comparison.delta} />
      </div>
      <div style={{ fontSize: 26, color: T.ink, fontWeight: 900, fontFamily: T.heading, letterSpacing: "-0.05em" }}>
        {formatMetric(metricKey, comparison.current)}
      </div>
      <InteractiveLineChart
        series={comparison.currentSeries}
        previousSeries={comparison.previousSeries}
        metricKey={metricKey}
        color={metric.color}
        height={320}
      />
      <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.45 }}>
        Selected period vs previous equivalent period. Previous total: {formatMetric(metricKey, comparison.previous)}.
      </div>
    </div>
  );
}

function AnalyticsBarList({ items, fixedMax = null }) {
  const max = fixedMax || Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 5, fontSize: 11 }}>
            <span style={{ color: T.ink, fontWeight: 800 }}>{item.label}</span>
            <span style={{ color: T.inkSoft, fontFamily: T.mono }}>{item.displayValue || `${Math.round(item.value)}%`}</span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: "rgba(22, 34, 24, 0.08)", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(2, Math.min(100, (Number(item.value) || 0) / max * 100))}%`,
                height: "100%",
                borderRadius: 999,
                background: item.color || T.accent,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsCommandCenter({ client, ga4, seriesMap, dateRangeLabel, liveState }) {
  if (!client || !ga4) {
    return <EmptyState title="GA4 not connected" body="Enable the GA4 connection in Client Studio to bring analytics into the dashboard." />;
  }

  const gaSeries = seriesMap[`ga4:${client.id}`] || [];
  const previousGaSeries = Array.isArray(ga4.previousSeries) ? ga4.previousSeries : [];
  const previousRangeLabel = ga4.previousStartDate && ga4.previousEndDate ? `${ga4.previousStartDate} - ${ga4.previousEndDate}` : "Previous period";
  const sessionsTrend = comparePeriodSeries(gaSeries, previousGaSeries, "sessions");
  const usersTrend = comparePeriodSeries(gaSeries, previousGaSeries, "users");
  const conversionsTrend = comparePeriodSeries(gaSeries, previousGaSeries, "conversions");
  const revenueTrend = comparePeriodSeries(gaSeries, previousGaSeries, "revenue");
  const channelItems = Object.entries(ga4.channels || {})
    .map(([label, value]) => ({
      label,
      value: Number(value) || 0,
      color: label === "Organic" ? T.accent : label === "Paid" ? T.sky : label === "Direct" ? T.amber : label === "Social" ? "#7b5cff" : T.coral,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
  const paidSpend = (client.accounts || []).reduce((acc, account) => acc + (Number(account.spend) || 0), 0);
  const paidClicks = (client.accounts || []).reduce((acc, account) => acc + (Number(account.clicks) || 0), 0);
  const paidImpressions = (client.accounts || []).reduce((acc, account) => acc + (Number(account.impressions) || 0), 0);
  const valueComparison = getAdsGa4ValueComparison(client, ga4);
  const analyticsRevenue = valueComparison.ga4Revenue;
  const adsConversionValue = valueComparison.adsConversionValue;
  const valueGap = valueComparison.gapPercent;
  const sessionsPerPaidClick = paidClicks ? (Number(ga4.sessions || 0) / paidClicks) * 100 : 0;
  const topChannel = channelItems[0];
  const liveErrors = Array.isArray(liveState?.errors) ? liveState.errors.filter((item) => item?.clientId === client.id || !item?.clientId) : [];
  const insightItems = [
    sessionsTrend.delta < -10 ? `Sessions are down ${Math.abs(sessionsTrend.delta).toFixed(0)}% vs the previous equivalent period.` : "",
    conversionsTrend.delta < -10 ? `Conversions are down ${Math.abs(conversionsTrend.delta).toFixed(0)}% vs the previous equivalent period; check landing pages and offer quality.` : "",
    Math.abs(valueGap) > 20 && analyticsRevenue > 0 ? `Primary ads conversion value (${formatCurrency(adsConversionValue)}) and GA4 revenue (${formatCurrency(analyticsRevenue)}) differ by ${Math.abs(valueGap).toFixed(0)}%; all conversion value is excluded from this check.` : "",
    topChannel?.value > 55 ? `${topChannel.label} is ${Math.round(topChannel.value)}% of traffic, so channel concentration is high.` : "",
    !gaSeries.length ? "No live GA4 daily stream returned for the selected period, so no synthetic trend chart is drawn." : "",
    gaSeries.length && !previousGaSeries.length ? "Previous-period GA4 daily stream did not return, so comparison deltas may be incomplete." : "",
  ].filter(Boolean);
  const funnelItems = [
    { label: "Ad impressions", value: paidImpressions, displayValue: formatNumber(paidImpressions), color: T.inkSoft },
    { label: "Ad clicks", value: paidClicks, displayValue: formatNumber(paidClicks), color: T.sky },
    { label: "GA4 sessions", value: Number(ga4.sessions) || 0, displayValue: formatNumber(ga4.sessions || 0), color: T.accent },
    { label: client.category === "eshop" ? "Purchases" : "Leads", value: Number(ga4.purchasesOrLeads) || 0, displayValue: formatNumber(ga4.purchasesOrLeads || 0), color: T.coral },
    { label: "Revenue", value: analyticsRevenue, displayValue: formatCurrency(analyticsRevenue), color: T.amber },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          padding: 22,
          borderRadius: 28,
          background: `linear-gradient(135deg, ${T.surfaceStrong} 0%, rgba(245, 124, 0, 0.12) 48%, rgba(15, 143, 102, 0.12) 100%)`,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <PlatformChip platform="ga4" />
              <div style={{ fontSize: "clamp(1.35rem, 2.2vw, 2rem)", fontWeight: 900, fontFamily: T.heading, color: T.ink, letterSpacing: "-0.06em" }}>{client.name} analytics</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft }}>{ga4.propertyName} | {dateRangeLabel}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: T.inkSoft, lineHeight: 1.5 }}>
              Charts use GA4 Analytics Data API daily rows only. If GA4 does not return daily rows, AdPulse now shows an empty-state instead of generated fallback data.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <ActionCue tone={liveState?.loading ? "info" : liveErrors.length ? "warning" : "success"}>
              {liveState?.loading ? "Refreshing GA4" : liveErrors.length ? "Partial GA4 sync" : "Live analytics"}
            </ActionCue>
            <ActionCue tone={gaSeries.length ? "success" : "warning"}>
              {gaSeries.length ? `${gaSeries.length} selected-period points` : "No selected-period daily rows"}
            </ActionCue>
            <ActionCue tone={previousGaSeries.length ? "success" : "warning"}>
              {previousGaSeries.length ? `${previousGaSeries.length} previous-period points` : "No previous-period rows"}
            </ActionCue>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: fitCols(132), gap: 10 }}>
          <MetricTile label="Sessions" value={formatNumber(ga4.sessions)} />
          <MetricTile label="Users" value={formatNumber(ga4.users)} />
          <MetricTile label="Engaged Rate" value={`${Number(ga4.engagedRate || 0).toFixed(1)}%`} />
          <MetricTile label="Conv. Rate" value={`${Number(ga4.conversionRate || 0).toFixed(1)}%`} />
          <MetricTile label={client.category === "eshop" ? "Revenue" : "Leads"} value={client.category === "eshop" ? formatCurrency(analyticsRevenue) : formatNumber(ga4.purchasesOrLeads)} />
          {client.category === "eshop" ? <MetricTile label="AOV" value={formatCurrency(ga4.aov)} /> : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 18 }}>
        <AnalyticsTrendTile label="Sessions" metricKey="sessions" comparison={sessionsTrend} />
        <AnalyticsTrendTile label="Users" metricKey="users" comparison={usersTrend} />
        <AnalyticsTrendTile label={client.category === "eshop" ? "Purchases" : "Leads"} metricKey="conversions" comparison={conversionsTrend} />
        <AnalyticsTrendTile label="Revenue" metricKey="revenue" comparison={revenueTrend} />
      </div>
      <div style={{ fontSize: 11, color: T.inkSoft, fontWeight: 700 }}>
        Comparison baseline: {previousRangeLabel}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
        <div style={{ padding: 18, borderRadius: 24, background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow, display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: T.heading }}>Traffic mix</div>
            <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>Where sessions are coming from.</div>
          </div>
          <AnalyticsBarList items={channelItems.length ? channelItems : [{ label: "Unassigned", value: 100, color: T.inkMute }]} fixedMax={100} />
        </div>

        <div style={{ padding: 18, borderRadius: 24, background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow, display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: T.heading }}>Journey bridge</div>
            <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>Paid media into site activity and outcomes.</div>
          </div>
          <AnalyticsBarList items={funnelItems} />
          <div style={{ display: "grid", gridTemplateColumns: fitCols(120), gap: 10 }}>
            <MetricTile label="Sessions / Paid Clicks" value={`${sessionsPerPaidClick.toFixed(0)}%`} subValue="Directional tracking sanity check" />
            <MetricTile label="Ads Conv. Value vs GA4" value={`${valueGap >= 0 ? "+" : ""}${valueGap.toFixed(0)}%`} subValue={`${formatCurrency(adsConversionValue)} ads primary value vs ${formatCurrency(analyticsRevenue)} GA4 revenue. All conv. value excluded.`} accent={Math.abs(valueGap) > 20 ? T.coral : T.accent} />
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 24, background: T.surface, border: `1px solid ${T.line}`, boxShadow: T.shadow, display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: T.heading }}>Diagnostics</div>
            <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>What needs attention in the current range.</div>
          </div>
          {insightItems.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {insightItems.map((item) => (
                <div key={item} style={{ padding: 11, borderRadius: 14, background: T.amberSoft, border: `1px solid ${T.amber}22`, color: T.ink, fontSize: 12, lineHeight: 1.45, fontWeight: 700 }}>
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 12, borderRadius: 16, background: T.accentSoft, border: `1px solid rgba(15, 143, 102, 0.16)`, color: T.accent, fontSize: 12, fontWeight: 800 }}>
              No analytics red flags detected for this range.
            </div>
          )}
          <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>{ga4.insight}</div>
        </div>
      </div>
    </div>
  );
}

function KpiSelector({ selected, onChange, available }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {available.map((metricKey) => {
        const metric = KPI_LIBRARY[metricKey];
        const active = selected.includes(metricKey);

        return (
          <button
            key={metricKey}
            onClick={() => onChange(active ? selected.filter((item) => item !== metricKey) : [...selected, metricKey])}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: `1px solid ${active ? `${metric.color}44` : T.line}`,
              background: active ? `${metric.color}12` : T.surfaceStrong,
              color: active ? metric.color : T.inkSoft,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            {metric.label}
          </button>
        );
      })}
    </div>
  );
}

function OverviewCard({ client, users, onOpenAccounts, onEdit, onResolveIssue }) {
  const noConnections = Object.values(client.connections).every((value) => !value);
  const awaitingLiveData = client.linkedAssetCount && !client.accounts.length;

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 24,
        background: T.surface,
        border: `1px solid ${client.health.ok ? T.line : "rgba(215, 93, 66, 0.18)"}`,
        boxShadow: T.shadow,
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 14, minWidth: 0, flex: "1 1 280px" }}>
          <LogoMark client={client} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: T.heading, color: T.ink, letterSpacing: "-0.04em" }}>{client.name}</div>
              <CategoryChip category={client.category} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft }}>
              {getClientSummaryText(client)}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.keys(client.connections).filter((platform) => client.connections[platform]).map((platform) => (
                <PlatformChip key={platform} platform={platform} />
              ))}
              {client.accounts.length > 0 && client.syncingPlatforms?.length ? <LiveDataCue client={client} compact /> : null}
            </div>
          </div>
        </div>
        <StatusPill ok={client.health.ok} />
      </div>

      <AssignedUsersStrip client={client} users={users} />

      <div style={{ display: "grid", gridTemplateColumns: fitCols(128), gap: 10 }}>
        <MetricTile label="Monthly Budget" value={formatCurrency(client.totalBudget)} />
        <MetricTile label="Spend MTD" value={formatCurrency(client.spend)} />
        <MetricTile label="Conv. Value" value={formatCurrency(client.conversionValue)} />
        <MetricTile label="ROAS" value={formatMetric("roas", client.roas)} accent={client.roas >= 3 ? T.accent : T.coral} />
        <MetricTile label={client.category === "eshop" ? "Revenue" : "Conversions"} value={client.category === "eshop" ? formatCurrency(client.ga4?.revenueCurrentPeriod || 0) : formatNumber(client.conversions)} subValue={client.category === "eshop" ? CALENDAR.revenueRangeLabel : "Client-level conversion volume"} />
      </div>

      {!awaitingLiveData ? (
        <>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Budget pace</div>
              <div style={{ fontSize: 11, color: T.inkSoft }}>{CALENDAR.spendRangeLabel}</div>
            </div>
            <ProgressRail current={client.spend} target={client.totalBudget * CALENDAR.spendProgress} />
          </div>

          <AlertList health={client.health} clientId={client.id} onResolveIssue={onResolveIssue} />
        </>
      ) : null}

      {noConnections ? (
        <div style={{ padding: "18px 16px", borderRadius: 16, background: T.amberSoft, border: `1px solid ${T.amber}22`, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.amber }}>No accounts linked</div>
          <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>Connect this client's ad accounts in Client Studio to see live data.</div>
        </div>
      ) : client.linkedAssetCount && !client.accounts.length ? (
        <LiveDataCue client={client} />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {client.accounts.slice(0, 3).map((account) => (
            <div
              key={account.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 16,
                background: T.surfaceStrong,
                border: `1px solid ${T.line}`,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", minWidth: 0, flex: "1 1 220px" }}>
                <PlatformChip platform={account.platform} />
                <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{account.name}</div>
                  <div style={{ fontSize: 11, color: T.inkSoft }}>{formatCurrency(account.spend)} of {formatCurrency(account.monthlyBudget)}</div>
                  {account.dataError ? <div style={{ marginTop: 4, fontSize: 10, color: T.coral }}>Live data warning</div> : null}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginLeft: "auto" }}>
                <div style={{ fontSize: 11, fontFamily: T.mono, color: T.inkSoft }}>
                  CPC {formatMetric("cpc", account.cpc)}
                </div>
                <div style={{ fontSize: 11, fontFamily: T.mono, color: T.inkSoft }}>
                  CPM {formatMetric("cpm", account.cpm)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button onClick={onOpenAccounts} tone="primary">Open account stack</Button>
        {onEdit ? <Button onClick={onEdit}>Edit client</Button> : null}
      </div>
    </div>
  );
}

function OverviewRow({ client, users, onOpenAccounts, onEdit, onResolveIssue }) {
  const noConnections = Object.values(client.connections).every((value) => !value);
  const awaitingLiveData = client.linkedAssetCount && !client.accounts.length;

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 22,
        background: T.surface,
        border: `1px solid ${client.health.ok ? T.line : "rgba(215, 93, 66, 0.18)"}`,
        boxShadow: T.shadow,
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, minWidth: 0, flex: "1 1 320px" }}>
          <LogoMark client={client} size={40} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: T.heading }}>{client.name}</div>
              <CategoryChip category={client.category} />
              <StatusPill ok={client.health.ok} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft }}>
              {getClientSummaryText(client, { includeAds: true })}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.keys(client.connections).filter((platform) => client.connections[platform]).map((platform) => (
                <PlatformChip key={platform} platform={platform} />
              ))}
              {client.accounts.length > 0 && client.syncingPlatforms?.length ? <LiveDataCue client={client} compact /> : null}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: fitCols(108), gap: 10, flex: "1 1 420px" }}>
          <MetricTile label="Budget" value={formatCurrency(client.totalBudget)} />
          <MetricTile label="Spend" value={formatCurrency(client.spend)} />
          <MetricTile label="Conv. Value" value={formatCurrency(client.conversionValue)} />
          <MetricTile label="Conv." value={formatNumber(client.conversions)} />
          <MetricTile label="ROAS" value={formatMetric("roas", client.roas)} accent={client.roas >= 3 ? T.accent : T.coral} />
        </div>
      </div>

      {!noConnections && !awaitingLiveData && (
        <ProgressRail current={client.spend} target={client.totalBudget * CALENDAR.spendProgress} />
      )}

      <AssignedUsersStrip client={client} users={users} />

      {noConnections ? (
        <div style={{ padding: "14px 16px", borderRadius: 14, background: T.amberSoft, border: `1px solid ${T.amber}22` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.amber }}>No accounts linked</div>
          <div style={{ marginTop: 3, fontSize: 11, color: T.inkSoft }}>Connect this client's ad accounts in Client Studio to see live data.</div>
        </div>
      ) : client.linkedAssetCount && !client.accounts.length ? (
        <LiveDataCue client={client} />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {(client.health.ok ? [{ id: "healthy", label: "Healthy", detail: "No red flags triggered for this client." }] : client.health.flags).slice(0, 2).map((flag) => (
            <div
              key={flag.id || `${client.id}-${flag.label}`}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                background: client.health.ok ? T.accentSoft : T.coralSoft,
                color: client.health.ok ? T.accent : T.coral,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 180px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{flag.label}</div>
                  <div style={{ marginTop: 3, fontSize: 11, color: T.inkSoft }}>{flag.detail}</div>
                </div>
                {!client.health.ok && flag.id && onResolveIssue ? (
                  <button
                    type="button"
                    onClick={() => onResolveIssue(client.id, flag.id)}
                    style={{
                      border: "1px solid rgba(215, 93, 66, 0.22)",
                      background: T.surfaceStrong,
                      color: T.coral,
                      borderRadius: 10,
                      padding: "6px 9px",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: T.font,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mark resolved
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button onClick={onOpenAccounts} tone="primary">Open account stack</Button>
        {onEdit ? <Button onClick={onEdit}>Edit client</Button> : null}
      </div>
    </div>
  );
}

const CAMPAIGN_STATUS_FILTERS = [
  { id: "active", label: "Active Only", emptyTitle: "No active campaigns", emptyBody: "This client has no active or learning campaigns in the current account stack." },
  { id: "stopped", label: "Stopped", emptyTitle: "No stopped campaigns", emptyBody: "This client has no stopped campaigns in the current account stack." },
  { id: "all", label: "All", emptyTitle: "No campaigns", emptyBody: "Connect ad accounts or sync live campaigns to populate this client stack." },
];

function campaignMatchesStatusFilter(campaign, filter) {
  if (filter === "active") return !isStoppedCampaign(campaign);
  if (filter === "stopped") return isStoppedCampaign(campaign);
  return true;
}

function AccountStack({ client, users, open, setOpen, campaigns, ads, dateRangeLabel, aiReady, onOpenConnections, onResolveIssue }) {
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [aiState, setAiState] = useState(() => createEmptyAiStrategistState());
  const filterMeta = CAMPAIGN_STATUS_FILTERS.find((option) => option.id === campaignFilter) || CAMPAIGN_STATUS_FILTERS[2];
  const noConnections = Object.values(client.connections).every((value) => !value);
  const awaitingLiveData = client.linkedAssetCount && !client.accounts.length;
  const aiPayload = useMemo(() => buildAccountAiPayload(client, dateRangeLabel), [client, dateRangeLabel]);
  const aiStrategyKey = useMemo(() => getAccountAiStrategyKey(client, dateRangeLabel), [client, dateRangeLabel]);
  const groupedCampaigns = useMemo(
    () => Object.fromEntries(campaigns.map((campaign) => [campaign.id, ads.filter((ad) => ad.campaignId === campaign.id)])),
    [ads, campaigns]
  );
  const visibleCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaignMatchesStatusFilter(campaign, campaignFilter)),
    [campaignFilter, campaigns]
  );
  const visibleAccountIds = useMemo(
    () => new Set(visibleCampaigns.map((campaign) => campaign.accountId)),
    [visibleCampaigns]
  );
  const visibleAccounts = useMemo(
    () => (campaignFilter === "all" ? client.accounts : client.accounts.filter((account) => visibleAccountIds.has(account.id))),
    [campaignFilter, client.accounts, visibleAccountIds]
  );

  useEffect(() => {
    const saved = readStoredAiStrategyResult(aiStrategyKey);
    setAiState(saved ? {
      loading: false,
      error: "",
      data: saved,
      generatedAt: saved?.generatedAt || "",
      cached: !!saved?.cached,
    } : createEmptyAiStrategistState());
  }, [aiStrategyKey]);

  async function runAiStrategist() {
    setAiState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const payload = await fetchAiStrategy({
        scope: "account",
        context: aiPayload,
        forceRefresh: true,
      });
      writeStoredAiStrategyResult(aiStrategyKey, payload);
      setAiState({
        loading: false,
        error: "",
        data: payload,
        generatedAt: payload?.generatedAt || "",
        cached: !!payload?.cached,
      });
    } catch (error) {
      setAiState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Could not run the AI strategist.",
      }));
    }
  }

  return (
    <div
      style={{
        borderRadius: 24,
        background: T.surface,
        border: `1px solid ${client.health.ok ? T.line : "rgba(215, 93, 66, 0.18)"}`,
        boxShadow: T.shadow,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((current) => ({ ...current, [client.id]: !current[client.id] }))}
        style={{
          width: "100%",
          textAlign: "left",
          padding: 20,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 14, minWidth: 0, flex: "1 1 260px" }}>
            <LogoMark client={client} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 19, fontWeight: 800, fontFamily: T.heading }}>{client.name}</div>
                <CategoryChip category={client.category} />
                <StatusPill ok={client.health.ok} />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft }}>
                {getClientSummaryText(client, { includeAds: true })}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: fitCols(108), gap: 10, flex: "1 1 420px" }}>
            <MetricTile label="Budget" value={formatCurrency(client.totalBudget)} />
            <MetricTile label="Spend" value={formatCurrency(client.spend)} />
            <MetricTile label="Conv. Value" value={formatCurrency(client.conversionValue)} />
            <MetricTile label={client.accounts.length ? "Accounts" : "Linked Assets"} value={client.accounts.length || client.linkedAssetCount} />
            <MetricTile label={open[client.id] ? "Collapse" : "Expand"} value={open[client.id] ? "-" : "+"} />
          </div>
        </div>
      </button>

      {open[client.id] ? (
        <div style={{ padding: "0 20px 20px", display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.keys(client.connections).filter((platform) => client.connections[platform]).map((platform) => (
                <PlatformChip key={platform} platform={platform} />
              ))}
              {client.syncingPlatforms?.length ? <LiveDataCue client={client} compact /> : null}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!noConnections && !awaitingLiveData && (
                <ToneBadge tone={client.health.ok ? "positive" : "danger"}>{client.health.ok ? "All checks passed" : `${client.health.flags.length} issue${client.health.flags.length === 1 ? "" : "s"}`}</ToneBadge>
              )}
              <ToneBadge tone="neutral">{client.accounts.length || client.linkedAssetCount} {client.accounts.length ? "accounts" : "linked assets"}</ToneBadge>
              <ToneBadge tone="neutral">{client.activeCampaigns} active campaigns</ToneBadge>
              {campaignFilter !== "all" ? <ToneBadge tone="neutral">{visibleCampaigns.length} shown</ToneBadge> : null}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", padding: 4, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}` }}>
              {CAMPAIGN_STATUS_FILTERS.map((option) => {
                const isActive = option.id === campaignFilter;

                return (
                  <button
                    key={`${client.id}-${option.id}`}
                    type="button"
                    onClick={() => setCampaignFilter(option.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: `1px solid ${isActive ? T.lineStrong : "transparent"}`,
                      background: isActive ? T.accentSoft : "transparent",
                      color: isActive ? T.accent : T.inkSoft,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: T.font,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft }}>
              Showing {visibleCampaigns.length} of {campaigns.length} campaigns across {visibleAccounts.length} of {client.accounts.length} accounts
            </div>
          </div>

          {noConnections ? (
            <div style={{ padding: "20px 16px", borderRadius: 16, background: T.amberSoft, border: `1px solid ${T.amber}22`, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.amber }}>No accounts linked for this client</div>
              <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>Go to Client Studio and link ad accounts from your connected OAuth sessions to populate live data here.</div>
            </div>
          ) : awaitingLiveData ? (
            <LiveDataCue client={client} />
          ) : (
            <>
              <AlertList health={client.health} clientId={client.id} onResolveIssue={onResolveIssue} />
              <div style={{ padding: 16, borderRadius: 18, background: T.bgSoft, border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: T.heading }}>AI strategist</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>
                      Model-backed strategic guidance for the current client target: {normalizeClientTarget(client.focus)}.
                    </div>
                  </div>
                  <ActionCue tone={aiState.error ? "danger" : aiState.data ? "info" : "neutral"}>
                    {aiState.loading
                      ? "Running strategist"
                      : aiState.data
                        ? "Strategy ready"
                        : aiReady
                          ? "Ready to analyze"
                          : "Needs Claude key"}
                  </ActionCue>
                </div>

                {!aiReady ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>
                      Add an Anthropic API key to enable the Claude strategist layer. Once configured, AdPulse will analyze live account structure, pacing, efficiency, budgets, and client goals before suggesting the next best move.
                    </div>
                    {onOpenConnections ? (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Button onClick={onOpenConnections}>Open Connections</Button>
                      </div>
                    ) : null}
                  </div>
                ) : aiState.error && !aiState.data ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 16, background: T.coralSoft, border: `1px solid rgba(215, 93, 66, 0.16)`, color: T.coral, fontSize: 12, fontWeight: 700 }}>
                      {aiState.error}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Button onClick={runAiStrategist} tone="primary" disabled={aiState.loading}>
                        {aiState.loading ? "Retrying..." : "Retry analysis"}
                      </Button>
                    </div>
                  </div>
                ) : aiState.data ? (
                  <AiStrategyOutput result={aiState.data} />
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>
                      Run the strategist to interpret this client&apos;s current account structure, live performance, and channel mix for {dateRangeLabel.toLowerCase()}.
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Button onClick={runAiStrategist} tone="primary" disabled={aiState.loading}>
                        {aiState.loading ? "Running strategist..." : "Run AI strategist"}
                      </Button>
                    </div>
                  </div>
                )}

                {aiReady && aiState.data ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button onClick={runAiStrategist} tone="primary" disabled={aiState.loading}>
                      {aiState.loading ? "Refreshing..." : "Refresh analysis"}
                    </Button>
                  </div>
                ) : null}
              </div>
              <AssignedUsersStrip client={client} users={users} label="Assigned team" />
            </>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {visibleAccounts.length === 0 ? (
              <div style={{ padding: "18px 16px", borderRadius: 16, background: T.bgSoft, border: `1px dashed ${T.lineStrong}`, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>
                  {client.linkedAssetCount && !client.accounts.length ? "Waiting for live account rows" : filterMeta.emptyTitle}
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>
                  {client.linkedAssetCount && !client.accounts.length
                    ? "The linked assets are saved. This section will populate as soon as the connected platforms return live account data."
                    : filterMeta.emptyBody}
                </div>
              </div>
            ) : visibleAccounts.map((account) => {
              const accountCampaigns = campaigns.filter((campaign) => campaign.accountId === account.id);
              const shownCampaigns = visibleCampaigns.filter((campaign) => campaign.accountId === account.id);
              const isAccountOpen = open[account.id];
              const liveCampaigns = accountCampaigns.filter((campaign) => !isStoppedCampaign(campaign)).length;
              const stoppedCampaigns = accountCampaigns.filter((campaign) => isStoppedCampaign(campaign)).length;
              const shownAdsCount = shownCampaigns.reduce((acc, campaign) => acc + (groupedCampaigns[campaign.id]?.length || 0), 0);
              const accountPaceTarget = Math.max(account.monthlyBudget * CALENDAR.spendProgress, 1);
              const accountPaceRatio = account.spend / accountPaceTarget;
              const activeAccountCampaigns = accountCampaigns.filter((campaign) => !isStoppedCampaign(campaign));
              const shouldEvaluateAccountPace = !accountCampaigns.length || activeAccountCampaigns.length > 0;
              const paceTone = shouldEvaluateAccountPace && (accountPaceRatio > 1.1 || accountPaceRatio < 0.9) ? "danger" : "positive";
              const accountFlags = [];

              if (shouldEvaluateAccountPace && accountPaceRatio > 1.1) accountFlags.push({ tone: "danger", label: `${Math.round((accountPaceRatio - 1) * 100)}% over pace` });
              if (shouldEvaluateAccountPace && accountPaceRatio < 0.9) accountFlags.push({ tone: "danger", label: `${Math.round((1 - accountPaceRatio) * 100)}% under pace` });
              const activeAccountSpend = activeAccountCampaigns.reduce((acc, campaign) => acc + (Number(campaign.spend) || 0), 0);
              const activeAccountClicks = activeAccountCampaigns.reduce((acc, campaign) => acc + (Number(campaign.clicks) || 0), 0);
              const activeAccountImpressions = activeAccountCampaigns.reduce((acc, campaign) => acc + (Number(campaign.impressions) || 0), 0);
              const activeAccountCpc = activeAccountClicks ? activeAccountSpend / activeAccountClicks : 0;
              const activeAccountCpm = activeAccountImpressions ? activeAccountSpend / activeAccountImpressions * 1000 : 0;
              const accountEfficiencyCpc = activeAccountCampaigns.length ? activeAccountCpc : accountCampaigns.length ? 0 : account.cpc;
              const accountEfficiencyCpm = activeAccountCampaigns.length ? activeAccountCpm : accountCampaigns.length ? 0 : account.cpm;
              const hasEfficiencyRows = activeAccountCampaigns.length || !accountCampaigns.length;

              if (hasEfficiencyRows && accountEfficiencyCpc > client.rules.cpcMax) accountFlags.push({ tone: "warning", label: `${activeAccountCampaigns.length ? "Active " : ""}CPC above ${formatMetric("cpc", client.rules.cpcMax)}` });
              if (hasEfficiencyRows && accountEfficiencyCpm > client.rules.cpmMax) accountFlags.push({ tone: "warning", label: `${activeAccountCampaigns.length ? "Active " : ""}CPM above ${formatMetric("cpm", client.rules.cpmMax)}` });
              if (account.dataError) accountFlags.push({ tone: "warning", label: "Live data warning" });

              return (
                <div
                  key={account.id}
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    background: T.surfaceStrong,
                    border: `1px solid ${T.line}`,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <button
                    onClick={() => setOpen((current) => ({ ...current, [account.id]: !current[account.id] }))}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: T.font,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0, flex: "1 1 260px", display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <PlatformChip platform={account.platform} />
                          <div style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{account.name}</div>
                          <ToneBadge tone="neutral">{liveCampaigns} live</ToneBadge>
                          {stoppedCampaigns ? <ToneBadge tone="neutral">{stoppedCampaigns} stopped</ToneBadge> : null}
                        </div>
                        <div style={{ fontSize: 12, color: T.inkSoft }}>
                          Spend {formatCurrency(account.spend)} of {formatCurrency(account.monthlyBudget)} | {shownCampaigns.length}{campaignFilter === "all" ? "" : ` of ${accountCampaigns.length}`} campaigns{campaignFilter === "all" ? "" : " shown"} | {shownAdsCount} ads{campaignFilter === "all" ? "" : " shown"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: "1 1 420px", justifyContent: "flex-end" }}>
                        <LedgerMetric label="Budget" value={formatCurrency(account.monthlyBudget)} />
                        <LedgerMetric label="Spend" value={formatCurrency(account.spend)} />
                        <LedgerMetric label="Value" value={formatCurrency(getConversionValue(account))} />
                        <LedgerMetric label="Pace" value={`${Math.round(accountPaceRatio * 100)}%`} tone={paceTone === "danger" ? T.coral : T.accent} />
                        <LedgerMetric label="ROAS" value={formatMetric("roas", account.roas)} tone={account.roas >= 3 ? T.accent : T.ink} />
                        <LedgerMetric label="CPC" value={formatMetric("cpc", account.cpc)} tone={hasEfficiencyRows && accountEfficiencyCpc > client.rules.cpcMax ? T.coral : T.ink} />
                        <LedgerMetric label="CPM" value={formatMetric("cpm", account.cpm)} tone={hasEfficiencyRows && accountEfficiencyCpm > client.rules.cpmMax ? T.coral : T.ink} />
                        <LedgerMetric label="Conv." value={formatNumber(account.conversions)} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.inkSoft, whiteSpace: "nowrap" }}>{isAccountOpen ? "Hide" : "Show"} campaigns</div>
                    </div>
                  </button>

                  <ProgressRail current={account.spend} target={account.monthlyBudget * CALENDAR.spendProgress} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {accountFlags.length ? accountFlags.map((flag) => (
                      <ToneBadge key={`${account.id}-${flag.label}`} tone={flag.tone}>{flag.label}</ToneBadge>
                    )) : <ToneBadge tone="positive">Within account thresholds</ToneBadge>}
                  </div>

                  {isAccountOpen ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {shownCampaigns.map((campaign) => {
                        const campaignAds = groupedCampaigns[campaign.id] || [];
                        const isCampaignOpen = open[campaign.id];
                        const campaignBadges = [];

                        const campaignStopped = isStoppedCampaign(campaign);

                        if (campaignStopped) campaignBadges.push({ tone: "neutral", label: "Stopped" });
                        if (!campaignStopped && campaign.status === "learning") campaignBadges.push({ tone: "warning", label: "Learning" });
                        if (!campaignStopped && campaign.cpc > client.rules.cpcMax) campaignBadges.push({ tone: "warning", label: `High CPC ${formatMetric("cpc", campaign.cpc)}` });
                        if (!campaignStopped && campaign.cpm > client.rules.cpmMax) campaignBadges.push({ tone: "warning", label: `High CPM ${formatMetric("cpm", campaign.cpm)}` });

                        return (
                          <div
                            key={campaign.id}
                            style={{
                              padding: 12,
                              borderRadius: 16,
                              background: T.bgSoft,
                              border: `1px solid ${T.line}`,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <button
                              onClick={() => setOpen((current) => ({ ...current, [campaign.id]: !current[campaign.id] }))}
                              style={{
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                textAlign: "left",
                                cursor: "pointer",
                                fontFamily: T.font,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                                <div style={{ minWidth: 0, flex: "1 1 240px", display: "grid", gap: 6 }}>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{campaign.name}</div>
                                    <ToneBadge tone={campaignStopped ? "neutral" : campaign.status === "learning" ? "warning" : "positive"}>{campaign.status}</ToneBadge>
                                    <ToneBadge tone="neutral">{campaignAds.length} ads</ToneBadge>
                                  </div>
                                  <div style={{ fontSize: 11, color: T.inkSoft }}>{campaign.objective}</div>
                                </div>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: "1 1 360px", justifyContent: "flex-end" }}>
                                  <LedgerMetric label="Spend" value={formatCurrency(campaign.spend)} compact />
                                  <LedgerMetric label="Value" value={formatCurrency(campaign.conversionValue || 0)} compact />
                                  <LedgerMetric label="Conv." value={formatNumber(campaign.conversions)} compact />
                                  <LedgerMetric label="CPC" value={formatMetric("cpc", campaign.cpc)} tone={!campaignStopped && campaign.cpc > client.rules.cpcMax ? T.coral : T.ink} compact />
                                  <LedgerMetric label="CPM" value={formatMetric("cpm", campaign.cpm)} tone={!campaignStopped && campaign.cpm > client.rules.cpmMax ? T.coral : T.ink} compact />
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: T.inkSoft, whiteSpace: "nowrap" }}>{isCampaignOpen ? "Hide" : "Show"} ads</div>
                              </div>
                            </button>

                            {campaignBadges.length ? (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {campaignBadges.map((flag) => (
                                  <ToneBadge key={`${campaign.id}-${flag.label}`} tone={flag.tone}>{flag.label}</ToneBadge>
                                ))}
                              </div>
                            ) : null}

                            {isCampaignOpen ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                {campaignAds.map((ad) => (
                                  <div
                                    key={ad.id}
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      alignItems: "center",
                                      padding: "10px 12px",
                                      borderRadius: 14,
                                      background: T.surfaceStrong,
                                      border: `1px solid ${T.line}`,
                                    }}
                                  >
                                    <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{ad.name}</div>
                                        <ToneBadge tone={ad.status === "paused" ? "neutral" : ad.status === "learning" ? "warning" : "positive"}>{ad.status}</ToneBadge>
                                      </div>
                                      <div style={{ marginTop: 3, fontSize: 10, color: T.inkSoft }}>{ad.format}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginLeft: "auto" }}>
                                      <LedgerMetric label="CTR" value={`${ad.ctr.toFixed(2)}%`} compact />
                                      <LedgerMetric label="Spend" value={formatCurrency(ad.spend)} compact />
                                      <LedgerMetric label="Value" value={formatCurrency(ad.conversionValue || 0)} compact />
                                      <LedgerMetric label="Conv." value={formatNumber(ad.conversions)} compact />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GaSummary({ client, ga4 }) {
  if (!ga4) {
    return <EmptyState title="GA4 not connected" body="Enable the GA4 connection in Client Studio to bring analytics into the dashboard." />;
  }

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 24,
        background: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <PlatformChip platform="ga4" />
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: T.heading }}>{client.name}</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft }}>{ga4.propertyName} | {CALENDAR.revenueRangeLabel}</div>
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, maxWidth: 260 }}>{ga4.insight}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: fitCols(128), gap: 10 }}>
        <MetricTile label="Sessions" value={formatNumber(ga4.sessions)} />
        <MetricTile label="Users" value={formatNumber(ga4.users)} />
        <MetricTile label="Engaged Rate" value={`${ga4.engagedRate.toFixed(1)}%`} />
        <MetricTile label="Conv. Rate" value={`${ga4.conversionRate.toFixed(1)}%`} />
        <MetricTile label={client.category === "eshop" ? "Revenue" : "Leads"} value={client.category === "eshop" ? formatCurrency(ga4.revenueCurrentPeriod) : formatNumber(ga4.purchasesOrLeads)} />
        {client.category === "eshop" ? <MetricTile label="AOV" value={formatCurrency(ga4.aov)} /> : null}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Traffic mix</div>
        {Object.entries(ga4.channels).map(([channel, value]) => (
          <div key={channel}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
              <span style={{ color: T.ink, fontWeight: 700 }}>{channel}</span>
              <span style={{ color: T.inkSoft, fontFamily: T.mono }}>{value}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(22, 34, 24, 0.08)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${value}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: channel === "Organic" ? T.accent : channel === "Paid" ? T.sky : channel === "Direct" ? T.amber : channel === "Social" ? "#7b5cff" : T.coral,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ chart, clients, accounts, seriesMap, dateRangeLabel, onRemove }) {
  const client = clients.find((item) => item.id === chart.clientId);
  const account = chart.scope === "account" ? accounts.find((item) => item.id === chart.accountId) : null;
  const seriesKey = chart.scope === "client" ? `client:${chart.clientId}` : chart.scope === "ga4" ? `ga4:${chart.clientId}` : `account:${chart.accountId}`;
  const series = seriesMap[seriesKey] || [];
  const previousSeries = chart.scope === "ga4" && client?.ga4 ? client.ga4.previousSeries || [] : [];
  const title = chart.scope === "account" && account ? `${client?.name || "Client"} / ${account.name}` : chart.scope === "ga4" ? `${client?.name || "Client"} / GA4` : client?.name || "Client";
  const subtitle = chart.scope === "account" ? "Specific ad account" : chart.scope === "ga4" ? "Google Analytics 4" : "Client summary";

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 24,
        background: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading, color: T.ink }}>{title}</div>
          <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>{subtitle} | {dateRangeLabel}</div>
        </div>
        <Button onClick={onRemove}>Remove</Button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {chart.metrics.map((metricKey) => {
          const values = series.map((point) => point[metricKey] || 0);
          const summaryValue = ADDITIVE_METRICS.has(metricKey)
            ? values.reduce((acc, value) => acc + value, 0)
            : values.reduce((acc, value) => acc + value, 0) / Math.max(values.length, 1);
          const metric = KPI_LIBRARY[metricKey];

          return (
            <div
              key={metricKey}
              style={{
                padding: 18,
                borderRadius: 20,
                background: T.surfaceStrong,
                border: `1px solid ${T.line}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: metric.color }}>{metric.label}</div>
                <div style={{ fontSize: 13, fontWeight: 900, fontFamily: T.mono, color: T.ink }}>
                  {formatMetric(metricKey, summaryValue)}
                </div>
              </div>
              <InteractiveLineChart series={series} previousSeries={previousSeries} metricKey={metricKey} color={metric.color} height={340} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function summarizeReportMetrics(items) {
  const spend = items.reduce((acc, item) => acc + (Number(item.spend) || 0), 0);
  const impressions = items.reduce((acc, item) => acc + (Number(item.impressions) || 0), 0);
  const clicks = items.reduce((acc, item) => acc + (Number(item.clicks) || 0), 0);
  const conversions = items.reduce((acc, item) => acc + (Number(item.conversions) || 0), 0);
  const conversionValue = items.reduce((acc, item) => acc + getConversionValue(item), 0);

  return {
    spend,
    impressions,
    clicks,
    conversions,
    conversionValue,
    ctr: impressions ? clicks / impressions * 100 : 0,
    cpc: clicks ? spend / clicks : 0,
    costPerConversion: conversions ? spend / conversions : 0,
    roas: spend ? conversionValue / spend : 0,
  };
}

function formatReportCurrency(value, digits = 2) {
  return `EUR ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatReportNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatReportPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function buildChartTicks(max, steps = 4, fixedMax = null) {
  const safeMax = fixedMax == null ? Math.max(Number(max) || 0, 1) : Math.max(Number(fixedMax) || 0, 1);
  const digits = safeMax <= 5 ? 2 : safeMax <= 25 ? 1 : 0;

  return Array.from({ length: steps + 1 }, (_, index) => +(safeMax * index / steps).toFixed(digits));
}

function formatChartAxisValue(value, axisType = "number") {
  const numeric = Number(value || 0);

  if (axisType === "currency") {
    return formatReportCurrency(numeric, Math.abs(numeric) >= 100 ? 0 : 2);
  }

  if (axisType === "percent") {
    return `${numeric.toFixed(Math.abs(numeric) >= 10 ? 0 : 1)}%`;
  }

  return formatReportNumber(numeric, Math.abs(numeric) < 10 ? 1 : 0);
}

function getSeriesAxisLabels(series) {
  const items = Array.isArray(series) ? series : [];
  if (!items.length) return [];

  const indices = Array.from(new Set([0, Math.floor((items.length - 1) / 2), items.length - 1]));
  return indices.map((index) => ({
    index,
    label: String(items[index]?.label || items[index]?.date || `Point ${index + 1}`),
  }));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPlatformReportSeries(client, platform, seriesMap) {
  const merged = new Map();

  (client.accounts || [])
    .filter((account) => account.platform === platform)
    .forEach((account) => {
      const accountSeries = normalizeProvidedSeries(account.series).length
        ? normalizeProvidedSeries(account.series)
        : (seriesMap[`account:${account.id}`] || []);

      accountSeries.forEach((point, index) => {
        const key = String(point?.date || point?.label || `point-${index}`);
        const current = merged.get(key) || {
          date: point?.date || "",
          label: point?.label || point?.date || "",
          spend: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          conversionValue: 0,
          revenue: 0,
        };

        current.date = current.date || point?.date || "";
        current.label = current.label || point?.label || point?.date || "";
        current.spend += Number(point?.spend) || 0;
        current.clicks += Number(point?.clicks) || 0;
        current.impressions += Number(point?.impressions) || 0;
        current.conversions += Number(point?.conversions) || 0;
        current.conversionValue += Number(point?.conversionValue ?? point?.revenue) || 0;
        current.revenue += Number(point?.revenue ?? point?.conversionValue) || 0;
        merged.set(key, current);
      });
    });

  const rows = Array.from(merged.values());
  return rows.every((point) => point.date)
    ? rows.sort((left, right) => String(left.date).localeCompare(String(right.date)))
    : rows;
}

function getGoogleGeographyEmptyLabel(errorMessage) {
  const message = String(errorMessage || "").trim();
  if (!message) {
    return "No geographic rows were returned by Google Ads for the selected account and date range.";
  }

  if (/403|permission/i.test(message)) {
    return "Google Ads did not allow a geographic breakdown for this account with the current login. Reconnect the Google Ads login and make sure the correct parent MCC has access to this ad account.";
  }

  return message;
}

function aggregateReportRows(rows, keyField, numericFields, sorterField = "cost") {
  const map = new Map();

  (rows || []).forEach((row) => {
    const key = String(row[keyField] || "Unknown").trim() || "Unknown";
    const current = map.get(key) || { ...row, [keyField]: key };
    numericFields.forEach((field) => {
      if (!map.has(key)) current[field] = 0;
      current[field] = (Number(current[field]) || 0) + (Number(row[field]) || 0);
    });
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      ctr: Number(row.impressions) ? Number(row.clicks || 0) / Number(row.impressions) * 100 : Number(row.ctr) || 0,
      costPerConversion: Number(row.conversions) ? Number(row.cost || row.spend || 0) / Number(row.conversions) : 0,
      averageCpc: Number(row.clicks) ? Number(row.cost || row.spend || 0) / Number(row.clicks) : Number(row.averageCpc) || 0,
      valuePerConversion: Number(row.conversions) ? Number(row.conversionValue || 0) / Number(row.conversions) : Number(row.valuePerConversion) || 0,
    }))
    .sort((left, right) => (Number(right[sorterField]) || 0) - (Number(left[sorterField]) || 0));
}

function aggregateGoogleReportDetails(details, clientId) {
  const clientDetails = (details || []).filter((detail) => detail.clientId === clientId);
  const devices = aggregateReportRows(
    clientDetails.flatMap((detail) => detail.devices || []),
    "device",
    ["impressions", "clicks", "cost", "conversions", "conversionValue"],
    "impressions"
  );
  const geographies = aggregateReportRows(
    clientDetails.flatMap((detail) => detail.geographies || []),
    "location",
    ["clicks", "cost", "conversions", "conversionValue"],
    "conversions"
  );
  const keywords = aggregateReportRows(
    clientDetails.flatMap((detail) => detail.keywords || []),
    "keyword",
    ["impressions", "clicks", "cost", "conversions", "conversionValue"],
    "clicks"
  );
  const impressionShare = aggregateImpressionShareRows(clientDetails.flatMap((detail) => detail.impressionShare || []));

  return {
    devices,
    geographies,
    keywords,
    impressionShare,
    errors: clientDetails.map((detail) => detail.dataError).filter(Boolean),
  };
}

function aggregateImpressionShareRows(rows) {
  const map = new Map();

  (rows || []).forEach((row) => {
    const key = row.date || row.label || "";
    if (!key) return;
    const current = map.get(key) || { date: key, label: row.label || key, searchImpressionShare: 0, searchBudgetLostImpressionShare: 0, count: 0 };
    current.searchImpressionShare += Number(row.searchImpressionShare) || 0;
    current.searchBudgetLostImpressionShare += Number(row.searchBudgetLostImpressionShare) || 0;
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((row) => ({
      date: row.date,
      label: row.label,
      searchImpressionShare: row.count ? row.searchImpressionShare / row.count : 0,
      searchBudgetLostImpressionShare: row.count ? row.searchBudgetLostImpressionShare / row.count : 0,
    }))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
}

function getReportDateStamp() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeReportSectionIds(value, fallback = DEFAULT_REPORT_SECTION_IDS) {
  const allowed = new Set(REPORT_SECTION_OPTIONS.map((section) => section.id));
  const source = Array.isArray(value) && value.length ? value : fallback;
  const normalized = source.filter((id) => allowed.has(id));
  return normalized.length ? normalized : [...fallback];
}

function getReportPresetById(presetId) {
  return REPORT_PRESETS.find((preset) => preset.id === presetId) || REPORT_PRESETS[0];
}

function getReportPresetLabel(presetId) {
  if (presetId === "custom") return "Custom report";
  return getReportPresetById(presetId).label;
}

function normalizeReportSchedule(value) {
  const input = value && typeof value === "object" ? value : {};
  const frequency = ["weekly", "monthly"].includes(input.frequency) ? input.frequency : DEFAULT_REPORT_SCHEDULE.frequency;
  const weekday = ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(input.weekday)
    ? input.weekday
    : DEFAULT_REPORT_SCHEDULE.weekday;
  const dayOfMonth = String(input.dayOfMonth || DEFAULT_REPORT_SCHEDULE.dayOfMonth).replace(/\D/g, "");
  const dayNumber = Math.min(28, Math.max(1, Number(dayOfMonth) || 1));

  return {
    ...DEFAULT_REPORT_SCHEDULE,
    ...input,
    enabled: !!input.enabled,
    frequency,
    weekday,
    dayOfMonth: String(dayNumber),
    recipients: String(input.recipients || "").trim(),
    notes: String(input.notes || "").trim(),
  };
}

function getReportScheduleSummary(schedule) {
  const normalized = normalizeReportSchedule(schedule);
  if (!normalized.enabled) return "Manual PDF export only";

  const cadence = normalized.frequency === "weekly"
    ? `Every ${normalized.weekday}`
    : `Day ${normalized.dayOfMonth} of each month`;
  const recipients = normalized.recipients
    ? normalized.recipients.split(",").map((item) => item.trim()).filter(Boolean).length
    : 0;

  return `${cadence}${recipients ? ` | ${recipients} recipient${recipients === 1 ? "" : "s"}` : " | no recipients yet"}`;
}

function getReportAiStrategyKey(client, dateRangeLabel) {
  return client?.id ? `report:${client.id}:${dateRangeLabel}` : "";
}

function getReportSectionStatus(sectionId, client, googleDetails) {
  const googleConnected = client?.connections?.google_ads;
  const metaConnected = client?.connections?.meta_ads;
  const ga4Connected = client?.connections?.ga4 && client?.ga4;

  if (sectionId.startsWith("google_") && !googleConnected) {
    return { tone: "warning", label: "No Google asset" };
  }

  if (sectionId === "google_geo" && googleConnected && googleDetails?.errors?.some((error) => /geo|location|permission|403/i.test(String(error)))) {
    return { tone: "warning", label: "Permission dependent" };
  }

  if (sectionId.startsWith("meta_") && !metaConnected) {
    return { tone: "warning", label: "No Meta asset" };
  }

  if (sectionId === "analytics" && !ga4Connected) {
    return { tone: "warning", label: "No live GA4" };
  }

  if (sectionId === "strategist") {
    return { tone: "neutral", label: "Optional" };
  }

  return { tone: "positive", label: "Ready" };
}

function buildReportReadinessItems(client, googleDetails, googleReportState, schedule) {
  if (!client) return [];

  const googleRows = [
    ...(googleDetails?.geographies || []),
    ...(googleDetails?.devices || []),
    ...(googleDetails?.keywords || []),
    ...(googleDetails?.impressionShare || []),
  ].length;
  const googleStatus = googleReportState.loading
    ? "Google report details are still loading."
    : googleRows
      ? `${googleRows} Google detail rows available for the selected range.`
      : client.connections?.google_ads
        ? "Google overview is live; detail breakdowns may depend on account permissions."
        : "No Google Ads asset is linked.";
  const metaStatus = client.accounts?.some((account) => account.platform === "meta_ads")
    ? `${client.campaigns.filter((campaign) => campaign.platform === "meta_ads").length} Meta campaigns available.`
    : client.connections?.meta_ads
      ? "Meta account is linked; campaign rows are still syncing or empty for this range."
      : "No Meta Ads asset is linked.";
  const ga4Status = client.ga4?.isLiveGa4
    ? `Live GA4 connected: ${formatReportNumber(client.ga4.sessions)} sessions in the selected period.`
    : client.connections?.ga4
      ? "GA4 is linked but no live analytics rows are available for this range."
      : "No GA4 property is linked.";

  return [
    { label: "Google Ads", detail: googleStatus, tone: googleRows || client.accounts?.some((account) => account.platform === "google_ads") ? "positive" : "warning" },
    { label: "Meta Ads", detail: metaStatus, tone: client.accounts?.some((account) => account.platform === "meta_ads") ? "positive" : "warning" },
    { label: "Analytics", detail: ga4Status, tone: client.ga4?.isLiveGa4 ? "positive" : "warning" },
    { label: "Recurring plan", detail: getReportScheduleSummary(schedule), tone: normalizeReportSchedule(schedule).enabled ? "positive" : "neutral" },
  ];
}

function getReportCampaignScore(campaign) {
  const spend = Number(campaign?.spend) || 0;
  const conversions = Number(campaign?.conversions) || 0;
  const conversionValue = getConversionValue(campaign);
  const roas = spend ? conversionValue / spend : 0;
  return roas * 100 + conversions * 8 + (conversionValue > 0 ? 10 : 0);
}

function getReportTopCampaigns(campaigns, limit = 4) {
  return [...(campaigns || [])]
    .sort((left, right) => getReportCampaignScore(right) - getReportCampaignScore(left) || (Number(right.spend) || 0) - (Number(left.spend) || 0))
    .slice(0, limit);
}

function getReportConcernCampaigns(campaigns, limit = 4) {
  return [...(campaigns || [])]
    .filter((campaign) => (Number(campaign.spend) || 0) > 0)
    .sort((left, right) => {
      const leftConversions = Number(left.conversions) || 0;
      const rightConversions = Number(right.conversions) || 0;
      const leftCpa = leftConversions ? (Number(left.spend) || 0) / leftConversions : Number(left.spend) || 0;
      const rightCpa = rightConversions ? (Number(right.spend) || 0) / rightConversions : Number(right.spend) || 0;
      const leftRoas = Number(left.spend) ? getConversionValue(left) / Number(left.spend) : 0;
      const rightRoas = Number(right.spend) ? getConversionValue(right) / Number(right.spend) : 0;
      return leftRoas - rightRoas || rightCpa - leftCpa || (Number(right.spend) || 0) - (Number(left.spend) || 0);
    })
    .slice(0, limit);
}

function ReportPrintStyles() {
  return (
    <style>
      {`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: #ffffff !important; }
          .report-screen-controls { display: none !important; }
          .report-print-root { display: block !important; background: #ffffff !important; }
          .report-page {
            width: 297mm !important;
            min-height: 210mm !important;
            max-width: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}
    </style>
  );
}

function ReportCenter({ clients, selectedClientId, onSelectClient, seriesMap, dateRangeLabel, dateRangeValue, onDateRangeChange, googleReportState, aiReady }) {
  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0] || null;
  const googleDetails = selectedClient ? aggregateGoogleReportDetails(googleReportState.details, selectedClient.id) : null;
  const reportGroups = groupClientsByReportingGroup(clients);
  const selectedGroup = reportGroups.find((group) => group.clients.some((client) => client.id === selectedClient?.id)) || null;
  const [reportPreset, setReportPreset] = useState(() => readStoredValue(STORAGE_KEYS.reportPreset, "full"));
  const [selectedSections, setSelectedSections] = useState(() => normalizeReportSectionIds(readStoredValue(STORAGE_KEYS.reportSections, DEFAULT_REPORT_SECTION_IDS)));
  const [schedulePlans, setSchedulePlans] = useState(() => {
    const stored = readStoredValue(STORAGE_KEYS.reportSchedulePlans, {});
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  });
  const [scheduleDraft, setScheduleDraft] = useState(() => normalizeReportSchedule());
  const [builderCue, setBuilderCue] = useState(null);
  const [reportAiState, setReportAiState] = useState(() => createEmptyAiStrategistState());
  const normalizedSections = useMemo(() => normalizeReportSectionIds(selectedSections), [selectedSections]);
  const selectedSectionSet = useMemo(() => new Set(normalizedSections), [normalizedSections]);
  const reportAiStrategyKey = useMemo(() => getReportAiStrategyKey(selectedClient, dateRangeLabel), [selectedClient, dateRangeLabel]);
  const reportReadinessItems = useMemo(
    () => buildReportReadinessItems(selectedClient, googleDetails, googleReportState, scheduleDraft),
    [selectedClient, googleDetails, googleReportState, scheduleDraft]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.reportSections, JSON.stringify(normalizedSections));
  }, [normalizedSections]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.reportPreset, JSON.stringify(reportPreset));
  }, [reportPreset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.reportSchedulePlans, JSON.stringify(schedulePlans));
  }, [schedulePlans]);

  useEffect(() => {
    if (!selectedClient) return;
    setScheduleDraft(normalizeReportSchedule(schedulePlans[selectedClient.id]));
  }, [schedulePlans, selectedClient?.id]);

  useEffect(() => {
    const saved = readStoredAiStrategyResult(reportAiStrategyKey);
    setReportAiState(saved ? {
      loading: false,
      error: "",
      data: saved,
      generatedAt: saved?.generatedAt || "",
      cached: !!saved?.cached,
    } : createEmptyAiStrategistState());
  }, [reportAiStrategyKey]);

  useEffect(() => {
    if (!builderCue) return undefined;
    const timer = window.setTimeout(() => setBuilderCue(null), 3200);
    return () => window.clearTimeout(timer);
  }, [builderCue]);

  function applyReportPreset(presetId) {
    const preset = getReportPresetById(presetId);
    setReportPreset(preset.id);
    setSelectedSections(normalizeReportSectionIds(preset.sections));
    setBuilderCue({ tone: "success", message: `${preset.label} preset applied.` });
  }

  function toggleReportSection(sectionId) {
    setReportPreset("custom");
    setSelectedSections((current) => {
      const currentSet = new Set(normalizeReportSectionIds(current));
      if (currentSet.has(sectionId)) {
        currentSet.delete(sectionId);
      } else {
        currentSet.add(sectionId);
      }

      return REPORT_SECTION_OPTIONS.map((section) => section.id).filter((id) => currentSet.has(id));
    });
  }

  function selectAllReportSections() {
    setReportPreset("custom");
    setSelectedSections(REPORT_SECTION_OPTIONS.map((section) => section.id));
    setBuilderCue({ tone: "success", message: "All report pages selected." });
  }

  function resetReportSections() {
    applyReportPreset("full");
  }

  function saveReportSchedulePlan() {
    if (!selectedClient) return;

    const normalized = normalizeReportSchedule(scheduleDraft);
    setSchedulePlans((current) => ({
      ...current,
      [selectedClient.id]: normalized,
    }));
    setBuilderCue({ tone: "success", message: `Report schedule plan saved for ${selectedClient.name}.` });
  }

  async function refreshReportStrategist() {
    if (!selectedClient || !reportAiStrategyKey) return;
    if (!aiReady) {
      setReportAiState((current) => ({
        ...current,
        error: "Claude is not configured yet. Add the Anthropic API key in Connections.",
      }));
      return;
    }

    setReportAiState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const payload = await fetchAiStrategy({
        scope: "report",
        context: {
          ...buildAccountAiPayload(selectedClient, dateRangeLabel),
          report: {
            preset: getReportPresetLabel(reportPreset),
            sections: normalizedSections,
            readiness: reportReadinessItems,
          },
        },
        forceRefresh: true,
      });
      writeStoredAiStrategyResult(reportAiStrategyKey, payload);
      setReportAiState({
        loading: false,
        error: "",
        data: payload,
        generatedAt: payload?.generatedAt || "",
        cached: !!payload?.cached,
      });
      setSelectedSections((current) => normalizeReportSectionIds([...new Set([...current, "strategist"])]));
      setBuilderCue({ tone: "success", message: "Claude strategist page refreshed and added to the report." });
    } catch (error) {
      setReportAiState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Could not refresh the report strategist.",
      }));
    }
  }

  function generatePdf() {
    if (!selectedClient || typeof window === "undefined") return;

    const reportNode = document.querySelector(".report-print-root");
    if (!reportNode) return;

    const printWindow = window.open("", "_blank", "width=1280,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    setBuilderCue({ tone: "info", message: "Opening the print dialog. Choose Save as PDF." });

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(selectedClient.name)} Campaign Report</title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #ffffff;
              color: #162218;
              font-family: ${T.font};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-print-root {
              display: block;
              width: 297mm;
              margin: 0 auto;
              background: #ffffff;
            }
            .report-page {
              width: 297mm !important;
              min-height: 210mm !important;
              max-width: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              page-break-after: always;
              break-after: page;
            }
            .report-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          </style>
        </head>
        <body>${reportNode.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 350);
  }

  if (!clients.length) {
    return <EmptyState title="No clients available for reports" body="Create a client and link campaign assets before generating a PDF report." />;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <ReportPrintStyles />
      <div
        className="report-screen-controls"
        style={{
          padding: 18,
          borderRadius: 24,
          background: T.surface,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: T.heading }}>Campaign PDF reports</div>
          <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>
            Template follows the sample report: overview KPIs, channel charts, campaign tables, ad tables and metric definitions. Choose Save as PDF when the print dialog opens.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selectedClient?.id || ""}
            onChange={(event) => onSelectClient(event.target.value)}
            style={{
              width: 260,
              maxWidth: "100%",
              boxSizing: "border-box",
              padding: "12px 13px",
              borderRadius: 16,
              border: `1px solid ${T.line}`,
              background: T.surfaceStrong,
              color: T.ink,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: T.font,
            }}
          >
            {reportGroups.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <Button onClick={generatePdf} tone="primary" disabled={!selectedClient}>Generate PDF</Button>
        </div>
      </div>

      {selectedClient && selectedGroup ? (
        <div
          className="report-screen-controls"
          style={{
            padding: 16,
            borderRadius: 22,
            background: T.surface,
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <ActionCue tone="success">Reporting group: {selectedGroup.label}</ActionCue>
          <ActionCue tone="info">Target: {selectedClient.focus}</ActionCue>
          <ToneBadge tone="neutral">{selectedGroup.clientsCount} clients in group</ToneBadge>
          <ToneBadge tone="neutral">Group spend {formatCurrency(selectedGroup.spend)}</ToneBadge>
        </div>
      ) : null}

      <div className="report-screen-controls">
        <AccountDateRangeControl value={dateRangeValue} onChange={onDateRangeChange} />
      </div>

      {selectedClient ? (
        <ReportBuilderPanel
          client={selectedClient}
          googleDetails={googleDetails}
          reportPreset={reportPreset}
          selectedSectionSet={selectedSectionSet}
          selectedSections={normalizedSections}
          onPreset={applyReportPreset}
          onToggleSection={toggleReportSection}
          onSelectAll={selectAllReportSections}
          onReset={resetReportSections}
          readinessItems={reportReadinessItems}
          scheduleDraft={scheduleDraft}
          onScheduleDraftChange={setScheduleDraft}
          onSaveSchedule={saveReportSchedulePlan}
          aiReady={aiReady}
          aiState={reportAiState}
          onRefreshStrategist={refreshReportStrategist}
          cue={builderCue}
        />
      ) : null}

      {selectedClient ? (
        <div className="report-print-root" style={{ display: "grid", gap: 18, justifyItems: "center" }}>
          <CampaignReportDocument
            client={selectedClient}
            seriesMap={seriesMap}
            dateRangeLabel={dateRangeLabel}
            googleDetails={googleDetails}
            googleReportState={googleReportState}
            selectedSections={normalizedSections}
            strategistResult={reportAiState.data}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReportBuilderPanel({
  client,
  googleDetails,
  reportPreset,
  selectedSectionSet,
  selectedSections,
  onPreset,
  onToggleSection,
  onSelectAll,
  onReset,
  readinessItems,
  scheduleDraft,
  onScheduleDraftChange,
  onSaveSchedule,
  aiReady,
  aiState,
  onRefreshStrategist,
  cue,
}) {
  return (
    <div
      className="report-screen-controls"
      style={{
        padding: 18,
        borderRadius: 24,
        background: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        display: "grid",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: T.heading }}>Report builder</div>
          <div style={{ marginTop: 5, color: T.inkSoft, fontSize: 12, lineHeight: 1.5 }}>
            Current setup: {getReportPresetLabel(reportPreset)} | {selectedSections.length} pages selected | {getReportScheduleSummary(scheduleDraft)}
          </div>
        </div>
        {cue ? <ActionCue tone={cue.tone}>{cue.message}</ActionCue> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
        <div style={{ padding: 16, borderRadius: 22, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.ink }}>Presets and PDF pages</div>
              <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>Choose a preset, then fine-tune the exact pages that print.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button onClick={onSelectAll}>Select all</Button>
              <Button onClick={onReset}>Reset full report</Button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            {REPORT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPreset(preset.id)}
                style={{
                  textAlign: "left",
                  padding: 13,
                  borderRadius: 16,
                  border: `1px solid ${reportPreset === preset.id ? "rgba(15, 143, 102, 0.34)" : T.line}`,
                  background: reportPreset === preset.id ? T.accentSoft : T.bgSoft,
                  cursor: "pointer",
                  fontFamily: T.font,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: reportPreset === preset.id ? T.accent : T.ink }}>{preset.label}</div>
                <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.45, color: T.inkSoft }}>{preset.description}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
            {REPORT_SECTION_OPTIONS.map((section) => {
              const checked = selectedSectionSet.has(section.id);
              const status = getReportSectionStatus(section.id, client, googleDetails);

              return (
                <label
                  key={section.id}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: `1px solid ${checked ? "rgba(15, 143, 102, 0.26)" : T.line}`,
                    background: checked ? "rgba(223, 245, 234, 0.58)" : T.bgSoft,
                    display: "grid",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSection(section.id)}
                        style={{ accentColor: T.accent }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 900, color: T.ink }}>{section.label}</span>
                    </span>
                    <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                  </div>
                  <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.45 }}>{section.description}</div>
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <ReportReadinessPanel items={readinessItems} />
          <ReportStrategistControl aiReady={aiReady} aiState={aiState} onRefresh={onRefreshStrategist} />
          <ReportSchedulePanel scheduleDraft={scheduleDraft} onChange={onScheduleDraftChange} onSave={onSaveSchedule} />
        </div>
      </div>
    </div>
  );
}

function ReportReadinessPanel({ items }) {
  return (
    <div style={{ padding: 16, borderRadius: 22, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, color: T.ink }}>Live data readiness</div>
        <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>This is a sanity check before printing the PDF.</div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {(items || []).map((item) => (
          <div key={item.label} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, alignItems: "start", fontSize: 11, lineHeight: 1.45 }}>
            <ToneBadge tone={item.tone}>{item.label}</ToneBadge>
            <div style={{ color: T.inkSoft }}>{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportStrategistControl({ aiReady, aiState, onRefresh }) {
  return (
    <div style={{ padding: 16, borderRadius: 22, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: T.ink }}>Claude strategist page</div>
          <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft, lineHeight: 1.45 }}>
            Creates a Greek diagnosis page for the PDF and keeps it saved until refreshed.
          </div>
        </div>
        <ToneBadge tone={aiReady ? "positive" : "warning"}>{aiReady ? "Configured" : "Setup needed"}</ToneBadge>
      </div>
      {aiState?.generatedAt ? (
        <div style={{ fontSize: 11, color: T.inkSoft }}>Last generated {formatAiGeneratedAt(aiState.generatedAt)}</div>
      ) : null}
      {aiState?.error ? <ActionCue tone="danger">{aiState.error}</ActionCue> : null}
      <Button onClick={onRefresh} tone="primary" disabled={!aiReady || aiState?.loading}>
        {aiState?.loading ? "Refreshing strategist..." : "Refresh strategist page"}
      </Button>
    </div>
  );
}

function ReportSchedulePanel({ scheduleDraft, onChange, onSave }) {
  const schedule = normalizeReportSchedule(scheduleDraft);
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${T.line}`,
    background: T.bgSoft,
    color: T.ink,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: T.font,
  };
  const update = (patch) => onChange((current) => normalizeReportSchedule({ ...current, ...patch }));

  return (
    <div style={{ padding: 16, borderRadius: 22, background: T.surfaceStrong, border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, color: T.ink }}>Recurring report plan</div>
        <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft, lineHeight: 1.45 }}>
          This saves the plan inside AdPulse. Email automation can be connected later through a mail provider.
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: T.ink }}>
        <input type="checkbox" checked={schedule.enabled} onChange={(event) => update({ enabled: event.target.checked })} style={{ accentColor: T.accent }} />
        Enable recurring report plan
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <select value={schedule.frequency} onChange={(event) => update({ frequency: event.target.value })} style={inputStyle}>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
        {schedule.frequency === "weekly" ? (
          <select value={schedule.weekday} onChange={(event) => update({ weekday: event.target.value })} style={inputStyle}>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
          </select>
        ) : (
          <select value={schedule.dayOfMonth} onChange={(event) => update({ dayOfMonth: event.target.value })} style={inputStyle}>
            {Array.from({ length: 28 }, (_, index) => String(index + 1)).map((day) => (
              <option key={day} value={day}>Day {day}</option>
            ))}
          </select>
        )}
      </div>
      <input
        value={schedule.recipients}
        onChange={(event) => update({ recipients: event.target.value })}
        placeholder="client@example.com, team@example.com"
        style={inputStyle}
      />
      <textarea
        value={schedule.notes}
        onChange={(event) => update({ notes: event.target.value })}
        placeholder="Internal notes for this reporting plan"
        rows={3}
        style={{ ...inputStyle, resize: "vertical", fontWeight: 600, lineHeight: 1.45 }}
      />
      <Button onClick={onSave} tone="success">Save schedule plan</Button>
    </div>
  );
}

function CampaignReportDocument({ client, seriesMap, dateRangeLabel, googleDetails, googleReportState, selectedSections, strategistResult }) {
  const googleAccounts = (client.accounts || []).filter((account) => account.platform === "google_ads");
  const metaAccounts = (client.accounts || []).filter((account) => account.platform === "meta_ads");
  const googleCampaigns = (client.campaigns || []).filter((campaign) => campaign.platform === "google_ads").sort((left, right) => right.spend - left.spend);
  const metaCampaigns = (client.campaigns || []).filter((campaign) => campaign.platform === "meta_ads").sort((left, right) => right.spend - left.spend);
  const metaAds = (client.ads || []).filter((ad) => ad.platform === "meta_ads").sort((left, right) => right.spend - left.spend);
  const allCampaigns = [...googleCampaigns, ...metaCampaigns];
  const googleSummary = summarizeReportMetrics(googleAccounts);
  const metaSummary = summarizeReportMetrics(metaAccounts);
  const totalSummary = summarizeReportMetrics(client.accounts || []);
  const googleSeries = getPlatformReportSeries(client, "google_ads", seriesMap);
  const metaSeries = getPlatformReportSeries(client, "meta_ads", seriesMap);
  const hasGoogle = googleAccounts.length > 0;
  const hasMeta = metaAccounts.length > 0;
  const channelLabel = [hasGoogle ? "Google Ads" : "", hasMeta ? "Meta Ads" : "", client.ga4 ? "GA4" : ""].filter(Boolean).join(" + ") || "No linked channels";
  const sectionSet = new Set(normalizeReportSectionIds(selectedSections));
  const showSection = (sectionId) => sectionSet.has(sectionId);

  return (
    <>
      {showSection("cover") ? (
      <ReportPage accent={T.ink}>
        <div style={{ display: "grid", gridTemplateRows: "1fr auto", minHeight: 690 }}>
          <div style={{ display: "grid", alignContent: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <LogoMark client={client} size={68} />
              <div>
                <div style={{ fontSize: 48, lineHeight: 1, fontWeight: 800, fontFamily: T.heading, letterSpacing: "-0.07em" }}>{client.name}</div>
                <div style={{ marginTop: 10, fontSize: 17, color: T.inkSoft }}>Campaign Performance Report</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: 24, alignItems: "stretch" }}>
              <div style={{ padding: 28, borderRadius: 28, background: "linear-gradient(135deg, #162218, #214e40)", color: "#fff", display: "grid", gap: 18 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.78, fontWeight: 800 }}>Reporting window</div>
                <div style={{ fontSize: 38, fontFamily: T.heading, fontWeight: 800, letterSpacing: "-0.06em" }}>{dateRangeLabel}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.82 }}>
                  Generated from linked dashboard campaign data. The report mirrors the monthly client report format with channel KPIs, campaign rankings, ad performance and metric definitions.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ReportKpiTile label="Spend" value={formatReportCurrency(totalSummary.spend)} />
                <ReportKpiTile label="Clicks" value={formatReportNumber(totalSummary.clicks)} />
                <ReportKpiTile label="Conversions" value={formatReportNumber(totalSummary.conversions, 2)} />
                <ReportKpiTile label="ROAS" value={formatMetric("roas", totalSummary.roas)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <ReportKpiTile label="Reporting Group" value={client.reportingGroup || client.name} />
              <ReportKpiTile label="Client Target" value={client.focus || DEFAULT_CLIENT_TARGET} />
              <ReportKpiTile label="Channels" value={channelLabel} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", color: T.inkSoft, fontSize: 12 }}>
            <div>{channelLabel}</div>
            <div>Generated {getReportDateStamp()}</div>
          </div>
        </div>
      </ReportPage>
      ) : null}

      {showSection("executive_summary") ? (
        <ReportExecutiveSummaryPage
          client={client}
          dateRangeLabel={dateRangeLabel}
          totalSummary={totalSummary}
          googleSummary={googleSummary}
          metaSummary={metaSummary}
          campaigns={allCampaigns}
          googleDetails={googleDetails}
        />
      ) : null}

      {showSection("strategist") ? (
        <ReportStrategistPage client={client} dateRangeLabel={dateRangeLabel} result={strategistResult} />
      ) : null}

      {showSection("google_overview") ? (
      <ReportChannelOverview
        title="Google Ads Performance Overview"
        platform="google_ads"
        summary={googleSummary}
        series={googleSeries}
        campaigns={googleCampaigns}
        details={googleDetails}
        detailLoading={googleReportState.loading}
        empty={!hasGoogle}
      />
      ) : null}

      {showSection("google_geo") ? <ReportGoogleGeographyPage details={googleDetails} loading={googleReportState.loading} /> : null}

      {showSection("google_device") ? <ReportGoogleDevicePage details={googleDetails} loading={googleReportState.loading} /> : null}

      {showSection("google_impression_share") ? <ReportGoogleImpressionSharePage details={googleDetails} loading={googleReportState.loading} /> : null}

      {showSection("google_campaigns") ? (
      <ReportCampaignTablePage
        title="Google Campaign Performance"
        platform="google_ads"
        campaigns={googleCampaigns}
        emptyLabel="No linked Google Ads campaigns were found for this client."
      />
      ) : null}

      {showSection("google_keywords") ? <ReportGoogleKeywordPage details={googleDetails} loading={googleReportState.loading} /> : null}

      {showSection("meta_overview") ? (
      <ReportChannelOverview
        title="Facebook Ads Performance Overview"
        platform="meta_ads"
        summary={metaSummary}
        series={metaSeries}
        campaigns={metaCampaigns}
        empty={!hasMeta}
      />
      ) : null}

      {showSection("meta_campaigns") ? (
      <ReportCampaignTablePage
        title="Facebook Campaign Performance"
        platform="meta_ads"
        campaigns={metaCampaigns}
        emptyLabel="No linked Meta Ads campaigns were found for this client."
      />
      ) : null}

      {showSection("meta_ads") ? <ReportAdsTablePage ads={metaAds} /> : null}

      {showSection("analytics") && client.ga4 ? <ReportAnalyticsPage client={client} ga4={client.ga4} /> : null}

      {showSection("definitions") ? <ReportDefinitionsPage /> : null}
    </>
  );
}

function ReportExecutiveSummaryPage({ client, dateRangeLabel, totalSummary, googleSummary, metaSummary, campaigns, googleDetails }) {
  const topCampaigns = getReportTopCampaigns(campaigns);
  const concernCampaigns = getReportConcernCampaigns(campaigns);
  const flags = client.health?.flags || [];
  const budgetPace = client.totalBudget ? client.spend / client.totalBudget * 100 : 0;
  const bestChannel = googleSummary.spend || metaSummary.spend
    ? googleSummary.roas >= metaSummary.roas
      ? { label: "Google Ads", summary: googleSummary, color: PLATFORM_META.google_ads.color }
      : { label: "Meta Ads", summary: metaSummary, color: PLATFORM_META.meta_ads.color }
    : null;
  const geoAvailable = (googleDetails?.geographies || []).length > 0;

  return (
    <ReportPage accent={T.accent}>
      <ReportHeader title="Executive Summary" />
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          <ReportKpiTile label="Spend" value={formatReportCurrency(totalSummary.spend)} subValue={`${formatReportPercent(budgetPace)} of client budget`} />
          <ReportKpiTile label="Conv. Value" value={formatReportCurrency(totalSummary.conversionValue)} />
          <ReportKpiTile label="ROAS" value={formatMetric("roas", totalSummary.roas)} />
          <ReportKpiTile label="Conversions" value={formatReportNumber(totalSummary.conversions, 2)} />
          <ReportKpiTile label="Date Range" value={dateRangeLabel} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={{ padding: 20, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 900, fontFamily: T.heading }}>What needs attention</div>
            {flags.length ? (
              flags.slice(0, 5).map((flag) => (
                <div key={flag.id || flag.label} style={{ padding: 12, borderRadius: 16, background: flag.tone === "warning" ? T.amberSoft : T.coralSoft, display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: flag.tone === "warning" ? T.amber : T.coral }}>{flag.label}</div>
                  <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.45 }}>{flag.detail}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: 14, borderRadius: 16, background: T.accentSoft, color: T.accent, fontSize: 12, fontWeight: 800 }}>
                No active dashboard red flags for this client in the selected period.
              </div>
            )}
          </div>

          <div style={{ padding: 20, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 900, fontFamily: T.heading }}>Focus for the next review</div>
            <ReportSummaryBullet
              title={bestChannel ? `Protect ${bestChannel.label} efficiency` : "Add enough live data for channel comparison"}
              body={bestChannel ? `${bestChannel.label} currently leads by ROAS at ${formatMetric("roas", bestChannel.summary.roas)} from ${formatReportCurrency(bestChannel.summary.spend)} spend.` : "The report needs linked live channel data before it can identify a leading channel."}
              color={bestChannel?.color || T.inkSoft}
            />
            <ReportSummaryBullet
              title={geoAvailable ? "Use geographic data in the client conversation" : "Geography may need permission attention"}
              body={geoAvailable ? `${googleDetails.geographies.length} geographic rows are available for local performance discussion.` : getGoogleGeographyEmptyLabel((googleDetails?.errors || []).find((error) => /geo|location/i.test(String(error))))}
              color={geoAvailable ? PLATFORM_META.google_ads.color : T.amber}
            />
            <ReportSummaryBullet
              title={client.ga4?.isLiveGa4 ? "Use GA4 as the measurement cross-check" : "GA4 is not live in this report"}
              body={client.ga4?.isLiveGa4 ? `GA4 shows ${formatReportNumber(client.ga4.sessions)} sessions and ${formatReportCurrency(client.ga4.revenueCurrentPeriod)} revenue for the selected period.` : "Link a GA4 property to make the analytics page and attribution cross-checks live."}
              color={client.ga4?.isLiveGa4 ? PLATFORM_META.ga4.color : T.amber}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <ReportMiniCampaignList title="Best performing campaigns" campaigns={topCampaigns} emptyLabel="No campaign rows available." />
          <ReportMiniCampaignList title="Campaigns to inspect" campaigns={concernCampaigns} emptyLabel="No campaign concerns detected from available rows." />
        </div>
      </div>
    </ReportPage>
  );
}

function ReportSummaryBullet({ title, body, color }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "10px 1fr", gap: 10, alignItems: "start" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, marginTop: 4 }} />
      <span>
        <span style={{ display: "block", fontSize: 12, fontWeight: 900, color: T.ink }}>{title}</span>
        <span style={{ display: "block", marginTop: 4, fontSize: 11, color: T.inkSoft, lineHeight: 1.45 }}>{body}</span>
      </span>
    </div>
  );
}

function ReportMiniCampaignList({ title, campaigns, emptyLabel }) {
  return (
    <div style={{ padding: 18, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 900, fontFamily: T.heading }}>{title}</div>
      {campaigns.length ? campaigns.map((campaign) => {
        const spend = Number(campaign.spend) || 0;
        const conversionValue = getConversionValue(campaign);
        const roas = spend ? conversionValue / spend : 0;

        return (
          <div key={campaign.id || campaign.name} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.name}</div>
              <div style={{ marginTop: 4, fontSize: 10, color: T.inkSoft }}>{PLATFORM_META[campaign.platform]?.label || campaign.platform} | {formatReportCurrency(spend)} spend</div>
            </div>
            <div style={{ textAlign: "right", fontFamily: T.mono, fontSize: 11, color: T.ink }}>
              {formatMetric("roas", roas)}
            </div>
          </div>
        );
      }) : (
        <div style={{ padding: 14, borderRadius: 16, background: T.bgSoft, color: T.inkSoft, fontSize: 12 }}>{emptyLabel}</div>
      )}
    </div>
  );
}

function ReportStrategistPage({ client, dateRangeLabel, result }) {
  const strategy = result?.strategy;
  const recommendations = strategy?.recommendations || [];
  const nextBestAction = strategy?.nextBestAction;

  return (
    <ReportPage accent="#9966e8">
      <ReportHeader title="Claude Strategist Diagnosis" />
      {strategy ? (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.8fr", gap: 18 }}>
            <div style={{ padding: 22, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 12, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900 }}>Τι δεν δουλεύει τώρα</div>
              <div style={{ fontSize: 15, color: T.ink, lineHeight: 1.65 }}>{strategy.performanceDiagnosis}</div>
            </div>
            <div style={{ padding: 22, borderRadius: 24, background: "linear-gradient(135deg, #221833, #4f2c7d)", color: "#fff", display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.78, fontWeight: 900 }}>Επόμενο βήμα</div>
              <div style={{ fontSize: 22, fontFamily: T.heading, fontWeight: 900, letterSpacing: "-0.04em" }}>{nextBestAction?.title || "Δεν υπάρχει αποθηκευμένη πρόταση"}</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.84 }}>{nextBestAction?.action || "Πάτησε Refresh strategist page πριν την εξαγωγή."}</div>
              {nextBestAction?.expectedImpact ? <div style={{ fontSize: 11, opacity: 0.74 }}>Impact: {nextBestAction.expectedImpact}</div> : null}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
            <div style={{ padding: 20, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 900, fontFamily: T.heading }}>Next actions</div>
              {[nextBestAction, ...recommendations].filter(Boolean).slice(0, 5).map((item, index) => (
                <div key={`${item.title}-${index}`} style={{ padding: 12, borderRadius: 16, background: index === 0 ? T.accentSoft : T.bgSoft, display: "grid", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: T.ink }}>{item.title}</div>
                    <ToneBadge tone={getAiPriorityTone(item.priority)}>{getAiPriorityLabel(item.priority)}</ToneBadge>
                  </div>
                  <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.45 }}>{item.action}</div>
                  <div style={{ fontSize: 10, color: T.inkMute, lineHeight: 1.4 }}>{item.why}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: 20, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 900, fontFamily: T.heading }}>Watchouts</div>
              {(strategy.watchouts || []).slice(0, 6).map((item, index) => (
                <ReportSummaryBullet key={`${item}-${index}`} title={`Watchout ${index + 1}`} body={item} color={T.coral} />
              ))}
              {strategy.budgetActions?.length ? (
                <div style={{ padding: 12, borderRadius: 16, background: T.bgSoft, display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: T.ink }}>Budget actions</div>
                  {strategy.budgetActions.slice(0, 3).map((item, index) => (
                    <div key={`${item.channel}-${index}`} style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.45 }}>
                      <strong style={{ color: T.ink }}>{item.channel}:</strong> {item.direction} {item.amountText} | {item.why}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ fontSize: 11, color: T.inkSoft }}>Client: {client.name} | Range: {dateRangeLabel} | Generated {formatAiGeneratedAt(result.generatedAt)}</div>
        </div>
      ) : (
        <div style={{ padding: 26, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, color: T.inkSoft, lineHeight: 1.6 }}>
          No Claude strategist result is saved for {client.name} yet. Use Refresh strategist page from the report builder before generating the PDF.
        </div>
      )}
    </ReportPage>
  );
}

function ReportPage({ children, accent = T.accent }) {
  return (
    <section
      className="report-page"
      style={{
        width: "100%",
        maxWidth: 1120,
        minHeight: 790,
        boxSizing: "border-box",
        padding: 34,
        borderRadius: 30,
        background: "#fbfaf6",
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(circle at 92% 8%, ${accent}18, transparent 24%), radial-gradient(circle at 8% 98%, rgba(22, 34, 24, 0.06), transparent 24%)` }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </section>
  );
}

function ReportHeader({ title, platform }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 22 }}>
      <div>
        <div style={{ fontSize: 28, fontFamily: T.heading, fontWeight: 800, letterSpacing: "-0.06em" }}>{title}</div>
        <div style={{ marginTop: 6, color: T.inkSoft, fontSize: 12 }}>Campaign report section</div>
      </div>
      {platform ? <PlatformChip platform={platform} /> : null}
    </div>
  );
}

function ReportKpiTile({ label, value, subValue }) {
  return (
    <div style={{ padding: 16, borderRadius: 20, background: "#fff", border: `1px solid ${T.line}`, display: "grid", alignContent: "start", minHeight: 106 }}>
      <div style={{ fontSize: 10, color: T.inkMute, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontFamily: T.heading, fontWeight: 800, color: T.ink, letterSpacing: "-0.06em", lineHeight: 1 }}>{value}</div>
      {subValue ? <div style={{ marginTop: 6, fontSize: 11, color: T.inkSoft }}>{subValue}</div> : null}
    </div>
  );
}

function ReportChannelOverview({ title, platform, summary, series, campaigns, empty }) {
  const campaignBars = campaigns.slice(0, 6).map((campaign) => ({
    label: campaign.name,
    value: Number(campaign.spend) || 0,
  }));
  const accent = PLATFORM_META[platform].color;

  return (
    <ReportPage accent={accent}>
      <ReportHeader title={title} platform={platform} />
      {empty ? (
        <div style={{ padding: 24, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, color: T.inkSoft }}>
          No linked {PLATFORM_META[platform].label} accounts were found for this client.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
            <ReportKpiTile label="Impressions" value={formatReportNumber(summary.impressions)} />
            <ReportKpiTile label="Clicks" value={formatReportNumber(summary.clicks)} />
            <ReportKpiTile label="CTR (%)" value={formatReportPercent(summary.ctr)} />
            <ReportKpiTile label="Cost" value={formatReportCurrency(summary.spend)} />
            <ReportKpiTile label="Average CPC" value={formatReportCurrency(summary.cpc)} />
            <ReportKpiTile label={platform === "meta_ads" ? "Purchases" : "Conversions"} value={formatReportNumber(summary.conversions, 2)} />
            <ReportKpiTile label={platform === "meta_ads" ? "Cost / Purchase" : "Cost / Conversion"} value={formatReportCurrency(summary.costPerConversion)} />
            <ReportKpiTile label={platform === "meta_ads" ? "Purchase Conv. Value" : "Total Conv. Value"} value={formatReportCurrency(summary.conversionValue)} />
            <ReportKpiTile label="ROAS" value={formatMetric("roas", summary.roas)} />
            <ReportKpiTile label="Campaigns" value={formatReportNumber(campaigns.length)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <ReportLineChart
              title={platform === "meta_ads" ? "Click Performance" : "Conversion Performance"}
              series={series}
              metric={platform === "meta_ads" ? "clicks" : "conversions"}
              color={accent}
              axisType="number"
            />
            <ReportBarChart title="Top campaigns by spend" items={campaignBars} color={accent} axisType="currency" />
          </div>
        </div>
      )}
    </ReportPage>
  );
}

function ReportCampaignTablePage({ title, platform, campaigns, emptyLabel }) {
  const columns = [
    { label: "Campaign", render: (row) => row.name },
    { label: "Impressions", align: "right", render: (row) => formatReportNumber(row.impressions) },
    { label: "Clicks", align: "right", render: (row) => formatReportNumber(row.clicks) },
    ...(platform === "meta_ads" ? [{ label: "Reach", align: "right", render: (row) => formatReportNumber(row.reach) }] : []),
    { label: "CTR (%)", align: "right", render: (row) => formatReportPercent(row.impressions ? row.clicks / row.impressions * 100 : 0) },
    { label: "Cost", align: "right", render: (row) => formatReportCurrency(row.spend) },
    { label: "Avg CPC", align: "right", render: (row) => formatReportCurrency(row.clicks ? row.spend / row.clicks : 0) },
    { label: platform === "meta_ads" ? "Purchases" : "Conversions", align: "right", render: (row) => formatReportNumber(row.conversions, 2) },
    { label: "Conv. Value", align: "right", render: (row) => formatReportCurrency(row.conversionValue || 0) },
    { label: "Cost / Conv.", align: "right", render: (row) => formatReportCurrency(row.conversions ? row.spend / row.conversions : 0) },
  ];

  return (
    <ReportPage accent={PLATFORM_META[platform].color}>
      <ReportHeader title={title} platform={platform} />
      <ReportTable columns={columns} rows={campaigns.slice(0, 12)} emptyLabel={emptyLabel} />
    </ReportPage>
  );
}

function ReportGoogleGeographyPage({ details, loading }) {
  const rows = details?.geographies || [];
  const geographyError = (details?.errors || []).find((error) => /geo|location/i.test(String(error)));
  const usingLocationViewFallback = rows.some((row) => row.source === "location_view");

  return (
    <ReportPage accent={PLATFORM_META.google_ads.color}>
      <ReportHeader title="Geographic Performance" platform="google_ads" />
      {usingLocationViewFallback ? (
        <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 16, background: "rgba(66, 133, 244, 0.08)", color: T.inkSoft, fontSize: 12 }}>
          Google Ads did not return visitor geography for this account, so this table is using targeted location performance from the account&apos;s location criteria.
        </div>
      ) : null}
      <ReportTable
        columns={[
          { label: "Location", render: (row) => row.location },
          { label: "Clicks", align: "right", render: (row) => formatReportNumber(row.clicks) },
          { label: "Conversions", align: "right", render: (row) => formatReportNumber(row.conversions, 2) },
          { label: "Conversion Cost", align: "right", render: (row) => formatReportCurrency(row.costPerConversion) },
          { label: "Total Conversion Value", align: "right", render: (row) => formatReportCurrency(row.conversionValue) },
        ]}
        rows={rows.slice(0, 12)}
        emptyLabel={loading ? "Loading geographic performance..." : getGoogleGeographyEmptyLabel(geographyError)}
      />
    </ReportPage>
  );
}

function ReportGoogleDevicePage({ details, loading }) {
  const rows = details?.devices || [];
  const bars = rows.map((row) => ({ label: row.device, value: row.conversions || row.clicks || row.impressions }));

  return (
    <ReportPage accent={PLATFORM_META.google_ads.color}>
      <ReportHeader title="Device Performance" platform="google_ads" />
      <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 18 }}>
        <ReportBarChart title="Conversions by device" items={bars} color={PLATFORM_META.google_ads.color} axisType="number" />
        <ReportTable
          columns={[
            { label: "Device", render: (row) => row.device },
            { label: "Clicks", align: "right", render: (row) => formatReportNumber(row.clicks) },
            { label: "Impressions", align: "right", render: (row) => formatReportNumber(row.impressions) },
            { label: "CTR (%)", align: "right", render: (row) => formatReportPercent(row.ctr) },
            { label: "Conversions", align: "right", render: (row) => formatReportNumber(row.conversions, 2) },
          ]}
          rows={rows.slice(0, 8)}
          emptyLabel={loading ? "Loading device performance..." : "Device performance is unavailable for the selected Google Ads account."}
        />
      </div>
    </ReportPage>
  );
}

function ReportGoogleImpressionSharePage({ details, loading }) {
  const rows = details?.impressionShare || [];

  return (
    <ReportPage accent={PLATFORM_META.google_ads.color}>
      <ReportHeader title="Impression Share Performance" platform="google_ads" />
      {rows.length ? (
        <ReportDualLineChart
          title="Search IS vs Search Budget Lost IS"
          series={rows}
          primaryMetric="searchImpressionShare"
          secondaryMetric="searchBudgetLostImpressionShare"
          primaryLabel="Search IS"
          secondaryLabel="Search Budget Lost IS"
          primaryColor={PLATFORM_META.google_ads.color}
          secondaryColor={T.amber}
          axisType="percent"
        />
      ) : (
        <div style={{ padding: 24, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, color: T.inkSoft }}>
          {loading ? "Loading impression share performance..." : "Search impression share is unavailable for this account or date range."}
        </div>
      )}
    </ReportPage>
  );
}

function ReportGoogleKeywordPage({ details, loading }) {
  const rows = details?.keywords || [];

  return (
    <ReportPage accent={PLATFORM_META.google_ads.color}>
      <ReportHeader title="Keyword Performance (Top 10)" platform="google_ads" />
      <ReportTable
        columns={[
          { label: "Keyword", render: (row) => row.keyword },
          { label: "Clicks", align: "right", render: (row) => formatReportNumber(row.clicks) },
          { label: "Average CPC", align: "right", render: (row) => formatReportCurrency(row.averageCpc) },
          { label: "CTR (%)", align: "right", render: (row) => formatReportPercent(row.ctr) },
          { label: "Cost", align: "right", render: (row) => formatReportCurrency(row.cost) },
          { label: "Conversions", align: "right", render: (row) => formatReportNumber(row.conversions, 2) },
          { label: "Cost / Conversion", align: "right", render: (row) => formatReportCurrency(row.costPerConversion) },
          { label: "Value / Conv.", align: "right", render: (row) => formatReportCurrency(row.valuePerConversion) },
        ]}
        rows={rows.slice(0, 10)}
        emptyLabel={loading ? "Loading keyword performance..." : "Keyword performance is unavailable for this Google Ads account."}
      />
    </ReportPage>
  );
}

function ReportAdsTablePage({ ads }) {
  const columns = [
    { label: "Ad name", render: (row) => row.name },
    { label: "Impressions", align: "right", render: (row) => formatReportNumber(row.impressions) },
    { label: "Clicks", align: "right", render: (row) => formatReportNumber(row.clicks) },
    { label: "Reach", align: "right", render: (row) => formatReportNumber(row.reach) },
    { label: "Purchases", align: "right", render: (row) => formatReportNumber(row.conversions, 2) },
    { label: "Cost / Purchase", align: "right", render: (row) => formatReportCurrency(row.conversions ? row.spend / row.conversions : 0) },
    { label: "Purchase Value", align: "right", render: (row) => formatReportCurrency(row.conversionValue || 0) },
    { label: "ROAS", align: "right", render: (row) => formatMetric("roas", row.spend ? (row.conversionValue || 0) / row.spend : 0) },
    { label: "Spend", align: "right", render: (row) => formatReportCurrency(row.spend) },
  ];

  return (
    <ReportPage accent={PLATFORM_META.meta_ads.color}>
      <ReportHeader title="Ads Performance" platform="meta_ads" />
      <ReportTable columns={columns} rows={ads.slice(0, 14)} emptyLabel="No Meta ad-level rows were found for this client." />
    </ReportPage>
  );
}

function ReportAnalyticsPage({ client, ga4 }) {
  const channels = Object.entries(ga4.channels || {}).map(([label, value]) => ({ label, value }));

  return (
    <ReportPage accent={PLATFORM_META.ga4.color}>
      <ReportHeader title="Analytics Performance" platform="ga4" />
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          <ReportKpiTile label="Sessions" value={formatReportNumber(ga4.sessions)} />
          <ReportKpiTile label="Users" value={formatReportNumber(ga4.users)} />
          <ReportKpiTile label="Engaged Rate" value={formatReportPercent(ga4.engagedRate)} />
          <ReportKpiTile label="Conv. Rate" value={formatReportPercent(ga4.conversionRate)} />
          <ReportKpiTile label={client.category === "eshop" ? "Revenue" : "Leads"} value={client.category === "eshop" ? formatReportCurrency(ga4.revenueCurrentPeriod) : formatReportNumber(ga4.purchasesOrLeads, 2)} />
        </div>
        <ReportBarChart title="Traffic mix" items={channels} color={PLATFORM_META.ga4.color} axisType="percent" />
      </div>
    </ReportPage>
  );
}

function ReportDefinitionsPage() {
  const definitions = [
    ["Clicks", "The number of people who clicked an ad and moved toward the website or landing page."],
    ["Impressions", "The number of times ads were shown."],
    ["CTR", "Clicks divided by impressions. It shows how often an impression becomes a click."],
    ["Average CPC", "Total ad cost divided by clicks."],
    ["Cost", "Total media spend during the selected reporting period."],
    ["Conversions / Purchases", "Valuable actions attributed to the ads, such as leads, purchases or other configured conversion events."],
    ["Cost / Conversion", "Total spend divided by conversions."],
    ["Conversion Value", "Revenue or value attributed to conversion actions."],
    ["ROAS", "Conversion value divided by spend."],
    ["Reach", "For Meta, the number of people who saw the ad at least once when reach is available."],
  ];

  return (
    <ReportPage accent={T.ink}>
      <ReportHeader title="Metric Definitions" />
      <ReportTable
        columns={[
          { label: "Metric", render: (row) => row[0] },
          { label: "Description", render: (row) => row[1] },
        ]}
        rows={definitions}
        emptyLabel=""
      />
    </ReportPage>
  );
}

function ReportLineChart({ title, series, metric, color, axisType = "number" }) {
  const values = (series || []).map((point) => Number(point[metric]) || 0);
  const width = 520;
  const height = 230;
  const padLeft = axisType === "currency" ? 110 : 84;
  const padRight = 20;
  const padTop = 16;
  const padBottom = 34;
  const max = Math.max(...values, 1);
  const ticks = buildChartTicks(max);
  const axisLabels = getSeriesAxisLabels(series);
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const points = values.map((value, index) => ({
    x: padLeft + (index / Math.max(values.length - 1, 1)) * chartWidth,
    y: height - padBottom - (value / max) * chartHeight,
  }));
  const path = points.length ? points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ") : "";

  return (
    <div style={{ padding: 18, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}` }}>
      <div style={{ fontSize: 15, fontWeight: 800, fontFamily: T.heading, marginBottom: 12 }}>{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", display: "block" }}>
        {ticks.map((tick) => {
          const y = height - padBottom - (tick / max) * chartHeight;
          return (
            <g key={tick}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="rgba(22,34,24,0.08)" />
              <text x="10" y={y + 4} textAnchor="start" fontSize="10" fill={T.inkSoft}>
                {formatChartAxisValue(tick, axisType)}
              </text>
            </g>
          );
        })}
        <line x1={padLeft} x2={width - padRight} y1={height - padBottom} y2={height - padBottom} stroke="rgba(22,34,24,0.12)" />
        <line x1={padLeft} x2={padLeft} y1={padTop} y2={height - padBottom} stroke="rgba(22,34,24,0.12)" />
        <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3.8" fill={color} />)}
        {axisLabels.map(({ index, label }) => {
          const x = padLeft + (index / Math.max(values.length - 1, 1)) * chartWidth;
          return (
            <text key={`${title}-${index}`} x={x} y={height - 8} fontSize="10" fill={T.inkSoft} textAnchor={index === 0 ? "start" : index === values.length - 1 ? "end" : "middle"}>
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ReportDualLineChart({ title, series, primaryMetric, secondaryMetric, primaryLabel, secondaryLabel, primaryColor, secondaryColor, axisType = "number" }) {
  const width = 980;
  const height = 420;
  const padLeft = axisType === "currency" ? 120 : 96;
  const padRight = 28;
  const padTop = 20;
  const padBottom = 36;
  const values = (series || []).flatMap((point) => [Number(point[primaryMetric]) || 0, Number(point[secondaryMetric]) || 0]);
  const max = Math.max(...values, 1);
  const axisMax = axisType === "percent" ? 100 : max;
  const ticks = buildChartTicks(axisMax, 4, axisType === "percent" ? 100 : null);
  const axisLabels = getSeriesAxisLabels(series);
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const buildPath = (metric) => (series || []).map((point, index) => {
    const value = Number(point[metric]) || 0;
    const x = padLeft + (index / Math.max(series.length - 1, 1)) * chartWidth;
    const y = height - padBottom - (value / axisMax) * chartHeight;
    return { x, y };
  });
  const primaryPoints = buildPath(primaryMetric);
  const secondaryPoints = buildPath(secondaryMetric);
  const toPath = (points) => points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");

  return (
    <div style={{ padding: 20, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: T.heading }}>{title}</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.inkSoft, fontWeight: 800 }}>
          <span style={{ color: primaryColor }}>{primaryLabel}</span>
          <span style={{ color: secondaryColor }}>{secondaryLabel}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", display: "block" }}>
        {ticks.map((tick) => {
          const y = height - padBottom - (tick / axisMax) * chartHeight;
          return (
            <g key={tick}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="rgba(22,34,24,0.08)" />
              <text x="12" y={y + 4} textAnchor="start" fontSize="10" fill={T.inkSoft}>
                {formatChartAxisValue(tick, axisType)}
              </text>
            </g>
          );
        })}
        <path d={toPath(primaryPoints)} fill="none" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toPath(secondaryPoints)} fill="none" stroke={secondaryColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {primaryPoints.map((point, index) => <circle key={`p-${index}`} cx={point.x} cy={point.y} r="3.6" fill={primaryColor} />)}
        {secondaryPoints.map((point, index) => <circle key={`s-${index}`} cx={point.x} cy={point.y} r="3.6" fill={secondaryColor} />)}
        {axisLabels.map(({ index, label }) => {
          const x = padLeft + (index / Math.max(series.length - 1, 1)) * chartWidth;
          return (
            <text key={`${title}-${index}`} x={x} y={height - 10} fontSize="10" fill={T.inkSoft} textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}>
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ReportBarChart({ title, items, color, axisType = "number" }) {
  const rows = (items || []).filter((item) => Number(item.value) > 0).slice(0, 8);
  const max = Math.max(...rows.map((item) => Number(item.value) || 0), 1);
  const axisMax = axisType === "percent" ? 100 : max;
  const ticks = buildChartTicks(axisMax, 4, axisType === "percent" ? 100 : null);

  return (
    <div style={{ padding: 18, borderRadius: 24, background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 800, fontFamily: T.heading }}>{title}</div>
      {rows.length ? (
        <>
          {rows.map((item) => {
            const value = Number(item.value) || 0;
            const width = axisMax ? value / axisMax * 100 : 0;

            return (
              <div key={item.label} style={{ display: "grid", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11 }}>
                  <span style={{ color: T.ink, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                  <span style={{ color: T.inkSoft, fontFamily: T.mono }}>{formatChartAxisValue(value, axisType)}</span>
                </div>
                <div style={{ position: "relative", height: 12, borderRadius: 999, background: "rgba(22,34,24,0.08)", overflow: "hidden" }}>
                  {ticks.slice(1, -1).map((tick) => (
                    <div
                      key={`${item.label}-${tick}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: `${tick / axisMax * 100}%`,
                        width: 1,
                        background: "rgba(22,34,24,0.12)",
                      }}
                    />
                  ))}
                  <div style={{ height: "100%", width: `${Math.max(4, width)}%`, borderRadius: 999, background: color }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${ticks.length}, minmax(0, 1fr))`, gap: 6, fontSize: 10, color: T.inkSoft, fontFamily: T.mono }}>
            {ticks.map((tick, index) => (
              <div key={`${title}-tick-${tick}`} style={{ textAlign: index === 0 ? "left" : index === ticks.length - 1 ? "right" : "center" }}>
                {formatChartAxisValue(tick, axisType)}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: 18, borderRadius: 18, background: T.bgSoft, color: T.inkSoft, fontSize: 12 }}>No chart data available.</div>
      )}
    </div>
  );
}

function ReportTable({ columns, rows, emptyLabel }) {
  return (
    <div style={{ overflow: "hidden", borderRadius: 20, border: `1px solid ${T.line}`, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "#f1eee7" }}>
            {columns.map((column) => (
              <th key={column.label} style={{ padding: "12px 10px", textAlign: column.align || "left", color: T.ink, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={row.id || row.name || rowIndex}>
              {columns.map((column) => (
                <td key={column.label} style={{ padding: "11px 10px", borderTop: `1px solid ${T.line}`, textAlign: column.align || "left", color: T.ink, fontWeight: column.align === "right" ? 700 : 600, verticalAlign: "top" }}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} style={{ padding: 24, color: T.inkSoft, textAlign: "center" }}>{emptyLabel}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AlertLane({ title, description, items, ok, onOpenAccounts, onEdit, users, onResolveIssue }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 24,
        background: ok ? "rgba(223, 245, 234, 0.55)" : "rgba(253, 233, 228, 0.74)",
        border: `1px solid ${ok ? "rgba(15, 143, 102, 0.16)" : "rgba(215, 93, 66, 0.16)"}`,
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StatusPill ok={ok} label={title} />
          <div style={{ fontSize: 12, color: T.inkSoft }}>{items.length} clients</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: T.inkSoft }}>{description}</div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((client) => (
          <div
            key={client.id}
            style={{
              padding: 14,
              borderRadius: 18,
              background: T.surfaceStrong,
              border: `1px solid ${ok ? "rgba(15, 143, 102, 0.14)" : "rgba(215, 93, 66, 0.14)"}`,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12, minWidth: 0, flex: "1 1 220px" }}>
                <LogoMark client={client} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{client.name}</div>
                    <CategoryChip category={client.category} />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>
                    Budget {formatCurrency(client.totalBudget)} | Spend {formatCurrency(client.spend)}
                  </div>
                </div>
              </div>
              <StatusPill ok={client.health.ok} />
            </div>

            {client.health.ok ? (
              <div style={{ fontSize: 12, color: T.accent, fontWeight: 800 }}>All alert checks passed.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {client.health.flags.map((flag) => (
                  <div
                    key={flag.id || `${client.id}-${flag.label}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                      <span style={{ fontWeight: 800, color: flag.tone === "warning" ? T.amber : T.coral }}>{flag.label}</span>
                      <span style={{ color: T.inkSoft }}> | {flag.detail}</span>
                    </div>
                    {flag.id && onResolveIssue ? (
                      <button
                        type="button"
                        onClick={() => onResolveIssue(client.id, flag.id)}
                        style={{
                          border: `1px solid ${flag.tone === "warning" ? "rgba(199, 147, 33, 0.22)" : "rgba(215, 93, 66, 0.22)"}`,
                          background: T.surfaceStrong,
                          color: flag.tone === "warning" ? T.amber : T.coral,
                          borderRadius: 10,
                          padding: "6px 9px",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          fontFamily: T.font,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Mark resolved
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <AssignedUsersStrip client={client} users={users} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={() => onOpenAccounts(client.id)} tone="primary">Open accounts</Button>
              {onEdit ? <Button onClick={() => onEdit(client.id)}>Edit rules</Button> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiltersBar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  categoryFilter,
  onCategoryFilter,
  sortBy,
  onSortBy,
  overviewMode,
  onOverviewMode,
  showModeToggle,
  count,
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 22,
        background: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search client, target or reporting group"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              borderRadius: 16,
              border: `1px solid ${T.line}`,
              background: T.surfaceStrong,
              color: T.ink,
              fontSize: 13,
              outline: "none",
              fontFamily: T.font,
            }}
          />
        </div>
        <select
          value={sortBy}
          onChange={(event) => onSortBy(event.target.value)}
          style={{
            width: "100%",
            maxWidth: 220,
            boxSizing: "border-box",
            padding: "13px 14px",
            borderRadius: 16,
            border: `1px solid ${T.line}`,
            background: T.surfaceStrong,
            color: T.ink,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: T.font,
            cursor: "pointer",
          }}
        >
          <option value="priority">Sort: Priority</option>
          <option value="spend">Sort: Spend</option>
          <option value="budget">Sort: Budget</option>
          <option value="roas">Sort: ROAS</option>
          <option value="name">Sort: Name</option>
        </select>
        {showModeToggle ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => onOverviewMode("grid")} active={overviewMode === "grid"}>Grid</Button>
            <Button onClick={() => onOverviewMode("list")} active={overviewMode === "list"}>List</Button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All clients" },
            { key: "red", label: "Red only" },
            { key: "green", label: "Green only" },
          ].map((item) => (
            <Button key={item.key} onClick={() => onStatusFilter(item.key)} active={statusFilter === item.key}>
              {item.label}
            </Button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={() => onCategoryFilter("all")} active={categoryFilter === "all"}>All categories</Button>
          {CATEGORIES.map((category) => (
            <Button key={category.key} onClick={() => onCategoryFilter(category.key)} active={categoryFilter === category.key}>
              {category.label}
            </Button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 700 }}>{count} clients in view</div>
      </div>
    </div>
  );
}

function AccountDateRangeControl({ value, onChange, label = "Account data range" }) {
  const isCustom = value.preset === "CUSTOM";
  const customValid = isValidAccountDateRange(value);
  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: T.font,
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 22,
        background: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>{label}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: customValid ? T.inkSoft : T.coral }}>
          {isCustom
            ? customValid ? `${value.startDate} to ${value.endDate}` : "Choose a valid start and end date."
            : ACCOUNT_DATE_RANGE_OPTIONS.find((option) => option.value === value.preset)?.label || "This month"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={value.preset}
          onChange={(event) => onChange((current) => ({ ...current, preset: event.target.value }))}
          style={{ ...inputStyle, minWidth: 180 }}
        >
          {ACCOUNT_DATE_RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {isCustom ? (
          <>
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => onChange((current) => ({ ...current, startDate: event.target.value }))}
              style={inputStyle}
            />
            <input
              type="date"
              value={value.endDate}
              onChange={(event) => onChange((current) => ({ ...current, endDate: event.target.value }))}
              style={inputStyle}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function ClientStudio({ clients, accounts, users, providerProfiles, selectedClientId, setSelectedClientId, draft, setDraft, onSave, onCreateClient, onDeleteClient, layoutColumns, canManageAssignments, canEditCoreSettings, onOpenConnections, state }) {
  const logoInputRef = useRef(null);
  const saveButtonRef = useRef(null);
  const seenSaveTokenRef = useRef("");
  const [logoError, setLogoError] = useState("");
  const [saveCelebrating, setSaveCelebrating] = useState(false);

  if (!draft) {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background: T.surface,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: T.heading }}>No live clients yet</div>
          <div style={{ marginTop: 6, fontSize: 13, color: T.inkSoft }}>Demo clients have been removed. Create a client, then link synced Google, Meta or GA4 assets here.</div>
        </div>
        {canEditCoreSettings ? <Button onClick={onCreateClient} tone="primary">Add client</Button> : null}
      </div>
    );
  }

  const connectedAssets = accounts.filter((account) => account.clientId === draft.id);
  const liveAssetsByPlatform = Object.keys(PLATFORM_META).reduce((acc, platform) => ({
    ...acc,
    [platform]: providerProfiles
      .filter((profile) => profile.platform === platform)
      .flatMap((profile) => (profile.assets || []).map((asset) => ({
        ...asset,
        connectionName: profile.name,
        connectionStatus: profile.status,
      }))),
  }), {});
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: 14,
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: 13,
    outline: "none",
    fontFamily: T.font,
  };
  const lockedInputStyle = {
    ...inputStyle,
    background: T.bgSoft,
    color: T.inkSoft,
    cursor: "not-allowed",
  };
  const updateLinkedAssets = (platform, nextIds) => {
    setDraft((current) => ({
      ...current,
      linkedAssets: {
        ...(current.linkedAssets || getEmptyLinkedAssets()),
        [platform]: Array.from(new Set(nextIds)),
      },
      connections: {
        ...current.connections,
        [platform]: nextIds.length > 0,
      },
    }));
  };
  const searchTermRules = normalizeSearchTermRules(draft.category, draft.rules?.searchTerms);
  const persistedClient = clients.find((client) => client.id === draft.id) || null;
  const isDirty = getClientEditorFingerprint(draft) !== getClientEditorFingerprint(persistedClient);
  const actionCue = state?.savingKey === draft.id
    ? { tone: "info", label: "Saving changes..." }
    : state?.error
      ? { tone: "danger", label: state.error }
      : logoError
        ? { tone: "warning", label: logoError }
        : isDirty
          ? { tone: "warning", label: "Unsaved changes" }
          : state?.notice
            ? { tone: "success", label: state.notice }
            : { tone: "success", label: "All changes saved" };
  const updateSearchTermRule = (field, value) => {
    setDraft((current) => ({
      ...current,
      rules: {
        ...current.rules,
        searchTerms: {
          ...normalizeSearchTermRules(current.category, current.rules?.searchTerms),
          [field]: value,
        },
      },
    }));
  };
  const canDeleteClient = canEditCoreSettings && Boolean(draft?.id);
  const handleLogoFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file for the client logo.");
      return;
    }
    if (file.size > 1_500_000) {
      setLogoError("Logo files must be under 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setLogoError("Could not read that logo file.");
        return;
      }
      setLogoError("");
      setDraft((current) => ({
        ...current,
        logoImage: result,
        logoText: current.logoText || getClientLogoText(current.name),
      }));
    };
    reader.onerror = () => setLogoError("Could not read that logo file.");
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!state?.lastSavedToken || state.lastSavedToken === seenSaveTokenRef.current) return undefined;
    if (state.lastSavedClientId !== draft.id) return undefined;

    seenSaveTokenRef.current = state.lastSavedToken;
    setSaveCelebrating(true);
    saveButtonRef.current?.animate?.([
      { transform: "translateY(0) scale(1)", boxShadow: "0 0 0 rgba(15, 143, 102, 0)" },
      { transform: "translateY(-2px) scale(1.06)", boxShadow: "0 18px 34px rgba(15, 143, 102, 0.24)" },
      { transform: "translateY(0) scale(1)", boxShadow: "0 0 0 rgba(15, 143, 102, 0)" },
    ], {
      duration: 760,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });

    const timer = window.setTimeout(() => setSaveCelebrating(false), 1100);
    return () => window.clearTimeout(timer);
  }, [draft.id, state?.lastSavedClientId, state?.lastSavedToken]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: layoutColumns, gap: 18 }}>
      <div
        style={{
          padding: 18,
          borderRadius: 24,
          background: T.surface,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          display: "grid",
          gap: 12,
          alignSelf: "start",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Client Studio</div>
          <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: T.ink }}>
            {canEditCoreSettings ? "Budgets, categories, alert rules and connections." : "Budgets, connected assets and alert rules for your assigned clients."}
          </div>
        </div>
        {canEditCoreSettings ? <Button onClick={onCreateClient} tone="primary">Add client</Button> : null}

        <div style={{ display: "grid", gap: 8 }}>
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              style={{
                padding: 12,
                borderRadius: 16,
                border: `1px solid ${selectedClientId === client.id ? "rgba(15, 143, 102, 0.22)" : T.line}`,
                background: selectedClientId === client.id ? T.accentSoft : T.surfaceStrong,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: T.font,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <LogoMark client={client} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: selectedClientId === client.id ? T.accent : T.ink }}>{client.name}</div>
                  <div style={{ marginTop: 3, fontSize: 11, color: T.inkSoft }}>Target: {client.focus}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {state?.error ? (
          <div style={{ padding: "12px 14px", borderRadius: 16, background: T.coralSoft, color: T.coral, fontSize: 12, fontWeight: 700 }}>
            {state.error}
          </div>
        ) : null}
        {!state?.error && (state?.notice || logoError) ? (
          <div style={{ padding: "12px 14px", borderRadius: 16, background: logoError ? T.amberSoft : T.accentSoft, color: logoError ? T.amber : T.accent, fontSize: 12, fontWeight: 700 }}>
            {logoError || state.notice}
          </div>
        ) : null}
        <div
          style={{
            padding: 20,
            borderRadius: 24,
            background: T.surface,
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            display: "grid",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, minWidth: 0, flexWrap: "wrap" }}>
              <LogoMark client={draft} size={48} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: T.heading }}>{draft.name}</div>
                <div style={{ marginTop: 5, fontSize: 12, color: T.inkSoft }}>Target: {draft.focus} | reporting group {draft.reportingGroup}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionCue tone={actionCue.tone}>{actionCue.label}</ActionCue>
              {canDeleteClient ? (
                <Button onClick={() => onDeleteClient(draft)} tone="danger" disabled={state?.savingKey === `delete:${draft.id}`}>
                  {state?.savingKey === `delete:${draft.id}` ? "Deleting..." : "Delete client"}
                </Button>
              ) : null}
              <Button onClick={onSave} tone={saveCelebrating ? "success" : "primary"} disabled={state?.savingKey === draft.id} buttonRef={saveButtonRef} emphasize={saveCelebrating}>
                {state?.savingKey === draft.id ? "Saving..." : saveCelebrating ? "Saved" : canEditCoreSettings ? "Save client" : "Save settings"}
              </Button>
              <StatusPill ok={Object.values(draft.connections).filter(Boolean).length > 1} label="Connection stack" />
            </div>
          </div>

          {!canEditCoreSettings ? (
            <div style={{ padding: 12, borderRadius: 16, background: T.sky ? "rgba(45, 108, 223, 0.10)" : T.bgSoft, border: `1px solid rgba(45, 108, 223, 0.14)`, color: T.sky, fontSize: 12, fontWeight: 700 }}>
              Account users can update channel budgets, connected assets and alert thresholds here. Client metadata, category and assignments stay director-only.
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 12 }}>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Client name</div>
              <input disabled={!canEditCoreSettings} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, logoText: current.logoImage ? current.logoText : getClientLogoText(event.target.value) }))} style={canEditCoreSettings ? inputStyle : lockedInputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Client target</div>
              <select
                disabled={!canEditCoreSettings}
                value={normalizeClientTarget(draft.focus)}
                onChange={(event) => setDraft((current) => ({ ...current, focus: event.target.value }))}
                style={canEditCoreSettings ? inputStyle : lockedInputStyle}
              >
                {CLIENT_TARGET_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Reporting group</div>
              <input disabled={!canEditCoreSettings} value={draft.reportingGroup} onChange={(event) => setDraft((current) => ({ ...current, reportingGroup: event.target.value }))} style={canEditCoreSettings ? inputStyle : lockedInputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Account owner</div>
              <input disabled={!canEditCoreSettings} value={draft.owner} onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))} style={canEditCoreSettings ? inputStyle : lockedInputStyle} />
            </div>
          </div>

          <div style={{ padding: 18, borderRadius: 22, background: T.bgSoft, border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Client logo</div>
                <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>Upload a logo for cards, reports and client selectors.</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <LogoMark client={draft} size={56} />
                {canEditCoreSettings ? (
                  <>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: "none" }} />
                    <Button onClick={() => logoInputRef.current?.click()}>Upload logo</Button>
                    <Button onClick={() => {
                      setLogoError("");
                      setDraft((current) => ({ ...current, logoImage: "", logoText: getClientLogoText(current.name) }));
                    }} disabled={!draft.logoImage}>
                      Remove logo
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.key}
                disabled={!canEditCoreSettings}
                onClick={() => setDraft((current) => ({ ...current, category: category.key }))}
                style={{
                  padding: "10px 13px",
                  borderRadius: 999,
                  border: `1px solid ${draft.category === category.key ? `${category.color}44` : T.line}`,
                  background: draft.category === category.key ? category.tint : T.surfaceStrong,
                  color: draft.category === category.key ? category.color : T.inkSoft,
                  cursor: canEditCoreSettings ? "pointer" : "not-allowed",
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 800,
                  opacity: canEditCoreSettings ? 1 : 0.56,
                }}
              >
                {category.label}
              </button>
            ))}
          </div>

          {canManageAssignments ? (
            <div
              style={{
                padding: 18,
                borderRadius: 22,
                background: T.bgSoft,
                border: `1px solid ${T.line}`,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Assigned team</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>A client can be assigned to more than one account user.</div>
                </div>
                <ToneBadge tone={draft.assignedUserIds?.length ? "positive" : "warning"}>
                  {draft.assignedUserIds?.length || 0} assigned user{(draft.assignedUserIds?.length || 0) === 1 ? "" : "s"}
                </ToneBadge>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 10 }}>
                {users.filter((user) => user.role === "account").map((user) => {
                  const assigned = draft.assignedUserIds?.includes(user.id);

                  return (
                    <button
                      key={user.id}
                      onClick={() => setDraft((current) => ({
                        ...current,
                        assignedUserIds: assigned
                          ? current.assignedUserIds.filter((id) => id !== user.id)
                          : [...(current.assignedUserIds || []), user.id],
                      }))}
                      style={{
                        padding: 12,
                        borderRadius: 18,
                        border: `1px solid ${assigned ? `${user.accent}44` : T.line}`,
                        background: assigned ? `${user.accent}12` : T.surfaceStrong,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: T.font,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <UserAvatar user={user} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: assigned ? user.accent : T.ink }}>{user.name}</div>
                          <RoleChip role={user.role} />
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>{user.title}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: fitCols(280), gap: 18 }}>
          <div
            style={{
              padding: 20,
              borderRadius: 24,
              background: T.surface,
              border: `1px solid ${T.line}`,
              boxShadow: T.shadow,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Channel budgets</div>
            <div style={{ display: "grid", gap: 12 }}>
              {["google_ads", "meta_ads"].map((platform) => (
                <div key={platform}>
                  <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>
                    {PLATFORM_META[platform].label}
                  </div>
                  <input
                    type="number"
                    value={draft.budgets[platform]}
                    onChange={(event) => setDraft((current) => ({ ...current, budgets: { ...current.budgets, [platform]: +event.target.value } }))}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <MetricTile label="Monthly total" value={formatCurrency((draft.budgets.google_ads || 0) + (draft.budgets.meta_ads || 0))} subValue="Used by the pace alert engine" />
          </div>

          <div
            style={{
              padding: 20,
              borderRadius: 24,
              background: T.surface,
              border: `1px solid ${T.line}`,
              boxShadow: T.shadow,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Connected assets</div>
            {Object.keys(PLATFORM_META).map((platform) => {
              const platformAssets = liveAssetsByPlatform[platform] || [];
              const selectedAssetIds = Array.isArray(draft.linkedAssets?.[platform]) ? draft.linkedAssets[platform] : [];
              const selectedAssets = platformAssets.filter((asset) => selectedAssetIds.includes(asset.id));
              const helperText = platform === "ga4"
                ? "Pick the GA4 property or properties that belong to this client."
                : connectedAssets.filter((account) => account.platform === platform).map((account) => account.name).join(", ") || `Use these synced ${PLATFORM_META[platform].label} accounts when you marry platform accounts with this client.`;

              return (
                <ConnectedAssetDropdown
                  key={platform}
                  platform={platform}
                  assets={platformAssets}
                  selectedAssetIds={selectedAssetIds}
                  selectedAssets={selectedAssets}
                  onToggleAsset={(assetId) => {
                    const nextIds = selectedAssetIds.includes(assetId)
                      ? selectedAssetIds.filter((currentId) => currentId !== assetId)
                      : [...selectedAssetIds, assetId];
                    updateLinkedAssets(platform, nextIds);
                  }}
                  onClearSelection={() => updateLinkedAssets(platform, [])}
                  helperText={helperText}
                  onOpenConnections={onOpenConnections}
                  canEditCoreSettings={canEditCoreSettings}
                />
              );
            })}
          </div>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 24,
            background: T.surface,
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Custom alert rules</div>
          <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 12 }}>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Pace tolerance %</div>
              <input type="number" value={draft.rules.pacingTolerance} onChange={(event) => setDraft((current) => ({ ...current, rules: { ...current.rules, pacingTolerance: +event.target.value } }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Revenue drop %</div>
              <input type="number" value={draft.rules.revenueDropTolerance} onChange={(event) => setDraft((current) => ({ ...current, rules: { ...current.rules, revenueDropTolerance: +event.target.value } }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Max CPC</div>
              <input type="number" step="0.1" value={draft.rules.cpcMax} onChange={(event) => setDraft((current) => ({ ...current, rules: { ...current.rules, cpcMax: +event.target.value } }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Max CPM</div>
              <input type="number" step="0.1" value={draft.rules.cpmMax} onChange={(event) => setDraft((current) => ({ ...current, rules: { ...current.rules, cpmMax: +event.target.value } }))} style={inputStyle} />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.inkSoft }}>
            <input type="checkbox" checked={draft.rules.stoppedCampaigns} onChange={() => setDraft((current) => ({ ...current, rules: { ...current.rules, stoppedCampaigns: !current.rules.stoppedCampaigns } }))} />
            Notify only when a campaign stops in the last 24 hours
          </label>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 24,
            background: T.surface,
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Search term auto-tagging</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>
                These thresholds are applied to live search terms for this client. Manual tags still override auto tags.
              </div>
            </div>
            <ToneBadge tone={searchTermRules.autoTaggingEnabled ? "positive" : "warning"}>
              {searchTermRules.autoTaggingEnabled ? "Auto-tagging on" : "Auto-tagging off"}
            </ToneBadge>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.inkSoft, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={searchTermRules.autoTaggingEnabled}
              onChange={(event) => updateSearchTermRule("autoTaggingEnabled", event.target.checked)}
            />
            Automatically tag live search terms using these thresholds
          </label>

          <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 12 }}>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Good min conversions</div>
              <input type="number" min="0" step="1" value={searchTermRules.goodMinConversions} onChange={(event) => updateSearchTermRule("goodMinConversions", +event.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Good max CPA</div>
              <input type="number" min="0" step="1" value={searchTermRules.goodMaxCostPerConversion} onChange={(event) => updateSearchTermRule("goodMaxCostPerConversion", +event.target.value)} style={inputStyle} />
              <div style={{ marginTop: 5, fontSize: 11, color: T.inkMute }}>Use 0 to ignore CPA for good tags.</div>
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Bad spend no conv.</div>
              <input type="number" min="0" step="1" value={searchTermRules.badNoConversionSpend} onChange={(event) => updateSearchTermRule("badNoConversionSpend", +event.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Bad clicks no conv.</div>
              <input type="number" min="0" step="1" value={searchTermRules.badNoConversionClicks} onChange={(event) => updateSearchTermRule("badNoConversionClicks", +event.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Bad max relevance</div>
              <input type="number" min="0" max="100" step="1" value={searchTermRules.badMaxRelevanceScore} onChange={(event) => updateSearchTermRule("badMaxRelevanceScore", +event.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Neutral min clicks</div>
              <input type="number" min="0" step="1" value={searchTermRules.neutralMinClicks} onChange={(event) => updateSearchTermRule("neutralMinClicks", +event.target.value)} style={inputStyle} />
              <div style={{ marginTop: 5, fontSize: 11, color: T.inkMute }}>Terms below this stay untagged unless Good/Bad thresholds fire.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Setup Wizard ──────────────────────────────────────────────

function SearchTermsWorkbench({ clients, providerProfiles, loading, error, aiReady, onOpenConnections }) {
  const selectStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: 16,
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: T.font,
  };
  const panelStyle = {
    padding: 20,
    borderRadius: 24,
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: 16,
  };
  const [selection, setSelection] = useState({
    clientId: "",
    accountAssetId: "",
    campaignId: "",
    adGroupId: "",
    dateRange: "LAST_30_DAYS",
  });
  const [campaignState, setCampaignState] = useState({ items: [], loading: false, error: "" });
  const [adGroupState, setAdGroupState] = useState({ items: [], loading: false, error: "" });
  const [termsState, setTermsState] = useState({ items: [], tags: [], loading: false, error: "", note: "" });
  const [tagFilter, setTagFilter] = useState("all");
  const [termStatusFilter, setTermStatusFilter] = useState("active");
  const [reviewPanel, setReviewPanel] = useState("table");
  const [sort, setSort] = useState({ key: "cost", direction: "desc" });
  const [tagBusyMap, setTagBusyMap] = useState({});
  const [aiState, setAiState] = useState(() => createEmptyAiStrategistState());

  const googleAssetMap = useMemo(() => {
    const map = new Map();

    providerProfiles
      .filter((profile) => profile.platform === "google_ads")
      .forEach((profile) => {
        (profile.assets || []).forEach((asset) => {
          map.set(asset.id, {
            ...asset,
            connectionId: profile.id,
            connectionName: profile.name,
            connectionStatus: profile.status,
          });
        });
      });

    return map;
  }, [providerProfiles]);

  const searchableClients = useMemo(() => {
    return clients
      .map((client) => {
        const assets = (client.linkedAssets?.google_ads || [])
          .map((assetId) => googleAssetMap.get(assetId))
          .filter((asset) => asset && asset.type !== "Manager account")
          .sort((left, right) => {
            const leftRank = left.type === "Ad account" ? 0 : left.type === "Customer account" ? 1 : 2;
            const rightRank = right.type === "Ad account" ? 0 : right.type === "Customer account" ? 1 : 2;
            if (leftRank !== rightRank) return leftRank - rightRank;
            return left.name.localeCompare(right.name);
          });

        return { ...client, googleLinkedAssets: assets };
      })
      .filter((client) => client.googleLinkedAssets.length);
  }, [clients, googleAssetMap]);

  const selectedClient = searchableClients.find((client) => client.id === selection.clientId) || searchableClients[0] || null;
  const availableAccounts = selectedClient?.googleLinkedAssets || [];
  const selectedAccount = availableAccounts.find((asset) => asset.id === selection.accountAssetId) || availableAccounts[0] || null;
  const campaignOptions = campaignState.items;
  const selectedCampaign = campaignOptions.find((campaign) => campaign.id === selection.campaignId) || campaignOptions[0] || null;
  const isPerformanceMax = selectedCampaign?.channelType === "PERFORMANCE_MAX";
  const adGroupOptions = adGroupState.items;
  const selectedAdGroup = isPerformanceMax
    ? null
    : adGroupOptions.find((adGroup) => adGroup.id === selection.adGroupId) || adGroupOptions[0] || null;
  const hasPmaxCampaigns = campaignState.items.some((campaign) => campaign.channelType === "PERFORMANCE_MAX");
  const scopeLevel = isPerformanceMax ? "campaign" : "ad_group";
  const autoTagRules = useMemo(
    () => normalizeSearchTermRules(selectedClient?.category, selectedClient?.rules?.searchTerms),
    [selectedClient?.category, selectedClient?.rules?.searchTerms]
  );

  useEffect(() => {
    if (!searchableClients.length) return;
    if (!searchableClients.some((client) => client.id === selection.clientId)) {
      setSelection((current) => ({ ...current, clientId: searchableClients[0].id }));
    }
  }, [searchableClients, selection.clientId]);

  useEffect(() => {
    if (!selectedClient) return;
    if (!availableAccounts.some((asset) => asset.id === selection.accountAssetId)) {
      setSelection((current) => ({
        ...current,
        accountAssetId: availableAccounts[0]?.id || "",
        campaignId: "",
        adGroupId: "",
      }));
    }
  }, [availableAccounts, selectedClient, selection.accountAssetId]);

  useEffect(() => {
    if (!selectedAccount?.connectionId || !selectedAccount?.externalId) {
      setCampaignState({ items: [], loading: false, error: "" });
      return undefined;
    }

    let active = true;
    setCampaignState({ items: [], loading: true, error: "" });

    fetchSearchTermHierarchy(selectedAccount.connectionId, {
      customerId: selectedAccount.externalId,
      dateRange: selection.dateRange,
    })
      .then((payload) => {
        if (!active) return;
        setCampaignState({ items: payload.campaigns || [], loading: false, error: "" });
      })
      .catch((requestError) => {
        if (!active) return;
        setCampaignState({ items: [], loading: false, error: requestError.message || "Could not load campaigns." });
      });

    return () => {
      active = false;
    };
  }, [selectedAccount?.connectionId, selectedAccount?.externalId, selection.dateRange]);

  useEffect(() => {
    if (!campaignOptions.length) {
      if (selection.campaignId) {
        setSelection((current) => ({ ...current, campaignId: "", adGroupId: "" }));
      }
      return;
    }

    if (!campaignOptions.some((campaign) => campaign.id === selection.campaignId)) {
      setSelection((current) => ({
        ...current,
        campaignId: campaignOptions[0]?.id || "",
        adGroupId: "",
      }));
    }
  }, [campaignOptions, selection.campaignId]);

  useEffect(() => {
    if (!selectedAccount?.connectionId || !selectedAccount?.externalId || !selectedCampaign?.id || isPerformanceMax) {
      setAdGroupState({ items: [], loading: false, error: "" });
      return undefined;
    }

    let active = true;
    setAdGroupState({ items: [], loading: true, error: "" });

    fetchSearchTermHierarchy(selectedAccount.connectionId, {
      customerId: selectedAccount.externalId,
      campaignId: selectedCampaign.id,
      dateRange: selection.dateRange,
    })
      .then((payload) => {
        if (!active) return;
        setAdGroupState({ items: payload.adGroups || [], loading: false, error: "" });
      })
      .catch((requestError) => {
        if (!active) return;
        setAdGroupState({ items: [], loading: false, error: requestError.message || "Could not load ad groups." });
      });

    return () => {
      active = false;
    };
  }, [isPerformanceMax, selectedAccount?.connectionId, selectedAccount?.externalId, selectedCampaign?.id, selection.dateRange]);

  useEffect(() => {
    if (isPerformanceMax) {
      if (selection.adGroupId) {
        setSelection((current) => ({ ...current, adGroupId: "" }));
      }
      return;
    }

    if (!adGroupOptions.length) {
      if (selection.adGroupId) {
        setSelection((current) => ({ ...current, adGroupId: "" }));
      }
      return;
    }

    if (!adGroupOptions.some((adGroup) => adGroup.id === selection.adGroupId)) {
      setSelection((current) => ({ ...current, adGroupId: adGroupOptions[0]?.id || "" }));
    }
  }, [adGroupOptions, isPerformanceMax, selection.adGroupId]);

  useEffect(() => {
    if (!selectedAccount?.connectionId || !selectedAccount?.externalId || !selectedCampaign?.id || (!isPerformanceMax && !selectedAdGroup?.id)) {
      setTermsState({ items: [], tags: [], loading: false, error: "", note: "" });
      return undefined;
    }

    let active = true;
    setTermsState({ items: [], tags: [], loading: true, error: "", note: "" });

    const requestParams = {
      customerId: selectedAccount.externalId,
      campaignId: selectedCampaign.id,
      dateRange: selection.dateRange,
      scopeLevel,
      ...(isPerformanceMax ? {} : { adGroupId: selectedAdGroup.id }),
    };

    Promise.all([
      fetchSearchTerms(selectedAccount.connectionId, requestParams),
      fetchSearchTermTags({
        connectionId: selectedAccount.connectionId,
        customerId: selectedAccount.externalId,
        campaignId: selectedCampaign.id,
        scopeLevel,
        ...(isPerformanceMax ? {} : { adGroupId: selectedAdGroup.id }),
      }),
    ])
      .then(([termsPayload, tagsPayload]) => {
        if (!active) return;

        const tagLookup = new Map((tagsPayload.tags || []).map((tag) => [tag.normalizedSearchTerm, tag]));
        const mergedTerms = (termsPayload.terms || []).map((term) => {
          const storedTag = tagLookup.get(normalizeSearchTermKey(term.searchTerm)) || null;
          return {
            ...term,
            manualTag: storedTag?.tag || term.manualTag || "",
            manualTagUpdatedAt: storedTag?.updatedAt || term.manualTagUpdatedAt || "",
          };
        });

        setTermsState({
          items: mergedTerms,
          tags: tagsPayload.tags || [],
          loading: false,
          error: "",
          note: termsPayload.note || "",
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setTermsState({
          items: [],
          tags: [],
          loading: false,
          error: requestError.message || "Could not load search terms.",
          note: "",
        });
      });

    return () => {
      active = false;
    };
  }, [isPerformanceMax, scopeLevel, selectedAccount?.connectionId, selectedAccount?.externalId, selectedCampaign?.id, selectedAdGroup?.id, selection.dateRange]);

  const benchmarks = useMemo(() => buildSearchTermBenchmarks(termsState.items), [termsState.items]);

  const evaluatedTerms = useMemo(() => {
    return termsState.items.map((term) => {
      const scored = deriveSearchTermEvaluation(term, benchmarks, { isPerformanceMax });
      const autoTag = term.manualTag ? "" : deriveSearchTermAutoTag({ ...term, ...scored }, autoTagRules);
      const effectiveTag = term.manualTag || autoTag;
      const recommendedAction = !term.manualTag && autoTag === "bad"
        ? "add_negative"
        : !term.manualTag && autoTag === "good"
          ? "keep"
          : !term.manualTag && autoTag === "neutral"
            ? "review"
            : scored.recommendedAction;

      return {
        ...term,
        ...scored,
        autoTag,
        effectiveTag,
        tagSource: term.manualTag ? "manual" : autoTag ? "auto" : "",
        recommendedAction,
      };
    });
  }, [autoTagRules, benchmarks, isPerformanceMax, termsState.items]);

  const summary = useMemo(() => {
    const totalTerms = evaluatedTerms.length;
    const activeTerms = evaluatedTerms.filter((term) => !isInactiveSearchTerm(term)).length;
    const inactiveTerms = evaluatedTerms.length - activeTerms;
    const actionCounts = {
      keep: 0,
      review: 0,
      consider_negative: 0,
      add_negative: 0,
      needs_data: 0,
      already_excluded: 0,
    };

    evaluatedTerms.forEach((term) => {
      if (actionCounts[term.recommendedAction] !== undefined) {
        actionCounts[term.recommendedAction] += 1;
      }
    });

    const goodCount = evaluatedTerms.filter((term) => term.effectiveTag === "good").length;
    const badCount = evaluatedTerms.filter((term) => term.effectiveTag === "bad").length;
    const neutralCount = evaluatedTerms.filter((term) => term.effectiveTag === "neutral").length;
    const untaggedCount = evaluatedTerms.filter((term) => !term.effectiveTag).length;
    const autoTaggedCount = evaluatedTerms.filter((term) => term.tagSource === "auto").length;
    const manualTaggedCount = evaluatedTerms.filter((term) => term.tagSource === "manual").length;
    const wastedSpend = evaluatedTerms
      .filter((term) => term.effectiveTag === "bad")
      .reduce((acc, term) => acc + (term.cost || 0), 0);

    return {
      totalTerms,
      activeTerms,
      inactiveTerms,
      goodCount,
      badCount,
      neutralCount,
      untaggedCount,
      autoTaggedCount,
      manualTaggedCount,
      wastedSpend,
      averagePerformanceScore: totalTerms ? Math.round(average(evaluatedTerms.map((term) => term.performanceScore || 0))) : null,
      averageRelevanceScore: totalTerms ? Math.round(average(evaluatedTerms.map((term) => term.relevanceScore || 0))) : null,
      negativeActionCount: actionCounts.add_negative + actionCounts.consider_negative,
      actionCounts,
    };
  }, [evaluatedTerms]);

  const statusFilteredTerms = useMemo(
    () => evaluatedTerms.filter((term) => matchesSearchTermStatusFilter(term, termStatusFilter)),
    [evaluatedTerms, termStatusFilter]
  );

  const filteredTerms = useMemo(() => {
    if (tagFilter === "all") return statusFilteredTerms;
    if (tagFilter === "untagged") return statusFilteredTerms.filter((term) => !term.effectiveTag);
    return statusFilteredTerms.filter((term) => term.effectiveTag === tagFilter);
  }, [statusFilteredTerms, tagFilter]);

  const visibleTerms = useMemo(() => sortSearchTermRows(filteredTerms, sort), [filteredTerms, sort]);
  const suggestedNegatives = useMemo(() => extractSuggestedNegatives(statusFilteredTerms), [statusFilteredTerms]);
  const searchTermDateRangeLabel = getOptionLabel(SEARCH_TERM_DATE_RANGE_OPTIONS, selection.dateRange);
  const aiPayload = useMemo(() => buildSearchTermsAiPayload({
    selectedClient,
    selectedAccount,
    selectedCampaign,
    selectedAdGroup,
    isPerformanceMax,
    dateRangeLabel: searchTermDateRangeLabel,
    termStatusFilter,
    summary,
    benchmarks,
    autoTagRules,
    evaluatedTerms,
    suggestedNegatives,
  }), [
    autoTagRules,
    benchmarks,
    evaluatedTerms,
    isPerformanceMax,
    searchTermDateRangeLabel,
    selectedAccount,
    selectedAdGroup,
    selectedCampaign,
    selectedClient,
    suggestedNegatives,
    summary,
    termStatusFilter,
  ]);
  const aiStrategyKey = useMemo(() => getSearchTermsAiStrategyKey({
    selectedClient,
    selectedAccount,
    selectedCampaign,
    selectedAdGroup,
    isPerformanceMax,
    dateRange: selection.dateRange,
    termStatusFilter,
  }), [isPerformanceMax, selectedAccount, selectedAdGroup, selectedCampaign, selectedClient, selection.dateRange, termStatusFilter]);
  const tableColumns = isPerformanceMax
    ? [
      { key: "searchTerm", label: "Search term" },
      { key: "matchSource", label: "Match source" },
      { key: "matchType", label: "Match type" },
      { key: "impressions", label: "Impr." },
      { key: "clicks", label: "Clicks" },
      { key: "ctr", label: "CTR" },
      { key: "averageCpc", label: "Avg CPC" },
      { key: "conversions", label: "Conv." },
      { key: "cost", label: "Cost" },
      { key: "performanceScore", label: "Perf score" },
      { key: "relevanceScore", label: "Rel. score" },
      { key: "recommendedAction", label: "Action" },
      { key: "tag", label: "Tag" },
    ]
    : [
      { key: "searchTerm", label: "Search term" },
      { key: "keywordText", label: "Triggered keyword" },
      { key: "matchType", label: "Match type" },
      { key: "impressions", label: "Impr." },
      { key: "clicks", label: "Clicks" },
      { key: "ctr", label: "CTR" },
      { key: "averageCpc", label: "Avg CPC" },
      { key: "conversions", label: "Conv." },
      { key: "cost", label: "Cost" },
      { key: "performanceScore", label: "Perf score" },
      { key: "relevanceScore", label: "Rel. score" },
      { key: "recommendedAction", label: "Action" },
      { key: "tag", label: "Tag" },
    ];

  useEffect(() => {
    const saved = readStoredAiStrategyResult(aiStrategyKey);
    setAiState(saved ? {
      loading: false,
      error: "",
      data: saved,
      generatedAt: saved?.generatedAt || "",
      cached: !!saved?.cached,
    } : createEmptyAiStrategistState());
  }, [aiStrategyKey]);

  function setSortColumn(nextKey) {
    setSort((current) => (
      current.key === nextKey
        ? { key: nextKey, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key: nextKey, direction: nextKey === "searchTerm" || nextKey === "keywordText" || nextKey === "matchSource" || nextKey === "matchType" || nextKey === "recommendedAction" || nextKey === "tag" ? "asc" : "desc" }
    ));
  }

  async function handleTag(term, nextTag) {
    if (!selectedAccount?.connectionId || !selectedAccount?.externalId || !selectedCampaign?.id || (!isPerformanceMax && !selectedAdGroup?.id)) return;

    const normalizedSearchTerm = normalizeSearchTermKey(term.searchTerm);
    const entityKey = isPerformanceMax ? selectedCampaign.id : selectedAdGroup.id;
    const busyKey = `${scopeLevel}:${entityKey}:${normalizedSearchTerm}`;
    const targetTag = term.manualTag === nextTag ? "" : nextTag;
    setTagBusyMap((current) => ({ ...current, [busyKey]: true }));

    try {
      const payload = await saveSearchTermTag({
        connectionId: selectedAccount.connectionId,
        customerId: selectedAccount.externalId,
        campaignId: selectedCampaign.id,
        scopeLevel,
        ...(isPerformanceMax ? {} : { adGroupId: selectedAdGroup.id }),
        searchTerm: term.searchTerm,
        tag: targetTag,
      });

      const tagLookup = new Map((payload.tags || []).map((tag) => [tag.normalizedSearchTerm, tag]));
      setTermsState((current) => ({
        ...current,
        tags: payload.tags || [],
        error: "",
        items: current.items.map((item) => {
          const nextStoredTag = tagLookup.get(normalizeSearchTermKey(item.searchTerm)) || null;
          return normalizeSearchTermKey(item.searchTerm) === normalizedSearchTerm
            ? {
                ...item,
                manualTag: nextStoredTag?.tag || "",
                manualTagUpdatedAt: nextStoredTag?.updatedAt || "",
              }
            : item;
        }),
      }));
    } catch (requestError) {
      setTermsState((current) => ({
        ...current,
        error: requestError.message || "Could not save the manual tag.",
      }));
    } finally {
      setTagBusyMap((current) => ({ ...current, [busyKey]: false }));
    }
  }

  function exportSuggestedNegatives() {
    if (!selectedClient || !selectedAccount || !selectedCampaign || !suggestedNegatives.length) return;

    const filename = [
      sanitizeFileFragment(selectedClient.name),
      sanitizeFileFragment(selectedAccount.name),
      sanitizeFileFragment(selectedCampaign.name),
      sanitizeFileFragment(isPerformanceMax ? "campaign-level" : selectedAdGroup?.name || "ad-group"),
      "negatives.txt",
    ].join("-");
    const content = suggestedNegatives.map((item) => item.word).join("\n");
    downloadTextFile(filename, content);
  }

  async function runAiStrategist() {
    setAiState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const payload = await fetchAiStrategy({
        scope: "search_terms",
        context: aiPayload,
        forceRefresh: true,
      });
      writeStoredAiStrategyResult(aiStrategyKey, payload);
      setAiState({
        loading: false,
        error: "",
        data: payload,
        generatedAt: payload?.generatedAt || "",
        cached: !!payload?.cached,
      });
    } catch (error) {
      setAiState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Could not run the AI strategist.",
      }));
    }
  }

  if (loading) {
    return <EmptyState title="Loading connected Google Ads accounts" body="AdPulse is refreshing synced connections before opening the search term workspace." />;
  }

  if (error && !providerProfiles.length) {
    return <EmptyState title="Connections are not available" body={error} />;
  }

  if (!searchableClients.length) {
    return <EmptyState title="No linked Google Ads ad accounts yet" body="Link at least one synced Google Ads ad account to a client in Client Studio. Manager accounts do not expose campaign and ad-group search term hierarchy here." />;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ ...panelStyle, gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            {selectedClient ? <LogoMark client={selectedClient} size={46} /> : null}
            <div>
              <div style={{ fontSize: 12, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Search Terms</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, fontFamily: T.heading }}>Keyword review and negative mining</div>
              <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, maxWidth: 680 }}>
                Review Google Ads search terms in hybrid mode: Search campaigns use ad-group level analysis, while Performance Max campaigns switch automatically to campaign-level review.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            {selectedAccount ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <PlatformChip platform="google_ads" />
                <ToneBadge tone={selectedAccount.connectionStatus === "attention" ? "warning" : "positive"}>
                  {selectedAccount.connectionName}
                </ToneBadge>
              </div>
            ) : null}
            {selectedAccount ? (
              <div style={{ fontSize: 11, color: T.inkSoft, textAlign: "right" }}>
                Customer ID {selectedAccount.externalId} | {selectedAccount.type}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: fitCols(220), gap: 12 }}>
          <div>
            <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Client</div>
            <select
              value={selectedClient?.id || ""}
              onChange={(event) => setSelection((current) => ({ ...current, clientId: event.target.value, accountAssetId: "", campaignId: "", adGroupId: "" }))}
              style={selectStyle}
            >
              {searchableClients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Account</div>
            <select
              value={selectedAccount?.id || ""}
              onChange={(event) => setSelection((current) => ({ ...current, accountAssetId: event.target.value, campaignId: "", adGroupId: "" }))}
              style={selectStyle}
            >
              {availableAccounts.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} | {asset.externalId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Campaign</div>
            <select
              value={selectedCampaign?.id || ""}
              onChange={(event) => setSelection((current) => ({ ...current, campaignId: event.target.value, adGroupId: "" }))}
              style={selectStyle}
              disabled={!campaignOptions.length}
            >
              {campaignOptions.length ? campaignOptions.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} | {formatGoogleAdsEnum(campaign.channelType)}
                </option>
              )) : <option value="">No campaigns found</option>}
            </select>
          </div>

          {isPerformanceMax ? (
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Review level</div>
              <div style={{ ...selectStyle, display: "flex", alignItems: "center", background: T.amberSoft, color: T.amber, border: "1px solid rgba(199, 147, 33, 0.16)" }}>
                Campaign-level review for Performance Max
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Ad group</div>
              <select
                value={selectedAdGroup?.id || ""}
                onChange={(event) => setSelection((current) => ({ ...current, adGroupId: event.target.value }))}
                style={selectStyle}
                disabled={!adGroupOptions.length}
              >
                {adGroupOptions.length ? adGroupOptions.map((adGroup) => (
                  <option key={adGroup.id} value={adGroup.id}>{adGroup.name}</option>
                )) : <option value="">No ad groups found</option>}
              </select>
            </div>
          )}

          <div>
            <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Date range</div>
            <select
              value={selection.dateRange}
              onChange={(event) => setSelection((current) => ({ ...current, dateRange: event.target.value, campaignId: "", adGroupId: "" }))}
              style={selectStyle}
            >
              {SEARCH_TERM_DATE_RANGE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={() => setTagFilter("all")} active={tagFilter === "all"}>All terms</Button>
          <Button onClick={() => setTagFilter("good")} active={tagFilter === "good"}>Good</Button>
          <Button onClick={() => setTagFilter("bad")} active={tagFilter === "bad"}>Bad</Button>
          <Button onClick={() => setTagFilter("neutral")} active={tagFilter === "neutral"}>Neutral</Button>
          <Button onClick={() => setTagFilter("untagged")} active={tagFilter === "untagged"}>Untagged</Button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", padding: 4, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}` }}>
            {[
              { id: "active", label: "Active only" },
              { id: "inactive", label: "Inactive" },
              { id: "all", label: "All statuses" },
            ].map((option) => {
              const isActive = termStatusFilter === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTermStatusFilter(option.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: `1px solid ${isActive ? T.lineStrong : "transparent"}`,
                    background: isActive ? T.accentSoft : "transparent",
                    color: isActive ? T.accent : T.inkSoft,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: T.font,
                    whiteSpace: "nowrap",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: T.inkSoft }}>
            {summary.activeTerms} active / {summary.inactiveTerms} inactive search terms fetched
          </div>
        </div>

        {campaignState.error || adGroupState.error || termsState.error ? (
          <div style={{ padding: 12, borderRadius: 16, background: T.coralSoft, border: `1px solid rgba(215, 93, 66, 0.16)`, color: T.coral, fontSize: 12, fontWeight: 700 }}>
            {termsState.error || adGroupState.error || campaignState.error}
          </div>
        ) : null}

        {isPerformanceMax ? (
          <div style={{ padding: 12, borderRadius: 16, background: T.amberSoft, border: `1px solid rgba(199, 147, 33, 0.16)`, color: T.amber, fontSize: 12, fontWeight: 700 }}>
            This is a Performance Max campaign, so AdPulse is using campaign-level search term reporting. Triggered keyword and ad-group fields are not available here.
          </div>
        ) : hasPmaxCampaigns ? (
          <div style={{ padding: 12, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}`, color: T.inkSoft, fontSize: 12, fontWeight: 700 }}>
            Hybrid mode is active. If you choose a Performance Max campaign above, this workspace will automatically switch from ad-group review to campaign-level review.
          </div>
        ) : null}

        {selectedCampaign ? (
          <div style={{ padding: 12, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}`, color: T.inkSoft, fontSize: 12, lineHeight: 1.55 }}>
            Scores are relative to this reporting slice. Perf. Score measures conversion and cost efficiency. Rel. Score measures audience relevance from search demand and engagement: impressions, clicks, CTR, and manual relevance overrides. Auto tags use this client's Client Studio thresholds: good at {autoTagRules.goodMinConversions}+ conversion{autoTagRules.goodMinConversions === 1 ? "" : "s"}{autoTagRules.goodMaxCostPerConversion > 0 ? ` under ${formatMetric("spend", autoTagRules.goodMaxCostPerConversion)} CPA` : ""}; bad when no-conversion spend reaches {formatMetric("spend", autoTagRules.badNoConversionSpend)} or {autoTagRules.badNoConversionClicks}+ clicks. Manual tags override auto tags.
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: fitCols(180), gap: 12 }}>
        <MetricTile label="Total terms" value={summary.totalTerms} subValue={termsState.loading ? "Refreshing live search terms" : `${visibleTerms.length} visible / ${summary.inactiveTerms} inactive`} />
        <MetricTile label="Good terms" value={summary.goodCount} subValue="Manual or auto validated traffic" accent={T.accent} />
        <MetricTile label="Bad terms" value={summary.badCount} subValue={`${summary.neutralCount} neutral / ${summary.untaggedCount} untagged`} accent={T.coral} />
        <MetricTile label="Avg perf score" value={summary.averagePerformanceScore === null ? "--" : `${summary.averagePerformanceScore}/100`} subValue={`${summary.actionCounts.keep} keep / ${summary.actionCounts.review} review`} accent={T.sky} />
        <MetricTile label="Avg relevance" value={summary.averageRelevanceScore === null ? "--" : `${summary.averageRelevanceScore}/100`} subValue={`${summary.negativeActionCount} negative candidates / ${summary.actionCounts.needs_data} need data`} accent={T.amber} />
        <MetricTile label="Wasted spend" value={formatMetric("spend", summary.wastedSpend)} subValue="Spend attached to bad terms" accent={T.coral} />
      </div>

      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>AI strategist</div>
            <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>
              Strategic analysis of this live search-term slice for the current client target: {normalizeClientTarget(selectedClient?.focus || DEFAULT_CLIENT_TARGET)}.
            </div>
          </div>
          <ActionCue tone={aiState.error ? "danger" : aiState.data ? "info" : "neutral"}>
            {aiState.loading
              ? "Running strategist"
              : aiState.data
                ? "Strategy ready"
                : aiReady
                  ? "Ready to analyze"
                  : "Needs Claude key"}
          </ActionCue>
        </div>

        {!aiReady ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>
              Add an Anthropic API key to enable Claude-backed keyword and negative-mining recommendations. The strategist uses the live term table, client target, thresholds, and current campaign slice instead of a static rule list.
            </div>
            {onOpenConnections ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button onClick={onOpenConnections}>Open Connections</Button>
              </div>
            ) : null}
          </div>
        ) : aiState.error && !aiState.data ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 16, background: T.coralSoft, border: `1px solid rgba(215, 93, 66, 0.16)`, color: T.coral, fontSize: 12, fontWeight: 700 }}>
              {aiState.error}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={runAiStrategist} tone="primary" disabled={aiState.loading || !selectedCampaign}>
                {aiState.loading ? "Retrying..." : "Retry analysis"}
              </Button>
            </div>
          </div>
        ) : aiState.data ? (
          <AiStrategyOutput result={aiState.data} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>
              Run the strategist to interpret user intent, search-term fit, waste patterns, and expansion opportunities for {searchTermDateRangeLabel.toLowerCase()}.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={runAiStrategist} tone="primary" disabled={aiState.loading || !selectedCampaign}>
                {aiState.loading ? "Running strategist..." : "Run AI strategist"}
              </Button>
            </div>
          </div>
        )}

        {aiReady && aiState.data ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={runAiStrategist} tone="primary" disabled={aiState.loading || !selectedCampaign}>
              {aiState.loading ? "Refreshing..." : "Refresh analysis"}
            </Button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", padding: 4, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}` }}>
          <button
            type="button"
            onClick={() => setReviewPanel("table")}
            style={{
              padding: "9px 13px",
              borderRadius: 12,
              border: `1px solid ${reviewPanel === "table" ? T.lineStrong : "transparent"}`,
              background: reviewPanel === "table" ? T.accentSoft : "transparent",
              color: reviewPanel === "table" ? T.accent : T.inkSoft,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: T.font,
              whiteSpace: "nowrap",
            }}
          >
            {isPerformanceMax ? "Campaign search term table" : "Ad group search term table"}
          </button>
          <button
            type="button"
            onClick={() => setReviewPanel("negatives")}
            style={{
              padding: "9px 13px",
              borderRadius: 12,
              border: `1px solid ${reviewPanel === "negatives" ? T.lineStrong : "transparent"}`,
              background: reviewPanel === "negatives" ? T.coralSoft : "transparent",
              color: reviewPanel === "negatives" ? T.coral : T.inkSoft,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: T.font,
              whiteSpace: "nowrap",
            }}
          >
            Suggested negatives
          </button>
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft }}>
          {reviewPanel === "table" ? `${visibleTerms.length} terms in the current table view` : `${suggestedNegatives.length} negative candidate${suggestedNegatives.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ ...panelStyle, overflow: "hidden", display: reviewPanel === "table" ? "grid" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>{isPerformanceMax ? "Campaign search term table" : "Ad group search term table"}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>
                {selectedCampaign?.name || "Select a campaign"}{isPerformanceMax ? " | Performance Max campaign view" : selectedAdGroup ? ` | ${selectedAdGroup.name}` : ""}
              </div>
            </div>
            {termsState.note ? <ToneBadge tone="neutral">{termsState.note}</ToneBadge> : null}
          </div>

          {termsState.loading ? (
            <EmptyState title="Loading search terms" body={isPerformanceMax ? "Fetching the latest campaign-level Performance Max search terms and your saved manual tags." : "Fetching the latest ad-group level search terms and your saved manual tags."} />
          ) : !termsState.items.length ? (
            <EmptyState title="No search terms in this slice" body={isPerformanceMax ? "Try another campaign or widen the date range. Some Performance Max campaigns may not return search term rows for the selected period." : "Try another ad group or widen the date range. Ad groups without matching search term traffic will appear empty here."} />
          ) : (
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: isPerformanceMax ? 1320 : 1420 }}>
                <thead>
                  <tr>
                    {tableColumns.map((column) => {
                      const active = sort.key === column.key;
                      return (
                        <th key={column.key} style={{ textAlign: column.key === "tag" ? "right" : "left", padding: "0 0 10px", borderBottom: `1px solid ${T.line}` }}>
                          <button
                            type="button"
                            onClick={() => setSortColumn(column.key)}
                            style={{
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              cursor: "pointer",
                              fontFamily: T.font,
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: active ? T.ink : T.inkMute,
                            }}
                          >
                            {column.label}{active ? ` ${sort.direction === "asc" ? "↑" : "↓"}` : ""}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visibleTerms.map((term) => {
                    const effectiveTagMeta = SEARCH_TERM_TAG_META[term.effectiveTag || "untagged"];
                    const classificationMeta = term.effectiveTag
                      ? {
                          ...effectiveTagMeta,
                          label: `${term.tagSource === "manual" ? "Manual" : "Auto"} ${effectiveTagMeta.label}`,
                        }
                      : term.recommendedAction === "add_negative" || term.recommendedAction === "consider_negative"
                        ? { label: "Scored negative", color: T.coral, tint: T.coralSoft, border: "rgba(215, 93, 66, 0.18)" }
                        : term.recommendedAction === "keep"
                          ? { label: "Scored keep", color: T.accent, tint: T.accentSoft, border: "rgba(15, 143, 102, 0.18)" }
                          : term.recommendedAction === "needs_data"
                            ? { label: "Needs data", color: T.inkSoft, tint: T.bgSoft, border: T.line }
                            : SEARCH_TERM_TAG_META.untagged;
                    const actionMeta = SEARCH_TERM_ACTION_META[term.recommendedAction] || SEARCH_TERM_ACTION_META.review;
                    const entityKey = isPerformanceMax ? selectedCampaign?.id : selectedAdGroup?.id;
                    const busyKey = `${scopeLevel}:${entityKey}:${normalizeSearchTermKey(term.searchTerm)}`;
                    const rowBackground = term.effectiveTag === "good"
                      ? "rgba(15, 143, 102, 0.07)"
                      : term.effectiveTag === "bad"
                        ? "rgba(215, 93, 66, 0.07)"
                          : term.effectiveTag === "neutral"
                          ? "rgba(199, 147, 33, 0.08)"
                          : "transparent";

                    return (
                      <tr key={`${term.scopeLevel || scopeLevel}-${term.campaignId || selectedCampaign?.id}-${term.adGroupId || "campaign"}-${term.searchTerm}`} style={{ background: rowBackground }}>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{term.searchTerm}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <ToneBadge tone={term.status === "EXCLUDED" || term.status === "ADDED_EXCLUDED" ? "warning" : "neutral"}>
                                {formatSearchTermStatus(term.status)}
                              </ToneBadge>
                              <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, background: classificationMeta.tint, border: `1px solid ${classificationMeta.border}`, color: classificationMeta.color, fontSize: 11, fontWeight: 800 }}>
                                {classificationMeta.label}
                              </span>
                            </div>
                          </div>
                        </td>
                        {isPerformanceMax ? (
                          <>
                            <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>
                              {formatGoogleAdsEnum(term.matchSource)}
                            </td>
                            <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>
                              {formatGoogleAdsEnum(term.matchType)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>
                              {term.keywordText || "No keyword text returned"}
                            </td>
                            <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>
                              {formatGoogleAdsEnum(term.matchType)}
                            </td>
                          </>
                        )}
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>{formatNumber(term.impressions)}</td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>{formatNumber(term.clicks)}</td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>{formatPercent(term.ctr)}</td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>{formatMetric("cpc", term.averageCpc)}</td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>{formatNumber(term.conversions)}</td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12, color: T.ink }}>{formatMetric("spend", term.cost)}</td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                          <SearchTermScoreBadge score={term.performanceScore} confidence={term.dataConfidence} />
                        </td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                          <SearchTermScoreBadge score={term.relevanceScore} />
                        </td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                          <ToneBadge tone={actionMeta.tone}>{actionMeta.label}</ToneBadge>
                        </td>
                        <td style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {["good", "neutral", "bad"].map((tag) => {
                              const meta = SEARCH_TERM_TAG_META[tag];
                              const active = term.effectiveTag === tag;

                              return (
                                <button
                                  key={`${term.searchTerm}-${tag}`}
                                  type="button"
                                  disabled={!!tagBusyMap[busyKey]}
                                  onClick={() => handleTag(term, tag)}
                                  style={{
                                    padding: "7px 10px",
                                    borderRadius: 999,
                                    border: `1px solid ${active ? meta.border : T.line}`,
                                    background: active ? meta.tint : T.surfaceStrong,
                                    color: active ? meta.color : T.inkSoft,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    cursor: tagBusyMap[busyKey] ? "progress" : "pointer",
                                    fontFamily: T.font,
                                    opacity: tagBusyMap[busyKey] ? 0.72 : 1,
                                  }}
                                >
                                  {tag === "bad" ? "Bad" : meta.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ ...panelStyle, display: reviewPanel === "negatives" ? "grid" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Suggested negatives</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft }}>
                Unique words found in manual-bad, auto-bad, or score-flagged terms, excluding words from good/keep terms.
              </div>
            </div>
            <Button onClick={exportSuggestedNegatives} tone="primary" disabled={!suggestedNegatives.length}>
              Export text list
            </Button>
          </div>

          {!suggestedNegatives.length ? (
            <EmptyState title="No negative suggestions yet" body="AdPulse will suggest negatives from terms you tag as bad and from live rows scored as Consider negative / Add negative." />
          ) : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                {suggestedNegatives.slice(0, 20).map((item) => (
                  <div
                    key={item.word}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 16,
                      background: T.surfaceStrong,
                      border: `1px solid ${T.line}`,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{item.word}</div>
                      <div style={{ marginTop: 4, fontSize: 11, color: T.inkSoft }}>
                        {item.termCount} source term{item.termCount === 1 ? "" : "s"} | {item.manualBadCount} manual bad | {item.scoreCandidateCount} auto/scored candidate{item.scoreCandidateCount === 1 ? "" : "s"} | {formatMetric("spend", item.wastedSpend)} spend
                      </div>
                    </div>
                    <ToneBadge tone="warning">Negative candidate</ToneBadge>
                  </div>
                ))}
              </div>

              <div style={{ padding: 14, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 11, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Export preview</div>
                <pre style={{ margin: "10px 0 0", fontFamily: T.mono, fontSize: 12, color: T.ink, whiteSpace: "pre-wrap" }}>
                  {suggestedNegatives.map((item) => item.word).join("\n")}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_ADS_DEVELOPER_TOKEN: "",
    META_APP_ID: "",
    META_APP_SECRET: "",
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_STRATEGIST_MODEL: "",
  });

  useEffect(() => {
    fetchSetupStatus()
      .then((data) => {
        setStatus(data);
        if (data.allReady) setStep(3);
      })
      .catch(() => {});
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const nonEmpty = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v.trim())
      );
      if (Object.keys(nonEmpty).length === 0) {
        setError("Paste at least one credential to save.");
        setSaving(false);
        return;
      }
      const result = await saveSetupCredentials(nonEmpty);
      if (result.ok) {
        setSuccess(result.message || "Saved!");
        setStatus(result.status || null);
        setForm({
          GOOGLE_CLIENT_ID: "",
          GOOGLE_CLIENT_SECRET: "",
          GOOGLE_ADS_DEVELOPER_TOKEN: "",
          META_APP_ID: "",
          META_APP_SECRET: "",
          ANTHROPIC_API_KEY: "",
          ANTHROPIC_STRATEGIST_MODEL: "",
        });
        if (result.status?.allReady) setTimeout(() => onComplete?.(), 1500);
      } else {
        setError(result.error || "Save failed.");
      }
    } catch (err) {
      setError(err.message || "Could not reach the server.");
    }
    setSaving(false);
  };

  const iS = {
    width: "100%", padding: "10px 12px", borderRadius: T.radiusSm,
    border: `1.5px solid ${T.line}`, background: T.surfaceStrong,
    color: T.ink, fontSize: 13, fontFamily: T.mono, outline: "none", boxSizing: "border-box",
  };
  const lS = {
    fontSize: 11, fontWeight: 700, color: T.inkMute, textTransform: "uppercase",
    letterSpacing: "0.5px", marginBottom: 4, display: "block",
  };
  const cS = {
    background: T.surface, borderRadius: T.radius,
    border: `1px solid ${T.line}`, padding: 20, marginBottom: 14,
  };
  const checkIcon = (ok) => (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%",
      background: ok ? T.accentSoft : T.coralSoft,
      color: ok ? T.accent : T.coral, fontSize: 11, fontWeight: 700, flexShrink: 0,
    }}>
      {ok ? "✓" : "·"}
    </span>
  );

  const steps = [
    { label: "Google Cloud", desc: "OAuth Client" },
    { label: "Google Ads", desc: "Dev Token" },
    { label: "Meta", desc: "App ID + Secret" },
    { label: "Done", desc: "Ready" },
  ];

  const btnPrimary = {
    padding: "9px 20px", borderRadius: T.radiusSm, border: "none",
    background: T.ink, color: "#fff", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: T.font,
  };
  const btnSecondary = {
    padding: "9px 16px", borderRadius: T.radiusSm,
    border: `1.5px solid ${T.lineStrong}`, background: "transparent",
    color: T.inkSoft, fontSize: 13, cursor: "pointer", fontFamily: T.font,
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: T.font, padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: T.accent,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 12,
          }}>A</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, fontFamily: T.heading, color: T.ink }}>
            AdPulse Setup
          </h1>
          <p style={{ margin: "8px 0 0", color: T.inkSoft, fontSize: 14, lineHeight: 1.5 }}>
            One-time setup — connect your Google &amp; Meta developer apps so AdPulse can use OAuth to pull your ad accounts.
          </p>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 6,
                background: i <= step ? T.accent : T.lineStrong, transition: "background 0.3s",
              }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: i <= step ? T.accent : T.inkMute }}>{s.label}</div>
            </div>
          ))}
        </div>

        {status && (
          <div style={{ ...cS, display: "flex", flexWrap: "wrap", gap: 8, padding: 14 }}>
            {Object.entries(status.configured).map(([key, ok]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 8,
                background: ok ? T.accentSoft : T.coralSoft,
                fontSize: 11, fontWeight: 600, color: ok ? T.accent : T.coral,
              }}>
                {checkIcon(ok)}
                {key.replace(/_/g, " ")}
                {ok && status.masked[key] && (
                  <span style={{ fontFamily: T.mono, fontSize: 10, opacity: 0.7 }}>{status.masked[key]}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 0 && (
          <div style={cS}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Google Cloud — OAuth Client</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>
              Go to{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: T.accent }}>
                Cloud Console → Credentials
              </a>
              {" "}→ Create OAuth Client ID (Web app). Add your redirect URIs (see setup guide).
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={lS}>Google Client ID</label>
              <input value={form.GOOGLE_CLIENT_ID} onChange={(e) => updateField("GOOGLE_CLIENT_ID", e.target.value)}
                placeholder="123456789-abc.apps.googleusercontent.com" style={iS} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lS}>Google Client Secret</label>
              <input value={form.GOOGLE_CLIENT_SECRET} onChange={(e) => updateField("GOOGLE_CLIENT_SECRET", e.target.value)}
                placeholder="GOCSPX-xxxxxx" style={iS} />
            </div>
            <button onClick={() => setStep(1)} style={btnPrimary}>Next: Google Ads Token →</button>
          </div>
        )}

        {step === 1 && (
          <div style={cS}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Google Ads — Developer Token</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>
              Go to your{" "}
              <a href="https://ads.google.com/aw/apicenter" target="_blank" rel="noreferrer" style={{ color: T.accent }}>
                Google Ads Manager → API Center
              </a>
              {" "}and copy the developer token (22 characters).
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={lS}>Developer Token</label>
              <input value={form.GOOGLE_ADS_DEVELOPER_TOKEN} onChange={(e) => updateField("GOOGLE_ADS_DEVELOPER_TOKEN", e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxx" style={iS} />
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: T.bgSoft, border: `1px solid ${T.line}`, display: "grid", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>AI strategist (optional)</div>
                <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>
                  Add an Anthropic API key now if you want Claude Sonnet strategy recommendations on the Accounts and Search Terms screens.
                </div>
              </div>
              <div>
                <label style={lS}>Anthropic API key</label>
                <input value={form.ANTHROPIC_API_KEY} onChange={(e) => updateField("ANTHROPIC_API_KEY", e.target.value)}
                  placeholder="sk-ant-..." style={iS} />
              </div>
              <div>
                <label style={lS}>Strategist model</label>
                <input value={form.ANTHROPIC_STRATEGIST_MODEL} onChange={(e) => updateField("ANTHROPIC_STRATEGIST_MODEL", e.target.value)}
                  placeholder="claude-sonnet-4-6" style={iS} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(0)} style={btnSecondary}>← Back</button>
              <button onClick={() => setStep(2)} style={btnPrimary}>Next: Meta →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={cS}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Meta — App Credentials</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>
              Go to{" "}
              <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" style={{ color: T.accent }}>
                Meta Developer Portal → My Apps
              </a>
              {" "}→ your app → Settings → Basic → copy App ID &amp; Secret.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={lS}>Meta App ID</label>
              <input value={form.META_APP_ID} onChange={(e) => updateField("META_APP_ID", e.target.value)}
                placeholder="123456789" style={iS} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lS}>Meta App Secret</label>
              <input value={form.META_APP_SECRET} onChange={(e) => updateField("META_APP_SECRET", e.target.value)}
                placeholder="abcdef123456..." style={iS} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Back</button>
              <button onClick={handleSave} disabled={saving}
                style={{ ...btnPrimary, background: T.accent, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save all credentials"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ ...cS, textAlign: "center", padding: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: T.accentSoft,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: T.accent, fontSize: 24, fontWeight: 700, marginBottom: 12,
            }}>✓</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>All set!</h3>
            <p style={{ margin: "0 0 20px", color: T.inkSoft, fontSize: 13, lineHeight: 1.5 }}>
              Credentials configured. Use "Login with Google" and "Login with Meta" in the Connections tab.
            </p>
            <button onClick={() => onComplete?.()} style={btnPrimary}>Open AdPulse →</button>
          </div>
        )}

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginTop: 10,
            background: T.coralSoft, color: T.coral, fontSize: 12,
            fontWeight: 600, border: `1px solid ${T.coral}20`,
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginTop: 10,
            background: T.accentSoft, color: T.accent, fontSize: 12,
            fontWeight: 600, border: `1px solid ${T.accent}20`,
          }}>{success}</div>
        )}

        {step < 3 && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={() => onComplete?.()} style={{
              background: "none", border: "none", cursor: "pointer",
              color: T.inkMute, fontSize: 12, fontFamily: T.font, textDecoration: "underline",
            }}>Skip — I already have .env.local configured</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdPulse() {
  const [view, setView] = useState("overview");
  const [overviewMode, setOverviewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [users, setUsers] = useState(() => hydrateUsers(readStoredValue(STORAGE_KEYS.users, USERS_BASE)));
  const [clients, setClients] = useState(() => hydrateClients(readStoredValue(STORAGE_KEYS.clients, CLIENTS_BASE)));
  const [accountsDateRange, setAccountsDateRange] = useState(() => getDefaultAccountDateRange());
  const [integrationState, setIntegrationState] = useState(() => ({
    ...createEmptyIntegrationSnapshot(),
    loading: true,
    error: "",
  }));
  const [userDirectoryState, setUserDirectoryState] = useState(() => createEmptyUserDirectoryState());
  const [clientDirectoryState, setClientDirectoryState] = useState(() => createEmptyClientDirectoryState());
  const [googleAdsLiveState, setGoogleAdsLiveState] = useState(() => createEmptyGoogleAdsLiveState());
  const [googleAdsReportState, setGoogleAdsReportState] = useState(() => createEmptyGoogleAdsReportState());
  const [metaAdsLiveState, setMetaAdsLiveState] = useState(() => createEmptyMetaAdsLiveState());
  const [ga4LiveState, setGa4LiveState] = useState(() => createEmptyGa4LiveState());
  const [integrationBusy, setIntegrationBusy] = useState({});
  const [currentUserId, setCurrentUserId] = useState(() => readStoredValue(STORAGE_KEYS.session, null));
  const [setupComplete, setSetupComplete] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [aiSetupForm, setAiSetupForm] = useState({ ANTHROPIC_API_KEY: "", ANTHROPIC_STRATEGIST_MODEL: "" });
  const [aiSetupState, setAiSetupState] = useState({ saving: false, error: "", success: "" });
  const [openMap, setOpenMap] = useState({});
  const [toasts, setToasts] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(CLIENTS_BASE[0]?.id || "");
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  const [showProfile, setShowProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: "", title: "" });
  const [loginForm, setLoginForm] = useState({ email: "director@adpulse.local", password: "demo123" });
  const [loginError, setLoginError] = useState("");
  const [chartForm, setChartForm] = useState({
    clientId: CLIENTS_BASE[0]?.id || "",
    scope: "client",
    accountId: CLIENTS_BASE[0] ? ACCOUNTS_BASE.find((account) => account.clientId === CLIENTS_BASE[0].id)?.id || "" : "",
    metrics: ["spend", "revenue"],
  });
  const [charts, setCharts] = useState(() => {
    const storedCharts = readStoredValue(STORAGE_KEYS.analyticsCharts, []);
    return Array.isArray(storedCharts) ? storedCharts : [];
  });
  const [gaClientId, setGaClientId] = useState(CLIENTS_BASE.find((client) => client.connections.ga4)?.id || CLIENTS_BASE[0]?.id || "");
  const [reportClientId, setReportClientId] = useState(CLIENTS_BASE[0]?.id || "");
  const [studioDraft, setStudioDraft] = useState(CLIENTS_BASE[0] || null);
  const currentUser = users.find((user) => user.id === currentUserId) || null;
  const isDirector = currentUser?.role === "director";
  const providerProfiles = integrationState.connections;
  const accountUsers = users.filter((user) => user.role === "account");
  const accountUserIds = useMemo(() => getAccountUserIds(users), [users]);
  const demoUsers = useMemo(() => users.filter((user) => user.isSeeded), [users]);
  const accessibleClients = useMemo(() => {
    if (!currentUser) return [];
    return isDirector ? clients : clients.filter((client) => client.assignedUserIds?.includes(currentUser.id));
  }, [clients, currentUser, isDirector]);
  const accountsDateRangePayload = useMemo(
    () => getAccountDateRangePayload(accountsDateRange),
    [accountsDateRange]
  );
  const googleAdsAssetLookup = useMemo(() => (
    new Map(
      providerProfiles
        .filter((profile) => profile.platform === "google_ads")
        .flatMap((profile) => (profile.assets || []).map((asset) => [
          asset.id,
          {
            ...asset,
            connectionId: profile.id,
            connectionStatus: profile.status,
          },
        ]))
    )
  ), [providerProfiles]);
  const metaAdsAssetLookup = useMemo(() => (
    new Map(
      providerProfiles
        .filter((profile) => profile.platform === "meta_ads")
        .flatMap((profile) => (profile.assets || []).map((asset) => [
          asset.id,
          {
            ...asset,
            connectionId: profile.id,
            connectionStatus: profile.status,
          },
        ]))
    )
  ), [providerProfiles]);
  const ga4AssetLookup = useMemo(() => (
    new Map(
      providerProfiles
        .filter((profile) => profile.platform === "ga4")
        .flatMap((profile) => (profile.assets || []).map((asset) => [
          asset.id,
          {
            ...asset,
            connectionId: profile.id,
            connectionStatus: profile.status,
          },
        ]))
    )
  ), [providerProfiles]);
  const googleAdsLiveRequests = useMemo(() => (
    accessibleClients.flatMap((client) => {
      const linkedAssets = (client.linkedAssets?.google_ads || [])
        .map((assetId) => googleAdsAssetLookup.get(assetId))
        .filter((asset) => asset && asset.type !== "Manager account" && sanitizeGoogleAdsId(asset.externalId));

      if (!linkedAssets.length) return [];

      const budgetHints = splitTotal(client.budgets.google_ads || 0, linkedAssets.length, `${client.id}-google-live-budget`);
      return linkedAssets.map((asset, index) => ({
        key: `${client.id}:${asset.id}`,
        clientId: client.id,
        connectionId: asset.connectionId,
        assetId: asset.id,
        customerId: sanitizeGoogleAdsId(asset.externalId),
        budgetHint: budgetHints[index] || 0,
      }));
    })
  ), [accessibleClients, googleAdsAssetLookup]);
  const metaAdsLiveRequests = useMemo(() => (
    accessibleClients.flatMap((client) => {
      const linkedAssets = (client.linkedAssets?.meta_ads || [])
        .map((assetId) => metaAdsAssetLookup.get(assetId))
        .filter((asset) => asset && sanitizeGoogleAdsId(asset.externalId));

      if (!linkedAssets.length) return [];

      const budgetHints = splitTotal(client.budgets.meta_ads || 0, linkedAssets.length, `${client.id}-meta-live-budget`);
      return linkedAssets.map((asset, index) => ({
        key: `${client.id}:${asset.id}`,
        clientId: client.id,
        connectionId: asset.connectionId,
        assetId: asset.id,
        adAccountId: sanitizeGoogleAdsId(asset.externalId),
        budgetHint: budgetHints[index] || 0,
      }));
    })
  ), [accessibleClients, metaAdsAssetLookup]);
  const ga4LiveRequests = useMemo(() => (
    accessibleClients.flatMap((client) => {
      const linkedAssets = (client.linkedAssets?.ga4 || [])
        .map((assetId) => ga4AssetLookup.get(assetId))
        .filter((asset) => asset && sanitizeGoogleAdsId(asset.externalId));

      return linkedAssets.map((asset) => ({
        key: `${client.id}:${asset.id}`,
        clientId: client.id,
        connectionId: asset.connectionId,
        assetId: asset.id,
        propertyId: sanitizeGoogleAdsId(asset.externalId),
      }));
    })
  ), [accessibleClients, ga4AssetLookup]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LEGACY_DEMO_CLIENT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setUserDirectoryState((current) => ({ ...current, loading: true, error: "" }));

    fetchUsers()
      .then((payload) => {
        if (cancelled) return;
        setUsers(hydrateUsers(payload?.users));
        setUserDirectoryState((current) => ({ ...current, loading: false, error: "" }));
      })
      .catch((error) => {
        if (cancelled) return;
        setUserDirectoryState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Could not load saved users.",
        }));
        pushToast(error.message || "Could not load saved users.", "danger", "Users");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const localClients = clients;
    setClientDirectoryState((current) => ({ ...current, loading: true, error: "" }));

    fetchClients()
      .then(async (payload) => {
        if (cancelled) return;
        const storedClients = Array.isArray(payload?.clients) ? payload.clients : [];

        if (storedClients.length) {
          setClients(hydrateClients(storedClients));
          setClientDirectoryState((current) => ({ ...current, loading: false, error: "", notice: "" }));
          return;
        }

        if (localClients.length) {
          const results = await Promise.allSettled(localClients.map((client) => saveClientRecord(client.id, client)));
          if (cancelled) return;
          const failed = results.filter((result) => result.status === "rejected");
          setClientDirectoryState((current) => ({
            ...current,
            loading: false,
            error: failed.length ? failed[0].reason?.message || "Could not migrate local clients to the server." : "",
            notice: failed.length ? "" : "Client records migrated to the server.",
          }));
          if (failed.length) {
            pushToast(failed[0].reason?.message || "Could not migrate local clients to the server.", "danger", "Clients");
          } else {
            pushToast("Client records migrated to the server.", "info", "Clients");
          }
          return;
        }

        setClientDirectoryState((current) => ({ ...current, loading: false, error: "", notice: "" }));
      })
      .catch((error) => {
        if (cancelled) return;
        setClientDirectoryState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Could not load saved clients.",
        }));
        pushToast(error.message || "Could not load saved clients.", "danger", "Clients");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.analyticsCharts, JSON.stringify(charts));
  }, [charts]);

  useEffect(() => {
    fetchSetupStatus()
      .then((data) => {
        setSetupStatus(data);
        setSetupComplete(data.allReady);
      })
      .catch(() => setSetupComplete(true));
  }, []);

  useEffect(() => {
    refreshIntegrations();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOAuthMessage = (event) => {
      if (!event?.data || event.data.source !== "adpulse-oauth") return;

      if (event.data.ok) {
        refreshIntegrations({ silent: true });
        pushToast("Connection completed successfully.", "success", "Integrations");
      } else {
        setIntegrationState((current) => ({
          ...current,
          error: event.data.error || "The provider login did not complete.",
          loading: false,
        }));
        pushToast(event.data.error || "The provider login did not complete.", "danger", "Integrations");
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  useEffect(() => {
    if (integrationState.loading || integrationState.error) return;

    const assetIds = new Set(providerProfiles.flatMap((profile) => (profile.assets || []).map((asset) => asset.id)));
    if (!assetIds.size) return;

    const currentAssetIdByStableKey = new Map(
      providerProfiles.flatMap((profile) => (profile.assets || []).map((asset) => [
        getLinkedAssetStableKey(profile.platform, asset),
        asset.id,
      ]))
    );

    setClients((current) => current.map((client) => {
      const currentLinks = client.linkedAssets || getEmptyLinkedAssets();
      const nextLinks = Object.fromEntries(Object.entries(currentLinks).map(([platform, ids]) => [
        platform,
        Array.isArray(ids)
          ? Array.from(new Set(ids.map((assetId) => {
            if (assetIds.has(assetId)) return assetId;
            return currentAssetIdByStableKey.get(getLinkedAssetStableKey(platform, assetId)) || "";
          }).filter(Boolean)))
          : [],
      ]));
      const changed = Object.keys(nextLinks).some((platform) => (
        nextLinks[platform].join("|") !== (currentLinks[platform] || []).join("|")
      ));

      return changed ? { ...client, linkedAssets: nextLinks } : client;
    }));
  }, [integrationState.error, integrationState.loading, providerProfiles]);

  useEffect(() => {
    if (!currentUser || !googleAdsLiveRequests.length) {
      setGoogleAdsLiveState(createEmptyGoogleAdsLiveState());
      setGoogleAdsReportState(createEmptyGoogleAdsReportState());
      return;
    }

    let cancelled = false;
    setGoogleAdsLiveState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));
    setGoogleAdsReportState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    fetchGoogleAdsLiveOverview({
      ...accountsDateRangePayload,
      requests: googleAdsLiveRequests,
    })
      .then((data) => {
        if (cancelled) return;
        setGoogleAdsLiveState({
          loading: false,
          error: "",
          generatedAt: data?.generatedAt || "",
          accounts: Array.isArray(data?.accounts) ? data.accounts : [],
          campaigns: Array.isArray(data?.campaigns) ? data.campaigns : [],
          ads: Array.isArray(data?.ads) ? data.ads : [],
          errors: Array.isArray(data?.errors) ? data.errors : [],
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setGoogleAdsLiveState({
          loading: false,
          error: error.message || "Could not load Google Ads live data.",
          generatedAt: "",
          accounts: [],
          campaigns: [],
          ads: [],
          errors: [],
        });
      });

    fetchGoogleAdsReportDetails({
      ...accountsDateRangePayload,
      requests: googleAdsLiveRequests,
    })
      .then((data) => {
        if (cancelled) return;
        setGoogleAdsReportState({
          loading: false,
          error: "",
          generatedAt: data?.generatedAt || "",
          details: Array.isArray(data?.details) ? data.details : [],
          errors: Array.isArray(data?.errors) ? data.errors : [],
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setGoogleAdsReportState({
          loading: false,
          error: error.message || "Could not load Google Ads report details.",
          generatedAt: "",
          details: [],
          errors: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [accountsDateRangePayload, currentUser, googleAdsLiveRequests]);

  useEffect(() => {
    if (!currentUser || !metaAdsLiveRequests.length) {
      setMetaAdsLiveState(createEmptyMetaAdsLiveState());
      return;
    }

    let cancelled = false;
    setMetaAdsLiveState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    fetchMetaAdsLiveOverview({
      ...accountsDateRangePayload,
      requests: metaAdsLiveRequests,
    })
      .then((data) => {
        if (cancelled) return;
        setMetaAdsLiveState({
          loading: false,
          error: "",
          generatedAt: data?.generatedAt || "",
          accounts: Array.isArray(data?.accounts) ? data.accounts : [],
          campaigns: Array.isArray(data?.campaigns) ? data.campaigns : [],
          ads: Array.isArray(data?.ads) ? data.ads : [],
          errors: Array.isArray(data?.errors) ? data.errors : [],
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setMetaAdsLiveState({
          loading: false,
          error: error.message || "Could not load Meta Ads live data.",
          generatedAt: "",
          accounts: [],
          campaigns: [],
          ads: [],
          errors: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [accountsDateRangePayload, currentUser, metaAdsLiveRequests]);

  useEffect(() => {
    if (!currentUser || !ga4LiveRequests.length) {
      setGa4LiveState(createEmptyGa4LiveState());
      return;
    }

    let cancelled = false;
    setGa4LiveState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    fetchGa4LiveOverview({
      ...accountsDateRangePayload,
      requests: ga4LiveRequests,
    })
      .then((data) => {
        if (cancelled) return;
        setGa4LiveState({
          loading: false,
          error: "",
          generatedAt: data?.generatedAt || "",
          properties: Array.isArray(data?.properties) ? data.properties : [],
          errors: Array.isArray(data?.errors) ? data.errors : [],
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setGa4LiveState({
          loading: false,
          error: error.message || "Could not load GA4 live data.",
          generatedAt: "",
          properties: [],
          errors: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [accountsDateRangePayload, currentUser, ga4LiveRequests]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentUserId) {
      window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(currentUserId));
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.session);
    }
  }, [currentUserId]);

  useEffect(() => {
    const current = clients.find((client) => client.id === selectedClientId) || clients[0];
    setStudioDraft(current || null);
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (!currentUser) return;
    setProfileDraft({ name: currentUser.name, title: currentUser.title });
  }, [currentUser]);

  useEffect(() => {
    if (isDirector) return;
    if (view === "connections" || view === "users") {
      setView("overview");
    }
  }, [isDirector, view]);

  useEffect(() => {
    if (!accessibleClients.length) return;
    if (!accessibleClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(accessibleClients[0].id);
    }
  }, [accessibleClients, selectedClientId]);

  useEffect(() => {
    const gaClients = accessibleClients.filter((client) => client.connections.ga4);
    if (gaClients.length && !gaClients.some((client) => client.id === gaClientId)) {
      setGaClientId(gaClients[0].id);
    }
  }, [accessibleClients, gaClientId]);

  useEffect(() => {
    if (!accessibleClients.length) return;
    if (!accessibleClients.some((client) => client.id === reportClientId)) {
      setReportClientId(accessibleClients[0].id);
    }
  }, [accessibleClients, reportClientId]);

  useEffect(() => {
    if (chartForm.scope !== "account") return;
    const currentClient = accessibleClients.find((client) => client.id === chartForm.clientId);
    const availableAccounts = ACCOUNTS_BASE.filter((account) => account.clientId === chartForm.clientId && currentClient?.connections[account.platform]);
    const nextAccountId = availableAccounts[0]?.id || "";
    if (!availableAccounts.some((account) => account.id === chartForm.accountId)) {
      setChartForm((current) => ({ ...current, accountId: nextAccountId }));
    }
  }, [accessibleClients, chartForm.accountId, chartForm.clientId, chartForm.scope]);

  useEffect(() => {
    if (!accessibleClients.length) return;
    if (!accessibleClients.some((client) => client.id === chartForm.clientId)) {
      const nextClient = accessibleClients[0];
      const nextAccounts = ACCOUNTS_BASE.filter((account) => account.clientId === nextClient.id && nextClient.connections[account.platform]);
      setChartForm((current) => ({ ...current, clientId: nextClient.id, accountId: nextAccounts[0]?.id || "" }));
    }
  }, [accessibleClients, chartForm.clientId]);

  const enriched = useMemo(() => {
    // When real OAuth connections are present, derive per-client platform visibility from
    // linkedAssets (only show a platform if the client has linked real assets for it).
    // When no OAuth connections exist we are in demo mode — fall back to the stored connections.
    const hasAnyProviders = providerProfiles.length > 0;

    return accessibleClients.map((client) => {
      const liveGoogleAccounts = googleAdsLiveState.accounts.filter((account) => account.clientId === client.id);
      const liveGoogleCampaigns = googleAdsLiveState.campaigns.filter((campaign) => campaign.clientId === client.id);
      const liveGoogleAds = googleAdsLiveState.ads.filter((ad) => ad.clientId === client.id);
      const liveMetaAccounts = metaAdsLiveState.accounts.filter((account) => account.clientId === client.id);
      const liveMetaCampaigns = metaAdsLiveState.campaigns.filter((campaign) => campaign.clientId === client.id);
      const liveMetaAds = metaAdsLiveState.ads.filter((ad) => ad.clientId === client.id);
      const liveGa4Reports = ga4LiveState.properties.filter((property) => property.clientId === client.id);
      const linkedAssetCounts = {
        google_ads: Array.isArray(client.linkedAssets?.google_ads) ? client.linkedAssets.google_ads.length : 0,
        meta_ads: Array.isArray(client.linkedAssets?.meta_ads) ? client.linkedAssets.meta_ads.length : 0,
        ga4: Array.isArray(client.linkedAssets?.ga4) ? client.linkedAssets.ga4.length : 0,
      };
      const hasLinkedGoogleAssets = linkedAssetCounts.google_ads > 0;
      const hasLinkedMetaAssets = linkedAssetCounts.meta_ads > 0;
      const hasLinkedGa4Assets = linkedAssetCounts.ga4 > 0;
      const hasStoredLinkedAssets = hasLinkedGoogleAssets || hasLinkedMetaAssets || hasLinkedGa4Assets;
      const useLiveGoogle = hasLinkedGoogleAssets;
      const useLiveMeta = hasLinkedMetaAssets;
      const useLiveGa4 = hasLinkedGa4Assets;
      const syncingPlatforms = [
        hasLinkedGoogleAssets && googleAdsLiveState.loading ? "google_ads" : "",
        hasLinkedMetaAssets && metaAdsLiveState.loading ? "meta_ads" : "",
        hasLinkedGa4Assets && ga4LiveState.loading ? "ga4" : "",
      ].filter(Boolean);

      // Effective connections: real-linked when OAuth connections exist, otherwise demo toggles
      const effectiveConnections = {
        google_ads: hasAnyProviders || hasStoredLinkedAssets ? hasLinkedGoogleAssets : client.connections.google_ads,
        meta_ads: hasAnyProviders || hasStoredLinkedAssets ? hasLinkedMetaAssets : client.connections.meta_ads,
        ga4: hasAnyProviders || hasStoredLinkedAssets ? hasLinkedGa4Assets : client.connections.ga4,
      };

      const visibleAccounts = [
        ...ACCOUNTS_BASE.filter((account) => account.clientId === client.id && effectiveConnections[account.platform] && (!useLiveGoogle || account.platform !== "google_ads") && (!useLiveMeta || account.platform !== "meta_ads")),
        ...(useLiveGoogle ? liveGoogleAccounts : []),
        ...(useLiveMeta ? liveMetaAccounts : []),
      ];
      const visibleCampaigns = [
        ...CAMPAIGNS_BASE.filter((campaign) => campaign.clientId === client.id && effectiveConnections[campaign.platform] && (!useLiveGoogle || campaign.platform !== "google_ads") && (!useLiveMeta || campaign.platform !== "meta_ads")),
        ...(useLiveGoogle ? liveGoogleCampaigns : []),
        ...(useLiveMeta ? liveMetaCampaigns : []),
      ];
      const visibleAds = [
        ...ADS_BASE.filter((ad) => ad.clientId === client.id && effectiveConnections[ad.platform] && (!useLiveGoogle || ad.platform !== "google_ads") && (!useLiveMeta || ad.platform !== "meta_ads")),
        ...(useLiveGoogle ? liveGoogleAds : []),
        ...(useLiveMeta ? liveMetaAds : []),
      ];
      const ga4 = effectiveConnections.ga4
        ? useLiveGa4 ? buildLiveGa4Summary(client, liveGa4Reports, ga4LiveState) : GA4_BASE[client.id]
        : null;
      const spend = visibleAccounts.reduce((acc, account) => acc + account.spend, 0);
      const clicks = visibleAccounts.reduce((acc, account) => acc + account.clicks, 0);
      const impressions = visibleAccounts.reduce((acc, account) => acc + account.impressions, 0);
      const conversions = visibleAccounts.reduce((acc, account) => acc + account.conversions, 0);
      const conversionValue = visibleAccounts.reduce((acc, account) => acc + getConversionValue(account), 0);
      const googleBudget = effectiveConnections.google_ads ? client.budgets.google_ads : 0;
      const metaBudget = effectiveConnections.meta_ads ? client.budgets.meta_ads : 0;
      const totalBudget = googleBudget + metaBudget;
      const roas = spend ? conversionValue / spend : 0;
      const activeCampaigns = visibleCampaigns.filter((campaign) => !isStoppedCampaign(campaign)).length;
      const stoppedCampaigns = visibleCampaigns.filter((campaign) => isStoppedCampaign(campaign)).length;
      const liveAds = visibleAds.filter((ad) => ad.status === "live" || ad.status === "learning").length;
      const shouldPauseHealthChecks = (effectiveConnections.google_ads || effectiveConnections.meta_ads) && visibleAccounts.length === 0;
      const health = shouldPauseHealthChecks
        ? { ok: true, flags: [], score: 0 }
        : evaluateHealth({
          ...client,
          budgets: {
            ...client.budgets,
            google_ads: googleBudget,
            meta_ads: metaBudget,
          },
        }, visibleAccounts, visibleCampaigns, ga4);

      return {
        ...client,
        connections: effectiveConnections,
        accounts: visibleAccounts,
        campaigns: visibleCampaigns,
        ads: visibleAds,
        ga4,
        linkedAssetCounts,
        linkedAssetCount: Object.values(linkedAssetCounts).reduce((acc, count) => acc + count, 0),
        syncingPlatforms,
        spend,
        clicks,
        impressions,
        conversions,
        conversionValue,
        ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
        cpc: clicks ? +(spend / clicks).toFixed(2) : 0,
        roas: +roas.toFixed(2),
        totalBudget,
        activeCampaigns,
        stoppedCampaigns,
        liveAds,
        health,
      };
    });
  }, [accessibleClients, ga4LiveState, googleAdsLiveState.accounts, googleAdsLiveState.ads, googleAdsLiveState.campaigns, googleAdsLiveState.loading, metaAdsLiveState.accounts, metaAdsLiveState.ads, metaAdsLiveState.campaigns, metaAdsLiveState.loading, providerProfiles]);

  useEffect(() => {
    if (googleAdsLiveState.loading || metaAdsLiveState.loading) return;
    if (!enriched.length) return;

    const now = new Date().toISOString();
    const updates = [];

    enriched.forEach((client) => {
      if (!Array.isArray(client.campaigns) || !client.campaigns.length) return;

      const storedClient = clients.find((item) => item.id === client.id);
      if (!storedClient) return;

      const currentMemory = normalizeCampaignStatusMemory(storedClient.campaignStatusMemory);
      const nextMemory = {};
      let changed = false;

      client.campaigns.forEach((campaign) => {
        const key = getCampaignMemoryKey(campaign);
        if (!key) return;

        const nextStatus = normalizeCampaignStatus(campaign.status);
        const previous = currentMemory[key] || null;
        const statusChanged = previous && previous.status !== nextStatus;
        const nextRecord = {
          status: nextStatus,
          lastSeenAt: previous?.lastSeenAt || now,
          lastChangedAt: previous?.lastChangedAt || "",
          stoppedAt: previous?.stoppedAt || "",
        };

        if (statusChanged) {
          nextRecord.lastSeenAt = now;
          nextRecord.lastChangedAt = now;
          nextRecord.stoppedAt = nextStatus === "stopped" ? now : "";
        } else if (!previous) {
          nextRecord.lastSeenAt = now;
          nextRecord.stoppedAt = "";
          nextRecord.lastChangedAt = "";
        }

        if (JSON.stringify(previous || null) !== JSON.stringify(nextRecord)) {
          changed = true;
        }

        nextMemory[key] = nextRecord;
      });

      if (!changed) {
        const currentKeys = Object.keys(currentMemory);
        const nextKeys = Object.keys(nextMemory);
        changed = currentKeys.length !== nextKeys.length || currentKeys.some((key) => !(key in nextMemory));
      }

      if (changed) {
        updates.push({
          id: storedClient.id,
          nextClient: {
            ...storedClient,
            campaignStatusMemory: nextMemory,
          },
        });
      }
    });

    if (!updates.length) return;

    setClients((current) => hydrateClients(current.map((client) => {
      const update = updates.find((item) => item.id === client.id);
      return update ? update.nextClient : client;
    })));

    updates.forEach(({ nextClient }) => {
      saveClientRecord(nextClient.id, nextClient).catch(() => {
        // Status memory is a convenience layer; do not interrupt the dashboard if it cannot sync.
      });
    });
  }, [clients, enriched, googleAdsLiveState.loading, metaAdsLiveState.loading]);

  const filteredClients = useMemo(() => {
    let list = enriched;

    if (statusFilter === "red") list = list.filter((client) => !client.health.ok);
    if (statusFilter === "green") list = list.filter((client) => client.health.ok);
    if (categoryFilter !== "all") list = list.filter((client) => client.category === categoryFilter);
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((client) => {
        const assignedNames = accountUsers.filter((user) => client.assignedUserIds?.includes(user.id)).map((user) => user.name).join(" ");
        const haystack = `${client.name} ${client.focus} ${client.reportingGroup} ${client.tags.join(" ")} ${assignedNames}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    return [...list].sort((left, right) => {
      if (sortBy === "priority") {
        if (left.health.ok !== right.health.ok) return left.health.ok ? 1 : -1;
        return right.health.score - left.health.score;
      }
      if (sortBy === "spend") return right.spend - left.spend;
      if (sortBy === "budget") return right.totalBudget - left.totalBudget;
      if (sortBy === "roas") return right.roas - left.roas;
      return left.name.localeCompare(right.name);
    });
  }, [accountUsers, categoryFilter, enriched, search, sortBy, statusFilter]);
  const filteredClientGroups = useMemo(() => groupClientsByReportingGroup(filteredClients), [filteredClients]);

  const redClients = enriched.filter((client) => !client.health.ok);
  const greenClients = enriched.filter((client) => client.health.ok);
  const gaVisibleClients = enriched.filter((client) => client.connections.ga4 && client.ga4?.isLiveGa4);
  const currentUserAssignedClients = currentUser?.role === "director" ? clients : clients.filter((client) => client.assignedUserIds?.includes(currentUser?.id));
  const chartAccounts = enriched.find((client) => client.id === chartForm.clientId)?.accounts || [];
  const allDashboardAccounts = useMemo(() => enriched.flatMap((client) => client.accounts || []), [enriched]);
  const dashboardGa4ByClient = useMemo(() => Object.fromEntries(enriched
    .filter((client) => client.ga4?.isLiveGa4)
    .map((client) => [client.id, client.ga4])), [enriched]);
  const dashboardSeriesMap = useMemo(() => buildSeriesMap(enriched, allDashboardAccounts, dashboardGa4ByClient), [allDashboardAccounts, dashboardGa4ByClient, enriched]);
  const reportDateRangeLabel = getAccountDateRangeLabel(accountsDateRange);
  const gaClient = gaVisibleClients.find((client) => client.id === gaClientId) || gaVisibleClients[0] || null;
  const shellMaxWidth = viewportWidth >= 1880 ? 1740 : viewportWidth >= 1680 ? 1640 : viewportWidth >= 1440 ? 1540 : viewportWidth >= 1200 ? 1380 : 1120;
  const overviewColumns = viewportWidth >= 1680 ? "repeat(4, minmax(0, 1fr))" : viewportWidth >= 1220 ? "repeat(3, minmax(0, 1fr))" : viewportWidth >= 760 ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const analyticsColumns = viewportWidth >= 1320 ? "minmax(0, 1.15fr) minmax(360px, 0.85fr)" : "1fr";
  const chartColumns = viewportWidth >= 1500 ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const alertColumns = viewportWidth >= 1200 ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const studioColumns = viewportWidth >= 1380 ? "minmax(300px, 330px) minmax(0, 1fr)" : "1fr";
  const integrationColumns = viewportWidth >= 1520 ? "repeat(3, minmax(0, 1fr))" : viewportWidth >= 1020 ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const aiConfigured = !!setupStatus?.configured?.ANTHROPIC_API_KEY;
  const navItems = [
    { key: "overview", label: "Overview" },
    { key: "accounts", label: "Accounts" },
    { key: "search_terms", label: "Search Terms" },
    { key: "analytics", label: "Analytics" },
    { key: "reports", label: "Reports" },
    { key: "alerts", label: "Alerts" },
    { key: "studio", label: "Client Studio" },
    ...(isDirector ? [{ key: "users", label: "Users" }, { key: "connections", label: "Connections" }] : []),
  ];

  function mergeUserRecord(nextUser) {
    setUsers((current) => hydrateUsers([
      ...current.filter((user) => user.id !== nextUser.id),
      nextUser,
    ]));
  }

  function mergeClientRecord(nextClient) {
    setClients((current) => hydrateClients([
      ...current.filter((client) => client.id !== nextClient.id),
      nextClient,
    ]));
  }

  function dismissToast(toastId) {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function pushToast(message, tone = "success", title = "") {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current.slice(-2), { id, message, tone, title }]);

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3600);
    }
  }

  async function handleLogin(credentials = loginForm) {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email || !password) {
      setLoginError("Enter your email and password.");
      return;
    }

    try {
      const payload = await loginUser({ email, password });
      if (!payload?.user) {
        setLoginError("Wrong email or password.");
        return;
      }

      mergeUserRecord(payload.user);
      setCurrentUserId(payload.user.id);
      setLoginError("");
      setShowProfile(false);
      setView("overview");
    } catch (error) {
      setLoginError(error.message || "Wrong email or password.");
    }
  }

  async function quickLogin(userId) {
    const match = users.find((user) => user.id === userId);
    if (!match) return;

    const nextCredentials = { email: match.email, password: DEMO_USER_PASSWORD };
    setLoginForm(nextCredentials);
    await handleLogin(nextCredentials);
  }

  function handleLogout() {
    setCurrentUserId(null);
    setShowProfile(false);
    setOpenMap({});
    setLoginError("");
    setView("overview");
  }

  async function saveProfile() {
    if (!currentUser) return;

    setUserDirectoryState((current) => ({ ...current, savingKey: currentUser.id, error: "", notice: "" }));

    try {
      const payload = await updateUser(currentUser.id, profileDraft);
      if (payload?.user) {
        mergeUserRecord(payload.user);
      }
      setShowProfile(false);
      setUserDirectoryState((current) => ({ ...current, savingKey: "", error: "", notice: "Profile updated." }));
      pushToast("Your profile has been updated.", "success", "Profile");
    } catch (error) {
      setUserDirectoryState((current) => ({ ...current, savingKey: "", error: error.message || "Could not update the profile.", notice: "" }));
      pushToast(error.message || "Could not update the profile.", "danger", "Profile");
    }
  }

  async function createDashboardUser(draft) {
    setUserDirectoryState((current) => ({ ...current, savingKey: "__create__", error: "", notice: "" }));

    try {
      const payload = await createUser(draft);
      if (payload?.user) {
        mergeUserRecord(payload.user);
        setUserDirectoryState((current) => ({ ...current, savingKey: "", error: "", notice: `${payload.user.name} created.` }));
        pushToast(`${payload.user.name} created successfully.`, "success", "Users");
        return payload.user;
      }
    } catch (error) {
      setUserDirectoryState((current) => ({ ...current, savingKey: "", error: error.message || "Could not create the user.", notice: "" }));
      pushToast(error.message || "Could not create the user.", "danger", "Users");
    }

    return null;
  }

  async function saveDashboardUser(userId, draft) {
    setUserDirectoryState((current) => ({ ...current, savingKey: userId, error: "", notice: "" }));

    try {
      const payload = await updateUser(userId, draft);
      if (payload?.user) {
        mergeUserRecord(payload.user);
        setUserDirectoryState((current) => ({ ...current, savingKey: "", error: "", notice: `${payload.user.name} updated.` }));
        pushToast(`${payload.user.name} updated.`, "success", "Users");
      }
    } catch (error) {
      setUserDirectoryState((current) => ({ ...current, savingKey: "", error: error.message || "Could not update the user.", notice: "" }));
      pushToast(error.message || "Could not update the user.", "danger", "Users");
    }
  }

  async function deleteDashboardUser(user) {
    if (!user?.id) return;
    if (user.id === currentUserId) {
      setUserDirectoryState((current) => ({ ...current, error: "You cannot delete the user who is currently signed in.", notice: "" }));
      pushToast("You cannot delete the user who is currently signed in.", "warning", "Users");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(`Delete ${user.name}? This will remove their login and unassign them from any clients.`)) {
      return;
    }

    setUserDirectoryState((current) => ({ ...current, savingKey: `delete:${user.id}`, error: "", notice: "" }));

    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setClients((current) => current.map((client) => ({
        ...client,
        assignedUserIds: (client.assignedUserIds || []).filter((assignedUserId) => assignedUserId !== user.id),
      })));
      setUserDirectoryState((current) => ({ ...current, savingKey: "", error: "", notice: `${user.name} deleted.` }));
      pushToast(`${user.name} deleted.`, "success", "Users");
    } catch (error) {
      setUserDirectoryState((current) => ({ ...current, savingKey: "", error: error.message || "Could not delete the user.", notice: "" }));
      pushToast(error.message || "Could not delete the user.", "danger", "Users");
    }
  }

  function jumpToAccounts(clientId) {
    setSelectedClientId(clientId);
    setOpenMap((current) => ({ ...current, [clientId]: true }));
    setView("accounts");
  }

  function jumpToStudio(clientId) {
    setSelectedClientId(clientId);
    setView("studio");
  }

  function createClient() {
    const nextClient = createLiveClientDraft(Date.now());
    setClients((current) => [...current, nextClient]);
    setSelectedClientId(nextClient.id);
    setStudioDraft(nextClient);
    setClientDirectoryState((current) => ({ ...current, error: "", notice: "New client draft created. Save it to persist the record." }));
    pushToast("New client draft created. Save it to persist the record.", "info", "Clients");
    setView("studio");
  }

  async function resolveClientIssue(clientId, issueId) {
    const client = clients.find((item) => item.id === clientId);
    if (!client || !issueId) return;

    const nextClient = hydrateClients([{
      ...client,
      resolvedIssueIds: normalizeIssueIdList([...(client.resolvedIssueIds || []), issueId]),
    }])[0] || client;

    mergeClientRecord(nextClient);
    if (studioDraft?.id === clientId) {
      setStudioDraft(nextClient);
    }

    try {
      const payload = await saveClientRecord(nextClient.id, nextClient);
      const savedClient = payload?.client ? hydrateClients([payload.client])[0] : nextClient;
      mergeClientRecord(savedClient);
      if (studioDraft?.id === clientId) {
        setStudioDraft(savedClient);
      }
      pushToast("Issue marked as resolved for everyone viewing this client.", "success", "Alerts");
    } catch (error) {
      mergeClientRecord(client);
      if (studioDraft?.id === clientId) {
        setStudioDraft(client);
      }
      pushToast(error.message || "Could not mark the issue as resolved.", "danger", "Alerts");
    }
  }

  async function saveStudioDraft() {
    if (!studioDraft) return;

    setClientDirectoryState((current) => ({ ...current, savingKey: studioDraft.id, error: "", notice: "" }));

    let nextClient = null;

    if (!isDirector) {
      const currentClient = clients.find((client) => client.id === studioDraft.id);
      if (!currentClient) {
        setClientDirectoryState((current) => ({ ...current, savingKey: "", error: "Client not found.", notice: "" }));
        pushToast("Client not found.", "danger", "Clients");
        return;
      }

      nextClient = {
        ...currentClient,
        budgets: { ...currentClient.budgets, ...studioDraft.budgets },
        linkedAssets: {
          ...(currentClient.linkedAssets || getEmptyLinkedAssets()),
          ...(studioDraft.linkedAssets || getEmptyLinkedAssets()),
        },
        connections: { ...currentClient.connections, ...studioDraft.connections },
        rules: {
          ...currentClient.rules,
          ...studioDraft.rules,
          searchTerms: normalizeSearchTermRules(studioDraft.category || currentClient.category, studioDraft.rules?.searchTerms),
        },
        logoImage: studioDraft.logoImage || currentClient.logoImage || "",
        logoText: studioDraft.logoText || currentClient.logoText || getClientLogoText(studioDraft.name || currentClient.name),
      };
    } else {
      nextClient = {
        ...studioDraft,
        logoText: studioDraft.logoText || getClientLogoText(studioDraft.name),
        assignedUserIds: Array.from(new Set((studioDraft.assignedUserIds || []).filter((userId) => accountUserIds.includes(userId)))),
        linkedAssets: {
          ...getEmptyLinkedAssets(),
          ...(studioDraft.linkedAssets || {}),
        },
        connections: { ...studioDraft.connections },
        rules: {
          ...studioDraft.rules,
          searchTerms: normalizeSearchTermRules(studioDraft.category, studioDraft.rules?.searchTerms),
        },
      };
    }

    const optimisticClient = hydrateClients([nextClient])[0] || nextClient;
    mergeClientRecord(optimisticClient);
    setStudioDraft(optimisticClient);

    try {
      const payload = await saveClientRecord(optimisticClient.id, optimisticClient);
      const savedClient = payload?.client ? hydrateClients([payload.client])[0] : optimisticClient;
      mergeClientRecord(savedClient);
      setStudioDraft(savedClient);
      setClientDirectoryState((current) => ({
        ...current,
        savingKey: "",
        error: "",
        notice: `${savedClient.name} saved.`,
        lastSavedToken: `${savedClient.id}:${Date.now()}`,
        lastSavedClientId: savedClient.id,
      }));
      pushToast(`${savedClient.name} saved successfully.`, "success", "Clients");
    } catch (error) {
      setClientDirectoryState((current) => ({ ...current, savingKey: "", error: error.message || "Could not save the client.", notice: "" }));
      pushToast(error.message || "Could not save the client.", "danger", "Clients");
    }
  }

  async function deleteDashboardClient(client) {
    if (!client?.id) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete ${client.name}? This removes the client record, linked assets, and Director configuration for it.`)) {
      return;
    }

    setClientDirectoryState((current) => ({ ...current, savingKey: `delete:${client.id}`, error: "", notice: "" }));

    try {
      await deleteClientRecord(client.id);
      const remaining = clients.filter((item) => item.id !== client.id);
      const nextSelectedId = remaining[0]?.id || "";
      const nextGaClientId = remaining.find((item) => item.connections?.ga4)?.id || nextSelectedId;

      setClients(remaining);
      setOpenMap((current) => {
        const next = { ...current };
        delete next[client.id];
        return next;
      });
      setCharts((current) => current.filter((chart) => chart.clientId !== client.id));
      if (selectedClientId === client.id) setSelectedClientId(nextSelectedId);
      if (reportClientId === client.id) setReportClientId(nextSelectedId);
      if (gaClientId === client.id) setGaClientId(nextGaClientId);
      if (studioDraft?.id === client.id) {
        setStudioDraft(remaining.find((item) => item.id === nextSelectedId) || null);
      }
      setClientDirectoryState((current) => ({ ...current, savingKey: "", error: "", notice: `${client.name} deleted.` }));
      pushToast(`${client.name} deleted.`, "success", "Clients");
    } catch (error) {
      setClientDirectoryState((current) => ({ ...current, savingKey: "", error: error.message || "Could not delete the client.", notice: "" }));
      pushToast(error.message || "Could not delete the client.", "danger", "Clients");
    }
  }

  async function saveAiSetup() {
    const payload = Object.fromEntries(
      Object.entries(aiSetupForm).filter(([, value]) => String(value || "").trim())
    );

    if (!Object.keys(payload).length) {
      setAiSetupState({ saving: false, error: "Paste at least one AI setting before saving.", success: "" });
      return;
    }

    setAiSetupState({ saving: true, error: "", success: "" });

    try {
      const result = await saveSetupCredentials(payload);
      setSetupStatus(result.status || null);
      setAiSetupState({
        saving: false,
        error: "",
        success: result.message || "AI settings saved.",
      });
      setAiSetupForm({ ANTHROPIC_API_KEY: "", ANTHROPIC_STRATEGIST_MODEL: "" });
      pushToast("AI strategist settings saved.", "success", "Connections");
    } catch (error) {
      setAiSetupState({
        saving: false,
        error: error.message || "Could not save the AI settings.",
        success: "",
      });
      pushToast(error.message || "Could not save the AI settings.", "danger", "Connections");
    }
  }

  function addChart() {
    if (!chartForm.metrics.length) return;
    setCharts((current) => [...current, { ...chartForm, id: `chart-${Date.now()}` }]);
  }

  function addChartPreset(preset) {
    const targetClientId = preset.scope === "ga4"
      ? gaClient?.id || chartForm.clientId || enriched[0]?.id || ""
      : chartForm.clientId || gaClient?.id || enriched[0]?.id || "";
    const targetClient = enriched.find((client) => client.id === targetClientId) || enriched[0] || null;

    if (!targetClient) {
      pushToast("Create or assign a client before adding analytics charts.", "warning", "Analytics");
      return;
    }

    if (preset.scope === "ga4" && !targetClient.connections?.ga4) {
      pushToast("This preset needs a GA4-linked client.", "warning", "Analytics");
      return;
    }

    const accountId = preset.scope === "account" ? targetClient.accounts?.[0]?.id || "" : "";
    if (preset.scope === "account" && !accountId) {
      pushToast("This client has no ad account for that chart preset.", "warning", "Analytics");
      return;
    }

    setCharts((current) => [...current, {
      id: `chart-${preset.id}-${Date.now()}`,
      clientId: targetClient.id,
      accountId,
      scope: preset.scope,
      metrics: preset.metrics,
    }]);
    pushToast(`${preset.label} added to Analytics.`, "success", "Analytics");
  }

  async function refreshIntegrations({ silent = false } = {}) {
    if (!silent) {
      setIntegrationState((current) => ({
        ...current,
        loading: true,
        error: "",
      }));
    }

    try {
      const snapshot = await fetchIntegrationSnapshot();
      setIntegrationState({
        ...createEmptyIntegrationSnapshot(),
        ...snapshot,
        loading: false,
        error: "",
      });
    } catch (error) {
      setIntegrationState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Could not load integration state. Make sure the local API server is running.",
      }));
      if (!silent) {
        pushToast(error.message || "Could not load integration state.", "danger", "Integrations");
      }
    }
  }

  function connectProviderProfile(platform) {
    if (typeof window === "undefined") return;

    setIntegrationBusy((current) => ({ ...current, [`connect-${platform}`]: true }));
    const popup = window.open(getProviderStartUrl(platform), `${platform}-oauth`, "popup=yes,width=760,height=820");

    if (!popup) {
      setIntegrationState((current) => ({
        ...current,
        loading: false,
        error: "Popup blocked. Allow popups for AdPulse and try again.",
      }));
      setIntegrationBusy((current) => ({ ...current, [`connect-${platform}`]: false }));
      pushToast("Popup blocked. Allow popups for AdPulse and try again.", "danger", "Integrations");
      return;
    }

    popup.focus?.();
    pushToast(`Finish the ${PLATFORM_META[platform]?.label || platform} login in the popup window.`, "info", "Integrations");
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        setIntegrationBusy((current) => ({ ...current, [`connect-${platform}`]: false }));
      }
    }, 450);
  }

  async function syncProviderProfile(profileId) {
    setIntegrationBusy((current) => ({ ...current, [profileId]: true }));

    try {
      await syncIntegrationProfile(profileId);
      await refreshIntegrations({ silent: true });
      pushToast("Integration synced successfully.", "success", "Integrations");
    } catch (error) {
      setIntegrationState((current) => ({
        ...current,
        error: error.message || "Sync failed.",
      }));
      pushToast(error.message || "Sync failed.", "danger", "Integrations");
    } finally {
      setIntegrationBusy((current) => ({ ...current, [profileId]: false }));
    }
  }

  async function disconnectProviderProfile(profileId) {
    if (typeof window !== "undefined" && !window.confirm("Disconnect this login and remove its synced assets?")) {
      return;
    }

    setIntegrationBusy((current) => ({ ...current, [`${profileId}-disconnect`]: true }));

    try {
      await disconnectIntegrationProfile(profileId);
      await refreshIntegrations({ silent: true });
      pushToast("Integration disconnected.", "success", "Integrations");
    } catch (error) {
      setIntegrationState((current) => ({
        ...current,
        error: error.message || "Disconnect failed.",
      }));
      pushToast(error.message || "Disconnect failed.", "danger", "Integrations");
    } finally {
      setIntegrationBusy((current) => ({ ...current, [`${profileId}-disconnect`]: false }));
    }
  }

  if (setupComplete === null) {
    return (<div style={{ minHeight: "100vh", background: T.bg }} />);
  }

  if (setupComplete === false) {
    return (<SetupWizard onComplete={() => setSetupComplete(true)} />);
  }

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        demoUsers={demoUsers}
        form={loginForm}
        onFormChange={(field, value) => setLoginForm((current) => ({ ...current, [field]: value }))}
        onSubmit={handleLogin}
        onQuickLogin={quickLogin}
        error={loginError}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: T.font, letterSpacing: "-0.01em" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at 12% 18%, rgba(15, 143, 102, 0.08), transparent 24%), radial-gradient(circle at 88% 12%, rgba(215, 93, 66, 0.07), transparent 26%), radial-gradient(circle at 50% 100%, rgba(45, 108, 223, 0.05), transparent 28%)",
          pointerEvents: "none",
        }}
      />
      <ToastStack items={toasts} onDismiss={dismissToast} />

      <div style={{ position: "relative", maxWidth: shellMaxWidth, margin: "0 auto", padding: "clamp(12px, 2vw, 24px)", overflowX: "hidden" }}>
        <div
          style={{
            padding: 16,
            borderRadius: 24,
            background: "rgba(255, 255, 255, 0.62)",
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            backdropFilter: "blur(14px)",
            display: "grid",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #0f8f66, #2d6cdf)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontFamily: T.heading,
                  letterSpacing: "-0.04em",
                }}
              >
                AP
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: T.heading }}>AdPulse</div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>
                  {CALENDAR.monthLabel} | {isDirector ? "full portfolio access" : `${accessibleClients.length} assigned clients`}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginLeft: "auto" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {navItems.map((item) => (
                  <Button key={item.key} onClick={() => setView(item.key)} active={view === item.key}>
                    {item.label}
                  </Button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowProfile((current) => !current)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 18,
                  border: `1px solid ${T.line}`,
                  background: T.surfaceStrong,
                  cursor: "pointer",
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <UserAvatar user={currentUser} size={34} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>{currentUser.name}</div>
                  <div style={{ fontSize: 11, color: T.inkSoft }}>{currentUser.title}</div>
                </div>
              </button>
            </div>
          </div>

          {showProfile ? (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ProfilePanel
                user={currentUser}
                draft={profileDraft}
                onDraftChange={(field, value) => setProfileDraft((current) => ({ ...current, [field]: value }))}
                onSave={saveProfile}
                onClose={() => setShowProfile(false)}
                onLogout={handleLogout}
                assignedClients={currentUserAssignedClients}
              />
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          {view === "overview" ? (
            <>
              <FiltersBar
                search={search}
                onSearch={setSearch}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                onCategoryFilter={setCategoryFilter}
                sortBy={sortBy}
                onSortBy={setSortBy}
                overviewMode={overviewMode}
                onOverviewMode={setOverviewMode}
                showModeToggle
                count={filteredClients.length}
              />
              {filteredClients.length === 0 ? (
                <EmptyState title={clients.length ? "No clients match the current filters" : "No live clients yet"} body={clients.length ? "Try a different search or switch back to all clients." : "Open Client Studio, add a client, then link synced assets to start seeing live data."} />
              ) : overviewMode === "grid" ? (
                <div style={{ display: "grid", gap: 18 }}>
                  {filteredClientGroups.map((group) => (
                    <ReportingGroupSection key={group.id} group={group}>
                      <div style={{ display: "grid", gridTemplateColumns: overviewColumns, gap: 18 }}>
                        {group.clients.map((client) => (
                          <OverviewCard key={client.id} client={client} users={accountUsers} onOpenAccounts={() => jumpToAccounts(client.id)} onEdit={() => jumpToStudio(client.id)} onResolveIssue={resolveClientIssue} />
                        ))}
                      </div>
                    </ReportingGroupSection>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {filteredClientGroups.map((group) => (
                    <ReportingGroupSection key={group.id} group={group}>
                      <div style={{ display: "grid", gap: 16 }}>
                        {group.clients.map((client) => (
                          <OverviewRow key={client.id} client={client} users={accountUsers} onOpenAccounts={() => jumpToAccounts(client.id)} onEdit={() => jumpToStudio(client.id)} onResolveIssue={resolveClientIssue} />
                        ))}
                      </div>
                    </ReportingGroupSection>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {view === "accounts" ? (
            <>
              <FiltersBar
                search={search}
                onSearch={setSearch}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                onCategoryFilter={setCategoryFilter}
                sortBy={sortBy}
                onSortBy={setSortBy}
                overviewMode={overviewMode}
                onOverviewMode={setOverviewMode}
                showModeToggle={false}
                count={filteredClients.length}
              />
              <AccountDateRangeControl value={accountsDateRange} onChange={setAccountsDateRange} />
              <div style={{ display: "grid", gap: 18 }}>
                {filteredClients.length ? filteredClientGroups.map((group) => (
                  <ReportingGroupSection key={group.id} group={group}>
                    <div style={{ display: "grid", gap: 18 }}>
                      {group.clients.map((client) => (
                        <AccountStack
                          key={client.id}
                          client={client}
                          users={accountUsers}
                          open={openMap}
                          setOpen={setOpenMap}
                          campaigns={client.campaigns}
                          ads={client.ads}
                          dateRangeLabel={reportDateRangeLabel}
                          aiReady={aiConfigured}
                          onOpenConnections={isDirector ? () => setView("connections") : null}
                          onResolveIssue={resolveClientIssue}
                        />
                      ))}
                    </div>
                  </ReportingGroupSection>
                )) : (
                  <EmptyState title="No live clients yet" body="Open Client Studio, add a client, then link synced ad accounts to populate this screen." />
                )}
              </div>
            </>
          ) : null}

          {view === "search_terms" ? (
            <SearchTermsWorkbench
              clients={enriched}
              providerProfiles={providerProfiles}
              loading={integrationState.loading}
              error={integrationState.error}
              aiReady={aiConfigured}
              onOpenConnections={isDirector ? () => setView("connections") : null}
            />
          ) : null}

          {view === "analytics" ? (
            <div style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  padding: 20,
                  borderRadius: 26,
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                  boxShadow: T.shadow,
                  display: "grid",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, fontFamily: T.heading, color: T.ink, letterSpacing: "-0.06em" }}>Analytics workspace</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft, maxWidth: 680, lineHeight: 1.55 }}>
                      Live GA4, traffic mix, journey diagnostics and custom KPI boards in one place. The same date range feeds GA4, account series and report charts.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <ActionCue tone={ga4LiveState.loading ? "info" : ga4LiveState.error ? "danger" : "success"}>
                      {ga4LiveState.loading ? "Syncing analytics" : ga4LiveState.error ? "GA4 sync issue" : "Analytics synced"}
                    </ActionCue>
                    <ActionCue tone={gaVisibleClients.length ? "success" : "warning"}>
                      {gaVisibleClients.length} GA4 client{gaVisibleClients.length === 1 ? "" : "s"}
                    </ActionCue>
                  </div>
                </div>
                <AccountDateRangeControl value={accountsDateRange} onChange={setAccountsDateRange} label="Analytics data range" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: analyticsColumns, gap: 18 }}>
                <div>
                  {gaClient ? (
                    <>
                      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <select
                          value={gaClientId}
                          onChange={(event) => setGaClientId(event.target.value)}
                          style={{
                            width: "100%",
                            maxWidth: 260,
                            boxSizing: "border-box",
                            padding: "12px 13px",
                            borderRadius: 16,
                            border: `1px solid ${T.line}`,
                            background: T.surfaceStrong,
                            color: T.ink,
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: T.font,
                          }}
                        >
                          {gaVisibleClients.map((client) => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                      </div>
                      <AnalyticsCommandCenter client={gaClient} ga4={gaClient.ga4} seriesMap={dashboardSeriesMap} dateRangeLabel={reportDateRangeLabel} liveState={ga4LiveState} />
                    </>
                  ) : (
                    <EmptyState title="No GA4 properties in your access scope" body="Connect GA4 or assign a client with analytics access to this user." />
                  )}
                </div>

                <div
                  style={{
                    padding: 20,
                    borderRadius: 24,
                    background: T.surface,
                    border: `1px solid ${T.line}`,
                    boxShadow: T.shadow,
                    display: "grid",
                    gap: 16,
                    alignSelf: "start",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: T.heading }}>Custom graph builder</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: T.inkSoft }}>
                      Choose a client, a specific account or GA4, then stack the KPIs you want to watch. Saved boards survive refresh.
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ marginBottom: 8, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Quick boards</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {ANALYTICS_CHART_PRESETS.map((preset) => (
                          <Button key={preset.id} onClick={() => addChartPreset(preset)}>
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Client</div>
                      <select
                        value={chartForm.clientId}
                        onChange={(event) => {
                          const nextClientId = event.target.value;
                          const nextAccounts = enriched.find((client) => client.id === nextClientId)?.accounts || [];
                          setChartForm((current) => ({ ...current, clientId: nextClientId, accountId: nextAccounts[0]?.id || "" }));
                        }}
                        style={{
                          width: "100%",
                          padding: "12px 13px",
                          borderRadius: 16,
                          border: `1px solid ${T.line}`,
                          background: T.surfaceStrong,
                          color: T.ink,
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: T.font,
                        }}
                      >
                        {enriched.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Source</div>
                      <select
                        value={chartForm.scope}
                        onChange={(event) => setChartForm((current) => ({ ...current, scope: event.target.value }))}
                        style={{
                          width: "100%",
                          padding: "12px 13px",
                          borderRadius: 16,
                          border: `1px solid ${T.line}`,
                          background: T.surfaceStrong,
                          color: T.ink,
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: T.font,
                        }}
                      >
                        <option value="client">Client summary</option>
                        <option value="account">Specific ad account</option>
                        <option value="ga4">Google Analytics 4</option>
                      </select>
                    </div>

                    {chartForm.scope === "account" ? (
                      <div>
                        <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>Account</div>
                        <select
                          value={chartForm.accountId}
                          onChange={(event) => setChartForm((current) => ({ ...current, accountId: event.target.value }))}
                          style={{
                            width: "100%",
                            padding: "12px 13px",
                            borderRadius: 16,
                            border: `1px solid ${T.line}`,
                            background: T.surfaceStrong,
                            color: T.ink,
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: T.font,
                          }}
                        >
                          {chartAccounts.map((account) => (
                            <option key={account.id} value={account.id}>{PLATFORM_META[account.platform].label} / {account.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div>
                      <div style={{ marginBottom: 6, fontSize: 11, color: T.inkMute, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" }}>KPIs</div>
                      <KpiSelector
                        selected={chartForm.metrics}
                        onChange={(metrics) => setChartForm((current) => ({ ...current, metrics }))}
                        available={chartForm.scope === "ga4" ? ["sessions", "users", "conversions", "revenue"] : ["spend", "clicks", "conversions", "conversionValue", "cpc", "cpm", "roas", "revenue"]}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Button onClick={addChart} tone="primary">Add custom graph</Button>
                      {charts.length ? <Button onClick={() => setCharts([])}>Clear board</Button> : null}
                    </div>
                  </div>
                </div>
              </div>

              {charts.length ? (
                <div style={{ display: "grid", gridTemplateColumns: chartColumns, gap: 18 }}>
                  {charts.map((chart) => (
                    <ChartCard key={chart.id} chart={chart} clients={enriched} accounts={allDashboardAccounts} seriesMap={dashboardSeriesMap} dateRangeLabel={reportDateRangeLabel} onRemove={() => setCharts((current) => current.filter((item) => item.id !== chart.id))} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No custom graphs yet" body="Use the builder above to pin client, account or GA4 KPI graphs." />
              )}
            </div>
          ) : null}

          {view === "reports" ? (
            <ReportCenter
              clients={enriched}
              selectedClientId={reportClientId}
              onSelectClient={setReportClientId}
              seriesMap={dashboardSeriesMap}
              dateRangeLabel={reportDateRangeLabel}
              dateRangeValue={accountsDateRange}
              onDateRangeChange={setAccountsDateRange}
              googleReportState={googleAdsReportState}
              aiReady={aiConfigured}
            />
          ) : null}

          {view === "alerts" ? (
            <div style={{ display: "grid", gridTemplateColumns: alertColumns, gap: 18 }}>
              <AlertLane title="Red lane / needs focus" description={`Clients listed here failed at least one rule. Revenue comparison uses ${CALENDAR.revenueRangeLabel}.`} items={redClients} ok={false} onOpenAccounts={jumpToAccounts} onEdit={jumpToStudio} users={accountUsers} onResolveIssue={resolveClientIssue} />
              <AlertLane title="Green lane / all clear" description="Clients listed here passed all active alert rules, so you can safely focus elsewhere." items={greenClients} ok onOpenAccounts={jumpToAccounts} onEdit={jumpToStudio} users={accountUsers} onResolveIssue={resolveClientIssue} />
            </div>
          ) : null}

          {view === "studio" ? (
            <ClientStudio clients={enriched} accounts={allDashboardAccounts} users={users} providerProfiles={providerProfiles} selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId} draft={studioDraft} setDraft={setStudioDraft} onSave={saveStudioDraft} onCreateClient={createClient} onDeleteClient={deleteDashboardClient} layoutColumns={studioColumns} canManageAssignments={isDirector} canEditCoreSettings={isDirector} onOpenConnections={() => setView("connections")} state={clientDirectoryState} />
          ) : null}

          {view === "users" ? (
            <UserAdminPanel
              users={users}
              clients={clients}
              currentUserId={currentUserId}
              state={userDirectoryState}
              onCreateUser={createDashboardUser}
              onUpdateUser={saveDashboardUser}
              onDeleteUser={deleteDashboardUser}
            />
          ) : null}

          {view === "connections" ? (
            <IntegrationHub
              providerProfiles={providerProfiles}
              clients={clients}
              configured={integrationState.configured}
              loading={integrationState.loading}
              error={integrationState.error}
              busyMap={integrationBusy}
              onConnect={connectProviderProfile}
              onSync={syncProviderProfile}
              onDisconnect={disconnectProviderProfile}
              layoutColumns={integrationColumns}
              setupStatus={setupStatus}
              aiForm={aiSetupForm}
              onAiFormChange={(field, value) => {
                setAiSetupForm((current) => ({ ...current, [field]: value }));
                setAiSetupState((current) => ({ ...current, error: "", success: "" }));
              }}
              onSaveAiConfig={saveAiSetup}
              aiSetupState={aiSetupState}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
