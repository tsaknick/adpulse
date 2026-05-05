// SearchTermsWorkbench — substantive port of React component (8673-9810).
// v1 includes cascading selectors, summary KPIs, sortable terms table with
// manual tag dropdown, suggested negatives + keyword opportunities tabs.
// AI strategist chat panel TBD in a follow-up.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import {
  PLATFORM_META,
  SEARCH_TERM_ACTION_META,
  SEARCH_TERM_DATE_RANGE_OPTIONS,
  SEARCH_TERM_TAG_META,
  T,
  average,
  buildSearchTermBenchmarks,
  deriveSearchTermAutoTag,
  deriveSearchTermEvaluation,
  extractKeywordOpportunities,
  extractSuggestedNegatives,
  fitCols,
  formatCurrency,
  formatMetric,
  formatNumber,
  formatPercent,
  isInactiveSearchTerm,
  matchesSearchTermStatusFilter,
  normalizeClientTarget,
  normalizeSearchTermKey,
  normalizeSearchTermRules,
  sortSearchTermRows,
} from "../foundation/adpulse-foundation";
import { getSearchTermScoreTone } from "../foundation/post-foundation-helpers";
import { IntegrationApiService } from "../integration-api.service";
import {
  ActionCueComponent,
  AppButtonComponent,
  EmptyStateComponent,
  MetricTileComponent,
  PlatformChipComponent,
  ToneBadgeComponent,
} from "./primitives";

@Component({
  selector: "app-search-terms-workbench",
  standalone: true,
  imports: [
    CommonModule,
    ActionCueComponent,
    AppButtonComponent,
    EmptyStateComponent,
    MetricTileComponent,
    PlatformChipComponent,
    ToneBadgeComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="panelStyle">
        <div [ngStyle]="headRowStyle">
          <div>
            <app-platform-chip platform="google_ads"></app-platform-chip>
            <div [ngStyle]="titleStyle">Google search terms workbench</div>
            <div [ngStyle]="leadStyle">
              Pick a campaign and ad group to load live search-term insights, then mark good/bad terms or pull suggested negatives.
            </div>
          </div>
          <app-action-cue tone="info">{{ aiReady ? 'AI strategist available' : 'Connect Anthropic to enable AI strategist' }}</app-action-cue>
        </div>

        <div *ngIf="!searchableClients.length" [ngStyle]="emptyStyle">
          <div [ngStyle]="emptyTitleStyle">No Google Ads clients linked</div>
          <div [ngStyle]="emptyBodyStyle">
            Connect a Google Ads login in the Connections tab and assign accounts in Client Studio to enable this workbench.
          </div>
          <div *ngIf="onOpenConnectionsAvailable">
            <app-button tone="primary" (pressed)="openConnections.emit()">Open Connections</app-button>
          </div>
        </div>

        <div *ngIf="searchableClients.length" [ngStyle]="selectorGridStyle">
          <div>
            <div [ngStyle]="labelStyle">Client</div>
            <select [value]="selection.clientId" (change)="onClientChange($any($event.target).value)" [ngStyle]="selectStyle">
              <option *ngFor="let client of searchableClients" [value]="client.id">{{ client.name }}</option>
            </select>
          </div>
          <div>
            <div [ngStyle]="labelStyle">Account</div>
            <select
              [value]="selection.accountAssetId"
              (change)="onAccountChange($any($event.target).value)"
              [disabled]="!availableAccounts.length"
              [ngStyle]="selectStyle"
            >
              <option *ngFor="let account of availableAccounts" [value]="account.id">{{ account.name }}</option>
            </select>
          </div>
          <div>
            <div [ngStyle]="labelStyle">Date range</div>
            <select [value]="selection.dateRange" (change)="onDateRangeChange($any($event.target).value)" [ngStyle]="selectStyle">
              <option *ngFor="let option of dateRangeOptions" [value]="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <div [ngStyle]="labelStyle">Campaign</div>
            <select
              [value]="selection.campaignId"
              (change)="onCampaignChange($any($event.target).value)"
              [disabled]="!campaignState.items.length"
              [ngStyle]="selectStyle"
            >
              <option value="">{{ campaignState.loading ? 'Loading…' : 'Select campaign' }}</option>
              <option *ngFor="let campaign of campaignState.items" [value]="campaign.id">{{ campaign.name }}</option>
            </select>
          </div>
          <div *ngIf="!isPerformanceMax">
            <div [ngStyle]="labelStyle">Ad group</div>
            <select
              [value]="selection.adGroupId"
              (change)="onAdGroupChange($any($event.target).value)"
              [disabled]="!adGroupState.items.length"
              [ngStyle]="selectStyle"
            >
              <option value="">{{ adGroupState.loading ? 'Loading…' : 'Select ad group' }}</option>
              <option *ngFor="let adGroup of adGroupState.items" [value]="adGroup.id">{{ adGroup.name }}</option>
            </select>
          </div>
          <div *ngIf="isPerformanceMax">
            <div [ngStyle]="labelStyle">Scope</div>
            <app-tone-badge tone="neutral">Performance Max — campaign-level only</app-tone-badge>
          </div>
        </div>

        <div *ngIf="campaignState.error" [ngStyle]="errorStyle">{{ campaignState.error }}</div>
        <div *ngIf="adGroupState.error" [ngStyle]="errorStyle">{{ adGroupState.error }}</div>
        <div *ngIf="termsState.error" [ngStyle]="errorStyle">{{ termsState.error }}</div>
      </div>

      <div *ngIf="evaluatedTerms.length" [ngStyle]="kpiRowStyle">
        <app-metric-tile label="Loaded terms" [value]="summary.totalTerms" [subValue]="summary.activeTerms + ' active'"></app-metric-tile>
        <app-metric-tile label="Good" [value]="summary.goodCount" [accent]="summary.goodCount ? T.accent : null"></app-metric-tile>
        <app-metric-tile label="Bad" [value]="summary.badCount" [accent]="summary.badCount ? T.coral : null"></app-metric-tile>
        <app-metric-tile label="Neutral" [value]="summary.neutralCount"></app-metric-tile>
        <app-metric-tile label="Untagged" [value]="summary.untaggedCount"></app-metric-tile>
        <app-metric-tile label="Wasted spend" [value]="formatCurrency(summary.wastedSpend)" [accent]="summary.wastedSpend ? T.coral : null"></app-metric-tile>
      </div>

      <div *ngIf="evaluatedTerms.length" [ngStyle]="panelStyle">
        <div [ngStyle]="filterRowStyle">
          <div [ngStyle]="filterPillRowStyle">
            <app-button *ngFor="let f of statusFilters" [active]="termStatusFilter === f.id" (pressed)="termStatusFilter = f.id">{{ f.label }}</app-button>
          </div>
          <div [ngStyle]="filterPillRowStyle">
            <app-button *ngFor="let f of tagFilters" [active]="tagFilter === f.id" (pressed)="tagFilter = f.id">{{ f.label }}</app-button>
          </div>
          <div [ngStyle]="filterPillRowStyle">
            <app-button [active]="reviewPanel === 'table'" (pressed)="reviewPanel = 'table'">Terms table</app-button>
            <app-button [active]="reviewPanel === 'negatives'" (pressed)="reviewPanel = 'negatives'">Suggested negatives</app-button>
            <app-button [active]="reviewPanel === 'opportunities'" (pressed)="reviewPanel = 'opportunities'">Keyword opportunities</app-button>
          </div>
        </div>

        <ng-container *ngIf="reviewPanel === 'table'">
          <div [ngStyle]="tableWrapStyle">
            <table [ngStyle]="tableStyle">
              <thead>
                <tr [ngStyle]="theadRowStyle">
                  <th [ngStyle]="thStyle" (click)="setSort('searchTerm')">Search term {{ sortIndicator('searchTerm') }}</th>
                  <th [ngStyle]="thStyle" (click)="setSort('cost')">Cost {{ sortIndicator('cost') }}</th>
                  <th [ngStyle]="thStyle" (click)="setSort('clicks')">Clicks {{ sortIndicator('clicks') }}</th>
                  <th [ngStyle]="thStyle" (click)="setSort('impressions')">Impr {{ sortIndicator('impressions') }}</th>
                  <th [ngStyle]="thStyle" (click)="setSort('conversions')">Conv {{ sortIndicator('conversions') }}</th>
                  <th [ngStyle]="thStyle" (click)="setSort('ctr')">CTR {{ sortIndicator('ctr') }}</th>
                  <th [ngStyle]="thStyle" (click)="setSort('performanceScore')">Score {{ sortIndicator('performanceScore') }}</th>
                  <th [ngStyle]="thStyle" (click)="setSort('recommendedAction')">Action {{ sortIndicator('recommendedAction') }}</th>
                  <th [ngStyle]="thStyle">Tag</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let term of sortedTerms; trackBy: trackByTerm" [ngStyle]="trStyle(term)">
                  <td [ngStyle]="termCellStyle">
                    <div [ngStyle]="termPrimaryStyle">{{ term.searchTerm }}</div>
                    <div [ngStyle]="termMetaStyle">
                      Keyword: {{ term.keywordText || '—' }} | match {{ term.matchType || '—' }}
                    </div>
                  </td>
                  <td [ngStyle]="cellStyle">{{ formatCurrency(term.cost || 0) }}</td>
                  <td [ngStyle]="cellStyle">{{ formatNumber(term.clicks || 0) }}</td>
                  <td [ngStyle]="cellStyle">{{ formatNumber(term.impressions || 0) }}</td>
                  <td [ngStyle]="cellStyle">{{ formatNumber(term.conversions || 0) }}</td>
                  <td [ngStyle]="cellStyle">{{ formatPercent(term.ctr || 0) }}</td>
                  <td [ngStyle]="cellStyle">
                    <app-tone-badge [tone]="scoreTone(term.performanceScore)">
                      {{ term.performanceScore || 0 }}/100
                    </app-tone-badge>
                  </td>
                  <td [ngStyle]="cellStyle">
                    <app-tone-badge [tone]="actionTone(term.recommendedAction)">{{ actionLabel(term.recommendedAction) }}</app-tone-badge>
                  </td>
                  <td [ngStyle]="cellStyle">
                    <select
                      [value]="term.manualTag || ''"
                      (change)="onTagChange(term, $any($event.target).value)"
                      [disabled]="!!tagBusyMap[normalizeKey(term.searchTerm)]"
                      [ngStyle]="tagSelectStyle"
                    >
                      <option value="">—</option>
                      <option value="good">Good</option>
                      <option value="bad">Bad</option>
                      <option value="neutral">Neutral</option>
                    </select>
                    <div *ngIf="term.tagSource" [ngStyle]="tagSourceStyle">{{ term.tagSource === 'manual' ? 'Manual' : 'Auto' }}</div>
                  </td>
                </tr>
                <tr *ngIf="!sortedTerms.length">
                  <td [ngStyle]="emptyTableCellStyle" colspan="9">No terms match the current filters.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>

        <ng-container *ngIf="reviewPanel === 'negatives'">
          <div [ngStyle]="listGridStyle">
            <app-empty-state *ngIf="!suggestedNegatives.length" title="No suggested negatives" body="Tag some terms as bad or wait for the auto rules to flag spend without conversions."></app-empty-state>
            <div *ngFor="let item of suggestedNegatives" [ngStyle]="negativeCardStyle">
              <div [ngStyle]="negativeWordStyle">{{ item.word }}</div>
              <div [ngStyle]="negativeMetaStyle">
                {{ item.termCount }} terms | {{ formatCurrency(item.wastedSpend) }} wasted spend
              </div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngIf="reviewPanel === 'opportunities'">
          <div [ngStyle]="listGridStyle">
            <app-empty-state *ngIf="!keywordOpportunities.length" title="No keyword opportunities yet" body="Need a few converting terms with strong CTR before opportunities surface."></app-empty-state>
            <div *ngFor="let opp of keywordOpportunities" [ngStyle]="opportunityCardStyle">
              <div [ngStyle]="opportunityHeadStyle">
                <div [ngStyle]="opportunityWordStyle">{{ opp.searchTerm }}</div>
                <app-tone-badge tone="positive">{{ opp.priority }}</app-tone-badge>
              </div>
              <div [ngStyle]="opportunityMetaStyle">
                {{ opp.suggestedMatchType }} match | {{ formatNumber(opp.clicks) }} clicks | {{ formatNumber(opp.conversions) }} conv | score {{ opp.performanceScore }}
              </div>
              <div [ngStyle]="opportunityReasonStyle">{{ opp.reason }}</div>
            </div>
          </div>
        </ng-container>
      </div>

      <div *ngIf="termsState.loading" [ngStyle]="loadingStyle">Loading terms…</div>
    </div>
  `,
})
export class SearchTermsWorkbenchComponent implements OnChanges {
  @Input() clients: any[] = [];
  @Input() providerProfiles: any[] = [];
  @Input() loading = false;
  @Input() error = "";
  @Input() aiReady = false;
  @Input() onOpenConnectionsAvailable = false;

  @Output() openConnections = new EventEmitter<void>();

  selection: any = { clientId: "", accountAssetId: "", campaignId: "", adGroupId: "", dateRange: "LAST_30_DAYS" };
  campaignState: any = { items: [], loading: false, error: "" };
  adGroupState: any = { items: [], loading: false, error: "" };
  termsState: any = { items: [], tags: [], loading: false, error: "", note: "" };
  tagFilter: "all" | "good" | "bad" | "neutral" | "untagged" = "all";
  termStatusFilter: "active" | "inactive" | "all" = "active";
  reviewPanel: "table" | "negatives" | "opportunities" = "table";
  sort: { key: string; direction: "asc" | "desc" } = { key: "cost", direction: "desc" };
  tagBusyMap: Record<string, boolean> = {};

  readonly dateRangeOptions = SEARCH_TERM_DATE_RANGE_OPTIONS;
  readonly statusFilters = [
    { id: "active", label: "Active only" },
    { id: "inactive", label: "Inactive" },
    { id: "all", label: "All" },
  ];
  readonly tagFilters = [
    { id: "all", label: "All tags" },
    { id: "good", label: "Good" },
    { id: "bad", label: "Bad" },
    { id: "neutral", label: "Neutral" },
    { id: "untagged", label: "Untagged" },
  ];

  formatCurrency = formatCurrency;
  formatNumber = formatNumber;
  formatMetric = formatMetric;
  formatPercent = formatPercent;
  T = T;

  constructor(private api: IntegrationApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes["clients"] || changes["providerProfiles"]) {
      const candidates = this.searchableClients;
      if (candidates.length && !candidates.some((c) => c.id === this.selection.clientId)) {
        this.selection = { ...this.selection, clientId: candidates[0].id };
        this.refreshAccountSelection();
      }
    }
  }

  // ── Derived selection state ────────────────────────────────────────
  get googleAssetMap(): Map<string, any> {
    const map = new Map();
    (this.providerProfiles || [])
      .filter((p) => p.platform === "google_ads")
      .forEach((profile) => {
        (profile.assets || []).forEach((asset: any) => {
          map.set(asset.id, { ...asset, connectionId: profile.id, connectionName: profile.name, connectionStatus: profile.status });
        });
      });
    return map;
  }

  get searchableClients(): any[] {
    const assetMap = this.googleAssetMap;
    return (this.clients || [])
      .map((client) => {
        const assets = (client.linkedAssets?.google_ads || [])
          .map((id: string) => assetMap.get(id))
          .filter((a: any) => a && a.type !== "Manager account")
          .sort((l: any, r: any) => l.name.localeCompare(r.name));
        return { ...client, googleLinkedAssets: assets };
      })
      .filter((c) => c.googleLinkedAssets.length);
  }

  get selectedClient(): any {
    return this.searchableClients.find((c) => c.id === this.selection.clientId) || this.searchableClients[0] || null;
  }
  get availableAccounts(): any[] {
    return this.selectedClient?.googleLinkedAssets || [];
  }
  get selectedAccount(): any {
    return this.availableAccounts.find((a: any) => a.id === this.selection.accountAssetId) || this.availableAccounts[0] || null;
  }
  get selectedCampaign(): any {
    return this.campaignState.items.find((c: any) => c.id === this.selection.campaignId) || this.campaignState.items[0] || null;
  }
  get isPerformanceMax(): boolean {
    return this.selectedCampaign?.channelType === "PERFORMANCE_MAX";
  }
  get selectedAdGroup(): any {
    if (this.isPerformanceMax) return null;
    return this.adGroupState.items.find((g: any) => g.id === this.selection.adGroupId) || this.adGroupState.items[0] || null;
  }
  get scopeLevel(): string {
    return this.isPerformanceMax ? "campaign" : "ad_group";
  }
  get autoTagRules() {
    return normalizeSearchTermRules(this.selectedClient?.category, this.selectedClient?.rules?.searchTerms);
  }

  // ── Selection handlers ─────────────────────────────────────────────
  onClientChange(value: string) {
    this.selection = { ...this.selection, clientId: value, accountAssetId: "", campaignId: "", adGroupId: "" };
    this.refreshAccountSelection();
  }
  onAccountChange(value: string) {
    this.selection = { ...this.selection, accountAssetId: value, campaignId: "", adGroupId: "" };
    this.loadCampaigns();
  }
  onDateRangeChange(value: string) {
    this.selection = { ...this.selection, dateRange: value };
    this.loadCampaigns();
  }
  onCampaignChange(value: string) {
    this.selection = { ...this.selection, campaignId: value, adGroupId: "" };
    this.loadAdGroups();
  }
  onAdGroupChange(value: string) {
    this.selection = { ...this.selection, adGroupId: value };
    this.loadTerms();
  }

  refreshAccountSelection() {
    const next = this.availableAccounts[0]?.id || "";
    this.selection = { ...this.selection, accountAssetId: next, campaignId: "", adGroupId: "" };
    this.loadCampaigns();
  }

  async loadCampaigns() {
    const account = this.selectedAccount;
    if (!account?.connectionId || !account?.externalId) {
      this.campaignState = { items: [], loading: false, error: "" };
      return;
    }
    this.campaignState = { items: [], loading: true, error: "" };
    try {
      const payload: any = await this.api.fetchSearchTermHierarchy(account.connectionId, {
        customerId: account.externalId,
        dateRange: this.selection.dateRange,
      });
      this.campaignState = { items: payload?.campaigns || [], loading: false, error: "" };
      const next = this.campaignState.items[0]?.id || "";
      this.selection = { ...this.selection, campaignId: next, adGroupId: "" };
      this.loadAdGroups();
    } catch (err: any) {
      this.campaignState = { items: [], loading: false, error: err?.message || "Could not load campaigns." };
    }
  }

  async loadAdGroups() {
    const account = this.selectedAccount;
    const campaign = this.selectedCampaign;
    if (!account?.connectionId || !campaign?.id || this.isPerformanceMax) {
      this.adGroupState = { items: [], loading: false, error: "" };
      this.loadTerms();
      return;
    }
    this.adGroupState = { items: [], loading: true, error: "" };
    try {
      const payload: any = await this.api.fetchSearchTermHierarchy(account.connectionId, {
        customerId: account.externalId,
        campaignId: campaign.id,
        dateRange: this.selection.dateRange,
      });
      this.adGroupState = { items: payload?.adGroups || [], loading: false, error: "" };
      const next = this.adGroupState.items[0]?.id || "";
      this.selection = { ...this.selection, adGroupId: next };
      this.loadTerms();
    } catch (err: any) {
      this.adGroupState = { items: [], loading: false, error: err?.message || "Could not load ad groups." };
    }
  }

  async loadTerms() {
    const account = this.selectedAccount;
    const campaign = this.selectedCampaign;
    if (!account?.connectionId || !campaign?.id || (!this.isPerformanceMax && !this.selectedAdGroup?.id)) {
      this.termsState = { items: [], tags: [], loading: false, error: "", note: "" };
      return;
    }
    this.termsState = { items: [], tags: [], loading: true, error: "", note: "" };
    const params: any = {
      customerId: account.externalId,
      campaignId: campaign.id,
      dateRange: this.selection.dateRange,
      scopeLevel: this.scopeLevel,
    };
    if (!this.isPerformanceMax) params.adGroupId = this.selectedAdGroup.id;
    try {
      const [termsPayload, tagsPayload]: any = await Promise.all([
        this.api.fetchSearchTerms(account.connectionId, params),
        this.api.fetchSearchTermTags({
          connectionId: account.connectionId,
          customerId: account.externalId,
          campaignId: campaign.id,
          scopeLevel: this.scopeLevel,
          ...(this.isPerformanceMax ? {} : { adGroupId: this.selectedAdGroup.id }),
        }),
      ]);
      const tagLookup = new Map((tagsPayload?.tags || []).map((tag: any) => [tag.normalizedSearchTerm, tag]));
      const merged = (termsPayload?.terms || []).map((term: any) => {
        const stored: any = tagLookup.get(normalizeSearchTermKey(term.searchTerm));
        return {
          ...term,
          manualTag: stored?.tag || term.manualTag || "",
          manualTagUpdatedAt: stored?.updatedAt || term.manualTagUpdatedAt || "",
        };
      });
      this.termsState = { items: merged, tags: tagsPayload?.tags || [], loading: false, error: "", note: termsPayload?.note || "" };
    } catch (err: any) {
      this.termsState = { items: [], tags: [], loading: false, error: err?.message || "Could not load search terms.", note: "" };
    }
  }

  // ── Computed: scoring + filters ────────────────────────────────────
  get benchmarks() {
    return buildSearchTermBenchmarks(this.termsState.items || []);
  }

  get evaluatedTerms(): any[] {
    const benchmarks = this.benchmarks;
    const rules = this.autoTagRules;
    const isPmax = this.isPerformanceMax;
    return (this.termsState.items || []).map((term: any) => {
      const scored = deriveSearchTermEvaluation(term, benchmarks, { isPerformanceMax: isPmax });
      const autoTag = term.manualTag ? "" : deriveSearchTermAutoTag({ ...term, ...scored }, rules);
      const effectiveTag = term.manualTag || autoTag;
      const recommendedAction =
        !term.manualTag && autoTag === "bad"
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
  }

  get summary() {
    const list = this.evaluatedTerms;
    const totalTerms = list.length;
    const activeTerms = list.filter((t) => !isInactiveSearchTerm(t)).length;
    const inactiveTerms = totalTerms - activeTerms;
    const goodCount = list.filter((t) => t.effectiveTag === "good").length;
    const badCount = list.filter((t) => t.effectiveTag === "bad").length;
    const neutralCount = list.filter((t) => t.effectiveTag === "neutral").length;
    const untaggedCount = list.filter((t) => !t.effectiveTag).length;
    const wastedSpend = list.filter((t) => t.effectiveTag === "bad").reduce((acc, t) => acc + (t.cost || 0), 0);
    return {
      totalTerms,
      activeTerms,
      inactiveTerms,
      goodCount,
      badCount,
      neutralCount,
      untaggedCount,
      wastedSpend,
      averagePerformanceScore: totalTerms ? Math.round(average(list.map((t: any) => t.performanceScore || 0))) : null,
    };
  }

  get filteredTerms(): any[] {
    return this.evaluatedTerms
      .filter((term) => matchesSearchTermStatusFilter(term, this.termStatusFilter))
      .filter((term) => {
        if (this.tagFilter === "all") return true;
        if (this.tagFilter === "untagged") return !term.effectiveTag;
        return term.effectiveTag === this.tagFilter;
      });
  }

  get sortedTerms(): any[] {
    return sortSearchTermRows(this.filteredTerms, this.sort);
  }

  get suggestedNegatives(): any[] {
    return extractSuggestedNegatives(this.evaluatedTerms);
  }
  get keywordOpportunities(): any[] {
    return extractKeywordOpportunities(
      this.evaluatedTerms,
      this.benchmarks,
      normalizeClientTarget(this.selectedClient?.focus),
      this.autoTagRules,
    );
  }

  setSort(key: string) {
    if (this.sort.key === key) {
      this.sort = { key, direction: this.sort.direction === "asc" ? "desc" : "asc" };
    } else {
      this.sort = { key, direction: "desc" };
    }
  }
  sortIndicator(key: string): string {
    if (this.sort.key !== key) return "";
    return this.sort.direction === "asc" ? "↑" : "↓";
  }

  scoreTone(score: number) {
    return getSearchTermScoreTone(score || 0);
  }
  actionTone(action: string) {
    return (SEARCH_TERM_ACTION_META as any)[action]?.tone || "neutral";
  }
  actionLabel(action: string) {
    return (SEARCH_TERM_ACTION_META as any)[action]?.label || action;
  }
  normalizeKey(value: string): string {
    return normalizeSearchTermKey(value);
  }
  trackByTerm(_: number, term: any) {
    return term?.searchTerm;
  }

  async onTagChange(term: any, tag: string) {
    const account = this.selectedAccount;
    const campaign = this.selectedCampaign;
    if (!account?.connectionId || !account.externalId || !campaign?.id) return;
    const key = normalizeSearchTermKey(term.searchTerm);
    this.tagBusyMap = { ...this.tagBusyMap, [key]: true };
    try {
      await this.api.saveSearchTermTag({
        connectionId: account.connectionId,
        customerId: account.externalId,
        campaignId: campaign.id,
        scopeLevel: this.scopeLevel,
        searchTerm: term.searchTerm,
        tag,
        ...(this.isPerformanceMax ? {} : { adGroupId: this.selectedAdGroup?.id }),
      });
      this.termsState = {
        ...this.termsState,
        items: this.termsState.items.map((t: any) =>
          normalizeSearchTermKey(t.searchTerm) === key ? { ...t, manualTag: tag } : t,
        ),
      };
    } catch (err) {
      // swallow — caller can show toast separately if needed
    }
    this.tagBusyMap = { ...this.tagBusyMap, [key]: false };
  }

  // ── Styles ─────────────────────────────────────────────────────────
  rootStyle = { display: "grid", gap: "18px" };
  panelStyle = {
    padding: "20px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
  };
  headRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  titleStyle = { marginTop: "10px", fontSize: "20px", fontWeight: 800, fontFamily: T.heading };
  leadStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft, lineHeight: 1.55 };
  emptyStyle = {
    padding: "20px",
    borderRadius: "20px",
    background: T.amberSoft,
    border: `1px solid ${T.amber}22`,
    display: "grid",
    gap: "10px",
  };
  emptyTitleStyle = { fontSize: "14px", fontWeight: 800, color: T.amber };
  emptyBodyStyle = { fontSize: "12px", color: T.inkSoft, lineHeight: 1.5 };
  selectorGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "12px" };
  labelStyle = {
    marginBottom: "6px",
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.08em",
  };
  selectStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: "16px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    fontWeight: 700,
    fontFamily: T.font,
  };
  errorStyle = {
    padding: "10px 12px",
    borderRadius: "12px",
    background: T.coralSoft,
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };

  kpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(160), gap: "10px" };
  filterRowStyle = {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
  };
  filterPillRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };

  tableWrapStyle = { overflowX: "auto", border: `1px solid ${T.line}`, borderRadius: "16px" };
  tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "12px", color: T.ink };
  theadRowStyle = { background: T.bgSoft };
  thStyle = {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 800,
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
    borderBottom: `1px solid ${T.line}`,
    whiteSpace: "nowrap",
  };
  trStyle(term: any) {
    const tag = term.effectiveTag;
    const bg =
      tag === "good" ? "rgba(15, 143, 102, 0.05)"
      : tag === "bad" ? "rgba(215, 93, 66, 0.06)"
      : tag === "neutral" ? "rgba(199, 147, 33, 0.05)"
      : "transparent";
    return { background: bg, borderBottom: `1px solid ${T.line}` };
  }
  cellStyle = { padding: "10px 12px", verticalAlign: "top" };
  termCellStyle = { padding: "10px 12px", verticalAlign: "top", minWidth: "220px" };
  termPrimaryStyle = { fontWeight: 800, color: T.ink };
  termMetaStyle = { marginTop: "3px", fontSize: "11px", color: T.inkSoft };
  tagSelectStyle = {
    padding: "6px 8px",
    borderRadius: "10px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: T.font,
  };
  tagSourceStyle = { marginTop: "3px", fontSize: "10px", color: T.inkMute };
  emptyTableCellStyle = { padding: "16px", textAlign: "center", color: T.inkSoft };

  listGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "12px" };
  negativeCardStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.coralSoft,
    border: "1px solid rgba(215, 93, 66, 0.18)",
  };
  negativeWordStyle = { fontSize: "14px", fontWeight: 800, color: T.coral, fontFamily: T.heading };
  negativeMetaStyle = { marginTop: "5px", fontSize: "11px", color: T.inkSoft };
  opportunityCardStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.accentSoft,
    border: "1px solid rgba(15, 143, 102, 0.18)",
  };
  opportunityHeadStyle = { display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" };
  opportunityWordStyle = { fontSize: "14px", fontWeight: 800, color: T.accent, fontFamily: T.heading };
  opportunityMetaStyle = { marginTop: "5px", fontSize: "11px", color: T.inkSoft };
  opportunityReasonStyle = { marginTop: "6px", fontSize: "12px", color: T.ink, lineHeight: 1.5 };

  loadingStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.bgSoft,
    color: T.inkSoft,
    fontSize: "12px",
    textAlign: "center",
  };
}
