import { Injectable } from "@angular/core";

const API_BASE = "/api";

@Injectable({ providedIn: "root" })
export class IntegrationApiService {
  getProviderStartUrl(platform: string): string {
    return `${API_BASE}/auth/${platform}/start`;
  }

  fetchIntegrationSnapshot(): Promise<any> {
    return this.request("/integrations");
  }

  fetchUsers(): Promise<any> {
    return this.request("/users");
  }

  fetchClients(): Promise<any> {
    return this.request("/clients");
  }

  loginUser(payload: any): Promise<any> {
    return this.request("/users/login", this.jsonOptions("POST", payload));
  }

  createUser(payload: any): Promise<any> {
    return this.request("/users", this.jsonOptions("POST", payload));
  }

  updateUser(userId: string, payload: any): Promise<any> {
    return this.request(`/users/${encodeURIComponent(userId)}`, this.jsonOptions("PATCH", payload));
  }

  deleteUser(userId: string): Promise<any> {
    return this.request(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  }

  saveClientRecord(clientId: string, payload: any): Promise<any> {
    return this.request(`/clients/${encodeURIComponent(clientId)}`, this.jsonOptions("PUT", payload));
  }

  deleteClientRecord(clientId: string): Promise<any> {
    return this.request(`/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" });
  }

  syncIntegrationProfile(profileId: string): Promise<any> {
    return this.request(`/integrations/${encodeURIComponent(profileId)}/sync`, { method: "POST" });
  }

  disconnectIntegrationProfile(profileId: string): Promise<any> {
    return this.request(`/integrations/${encodeURIComponent(profileId)}`, { method: "DELETE" });
  }

  fetchSetupStatus(): Promise<any> {
    return this.request("/setup");
  }

  saveSetupCredentials(credentials: any): Promise<any> {
    return this.request("/setup", this.jsonOptions("POST", credentials));
  }

  fetchSearchTermHierarchy(connectionId: string, params: any): Promise<any> {
    return this.request(withQuery(`/search-terms/${encodeURIComponent(connectionId)}/hierarchy`, params));
  }

  fetchSearchTerms(connectionId: string, params: any): Promise<any> {
    return this.request(withQuery(`/search-terms/${encodeURIComponent(connectionId)}`, params));
  }

  fetchGoogleAdsLiveOverview(payload: any): Promise<any> {
    return this.request("/google-ads/live-overview", this.jsonOptions("POST", payload));
  }

  fetchGoogleAdsReportDetails(payload: any): Promise<any> {
    return this.request("/google-ads/report-details", this.jsonOptions("POST", payload));
  }

  fetchMetaAdsLiveOverview(payload: any): Promise<any> {
    return this.request("/meta-ads/live-overview", this.jsonOptions("POST", payload));
  }

  fetchTikTokAdsLiveOverview(payload: any): Promise<any> {
    return this.request("/tiktok-ads/live-overview", this.jsonOptions("POST", payload));
  }

  fetchGa4LiveOverview(payload: any): Promise<any> {
    return this.request("/ga4/live-overview", this.jsonOptions("POST", payload));
  }

  fetchAiStrategy(payload: any): Promise<any> {
    return this.request("/ai/strategy", this.jsonOptions("POST", payload));
  }

  chatWithAiStrategist(payload: any): Promise<any> {
    return this.request("/ai/strategy/chat", this.jsonOptions("POST", payload));
  }

  fetchSearchTermTags(params: any): Promise<any> {
    return this.request(withQuery("/search-terms/tags", params));
  }

  saveSearchTermTag(payload: any): Promise<any> {
    return this.request("/search-terms/tags", this.jsonOptions("POST", payload));
  }

  fetchReportWidgets(clientId: string): Promise<any> {
    return this.request(`/report-widgets/${encodeURIComponent(clientId)}`);
  }

  saveReportWidgets(clientId: string, widgets: any[]): Promise<any> {
    return this.request(
      `/report-widgets/${encodeURIComponent(clientId)}`,
      this.jsonOptions("PUT", { widgets }),
    );
  }

  private jsonOptions(method: string, payload: any): RequestInit {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
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
}

function withQuery(path: string, params: any = {}): string {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
