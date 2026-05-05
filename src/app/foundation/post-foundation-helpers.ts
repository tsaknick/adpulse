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
