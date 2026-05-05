// Analytics view — substantive port of React AnalyticsCommandCenter (4698-4844)
// + a v1 saved chart panel using SVG sparklines. The full InteractiveLineChart
// (4480-4621) is deferred to a follow-up.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  ANALYTICS_CHART_PRESETS,
  KPI_LIBRARY,
  T,
  fitCols,
  formatCurrency,
  formatMetric,
  formatNumber,
} from "../foundation/adpulse-foundation";
import {
  comparePeriodSeries,
  getAdsGa4ValueComparison,
} from "../foundation/post-foundation-helpers";
import {
  ActionCueComponent,
  AppButtonComponent,
  EmptyStateComponent,
  MetricTileComponent,
  PlatformChipComponent,
} from "./primitives";

// ─────────────────────────────────────────────────────────────────────
// AnalyticsTrendTile primitive
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-analytics-trend-tile",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="labelStyle">{{ label }}</div>
      <div [ngStyle]="valueStyle">{{ valueText }}</div>
      <div [ngStyle]="deltaStyle">
        {{ comparison?.delta != null ? deltaText : 'No comparison data' }}
      </div>
    </div>
  `,
})
export class AnalyticsTrendTileComponent {
  @Input() label = "";
  @Input() metricKey: string = "sessions";
  @Input() comparison: any = null;

  get valueText(): string {
    return formatMetric(this.metricKey, this.comparison?.current || 0);
  }
  get deltaText(): string {
    const delta = Number(this.comparison?.delta || 0);
    const prefix = delta >= 0 ? "+" : "";
    return `${prefix}${delta.toFixed(0)}% vs previous`;
  }
  rootStyle = {
    padding: "14px",
    borderRadius: "20px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "6px",
  };
  labelStyle = {
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  valueStyle = {
    fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
    fontWeight: 800,
    fontFamily: T.heading,
    color: T.ink,
    letterSpacing: "-0.04em",
  };
  get deltaStyle() {
    const delta = Number(this.comparison?.delta || 0);
    const color = delta >= 0 ? T.accent : T.coral;
    return { fontSize: "12px", fontWeight: 700, color };
  }
}

// ─────────────────────────────────────────────────────────────────────
// AnalyticsBarList primitive
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-analytics-bar-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="listStyle">
      <div *ngFor="let item of items" [ngStyle]="rowStyle">
        <div [ngStyle]="labelRowStyle">
          <span [ngStyle]="dotStyle(item)"></span>
          <span [ngStyle]="labelStyle">{{ item.label }}</span>
          <span [ngStyle]="valueStyle">{{ item.displayValue || item.value }}</span>
        </div>
        <div [ngStyle]="trackStyle">
          <div [ngStyle]="fillStyle(item)"></div>
        </div>
      </div>
    </div>
  `,
})
export class AnalyticsBarListComponent {
  @Input() items: any[] = [];
  @Input() fixedMax: number | null = null;

  get max(): number {
    if (this.fixedMax) return this.fixedMax;
    return Math.max(...this.items.map((i) => Number(i.value) || 0), 1);
  }

  listStyle = { display: "grid", gap: "10px" };
  rowStyle = { display: "grid", gap: "6px" };
  labelRowStyle = { display: "flex", alignItems: "center", gap: "8px" };
  dotStyle(item: any) {
    return { width: "8px", height: "8px", borderRadius: "50%", background: item.color || T.accent };
  }
  labelStyle = { fontSize: "12px", color: T.ink, fontWeight: 700, flex: 1 };
  valueStyle = { fontSize: "11px", color: T.inkSoft, fontFamily: T.mono };
  trackStyle = {
    height: "8px",
    borderRadius: "999px",
    background: "rgba(22, 34, 24, 0.06)",
    overflow: "hidden",
  };
  fillStyle(item: any) {
    const pct = Math.min(100, ((Number(item.value) || 0) / this.max) * 100);
    return {
      width: `${pct}%`,
      height: "100%",
      borderRadius: "999px",
      background: item.color || T.accent,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────
// AnalyticsView
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-analytics-view",
  standalone: true,
  imports: [
    CommonModule,
    ActionCueComponent,
    AnalyticsTrendTileComponent,
    AnalyticsBarListComponent,
    AppButtonComponent,
    EmptyStateComponent,
    MetricTileComponent,
    PlatformChipComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <!-- Client picker -->
      <div [ngStyle]="picker.toolbar">
        <div>
          <div [ngStyle]="picker.label">Analytics client</div>
          <select [value]="selectedClientId" (change)="clientChange.emit($any($event.target).value)" [ngStyle]="picker.select">
            <option *ngFor="let c of clients" [value]="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>{{ dateRangeLabel }}</div>
      </div>

      <!-- Empty state if no GA4 -->
      <ng-container *ngIf="!client; else withClient">
        <app-empty-state title="No analytics client selected" body="Pick a client with GA4 connected to view its analytics command center."></app-empty-state>
      </ng-container>

      <ng-template #withClient>
        <ng-container *ngIf="!ga4; else withGa4">
          <app-empty-state title="GA4 not connected" body="Enable the GA4 connection in Client Studio to bring analytics into the dashboard."></app-empty-state>
        </ng-container>
      </ng-template>

      <ng-template #withGa4>
        <!-- Hero -->
        <div [ngStyle]="heroStyle">
          <div [ngStyle]="heroHeadStyle">
            <div>
              <div [ngStyle]="heroTitleRowStyle">
                <app-platform-chip platform="ga4"></app-platform-chip>
                <div [ngStyle]="heroTitleStyle">{{ client.name }} analytics</div>
              </div>
              <div [ngStyle]="heroSubStyle">{{ ga4.propertyName || 'GA4 property' }} | {{ dateRangeLabel }}</div>
              <div [ngStyle]="heroNoteStyle">
                Charts use GA4 Analytics Data API daily rows only. If GA4 does not return daily rows, AdPulse shows an empty-state instead of generated fallback data.
              </div>
            </div>
            <div [ngStyle]="cueRowStyle">
              <app-action-cue [tone]="liveState?.loading ? 'info' : (liveErrors.length ? 'warning' : 'success')">
                {{ liveState?.loading ? 'Refreshing GA4' : (liveErrors.length ? 'Partial GA4 sync' : 'Live analytics') }}
              </app-action-cue>
              <app-action-cue [tone]="gaSeries.length ? 'success' : 'warning'">
                {{ gaSeries.length ? gaSeries.length + ' selected-period points' : 'No selected-period daily rows' }}
              </app-action-cue>
              <app-action-cue [tone]="previousGaSeries.length ? 'success' : 'warning'">
                {{ previousGaSeries.length ? previousGaSeries.length + ' previous-period points' : 'No previous-period rows' }}
              </app-action-cue>
            </div>
          </div>

          <div [ngStyle]="heroKpiRowStyle">
            <app-metric-tile label="Sessions" [value]="formatNumber(ga4.sessions || 0)"></app-metric-tile>
            <app-metric-tile label="Users" [value]="formatNumber(ga4.users || 0)"></app-metric-tile>
            <app-metric-tile label="Engaged Rate" [value]="(ga4.engagedRate || 0).toFixed(1) + '%'"></app-metric-tile>
            <app-metric-tile label="Conv. Rate" [value]="(ga4.conversionRate || 0).toFixed(1) + '%'"></app-metric-tile>
            <app-metric-tile
              [label]="client.category === 'eshop' ? 'Revenue' : 'Leads'"
              [value]="client.category === 'eshop' ? formatCurrency(ga4Revenue) : formatNumber(ga4.purchasesOrLeads || 0)"
            ></app-metric-tile>
            <app-metric-tile *ngIf="client.category === 'eshop'" label="AOV" [value]="formatCurrency(ga4.aov || 0)"></app-metric-tile>
          </div>
        </div>

        <!-- Trend tiles -->
        <div [ngStyle]="trendGridStyle">
          <app-analytics-trend-tile label="Sessions" metricKey="sessions" [comparison]="sessionsTrend"></app-analytics-trend-tile>
          <app-analytics-trend-tile label="Users" metricKey="users" [comparison]="usersTrend"></app-analytics-trend-tile>
          <app-analytics-trend-tile [label]="client.category === 'eshop' ? 'Purchases' : 'Leads'" metricKey="conversions" [comparison]="conversionsTrend"></app-analytics-trend-tile>
          <app-analytics-trend-tile label="Revenue" metricKey="revenue" [comparison]="revenueTrend"></app-analytics-trend-tile>
        </div>
        <div [ngStyle]="comparisonNoteStyle">Comparison baseline: {{ previousRangeLabel }}</div>

        <!-- Three-up traffic / journey / diagnostics -->
        <div [ngStyle]="threeUpStyle">
          <div [ngStyle]="cardStyle">
            <div>
              <div [ngStyle]="cardTitleStyle">Traffic mix</div>
              <div [ngStyle]="cardLeadStyle">Where sessions are coming from.</div>
            </div>
            <app-analytics-bar-list [items]="channelItems.length ? channelItems : fallbackChannels" [fixedMax]="100"></app-analytics-bar-list>
          </div>

          <div [ngStyle]="cardStyle">
            <div>
              <div [ngStyle]="cardTitleStyle">Journey bridge</div>
              <div [ngStyle]="cardLeadStyle">Paid media into site activity and outcomes.</div>
            </div>
            <app-analytics-bar-list [items]="funnelItems"></app-analytics-bar-list>
            <div [ngStyle]="journeyKpiRowStyle">
              <app-metric-tile
                label="Sessions / Paid Clicks"
                [value]="sessionsPerPaidClick.toFixed(0) + '%'"
                subValue="Directional tracking sanity check"
              ></app-metric-tile>
              <app-metric-tile
                label="Ads Conv. Value vs GA4"
                [value]="(valueGap >= 0 ? '+' : '') + valueGap.toFixed(0) + '%'"
                [subValue]="formatCurrency(adsConversionValue) + ' ads value vs ' + formatCurrency(ga4Revenue) + ' GA4 revenue'"
                [accent]="absValueGap > 20 ? T.coral : T.accent"
              ></app-metric-tile>
            </div>
          </div>

          <div [ngStyle]="cardStyle">
            <div>
              <div [ngStyle]="cardTitleStyle">Diagnostics</div>
              <div [ngStyle]="cardLeadStyle">What needs attention in the current range.</div>
            </div>
            <ng-container *ngIf="insightItems.length; else allClear">
              <div [ngStyle]="diagListStyle">
                <div *ngFor="let item of insightItems" [ngStyle]="diagItemStyle">{{ item }}</div>
              </div>
            </ng-container>
            <ng-template #allClear>
              <div [ngStyle]="allClearStyle">No analytics red flags detected for this range.</div>
            </ng-template>
            <div *ngIf="ga4.insight" [ngStyle]="cardLeadStyle">{{ ga4.insight }}</div>
          </div>
        </div>

        <!-- Saved charts (v1) -->
        <div [ngStyle]="cardStyle">
          <div [ngStyle]="chartHeadStyle">
            <div>
              <div [ngStyle]="cardTitleStyle">Saved charts</div>
              <div [ngStyle]="cardLeadStyle">Persist KPI cards across sessions. Pick a preset to add it to the board.</div>
            </div>
            <div [ngStyle]="presetRowStyle">
              <app-button *ngFor="let preset of analyticsChartPresets" (pressed)="addChartPreset.emit(preset)">{{ preset.label }}</app-button>
              <app-button *ngIf="charts.length" tone="danger" (pressed)="clearCharts.emit()">Clear</app-button>
            </div>
          </div>

          <div *ngIf="!charts.length" [ngStyle]="emptyChartStyle">No saved charts yet — pick a preset above.</div>
          <div *ngIf="charts.length" [ngStyle]="chartGridStyle">
            <div *ngFor="let chart of charts" [ngStyle]="chartCardStyle">
              <div [ngStyle]="chartCardHeadStyle">
                <div [ngStyle]="chartCardTitleStyle">{{ chart.label || chart.scope }}</div>
                <button (click)="removeChart.emit(chart)" [ngStyle]="chartRemoveStyle">×</button>
              </div>
              <div [ngStyle]="chartMetricsStyle">
                <span *ngFor="let metric of chart.metrics" [ngStyle]="metricChipStyle(metric)">
                  {{ kpiLabel(metric) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
})
export class AnalyticsViewComponent {
  @Input() clients: any[] = [];
  @Input() selectedClientId = "";
  @Input() seriesMap: any = {};
  @Input() dateRangeLabel = "";
  @Input() liveState: any = null;
  @Input() charts: any[] = [];

  @Output() clientChange = new EventEmitter<string>();
  @Output() addChartPreset = new EventEmitter<any>();
  @Output() removeChart = new EventEmitter<any>();
  @Output() clearCharts = new EventEmitter<void>();

  T = T;
  formatNumber = formatNumber;
  formatCurrency = formatCurrency;
  analyticsChartPresets = ANALYTICS_CHART_PRESETS;

  get client(): any {
    return this.clients.find((c) => c.id === this.selectedClientId) || this.clients[0] || null;
  }
  get ga4(): any {
    return this.client?.ga4 || null;
  }
  get gaSeries(): any[] {
    return this.seriesMap?.[`ga4:${this.client?.id}`] || [];
  }
  get previousGaSeries(): any[] {
    return Array.isArray(this.ga4?.previousSeries) ? this.ga4.previousSeries : [];
  }
  get previousRangeLabel(): string {
    if (this.ga4?.previousStartDate && this.ga4?.previousEndDate) {
      return `${this.ga4.previousStartDate} - ${this.ga4.previousEndDate}`;
    }
    return "Previous period";
  }
  get sessionsTrend() {
    return comparePeriodSeries(this.gaSeries, this.previousGaSeries, "sessions");
  }
  get usersTrend() {
    return comparePeriodSeries(this.gaSeries, this.previousGaSeries, "users");
  }
  get conversionsTrend() {
    return comparePeriodSeries(this.gaSeries, this.previousGaSeries, "conversions");
  }
  get revenueTrend() {
    return comparePeriodSeries(this.gaSeries, this.previousGaSeries, "revenue");
  }
  get channelItems(): any[] {
    return Object.entries(this.ga4?.channels || {})
      .map(([label, value]) => ({
        label,
        value: Number(value) || 0,
        color:
          label === "Organic" ? T.accent
          : label === "Paid" ? T.sky
          : label === "Direct" ? T.amber
          : label === "Social" ? "#7b5cff"
          : T.coral,
      }))
      .sort((l, r) => r.value - l.value)
      .slice(0, 6);
  }
  fallbackChannels = [{ label: "Unassigned", value: 100, color: T.inkMute }];
  get paidSpend(): number {
    return (this.client?.accounts || []).reduce((acc, a) => acc + (Number(a.spend) || 0), 0);
  }
  get paidClicks(): number {
    return (this.client?.accounts || []).reduce((acc, a) => acc + (Number(a.clicks) || 0), 0);
  }
  get paidImpressions(): number {
    return (this.client?.accounts || []).reduce((acc, a) => acc + (Number(a.impressions) || 0), 0);
  }
  get valueComparison() {
    const cmp = getAdsGa4ValueComparison(this.client, this.ga4) || { current: 0, previous: 0, delta: 0 };
    return {
      ga4Revenue: cmp.current || 0,
      adsConversionValue: cmp.previous || 0,
      gapPercent: cmp.delta || 0,
    };
  }
  get ga4Revenue(): number {
    return Number(this.ga4?.revenueCurrentPeriod) || 0;
  }
  get adsConversionValue(): number {
    return (this.client?.accounts || []).reduce((acc: number, a: any) => acc + (Number(a.conversionValue) || 0), 0);
  }
  get valueGap(): number {
    if (!this.ga4Revenue) return 0;
    return ((this.ga4Revenue - this.adsConversionValue) / this.ga4Revenue) * 100;
  }
  get absValueGap(): number {
    return Math.abs(this.valueGap);
  }
  get sessionsPerPaidClick(): number {
    return this.paidClicks > 0 ? (Number(this.ga4?.sessions || 0) / this.paidClicks) * 100 : 0;
  }
  get topChannel(): any {
    return this.channelItems[0];
  }
  get liveErrors(): any[] {
    const list = Array.isArray(this.liveState?.errors) ? this.liveState.errors : [];
    return list.filter((e: any) => e?.clientId === this.client?.id || !e?.clientId);
  }
  get insightItems(): string[] {
    const items: string[] = [];
    if (this.sessionsTrend.delta < -10) {
      items.push(`Sessions are down ${Math.abs(this.sessionsTrend.delta).toFixed(0)}% vs the previous equivalent period.`);
    }
    if (this.conversionsTrend.delta < -10) {
      items.push(`Conversions are down ${Math.abs(this.conversionsTrend.delta).toFixed(0)}% vs the previous period; check landing pages and offer quality.`);
    }
    if (this.absValueGap > 20 && this.ga4Revenue > 0) {
      items.push(`Ads conversion value (${formatCurrency(this.adsConversionValue)}) and GA4 revenue (${formatCurrency(this.ga4Revenue)}) differ by ${this.absValueGap.toFixed(0)}%.`);
    }
    if (this.topChannel?.value > 55) {
      items.push(`${this.topChannel.label} is ${Math.round(this.topChannel.value)}% of traffic, so channel concentration is high.`);
    }
    if (!this.gaSeries.length) {
      items.push("No live GA4 daily stream returned for the selected period.");
    } else if (!this.previousGaSeries.length) {
      items.push("Previous-period GA4 daily stream did not return — comparison deltas may be incomplete.");
    }
    return items;
  }
  get funnelItems(): any[] {
    return [
      { label: "Ad impressions", value: this.paidImpressions, displayValue: formatNumber(this.paidImpressions), color: T.inkSoft },
      { label: "Ad clicks", value: this.paidClicks, displayValue: formatNumber(this.paidClicks), color: T.sky },
      { label: "GA4 sessions", value: Number(this.ga4?.sessions) || 0, displayValue: formatNumber(this.ga4?.sessions || 0), color: T.accent },
      { label: this.client?.category === "eshop" ? "Purchases" : "Leads", value: Number(this.ga4?.purchasesOrLeads) || 0, displayValue: formatNumber(this.ga4?.purchasesOrLeads || 0), color: T.coral },
      { label: "Revenue", value: this.ga4Revenue, displayValue: formatCurrency(this.ga4Revenue), color: T.amber },
    ];
  }

  kpiLabel(metric: string): string {
    return (KPI_LIBRARY as any)[metric]?.label || metric;
  }

  // ── Styles ─────────────────────────────────────────────────────────
  rootStyle = { display: "grid", gap: "18px" };

  picker = {
    toolbar: {
      padding: "16px",
      borderRadius: "20px",
      background: T.surface,
      border: `1px solid ${T.line}`,
      boxShadow: T.shadow,
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
      alignItems: "center",
      color: T.inkSoft,
      fontSize: "12px",
    },
    label: {
      marginBottom: "6px",
      fontSize: "11px",
      color: T.inkMute,
      textTransform: "uppercase",
      fontWeight: 800,
      letterSpacing: "0.08em",
    },
    select: {
      padding: "10px 12px",
      borderRadius: "14px",
      border: `1px solid ${T.line}`,
      background: T.surfaceStrong,
      color: T.ink,
      fontSize: "13px",
      fontWeight: 700,
      fontFamily: T.font,
    },
  };

  heroStyle = {
    padding: "22px",
    borderRadius: "28px",
    background: `linear-gradient(135deg, ${T.surfaceStrong} 0%, rgba(245, 124, 0, 0.12) 48%, rgba(15, 143, 102, 0.12) 100%)`,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
  };
  heroHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  heroTitleRowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
  heroTitleStyle = {
    fontSize: "clamp(1.35rem, 2.2vw, 2rem)",
    fontWeight: 900,
    fontFamily: T.heading,
    color: T.ink,
    letterSpacing: "-0.06em",
  };
  heroSubStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft };
  heroNoteStyle = { marginTop: "6px", fontSize: "11px", color: T.inkSoft, lineHeight: 1.5 };
  cueRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" };
  heroKpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(132), gap: "10px" };

  trendGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "12px" };
  comparisonNoteStyle = { fontSize: "11px", color: T.inkSoft, fontWeight: 700 };

  threeUpStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" };
  cardStyle = {
    padding: "18px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "14px",
  };
  cardTitleStyle = { fontSize: "16px", fontWeight: 900, fontFamily: T.heading };
  cardLeadStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft };
  diagListStyle = { display: "grid", gap: "8px" };
  diagItemStyle = {
    padding: "11px",
    borderRadius: "14px",
    background: T.amberSoft,
    border: `1px solid ${T.amber}22`,
    color: T.ink,
    fontSize: "12px",
    lineHeight: 1.45,
    fontWeight: 700,
  };
  allClearStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.accentSoft,
    border: "1px solid rgba(15, 143, 102, 0.16)",
    color: T.accent,
    fontSize: "12px",
    fontWeight: 800,
  };
  journeyKpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(120), gap: "10px" };

  chartHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  presetRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  emptyChartStyle = {
    padding: "12px",
    borderRadius: "14px",
    background: T.bgSoft,
    color: T.inkSoft,
    fontSize: "12px",
  };
  chartGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "12px" };
  chartCardStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "8px",
  };
  chartCardHeadStyle = { display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" };
  chartCardTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.ink, fontFamily: T.heading };
  chartRemoveStyle = {
    border: "none",
    background: "transparent",
    color: T.inkMute,
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 800,
  };
  chartMetricsStyle = { display: "flex", gap: "6px", flexWrap: "wrap" };
  metricChipStyle(metric: string) {
    const color = (KPI_LIBRARY as any)[metric]?.color || T.inkSoft;
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 9px",
      borderRadius: "999px",
      background: `${color}12`,
      color,
      fontSize: "11px",
      fontWeight: 800,
      border: `1px solid ${color}33`,
    };
  }
}
