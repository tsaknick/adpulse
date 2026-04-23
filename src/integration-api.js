const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function withQuery(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return { error: text };
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload;
}

export function getProviderStartUrl(platform) {
  return `${API_BASE}/auth/${platform}/start`;
}

export function fetchIntegrationSnapshot() {
  return request("/integrations");
}

export function syncIntegrationProfile(profileId) {
  return request(`/integrations/${profileId}/sync`, {
    method: "POST",
  });
}

export function disconnectIntegrationProfile(profileId) {
  return request(`/integrations/${profileId}`, {
    method: "DELETE",
  });
}

export function fetchSetupStatus() {
  return request("/setup");
}

export function saveSetupCredentials(credentials) {
  return request("/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
}

export function fetchSearchTermHierarchy(connectionId, params) {
  return request(withQuery(`/search-terms/${connectionId}/hierarchy`, params));
}

export function fetchSearchTerms(connectionId, params) {
  return request(withQuery(`/search-terms/${connectionId}`, params));
}

export function fetchGoogleAdsLiveOverview(payload) {
  return request("/google-ads/live-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchMetaAdsLiveOverview(payload) {
  return request("/meta-ads/live-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchGa4LiveOverview(payload) {
  return request("/ga4/live-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchSearchTermTags(params) {
  return request(withQuery("/search-terms/tags", params));
}

export function saveSearchTermTag(payload) {
  return request("/search-terms/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
