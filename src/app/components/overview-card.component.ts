// OverviewCard + OverviewRow — mirror React functions (lines 4890-5129).
import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  CALENDAR,
  T,
  fitCols,
  formatCurrency,
  formatMetric,
} from "../foundation/adpulse-foundation";
import {
  getClientSummaryText,
  getLiveDataNotice,
  getOverviewClientKpis,
} from "../foundation/post-foundation-helpers";
import {
  AlertListComponent,
  AppButtonComponent,
  AssignedUsersStripComponent,
  CategoryChipComponent,
  LiveDataCueComponent,
  LogoMarkComponent,
  MetricTileComponent,
  PlatformChipComponent,
  ProgressRailComponent,
  StatusPillComponent,
} from "./primitives";

@Component({
  selector: "app-overview-card",
  standalone: true,
  imports: [
    CommonModule,
    LogoMarkComponent,
    CategoryChipComponent,
    PlatformChipComponent,
    StatusPillComponent,
    AssignedUsersStripComponent,
    MetricTileComponent,
    ProgressRailComponent,
    AlertListComponent,
    LiveDataCueComponent,
    AppButtonComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <div [ngStyle]="headLeftStyle">
          <app-logo-mark [client]="client"></app-logo-mark>
          <div [ngStyle]="titleColStyle">
            <div [ngStyle]="titleRowStyle">
              <div [ngStyle]="nameStyle">{{ client?.name }}</div>
              <app-category-chip [category]="client?.category"></app-category-chip>
            </div>
            <div [ngStyle]="summaryStyle">{{ summaryText }}</div>
            <div [ngStyle]="platformRowStyle">
              <app-platform-chip
                *ngFor="let platform of activePlatforms"
                [platform]="platform"
              ></app-platform-chip>
              <app-live-data-cue
                *ngIf="(client?.accounts?.length || 0) > 0 && client?.syncingPlatforms?.length"
                [client]="client"
                [compact]="true"
              ></app-live-data-cue>
            </div>
          </div>
        </div>
        <app-status-pill [ok]="client?.health?.ok"></app-status-pill>
      </div>

      <app-assigned-users-strip [client]="client" [users]="users"></app-assigned-users-strip>

      <div [ngStyle]="kpiGridStyle">
        <app-metric-tile
          *ngFor="let item of overviewKpis"
          [label]="item.label"
          [value]="item.value"
          [subValue]="item.subValue"
          [accent]="item.accent"
        ></app-metric-tile>
      </div>

      <ng-container *ngIf="!awaitingLiveData">
        <div>
          <div [ngStyle]="paceHeadStyle">
            <div [ngStyle]="paceLabelStyle">Budget pace</div>
            <div [ngStyle]="paceRangeStyle">{{ calendar.spendRangeLabel }}</div>
          </div>
          <app-progress-rail
            [current]="client?.spend || 0"
            [target]="(client?.totalBudget || 0) * calendar.spendProgress"
          ></app-progress-rail>
        </div>

        <app-alert-list
          [health]="client?.health"
          [clientId]="client?.id"
          (resolveIssue)="resolveIssue.emit($event)"
        ></app-alert-list>
      </ng-container>

      <div *ngIf="noConnections" [ngStyle]="noConnectionsStyle">
        <div [ngStyle]="noConnectionsTitleStyle">No accounts linked</div>
        <div [ngStyle]="noConnectionsBodyStyle">Connect this client's ad accounts in Client Studio to see live data.</div>
      </div>

      <app-live-data-cue
        *ngIf="!noConnections && (client?.linkedAssetCount || 0) && !(client?.accounts?.length)"
        [client]="client"
      ></app-live-data-cue>

      <div *ngIf="!noConnections && (client?.accounts?.length || 0) > 0" [ngStyle]="accountListStyle">
        <div *ngFor="let account of (client.accounts || []).slice(0, 3)" [ngStyle]="accountRowStyle">
          <div [ngStyle]="accountLeftStyle">
            <app-platform-chip [platform]="account.platform"></app-platform-chip>
            <div [ngStyle]="accountTextStyle">
              <div [ngStyle]="accountNameStyle">{{ account.name }}</div>
              <div [ngStyle]="accountAmountStyle">
                {{ formatCurrency(account.spend || 0) }} of {{ formatCurrency(account.monthlyBudget || 0) }}
              </div>
              <div *ngIf="liveDataNotice(account) as notice" [ngStyle]="liveNoticeStyle(notice)">{{ notice.label }}</div>
            </div>
          </div>
          <div [ngStyle]="accountRightStyle">
            <div [ngStyle]="kpiTextStyle">CPC {{ formatMetric('cpc', account.cpc || 0) }}</div>
            <div [ngStyle]="kpiTextStyle">CPM {{ formatMetric('cpm', account.cpm || 0) }}</div>
          </div>
        </div>
      </div>

      <div [ngStyle]="actionRowStyle">
        <app-button tone="primary" (pressed)="openAccounts.emit()">Open account stack</app-button>
        <app-button *ngIf="canEdit" (pressed)="edit.emit()">Edit client</app-button>
      </div>
    </div>
  `,
})
export class OverviewCardComponent {
  @Input() client: any = {};
  @Input() users: any[] = [];
  @Input() canEdit = true;
  @Output() openAccounts = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() resolveIssue = new EventEmitter<{ clientId: string; flagId: string }>();

  formatCurrency = formatCurrency;
  formatMetric = formatMetric;
  calendar = CALENDAR;

  get noConnections(): boolean {
    return Object.values(this.client?.connections || {}).every((value) => !value);
  }
  get awaitingLiveData(): boolean {
    return !!(this.client?.linkedAssetCount && !this.client?.accounts?.length);
  }
  get summaryText(): string {
    return getClientSummaryText(this.client);
  }
  get activePlatforms(): string[] {
    return Object.keys(this.client?.connections || {}).filter((p) => this.client.connections[p]);
  }
  get overviewKpis(): any[] {
    return getOverviewClientKpis(this.client);
  }
  liveDataNotice(account: any) {
    return getLiveDataNotice(account);
  }
  liveNoticeStyle(notice: any) {
    return { marginTop: "4px", fontSize: "10px", color: notice.color };
  }

  get rootStyle() {
    return {
      padding: "18px",
      borderRadius: "24px",
      background: T.surface,
      border: `1px solid ${this.client?.health?.ok ? T.line : "rgba(215, 93, 66, 0.18)"}`,
      boxShadow: T.shadow,
      display: "grid",
      gap: "14px",
    };
  }
  headStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  headLeftStyle = { display: "flex", gap: "14px", minWidth: "0", flex: "1 1 280px" };
  titleColStyle = { minWidth: "0", flex: 1 };
  titleRowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
  nameStyle = {
    fontSize: "18px",
    fontWeight: 800,
    fontFamily: T.heading,
    color: T.ink,
    letterSpacing: "-0.04em",
  };
  summaryStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft };
  platformRowStyle = { marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" };

  kpiGridStyle = { display: "grid", gridTemplateColumns: fitCols(128), gap: "10px" };
  paceHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  };
  paceLabelStyle = {
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.08em",
  };
  paceRangeStyle = { fontSize: "11px", color: T.inkSoft };

  noConnectionsStyle = {
    padding: "18px 16px",
    borderRadius: "16px",
    background: T.amberSoft,
    border: `1px solid ${T.amber}22`,
    textAlign: "center",
  };
  noConnectionsTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.amber };
  noConnectionsBodyStyle = { marginTop: "4px", fontSize: "11px", color: T.inkSoft };

  accountListStyle = { display: "grid", gap: "8px" };
  accountRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "16px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
  };
  accountLeftStyle = {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    minWidth: "0",
    flex: "1 1 220px",
  };
  accountTextStyle = { minWidth: "0", flex: "1 1 160px" };
  accountNameStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  accountAmountStyle = { fontSize: "11px", color: T.inkSoft };
  accountRightStyle = { display: "flex", gap: "10px", flexWrap: "wrap", marginLeft: "auto" };
  kpiTextStyle = { fontSize: "11px", fontFamily: T.mono, color: T.inkSoft };
  actionRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
}

// =====================================================================
// OverviewRow
// =====================================================================
@Component({
  selector: "app-overview-row",
  standalone: true,
  imports: [
    CommonModule,
    LogoMarkComponent,
    CategoryChipComponent,
    PlatformChipComponent,
    StatusPillComponent,
    AssignedUsersStripComponent,
    MetricTileComponent,
    ProgressRailComponent,
    LiveDataCueComponent,
    AppButtonComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <div [ngStyle]="headLeftStyle">
          <app-logo-mark [client]="client" [size]="40"></app-logo-mark>
          <div [ngStyle]="titleColStyle">
            <div [ngStyle]="titleRowStyle">
              <div [ngStyle]="nameStyle">{{ client?.name }}</div>
              <app-category-chip [category]="client?.category"></app-category-chip>
              <app-status-pill [ok]="client?.health?.ok"></app-status-pill>
            </div>
            <div [ngStyle]="summaryStyle">{{ summaryText }}</div>
            <div [ngStyle]="platformRowStyle">
              <app-platform-chip
                *ngFor="let platform of activePlatforms"
                [platform]="platform"
              ></app-platform-chip>
              <app-live-data-cue
                *ngIf="(client?.accounts?.length || 0) > 0 && client?.syncingPlatforms?.length"
                [client]="client"
                [compact]="true"
              ></app-live-data-cue>
            </div>
          </div>
        </div>

        <div [ngStyle]="kpiGridStyle">
          <app-metric-tile
            *ngFor="let item of overviewKpis"
            [label]="item.label"
            [value]="item.value"
            [subValue]="item.subValue"
            [accent]="item.accent"
          ></app-metric-tile>
        </div>
      </div>

      <app-progress-rail
        *ngIf="!noConnections && !awaitingLiveData"
        [current]="client?.spend || 0"
        [target]="(client?.totalBudget || 0) * calendar.spendProgress"
      ></app-progress-rail>

      <app-assigned-users-strip [client]="client" [users]="users"></app-assigned-users-strip>

      <div *ngIf="noConnections" [ngStyle]="noConnectionsStyle">
        <div [ngStyle]="noConnectionsTitleStyle">No accounts linked</div>
        <div [ngStyle]="noConnectionsBodyStyle">Connect this client's ad accounts in Client Studio to see live data.</div>
      </div>

      <app-live-data-cue
        *ngIf="!noConnections && (client?.linkedAssetCount || 0) && !(client?.accounts?.length)"
        [client]="client"
      ></app-live-data-cue>

      <div *ngIf="!noConnections && (client?.accounts?.length || 0) > 0" [ngStyle]="flagsListStyle">
        <div *ngFor="let flag of flagsToShow" [ngStyle]="flagWrapStyle">
          <div [ngStyle]="flagHeadStyle">
            <div [ngStyle]="flagBodyStyle">
              <div [ngStyle]="flagLabelStyle">{{ flag.label }}</div>
              <div [ngStyle]="flagDetailStyle">{{ flag.detail }}</div>
            </div>
            <button
              *ngIf="!client?.health?.ok && flag.id"
              type="button"
              [ngStyle]="resolveButtonStyle"
              (click)="resolveIssue.emit({ clientId: client.id, flagId: flag.id })"
            >Mark resolved</button>
          </div>
        </div>
      </div>

      <div [ngStyle]="actionRowStyle">
        <app-button tone="primary" (pressed)="openAccounts.emit()">Open account stack</app-button>
        <app-button *ngIf="canEdit" (pressed)="edit.emit()">Edit client</app-button>
      </div>
    </div>
  `,
})
export class OverviewRowComponent {
  @Input() client: any = {};
  @Input() users: any[] = [];
  @Input() canEdit = true;
  @Output() openAccounts = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() resolveIssue = new EventEmitter<{ clientId: string; flagId: string }>();

  calendar = CALENDAR;

  get noConnections(): boolean {
    return Object.values(this.client?.connections || {}).every((value) => !value);
  }
  get awaitingLiveData(): boolean {
    return !!(this.client?.linkedAssetCount && !this.client?.accounts?.length);
  }
  get summaryText(): string {
    return getClientSummaryText(this.client, { includeAds: true });
  }
  get activePlatforms(): string[] {
    return Object.keys(this.client?.connections || {}).filter((p) => this.client.connections[p]);
  }
  get overviewKpis(): any[] {
    return getOverviewClientKpis(this.client, { compactLabels: true });
  }
  get flagsToShow(): any[] {
    if (this.client?.health?.ok) {
      return [{ id: "healthy", label: "Healthy", detail: "No red flags triggered for this client." }].slice(0, 2);
    }
    return (this.client?.health?.flags || []).slice(0, 2);
  }

  get rootStyle() {
    return {
      padding: "18px",
      borderRadius: "22px",
      background: T.surface,
      border: `1px solid ${this.client?.health?.ok ? T.line : "rgba(215, 93, 66, 0.18)"}`,
      boxShadow: T.shadow,
      display: "grid",
      gap: "14px",
    };
  }
  headStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    flexWrap: "wrap",
  };
  headLeftStyle = { display: "flex", gap: "14px", minWidth: "0", flex: "1 1 320px" };
  titleColStyle = { minWidth: "0", flex: 1 };
  titleRowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
  nameStyle = { fontSize: "17px", fontWeight: 800, fontFamily: T.heading };
  summaryStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft };
  platformRowStyle = { marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" };

  kpiGridStyle = {
    display: "grid",
    gridTemplateColumns: fitCols(108),
    gap: "10px",
    flex: "1 1 420px",
  };

  noConnectionsStyle = {
    padding: "14px 16px",
    borderRadius: "14px",
    background: T.amberSoft,
    border: `1px solid ${T.amber}22`,
  };
  noConnectionsTitleStyle = { fontSize: "12px", fontWeight: 800, color: T.amber };
  noConnectionsBodyStyle = { marginTop: "3px", fontSize: "11px", color: T.inkSoft };

  flagsListStyle = { display: "grid", gap: "8px" };
  get flagWrapStyle() {
    return {
      padding: "10px 12px",
      borderRadius: "14px",
      background: this.client?.health?.ok ? T.accentSoft : T.coralSoft,
      color: this.client?.health?.ok ? T.accent : T.coral,
    };
  }
  flagHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  };
  flagBodyStyle = { minWidth: "0", flex: "1 1 180px" };
  flagLabelStyle = { fontSize: "12px", fontWeight: 800 };
  flagDetailStyle = { marginTop: "3px", fontSize: "11px", color: T.inkSoft };
  resolveButtonStyle = {
    border: "1px solid rgba(215, 93, 66, 0.22)",
    background: T.surfaceStrong,
    color: T.coral,
    borderRadius: "10px",
    padding: "6px 9px",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: T.font,
    whiteSpace: "nowrap",
  };
  actionRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
}
