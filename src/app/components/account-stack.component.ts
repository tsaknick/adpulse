// AccountStack — substantive port of React component (5143-5670).
// v1 includes the expandable client header, campaign filter, account →
// campaign → ads drill-down with all the ledger KPI strips. AI strategist
// panel deferred to follow-up.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output } from "@angular/core";
import {
  CALENDAR,
  T,
  buildAccountAiPayload,
  buildAiStrategistAlignmentNotes,
  createEmptyAiStrategistState,
  formatCurrency,
  formatMetric,
  formatNumber,
  getAccountAiStrategyKey,
  getAiStrategyChatKey,
  getConversionValue,
  isStoppedCampaign,
  normalizeAiStrategyChatThread,
  readStoredAiStrategyChatThread,
  readStoredAiStrategyResult,
  writeStoredAiStrategyChatThread,
  writeStoredAiStrategyResult,
} from "../foundation/adpulse-foundation";
import {
  CAMPAIGN_STATUS_FILTERS,
  campaignMatchesStatusFilter,
  getClientSummaryText,
  getLiveDataNotice,
} from "../foundation/post-foundation-helpers";
import {
  AlertListComponent,
  AssignedUsersStripComponent,
  CategoryChipComponent,
  LiveDataCueComponent,
  LogoMarkComponent,
  PlatformChipComponent,
  ProgressRailComponent,
  StatusPillComponent,
  ToneBadgeComponent,
} from "./primitives";

// ── LedgerMetric primitive (kept inline — small) ──────────────────────
@Component({
  selector: "app-ledger-metric",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="labelStyle">{{ label }}</div>
      <div [ngStyle]="valueStyle">{{ value }}</div>
    </div>
  `,
})
export class LedgerMetricComponent {
  @Input() label = "";
  @Input() value = "";
  @Input() tone: string | null = null;
  @Input() compact = false;

  get rootStyle() {
    return { display: "grid", gap: "3px", minWidth: this.compact ? "62px" : "76px" };
  }
  labelStyle = {
    fontSize: "10px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  get valueStyle() {
    return {
      fontSize: this.compact ? "12px" : "13px",
      color: this.tone || T.ink,
      fontWeight: 800,
      fontFamily: this.compact ? T.font : T.heading,
      letterSpacing: this.compact ? 0 : "-0.03em",
    };
  }
}

// ── AccountStack ──────────────────────────────────────────────────────
@Component({
  selector: "app-account-stack",
  standalone: true,
  imports: [
    CommonModule,
    AiStrategistPanelComponent,
    AlertListComponent,
    AssignedUsersStripComponent,
    CategoryChipComponent,
    LedgerMetricComponent,
    LiveDataCueComponent,
    LogoMarkComponent,
    PlatformChipComponent,
    ProgressRailComponent,
    StatusPillComponent,
    ToneBadgeComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headerStyle">
        <div [ngStyle]="headerLeftStyle">
          <app-logo-mark [client]="client"></app-logo-mark>
          <div [ngStyle]="minWidthStyle">
            <div [ngStyle]="titleRowStyle">
              <div [ngStyle]="nameStyle">{{ client?.name }}</div>
              <app-category-chip [category]="client?.category"></app-category-chip>
              <app-status-pill [ok]="client?.health?.ok"></app-status-pill>
            </div>
            <div [ngStyle]="summaryStyle">{{ summaryText }}</div>
            <div [ngStyle]="platformRowStyle">
              <app-platform-chip *ngFor="let platform of activePlatforms" [platform]="platform"></app-platform-chip>
              <app-live-data-cue
                *ngIf="(client?.accounts?.length || 0) > 0 && client?.syncingPlatforms?.length"
                [client]="client"
                [compact]="true"
              ></app-live-data-cue>
            </div>
          </div>
        </div>
        <div [ngStyle]="headerKpiRowStyle">
          <app-ledger-metric label="Budget" [value]="formatCurrency(client?.totalBudget || 0)"></app-ledger-metric>
          <app-ledger-metric label="Spend MTD" [value]="formatCurrency(client?.spend || 0)"></app-ledger-metric>
          <app-ledger-metric label="Conv. value" [value]="formatCurrency(client?.conversionValue || 0)"></app-ledger-metric>
          <app-ledger-metric label="ROAS" [value]="formatMetric('roas', client?.roas || 0)"></app-ledger-metric>
          <app-ledger-metric label="Conv." [value]="formatNumber(client?.conversions || 0)"></app-ledger-metric>
          <app-ledger-metric label="Active" [value]="formatNumber(client?.activeCampaigns || 0)"></app-ledger-metric>
          <app-ledger-metric label="Live ads" [value]="formatNumber(client?.liveAds || 0)"></app-ledger-metric>
        </div>
      </div>

      <div [ngStyle]="filterRowStyle">
        <div [ngStyle]="filterPillsStyle">
          <button
            *ngFor="let option of statusFilters"
            type="button"
            (click)="campaignFilter = option.id"
            [ngStyle]="filterButtonStyle(option.id)"
          >{{ option.label }}</button>
        </div>
        <div [ngStyle]="filterCountStyle">
          Showing {{ visibleCampaigns.length }} of {{ campaigns.length }} campaigns across {{ visibleAccounts.length }} of {{ client?.accounts?.length || 0 }} accounts
        </div>
      </div>

      <div *ngIf="noConnections" [ngStyle]="noConnectionsStyle">
        <div [ngStyle]="noConnectionsTitleStyle">No accounts linked for this client</div>
        <div [ngStyle]="noConnectionsBodyStyle">Go to Client Studio and link ad accounts from your connected OAuth sessions to populate live data here.</div>
      </div>

      <app-live-data-cue *ngIf="awaitingLiveData" [client]="client"></app-live-data-cue>

      <ng-container *ngIf="!noConnections && !awaitingLiveData">
        <app-alert-list
          [health]="client?.health"
          [clientId]="client?.id"
          (resolveIssue)="resolveIssue.emit($event)"
        ></app-alert-list>
        <app-assigned-users-strip [client]="client" [users]="users" label="Assigned team"></app-assigned-users-strip>

        <app-ai-strategist-panel
          [aiReady]="aiReady"
          [canOpenConnections]="canOpenConnections"
          [state]="aiState"
          [chatThread]="aiChatThread"
          [chatDraft]="aiChatDraft"
          [chatState]="aiChatState"
          (run)="runAiStrategist()"
          (sendChat)="sendStrategistMessage()"
          (clearChat)="clearStrategistChat()"
          (chatDraftChange)="aiChatDraft = $event"
          (openConnections)="openConnections.emit()"
        ></app-ai-strategist-panel>
      </ng-container>

      <div [ngStyle]="accountListStyle">
        <div *ngIf="visibleAccounts.length === 0" [ngStyle]="emptyAccountStyle">
          <div [ngStyle]="emptyAccountTitleStyle">{{ emptyTitle }}</div>
          <div [ngStyle]="emptyAccountBodyStyle">{{ emptyBody }}</div>
        </div>

        <div *ngFor="let account of visibleAccounts" [ngStyle]="accountCardStyle">
          <button (click)="toggleOpen(account.id)" [ngStyle]="accountHeaderButtonStyle">
            <div [ngStyle]="accountHeaderRowStyle">
              <div [ngStyle]="accountIdentRowStyle">
                <div [ngStyle]="accountIdentInnerStyle">
                  <app-platform-chip [platform]="account.platform"></app-platform-chip>
                  <div [ngStyle]="accountNameStyle">{{ account.name }}</div>
                  <app-tone-badge tone="neutral">{{ liveCampaignCount(account) }} live</app-tone-badge>
                  <app-tone-badge *ngIf="stoppedCampaignCount(account)" tone="neutral">{{ stoppedCampaignCount(account) }} stopped</app-tone-badge>
                </div>
                <div [ngStyle]="accountSummaryStyle">
                  Spend {{ formatCurrency(account.spend) }} of {{ formatCurrency(account.monthlyBudget) }} | {{ shownCampaignCount(account) }}{{ campaignFilter === 'all' ? '' : ' of ' + accountCampaignCount(account) }} campaigns | {{ shownAdsCount(account) }} ads
                </div>
              </div>
              <div [ngStyle]="accountKpiRowStyle">
                <app-ledger-metric label="Budget" [value]="formatCurrency(account.monthlyBudget)"></app-ledger-metric>
                <app-ledger-metric label="Spend" [value]="formatCurrency(account.spend)"></app-ledger-metric>
                <app-ledger-metric label="Value" [value]="formatCurrency(getConversionValue(account))"></app-ledger-metric>
                <app-ledger-metric label="Pace" [value]="paceLabel(account)" [tone]="paceTone(account)"></app-ledger-metric>
                <app-ledger-metric label="ROAS" [value]="formatMetric('roas', account.roas)" [tone]="(account.roas || 0) >= 3 ? T.accent : T.ink"></app-ledger-metric>
                <app-ledger-metric label="CPC" [value]="formatMetric('cpc', account.cpc || 0)" [tone]="cpcOver(account) ? T.coral : T.ink"></app-ledger-metric>
                <app-ledger-metric label="CPM" [value]="formatMetric('cpm', account.cpm || 0)" [tone]="cpmOver(account) ? T.coral : T.ink"></app-ledger-metric>
                <app-ledger-metric label="Conv." [value]="formatNumber(account.conversions || 0)"></app-ledger-metric>
              </div>
              <div [ngStyle]="disclosureStyle">{{ open[account.id] ? 'Hide' : 'Show' }} campaigns</div>
            </div>
          </button>

          <app-progress-rail [current]="account.spend || 0" [target]="(account.monthlyBudget || 0) * calendar.spendProgress"></app-progress-rail>

          <div [ngStyle]="badgeRowStyle">
            <app-tone-badge *ngIf="!accountFlags(account).length" tone="positive">Within account thresholds</app-tone-badge>
            <app-tone-badge
              *ngFor="let flag of accountFlags(account)"
              [tone]="$any(flag.tone)"
            >{{ flag.label }}</app-tone-badge>
          </div>

          <div *ngIf="open[account.id]" [ngStyle]="campaignListStyle">
            <div *ngFor="let campaign of shownCampaigns(account)" [ngStyle]="campaignCardStyle">
              <button (click)="toggleOpen(campaign.id)" [ngStyle]="campaignHeaderButtonStyle">
                <div [ngStyle]="campaignHeaderRowStyle">
                  <div [ngStyle]="campaignIdentRowStyle">
                    <div [ngStyle]="campaignIdentInnerStyle">
                      <div [ngStyle]="campaignNameStyle">{{ campaign.name }}</div>
                      <app-tone-badge [tone]="campaignStatusTone(campaign)">{{ campaign.status }}</app-tone-badge>
                      <app-tone-badge tone="neutral">{{ adsForCampaign(campaign).length }} ads</app-tone-badge>
                    </div>
                    <div [ngStyle]="campaignObjectiveStyle">{{ campaign.objective }}</div>
                  </div>
                  <div [ngStyle]="campaignKpiRowStyle">
                    <app-ledger-metric label="Spend" [value]="formatCurrency(campaign.spend || 0)" [compact]="true"></app-ledger-metric>
                    <app-ledger-metric label="Value" [value]="formatCurrency(campaign.conversionValue || 0)" [compact]="true"></app-ledger-metric>
                    <app-ledger-metric label="Conv." [value]="formatNumber(campaign.conversions || 0)" [compact]="true"></app-ledger-metric>
                    <app-ledger-metric label="CPC" [value]="formatMetric('cpc', campaign.cpc || 0)" [tone]="campaignCpcOver(campaign) ? T.coral : T.ink" [compact]="true"></app-ledger-metric>
                    <app-ledger-metric label="CPM" [value]="formatMetric('cpm', campaign.cpm || 0)" [tone]="campaignCpmOver(campaign) ? T.coral : T.ink" [compact]="true"></app-ledger-metric>
                  </div>
                  <div [ngStyle]="disclosureStyle">{{ open[campaign.id] ? 'Hide' : 'Show' }} ads</div>
                </div>
              </button>

              <div *ngIf="campaignBadges(campaign).length" [ngStyle]="badgeRowStyle">
                <app-tone-badge
                  *ngFor="let flag of campaignBadges(campaign)"
                  [tone]="$any(flag.tone)"
                >{{ flag.label }}</app-tone-badge>
              </div>

              <div *ngIf="open[campaign.id]" [ngStyle]="adListStyle">
                <div *ngFor="let ad of adsForCampaign(campaign)" [ngStyle]="adRowStyle">
                  <div [ngStyle]="adLeftStyle">
                    <div [ngStyle]="adNameRowStyle">
                      <div [ngStyle]="adNameStyle">{{ ad.name }}</div>
                      <app-tone-badge [tone]="adStatusTone(ad)">{{ ad.status }}</app-tone-badge>
                    </div>
                    <div [ngStyle]="adFormatStyle">{{ ad.format }}</div>
                  </div>
                  <div [ngStyle]="adKpiRowStyle">
                    <app-ledger-metric label="CTR" [value]="(ad.ctr || 0).toFixed(2) + '%'" [compact]="true"></app-ledger-metric>
                    <app-ledger-metric label="Spend" [value]="formatCurrency(ad.spend || 0)" [compact]="true"></app-ledger-metric>
                    <app-ledger-metric label="Value" [value]="formatCurrency(ad.conversionValue || 0)" [compact]="true"></app-ledger-metric>
                    <app-ledger-metric label="Conv." [value]="formatNumber(ad.conversions || 0)" [compact]="true"></app-ledger-metric>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AccountStackComponent implements OnChanges {
  @Input() client: any = {};
  @Input() users: any[] = [];
  @Input() campaigns: any[] = [];
  @Input() ads: any[] = [];
  @Input() dateRangeLabel = "";

  @Output() resolveIssue = new EventEmitter<{ clientId: string; flagId: string }>();

  @Input() aiReady = false;
  @Input() canOpenConnections = false;
  @Output() openConnections = new EventEmitter<void>();

  // AI strategist state per drilldown
  aiState: any = createEmptyAiStrategistState();
  aiChatThread: any[] = [];
  aiChatDraft = "";
  aiChatState: any = { loading: false, error: "" };
  private aiStrategyKey = "";
  private aiChatKey = "";
  private lastClientId = "";

  constructor(private api: IntegrationApiService) {}

  ngOnChanges() {
    if (this.client?.id && this.client.id !== this.lastClientId) {
      this.lastClientId = this.client.id;
      this.refreshAiKeys();
    }
  }

  private refreshAiKeys() {
    this.aiStrategyKey = getAccountAiStrategyKey(this.client, this.dateRangeLabel);
    this.aiChatKey = getAiStrategyChatKey(this.aiStrategyKey);
    const saved = readStoredAiStrategyResult(this.aiStrategyKey);
    this.aiState = saved
      ? { loading: false, error: "", data: saved, generatedAt: saved?.generatedAt || "", cached: !!saved?.cached }
      : createEmptyAiStrategistState();
    this.aiChatThread = readStoredAiStrategyChatThread(this.aiChatKey);
    this.aiChatDraft = "";
    this.aiChatState = { loading: false, error: "" };
  }

  async runAiStrategist() {
    this.refreshAiKeys();
    this.aiState = { ...this.aiState, loading: true, error: "" };
    try {
      const payload = await this.api.fetchAiStrategy({
        scope: "account",
        context: { ...buildAccountAiPayload(this.client, this.dateRangeLabel), alignmentNotes: buildAiStrategistAlignmentNotes(this.aiChatThread) },
        forceRefresh: true,
      });
      writeStoredAiStrategyResult(this.aiStrategyKey, payload);
      this.aiState = { loading: false, error: "", data: payload, generatedAt: payload?.generatedAt || "", cached: !!payload?.cached };
    } catch (error: any) {
      this.aiState = { ...this.aiState, loading: false, error: error?.message || "Could not run the AI strategist." };
    }
  }

  async sendStrategistMessage() {
    const text = (this.aiChatDraft || "").trim();
    if (!text || !this.aiState.data) return;
    const nextThread = normalizeAiStrategyChatThread([
      ...this.aiChatThread,
      { role: "user", text, createdAt: new Date().toISOString() },
    ]);
    this.aiChatThread = nextThread;
    writeStoredAiStrategyChatThread(this.aiChatKey, nextThread);
    this.aiChatDraft = "";
    this.aiChatState = { loading: true, error: "" };
    try {
      const payload = await this.api.chatWithAiStrategist({
        scope: "account",
        context: { ...buildAccountAiPayload(this.client, this.dateRangeLabel), alignmentNotes: buildAiStrategistAlignmentNotes(nextThread) },
        strategy: this.aiState.data?.strategy || null,
        thread: nextThread,
      });
      const finalThread = normalizeAiStrategyChatThread([
        ...nextThread,
        { role: "assistant", text: String(payload?.reply || "").trim(), createdAt: payload?.generatedAt || new Date().toISOString() },
      ]);
      this.aiChatThread = finalThread;
      writeStoredAiStrategyChatThread(this.aiChatKey, finalThread);
      this.aiChatState = { loading: false, error: "" };
    } catch (error: any) {
      this.aiChatState = { loading: false, error: error?.message || "Could not send your note to the strategist." };
    }
  }

  clearStrategistChat() {
    this.aiChatThread = [];
    writeStoredAiStrategyChatThread(this.aiChatKey, []);
    this.aiChatState = { loading: false, error: "" };
  }


  campaignFilter: string = "all";
  open: Record<string, boolean> = {};

  T = T;
  calendar = CALENDAR;
  formatCurrency = formatCurrency;
  formatNumber = formatNumber;
  formatMetric = formatMetric;
  getConversionValue = getConversionValue;
  statusFilters = CAMPAIGN_STATUS_FILTERS;

  toggleOpen(id: string) {
    this.open = { ...this.open, [id]: !this.open[id] };
  }

  get summaryText(): string {
    return getClientSummaryText(this.client, { includeAds: true });
  }
  get activePlatforms(): string[] {
    return Object.keys(this.client?.connections || {}).filter((p) => this.client.connections[p]);
  }
  get noConnections(): boolean {
    return Object.values(this.client?.connections || {}).every((value) => !value);
  }
  get awaitingLiveData(): boolean {
    return !!(this.client?.linkedAssetCount && !this.client?.accounts?.length);
  }
  get visibleCampaigns(): any[] {
    return this.campaigns.filter((c) => campaignMatchesStatusFilter(c, this.campaignFilter));
  }
  get visibleAccounts(): any[] {
    if (this.campaignFilter === "all") return this.client?.accounts || [];
    const ids = new Set(this.visibleCampaigns.map((c) => c.accountId));
    return (this.client?.accounts || []).filter((a: any) => ids.has(a.id));
  }
  get filterMeta(): any {
    return CAMPAIGN_STATUS_FILTERS.find((o) => o.id === this.campaignFilter) || CAMPAIGN_STATUS_FILTERS[2];
  }
  get emptyTitle(): string {
    if (this.client?.linkedAssetCount && !this.client?.accounts?.length) return "Waiting for live account rows";
    return this.filterMeta.emptyTitle;
  }
  get emptyBody(): string {
    if (this.client?.linkedAssetCount && !this.client?.accounts?.length) {
      return "The linked assets are saved. This section will populate as soon as the connected platforms return live account data.";
    }
    return this.filterMeta.emptyBody;
  }

  // ── Per-account / per-campaign helpers ─────────────────────────────
  campaignsForAccount(account: any): any[] {
    return this.campaigns.filter((c) => c.accountId === account.id);
  }
  liveCampaignCount(account: any): number {
    return this.campaignsForAccount(account).filter((c) => !isStoppedCampaign(c)).length;
  }
  stoppedCampaignCount(account: any): number {
    return this.campaignsForAccount(account).filter((c) => isStoppedCampaign(c)).length;
  }
  shownCampaigns(account: any): any[] {
    return this.visibleCampaigns.filter((c) => c.accountId === account.id);
  }
  shownCampaignCount(account: any): number {
    return this.shownCampaigns(account).length;
  }
  accountCampaignCount(account: any): number {
    return this.campaignsForAccount(account).length;
  }
  shownAdsCount(account: any): number {
    return this.shownCampaigns(account).reduce((acc, c) => acc + this.adsForCampaign(c).length, 0);
  }
  adsForCampaign(campaign: any): any[] {
    return this.ads.filter((a) => a.campaignId === campaign.id);
  }
  paceRatio(account: any): number {
    const target = Math.max((account.monthlyBudget || 0) * CALENDAR.spendProgress, 1);
    return (account.spend || 0) / target;
  }
  paceLabel(account: any): string {
    return `${Math.round(this.paceRatio(account) * 100)}%`;
  }
  paceTone(account: any): string {
    const r = this.paceRatio(account);
    return r > 1.1 || r < 0.9 ? T.coral : T.accent;
  }
  cpcOver(account: any): boolean {
    return (account.cpc || 0) > (this.client?.rules?.cpcMax || Infinity);
  }
  cpmOver(account: any): boolean {
    return (account.cpm || 0) > (this.client?.rules?.cpmMax || Infinity);
  }
  campaignCpcOver(campaign: any): boolean {
    return !isStoppedCampaign(campaign) && (campaign.cpc || 0) > (this.client?.rules?.cpcMax || Infinity);
  }
  campaignCpmOver(campaign: any): boolean {
    return !isStoppedCampaign(campaign) && (campaign.cpm || 0) > (this.client?.rules?.cpmMax || Infinity);
  }
  accountFlags(account: any): any[] {
    const flags: any[] = [];
    const r = this.paceRatio(account);
    const accountCampaigns = this.campaignsForAccount(account);
    const activeCampaigns = accountCampaigns.filter((c) => !isStoppedCampaign(c));
    const shouldEvaluatePace = !accountCampaigns.length || activeCampaigns.length > 0;
    if (shouldEvaluatePace && r > 1.1) flags.push({ tone: "danger", label: `${Math.round((r - 1) * 100)}% over pace` });
    if (shouldEvaluatePace && r < 0.9) flags.push({ tone: "danger", label: `${Math.round((1 - r) * 100)}% under pace` });
    if (this.cpcOver(account)) flags.push({ tone: "warning", label: `CPC above ${formatMetric("cpc", this.client?.rules?.cpcMax || 0)}` });
    if (this.cpmOver(account)) flags.push({ tone: "warning", label: `CPM above ${formatMetric("cpm", this.client?.rules?.cpmMax || 0)}` });
    const notice = getLiveDataNotice(account);
    if (notice) flags.push({ tone: notice.tone, label: notice.label });
    return flags;
  }
  campaignStatusTone(campaign: any): "neutral" | "warning" | "positive" {
    if (isStoppedCampaign(campaign)) return "neutral";
    if (campaign.status === "learning") return "warning";
    return "positive";
  }
  campaignBadges(campaign: any): any[] {
    const flags: any[] = [];
    if (isStoppedCampaign(campaign)) flags.push({ tone: "neutral", label: "Stopped" });
    else if (campaign.status === "learning") flags.push({ tone: "warning", label: "Learning" });
    if (this.campaignCpcOver(campaign)) flags.push({ tone: "warning", label: `High CPC ${formatMetric("cpc", campaign.cpc)}` });
    if (this.campaignCpmOver(campaign)) flags.push({ tone: "warning", label: `High CPM ${formatMetric("cpm", campaign.cpm)}` });
    return flags;
  }
  adStatusTone(ad: any): "neutral" | "warning" | "positive" {
    if (ad.status === "paused") return "neutral";
    if (ad.status === "learning") return "warning";
    return "positive";
  }

  filterButtonStyle(id: string) {
    const active = id === this.campaignFilter;
    return {
      padding: "8px 12px",
      borderRadius: "12px",
      border: `1px solid ${active ? T.lineStrong : "transparent"}`,
      background: active ? T.accentSoft : "transparent",
      color: active ? T.accent : T.inkSoft,
      fontSize: "12px",
      fontWeight: 800,
      cursor: "pointer",
      fontFamily: T.font,
      whiteSpace: "nowrap",
    };
  }

  // ── Static styles ──────────────────────────────────────────────────
  rootStyle = {
    padding: "20px",
    borderRadius: "26px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
  };
  headerStyle = { display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" };
  headerLeftStyle = { display: "flex", gap: "14px", minWidth: "0", flex: "1 1 320px" };
  minWidthStyle = { minWidth: "0" };
  titleRowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
  nameStyle = {
    fontSize: "20px",
    fontWeight: 800,
    fontFamily: T.heading,
    color: T.ink,
    letterSpacing: "-0.04em",
  };
  summaryStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft };
  platformRowStyle = { marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" };
  headerKpiRowStyle = { display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "flex-end" };

  filterRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  };
  filterPillsStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  filterCountStyle = { fontSize: "12px", color: T.inkSoft };

  noConnectionsStyle = {
    padding: "20px 16px",
    borderRadius: "16px",
    background: T.amberSoft,
    border: `1px solid ${T.amber}22`,
    textAlign: "center",
  };
  noConnectionsTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.amber };
  noConnectionsBodyStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft };

  accountListStyle = { display: "grid", gap: "12px" };
  emptyAccountStyle = {
    padding: "18px 16px",
    borderRadius: "16px",
    background: T.bgSoft,
    border: `1px dashed ${T.lineStrong}`,
    textAlign: "center",
  };
  emptyAccountTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  emptyAccountBodyStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft };

  accountCardStyle = {
    padding: "16px",
    borderRadius: "20px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "12px",
  };
  accountHeaderButtonStyle = {
    border: "none",
    background: "transparent",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    fontFamily: T.font,
  };
  accountHeaderRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  accountIdentRowStyle = { minWidth: "0", flex: "1 1 260px", display: "grid", gap: "8px" };
  accountIdentInnerStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
  accountNameStyle = { fontSize: "15px", fontWeight: 800, color: T.ink };
  accountSummaryStyle = { fontSize: "12px", color: T.inkSoft };
  accountKpiRowStyle = {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    flex: "1 1 420px",
    justifyContent: "flex-end",
  };
  disclosureStyle = { fontSize: "12px", fontWeight: 800, color: T.inkSoft, whiteSpace: "nowrap" };
  badgeRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };

  campaignListStyle = { display: "grid", gap: "10px" };
  campaignCardStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "10px",
  };
  campaignHeaderButtonStyle = {
    border: "none",
    background: "transparent",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    fontFamily: T.font,
  };
  campaignHeaderRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  campaignIdentRowStyle = { minWidth: "0", flex: "1 1 240px", display: "grid", gap: "6px" };
  campaignIdentInnerStyle = { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" };
  campaignNameStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  campaignObjectiveStyle = { fontSize: "11px", color: T.inkSoft };
  campaignKpiRowStyle = {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    flex: "1 1 360px",
    justifyContent: "flex-end",
  };

  adListStyle = { display: "grid", gap: "6px" };
  adRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "14px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
  };
  adLeftStyle = { minWidth: "0", flex: "1 1 220px" };
  adNameRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" };
  adNameStyle = { fontSize: "12px", fontWeight: 700, color: T.ink };
  adFormatStyle = { marginTop: "3px", fontSize: "10px", color: T.inkSoft };
  adKpiRowStyle = { display: "flex", gap: "14px", flexWrap: "wrap", marginLeft: "auto" };
}
