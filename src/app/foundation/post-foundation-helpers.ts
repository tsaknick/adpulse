// Helpers and constants that live AFTER the first React component in adpulse-v5.jsx.
// Ported as plain TS so primitives & screens can share them.
// @ts-nocheck
/* eslint-disable */

import {
  PLATFORM_META,
  T,
  formatCurrency,
  formatMetric,
  formatNumber,
  formatPercent,
  getClientTargetMode,
  isStoppedCampaign,
  normalizeClientTarget,
} from "./adpulse-foundation";

export function formatInlineList(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function getClientLinkedPlatforms(client) {
  return Object.entries(client?.linkedAssetCounts || {})
    .filter(([, count]) => count > 0)
    .map(([platform]) => platform);
}

export function getClientSummaryText(client, { includeAds = false } = {}) {
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

export function getClientLiveDataMessage(client) {
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

export function getReportingGroupLabel(client) {
  return String(client?.reportingGroup || client?.name || "Ungrouped").trim() || "Ungrouped";
}

export function groupClientsByReportingGroup(clients) {
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

export function getOverviewClientKpis(client, { compactLabels = false } = {}) {
  const normalizedTarget = normalizeClientTarget(client?.focus);
  const normalizedLower = normalizedTarget.toLowerCase();
  const targetMode = normalizedLower === "leads" ? "traffic" : getClientTargetMode(normalizedTarget);
  const budgetLabel = compactLabels ? "Budget" : "Monthly Budget";
  const spendLabel = compactLabels ? "Spend" : "Spend MTD";
  const spend = Number(client?.spend) || 0;
  const impressions = Number(client?.impressions) || 0;
  const clicks = Number(client?.clicks) || 0;
  const conversions = Number(client?.conversions) || 0;
  const conversionValue = Number(client?.conversionValue) || 0;
  const ga4Revenue = Number(client?.ga4?.revenueCurrentPeriod) || 0;
  const ctr = Number(client?.ctr) || 0;
  const cpc = Number(client?.cpc) || 0;
  const roas = Number(client?.roas) || 0;
  const cpm = impressions > 0 ? spend / impressions * 1000 : 0;
  const costPerConversion = conversions > 0 ? spend / conversions : 0;
  const base = [
    { label: budgetLabel, value: formatCurrency(client?.totalBudget || 0) },
    { label: spendLabel, value: formatCurrency(spend) },
  ];

  if (targetMode === "awareness") {
    return [
      ...base,
      { label: "Impressions", value: formatNumber(impressions) },
      { label: "CPM", value: formatMetric("cpm", cpm) },
      { label: "CTR", value: formatPercent(ctr) },
    ];
  }

  if (targetMode === "traffic") {
    return [
      ...base,
      { label: "Clicks", value: formatNumber(clicks) },
      { label: "CPC", value: formatMetric("cpc", cpc) },
      { label: "CTR", value: formatPercent(ctr) },
    ];
  }

  if (targetMode === "revenue") {
    const valueLabel = ga4Revenue > 0 ? "Revenue" : "Conv. Value";
    const valueAmount = ga4Revenue > 0 ? ga4Revenue : conversionValue;

    return [
      ...base,
      { label: valueLabel, value: formatCurrency(valueAmount) },
      { label: "ROAS", value: formatMetric("roas", roas), accent: roas >= 3 ? T.accent : T.coral },
      { label: "Conversions", value: formatNumber(conversions) },
    ];
  }

  const conversionLabel = normalizedLower === "app installs"
    ? "Installs"
    : normalizedLower === "store visits"
      ? "Visits"
      : "Conversions";

  return [
    ...base,
    { label: conversionLabel, value: formatNumber(conversions) },
    { label: "CPA", value: conversions > 0 ? formatMetric("cpc", costPerConversion) : "No data" },
    { label: "CTR", value: formatPercent(ctr) },
  ];
}

export function getSearchTermScoreTone(score) {
  if (score >= 70) return "positive";
  if (score <= 34) return "danger";
  return "warning";
}

export function getLiveDataNotice(item) {
  if (item?.dataStatus === "error" || (!item?.dataStatus && item?.dataError)) {
    return { tone: "warning", label: "Live data warning", color: T.coral };
  }

  if (item?.dataStatus === "partial") {
    return { tone: "neutral", label: "Partial live data", color: T.inkSoft };
  }

  return null;
}

export function formatConnectedAssetSummary(platform, asset) {
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

export const CAMPAIGN_STATUS_FILTERS = [
  { id: "active", label: "Active Only", emptyTitle: "No active campaigns", emptyBody: "This client has no active or learning campaigns in the current account stack." },
  { id: "stopped", label: "Stopped", emptyTitle: "No stopped campaigns", emptyBody: "This client has no stopped campaigns in the current account stack." },
  { id: "all", label: "All", emptyTitle: "No campaigns", emptyBody: "Connect ad accounts or sync live campaigns to populate this client stack." },
];

export function campaignMatchesStatusFilter(campaign, filter) {
  if (filter === "active") return !isStoppedCampaign(campaign);
  if (filter === "stopped") return isStoppedCampaign(campaign);
  return true;
}

export function summarizeSeriesMetric(series, metricKey) {
  if (!series || !Array.isArray(series.points)) return 0;
  return series.points.reduce((sum, point) => sum + (Number(point?.[metricKey]) || 0), 0);
}

export function comparePeriodSeries(currentSeries, previousSeries, metricKey) {
  const current = summarizeSeriesMetric(currentSeries, metricKey);
  const previous = summarizeSeriesMetric(previousSeries, metricKey);
  if (!previous) return { current, previous, delta: 0 };
  return {
    current,
    previous,
    delta: ((current - previous) / previous) * 100,
  };
}

export function getAdsGa4ValueComparison(client, ga4) {
  const current = Number(ga4?.revenueCurrentPeriod) || 0;
  const previous = Number(ga4?.revenueLastYearPeriod) || 0;
  if (!previous) return null;
  return {
    current,
    previous,
    delta: ((current - previous) / previous) * 100,
  };
}

// ── Report helpers (ported from adpulse-v5.jsx ~line 5796) ──────────────
import { DEFAULT_REPORT_SECTION_IDS, REPORT_SECTION_OPTIONS } from "./adpulse-foundation";

export function summarizeReportMetrics(items) {
  const spend = items.reduce((acc, item) => acc + (Number(item.spend) || 0), 0);
  const impressions = items.reduce((acc, item) => acc + (Number(item.impressions) || 0), 0);
  const clicks = items.reduce((acc, item) => acc + (Number(item.clicks) || 0), 0);
  const conversions = items.reduce((acc, item) => acc + (Number(item.conversions) || 0), 0);
  const conversionValue = items.reduce((acc, item) => {
    const v = Number(item.conversionValue);
    if (Number.isFinite(v) && v > 0) return acc + v;
    const s = Number(item.spend) || 0;
    const r = Number(item.roas) || 0;
    return acc + (s > 0 && r > 0 ? s * r : 0);
  }, 0);
  return {
    spend, impressions, clicks, conversions, conversionValue,
    ctr: impressions ? clicks / impressions * 100 : 0,
    cpc: clicks ? spend / clicks : 0,
    costPerConversion: conversions ? spend / conversions : 0,
    roas: spend ? conversionValue / spend : 0,
  };
}

export function formatReportCurrency(value, digits = 2) {
  return `EUR ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
export function formatReportNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function formatReportPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export function buildChartTicks(max, steps = 4, fixedMax = null) {
  const safeMax = fixedMax == null ? Math.max(Number(max) || 0, 1) : Math.max(Number(fixedMax) || 0, 1);
  const digits = safeMax <= 5 ? 2 : safeMax <= 25 ? 1 : 0;
  return Array.from({ length: steps + 1 }, (_, i) => +(safeMax * i / steps).toFixed(digits));
}

export function formatChartAxisValue(value, axisType = "number") {
  const numeric = Number(value || 0);
  if (axisType === "currency") return formatReportCurrency(numeric, Math.abs(numeric) >= 100 ? 0 : 2);
  if (axisType === "percent") return `${numeric.toFixed(Math.abs(numeric) >= 10 ? 0 : 1)}%`;
  return formatReportNumber(numeric, Math.abs(numeric) < 10 ? 1 : 0);
}

export function getSeriesAxisLabels(series) {
  const items = Array.isArray(series) ? series : [];
  if (!items.length) return [];
  const indices = Array.from(new Set([0, Math.floor((items.length - 1) / 2), items.length - 1]));
  return indices.map((index) => ({
    index,
    label: String(items[index]?.label || items[index]?.date || `Point ${index + 1}`),
  }));
}

export function getPlatformReportSeries(client, platform, seriesMap = {}) {
  const merged = new Map();
  (client?.accounts || [])
    .filter((account) => account.platform === platform)
    .forEach((account) => {
      const accountSeries = Array.isArray(account.series) && account.series.length
        ? account.series
        : (seriesMap[`account:${account.id}`] || []);
      accountSeries.forEach((point, index) => {
        const key = String(point?.date || point?.label || `point-${index}`);
        const current = merged.get(key) || {
          date: point?.date || "",
          label: point?.label || point?.date || "",
          spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionValue: 0, revenue: 0,
        };
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
  return rows.every((p) => p.date) ? rows.sort((l, r) => String(l.date).localeCompare(String(r.date))) : rows;
}

export function getGoogleGeographyEmptyLabel(errorMessage) {
  const message = String(errorMessage || "").trim();
  if (!message) return "No geographic rows were returned by Google Ads for the selected account and date range.";
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
    .sort((l, r) => (Number(r[sorterField]) || 0) - (Number(l[sorterField]) || 0));
}

export function aggregateGoogleReportDetails(details, clientId) {
  const clientDetails = (details || []).filter((d) => d.clientId === clientId);
  const devices = aggregateReportRows(
    clientDetails.flatMap((d) => d.devices || []),
    "device", ["impressions", "clicks", "cost", "conversions", "conversionValue"], "impressions",
  );
  const geographies = aggregateReportRows(
    clientDetails.flatMap((d) => d.geographies || []),
    "location", ["clicks", "cost", "conversions", "conversionValue", "sessions", "users", "keyEvents", "revenue"], "conversions",
  );
  const keywords = aggregateReportRows(
    clientDetails.flatMap((d) => d.keywords || []),
    "keyword", ["impressions", "clicks", "cost", "conversions", "conversionValue"], "clicks",
  );
  const impressionShare = aggregateImpressionShareRows(clientDetails.flatMap((d) => d.impressionShare || []));
  return {
    devices, geographies, keywords, impressionShare,
    errors: clientDetails.map((d) => d.dataError).filter(Boolean),
  };
}

export function aggregateImpressionShareRows(rows) {
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
    .sort((l, r) => String(l.date).localeCompare(String(r.date)));
}

export function getReportCampaignScore(campaign) {
  const spend = Number(campaign?.spend) || 0;
  const conversions = Number(campaign?.conversions) || 0;
  const cv = Number(campaign?.conversionValue);
  const roas = spend ? (Number.isFinite(cv) && cv > 0 ? cv : (Number(campaign.roas) || 0) * spend) / spend : 0;
  return roas * 100 + conversions * 8 + (cv > 0 ? 10 : 0);
}
export function getReportTopCampaigns(campaigns, limit = 4) {
  return [...(campaigns || [])]
    .sort((l, r) => getReportCampaignScore(r) - getReportCampaignScore(l) || (Number(r.spend) || 0) - (Number(l.spend) || 0))
    .slice(0, limit);
}
export function getReportConcernCampaigns(campaigns, limit = 4) {
  return [...(campaigns || [])]
    .filter((c) => (Number(c.spend) || 0) > 0)
    .sort((l, r) => getReportCampaignScore(l) - getReportCampaignScore(r))
    .slice(0, limit);
}

export function chunkReportItems(items, size) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

export function formatMetaPreviewCta(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Shop now";
  return normalized.toLowerCase().split("_").filter(Boolean)
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1)).join(" ");
}

export function normalizeReportSectionIds(value, fallback = DEFAULT_REPORT_SECTION_IDS) {
  const allowed = new Set(REPORT_SECTION_OPTIONS.map((s) => s.id));
  const source = Array.isArray(value) && value.length ? value : fallback;
  const normalized = source.filter((id) => allowed.has(id));
  return normalized.length ? normalized : [...fallback];
}
