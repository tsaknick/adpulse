// CampaignReportDocument — full port of React print preview (6904+ in adpulse-v5.jsx).
// Contains the entire family of report sub-pages: Cover/ExecutiveSummary,
// Channel overviews (Google + Meta), Campaign tables, Geography/Device/
// Impression Share/Keyword pages, Meta ad preview cards, GA4 analytics,
// Definitions. Charts are rendered as inline SVG.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import {
  PLATFORM_META,
  T,
  formatAiGeneratedAt,
  formatMetric,
  getAiPriorityLabel,
  getAiPriorityTone,
} from "../foundation/adpulse-foundation";
import {
  aggregateGoogleReportDetails,
  buildChartTicks,
  chunkReportItems,
  formatChartAxisValue,
  formatMetaPreviewCta,
  formatReportCurrency,
  formatReportNumber,
  formatReportPercent,
  getGoogleGeographyEmptyLabel,
  getPlatformReportSeries,
  getReportConcernCampaigns,
  getReportDateStamp,
  getReportTopCampaigns,
  getSeriesAxisLabels,
  summarizeReportMetrics,
} from "../foundation/post-foundation-helpers";
import { PlatformChipComponent, ToneBadgeComponent } from "./primitives";

// ─────────────────────────────────────────────────────────────────────
// Small print-preview primitives
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-report-page",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="report-page" [ngStyle]="rootStyle">
      <div [ngStyle]="overlayStyle"></div>
      <div [ngStyle]="contentStyle"><ng-content></ng-content></div>
    </section>
  `,
})
export class ReportPageComponent {
  @Input() accent: string = T.accent;
  rootStyle = {
    width: "100%",
    maxWidth: "1120px",
    minHeight: "790px",
    boxSizing: "border-box",
    padding: "34px",
    borderRadius: "30px",
    background: "#fbfaf6",
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    position: "relative",
    overflow: "hidden",
  };
  get overlayStyle() {
    return {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: `radial-gradient(circle at 92% 8%, ${this.accent}18, transparent 24%), radial-gradient(circle at 8% 98%, rgba(22, 34, 24, 0.06), transparent 24%)`,
    };
  }
  contentStyle = { position: "relative", zIndex: 1 };
}

@Component({
  selector: "app-report-header",
  standalone: true,
  imports: [CommonModule, PlatformChipComponent],
  template: `
    <div [ngStyle]="rowStyle">
      <div>
        <div [ngStyle]="titleStyle">{{ title }}</div>
        <div [ngStyle]="kickerStyle">Campaign report section</div>
      </div>
      <app-platform-chip *ngIf="platform" [platform]="platform"></app-platform-chip>
    </div>
  `,
})
export class ReportHeaderComponent {
  @Input() title = "";
  @Input() platform: string | null = null;
  rowStyle = { display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", marginBottom: "22px" };
  titleStyle = { fontSize: "28px", fontFamily: T.heading, fontWeight: 800, letterSpacing: "-0.06em" };
  kickerStyle = { marginTop: "6px", color: T.inkSoft, fontSize: "12px" };
}

@Component({
  selector: "app-report-kpi-tile",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="labelStyle">{{ label }}</div>
      <div [ngStyle]="valueStyle">{{ value }}</div>
      <div *ngIf="subValue" [ngStyle]="subStyle">{{ subValue }}</div>
    </div>
  `,
})
export class ReportKpiTileComponent {
  @Input() label = "";
  @Input() value: string | number = "";
  @Input() subValue: string | number | null = null;
  rootStyle = {
    padding: "16px",
    borderRadius: "20px",
    background: "#fff",
    border: `1px solid ${T.line}`,
    display: "grid",
    alignContent: "start",
    minHeight: "106px",
  };
  labelStyle = { fontSize: "10px", color: T.inkMute, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
  valueStyle = { marginTop: "8px", fontSize: "28px", fontFamily: T.heading, fontWeight: 800, color: T.ink, letterSpacing: "-0.06em", lineHeight: 1 };
  subStyle = { marginTop: "6px", fontSize: "11px", color: T.inkSoft };
}

// ─── Tables ────────────────────────────────────────────────────────────
@Component({
  selector: "app-report-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="wrapStyle">
      <table [ngStyle]="tableStyle">
        <thead>
          <tr [ngStyle]="theadRowStyle">
            <th *ngFor="let col of columns" [ngStyle]="thStyle(col)">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows; let i = index">
            <td *ngFor="let col of columns" [ngStyle]="tdStyle(col)">{{ render(col, row) }}</td>
          </tr>
          <tr *ngIf="!rows.length">
            <td [attr.colspan]="columns.length" [ngStyle]="emptyStyle">{{ emptyLabel }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class ReportTableComponent {
  @Input() columns: { label: string; align?: "left" | "right"; render: (row: any) => any }[] = [];
  @Input() rows: any[] = [];
  @Input() emptyLabel = "";

  render(col: any, row: any) {
    try { return col.render(row); } catch { return ""; }
  }

  wrapStyle = { overflow: "hidden", borderRadius: "20px", border: `1px solid ${T.line}`, background: "#fff" };
  tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "11px" };
  theadRowStyle = { background: "#f1eee7" };
  thStyle(col: any) {
    return {
      padding: "12px 10px",
      textAlign: col.align || "left",
      color: T.ink,
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    };
  }
  tdStyle(col: any) {
    return {
      padding: "11px 10px",
      borderTop: `1px solid ${T.line}`,
      textAlign: col.align || "left",
      color: T.ink,
      fontWeight: col.align === "right" ? 700 : 600,
      verticalAlign: "top",
    };
  }
  emptyStyle = { padding: "16px", textAlign: "center", color: T.inkSoft };
}

// ─── Charts ────────────────────────────────────────────────────────────
@Component({
  selector: "app-report-line-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="titleStyle">{{ title }}</div>
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" style="width:100%; display:block;">
        <g *ngFor="let tick of ticks">
          <line [attr.x1]="padLeft" [attr.x2]="width - padRight" [attr.y1]="yFor(tick)" [attr.y2]="yFor(tick)" stroke="rgba(22,34,24,0.08)"/>
          <text x="10" [attr.y]="yFor(tick) + 4" textAnchor="start" fontSize="10" [attr.fill]="inkSoft">
            {{ formatTick(tick) }}
          </text>
        </g>
        <line [attr.x1]="padLeft" [attr.x2]="width - padRight" [attr.y1]="height - padBottom" [attr.y2]="height - padBottom" stroke="rgba(22,34,24,0.12)"/>
        <line [attr.x1]="padLeft" [attr.x2]="padLeft" [attr.y1]="padTop" [attr.y2]="height - padBottom" stroke="rgba(22,34,24,0.12)"/>
        <path *ngIf="path" [attr.d]="path" fill="none" [attr.stroke]="color" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle *ngFor="let p of points" [attr.cx]="p.x" [attr.cy]="p.y" r="3.8" [attr.fill]="color"/>
        <text *ngFor="let l of axisLabels" [attr.x]="xForIndex(l.index)" [attr.y]="height - 8" fontSize="10" [attr.fill]="inkSoft" [attr.text-anchor]="anchorFor(l.index)">{{ l.label }}</text>
      </svg>
    </div>
  `,
})
export class ReportLineChartComponent {
  @Input() title = "";
  @Input() series: any[] = [];
  @Input() metric: string = "spend";
  @Input() color: string = T.accent;
  @Input() axisType: "number" | "currency" | "percent" = "number";

  width = 520; height = 230;
  get padLeft() { return this.axisType === "currency" ? 110 : 84; }
  padRight = 20; padTop = 16; padBottom = 34;
  inkSoft = T.inkSoft;

  get values(): number[] { return (this.series || []).map((p) => Number(p?.[this.metric]) || 0); }
  get max(): number { return Math.max(...this.values, 1); }
  get ticks(): number[] { return buildChartTicks(this.max); }
  get axisLabels() { return getSeriesAxisLabels(this.series); }
  get chartWidth() { return this.width - this.padLeft - this.padRight; }
  get chartHeight() { return this.height - this.padTop - this.padBottom; }
  get points() {
    const n = Math.max(this.values.length - 1, 1);
    return this.values.map((value, index) => ({
      x: this.padLeft + (index / n) * this.chartWidth,
      y: this.height - this.padBottom - (value / this.max) * this.chartHeight,
    }));
  }
  get path(): string {
    return this.points.length
      ? this.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
      : "";
  }
  yFor(tick: number) { return this.height - this.padBottom - (tick / this.max) * this.chartHeight; }
  xForIndex(i: number) {
    const n = Math.max(this.values.length - 1, 1);
    return this.padLeft + (i / n) * this.chartWidth;
  }
  anchorFor(i: number): string {
    if (i === 0) return "start";
    if (i === this.values.length - 1) return "end";
    return "middle";
  }
  formatTick(tick: number): string { return formatChartAxisValue(tick, this.axisType); }

  rootStyle = { padding: "18px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}` };
  titleStyle = { fontSize: "15px", fontWeight: 800, fontFamily: T.heading, marginBottom: "12px" };
}

@Component({
  selector: "app-report-dual-line-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <div [ngStyle]="titleStyle">{{ title }}</div>
        <div [ngStyle]="legendStyle">
          <span [ngStyle]="{ color: primaryColor }">{{ primaryLabel }}</span>
          <span [ngStyle]="{ color: secondaryColor }">{{ secondaryLabel }}</span>
        </div>
      </div>
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" style="width:100%; display:block;">
        <g *ngFor="let tick of ticks">
          <line [attr.x1]="padLeft" [attr.x2]="width - padRight" [attr.y1]="yFor(tick)" [attr.y2]="yFor(tick)" stroke="rgba(22,34,24,0.08)"/>
          <text x="12" [attr.y]="yFor(tick) + 4" textAnchor="start" fontSize="10" [attr.fill]="inkSoft">{{ formatTick(tick) }}</text>
        </g>
        <path *ngIf="primaryPath" [attr.d]="primaryPath" fill="none" [attr.stroke]="primaryColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path *ngIf="secondaryPath" [attr.d]="secondaryPath" fill="none" [attr.stroke]="secondaryColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle *ngFor="let p of primaryPoints; let i = index" [attr.cx]="p.x" [attr.cy]="p.y" r="3.6" [attr.fill]="primaryColor"/>
        <circle *ngFor="let p of secondaryPoints; let i = index" [attr.cx]="p.x" [attr.cy]="p.y" r="3.6" [attr.fill]="secondaryColor"/>
        <text *ngFor="let l of axisLabels" [attr.x]="xForIndex(l.index)" [attr.y]="height - 10" fontSize="10" [attr.fill]="inkSoft" [attr.text-anchor]="anchorFor(l.index)">{{ l.label }}</text>
      </svg>
    </div>
  `,
})
export class ReportDualLineChartComponent {
  @Input() title = "";
  @Input() series: any[] = [];
  @Input() primaryMetric = "";
  @Input() secondaryMetric = "";
  @Input() primaryLabel = "";
  @Input() secondaryLabel = "";
  @Input() primaryColor = T.accent;
  @Input() secondaryColor = T.amber;
  @Input() axisType: "number" | "currency" | "percent" = "number";

  width = 980; height = 420;
  get padLeft() { return this.axisType === "currency" ? 120 : 96; }
  padRight = 28; padTop = 20; padBottom = 36;
  inkSoft = T.inkSoft;

  get axisMax(): number {
    if (this.axisType === "percent") return 100;
    const vals = (this.series || []).flatMap((p) => [Number(p?.[this.primaryMetric]) || 0, Number(p?.[this.secondaryMetric]) || 0]);
    return Math.max(...vals, 1);
  }
  get ticks(): number[] {
    return buildChartTicks(this.axisMax, 4, this.axisType === "percent" ? 100 : null);
  }
  get axisLabels() { return getSeriesAxisLabels(this.series); }
  get chartWidth() { return this.width - this.padLeft - this.padRight; }
  get chartHeight() { return this.height - this.padTop - this.padBottom; }

  buildPath(metric: string) {
    const n = Math.max((this.series || []).length - 1, 1);
    return (this.series || []).map((point, index) => {
      const v = Number(point?.[metric]) || 0;
      const x = this.padLeft + (index / n) * this.chartWidth;
      const y = this.height - this.padBottom - (v / this.axisMax) * this.chartHeight;
      return { x, y };
    });
  }
  toPath(points: any[]): string {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }
  get primaryPoints() { return this.buildPath(this.primaryMetric); }
  get secondaryPoints() { return this.buildPath(this.secondaryMetric); }
  get primaryPath() { return this.primaryPoints.length ? this.toPath(this.primaryPoints) : ""; }
  get secondaryPath() { return this.secondaryPoints.length ? this.toPath(this.secondaryPoints) : ""; }
  yFor(tick: number) { return this.height - this.padBottom - (tick / this.axisMax) * this.chartHeight; }
  xForIndex(i: number) {
    const n = Math.max((this.series || []).length - 1, 1);
    return this.padLeft + (i / n) * this.chartWidth;
  }
  anchorFor(i: number): string {
    if (i === 0) return "start";
    if (i === this.series.length - 1) return "end";
    return "middle";
  }
  formatTick(tick: number): string { return formatChartAxisValue(tick, this.axisType); }

  rootStyle = { padding: "20px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}` };
  headStyle = { display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "14px" };
  titleStyle = { fontSize: "15px", fontWeight: 800, fontFamily: T.heading };
  legendStyle = { display: "flex", gap: "12px", fontSize: "11px", color: T.inkSoft, fontWeight: 800 };
}

@Component({
  selector: "app-report-bar-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="titleStyle">{{ title }}</div>
      <ng-container *ngIf="rows.length; else emptyTpl">
        <div *ngFor="let item of rows" [ngStyle]="rowGridStyle">
          <div [ngStyle]="rowHeadStyle">
            <span [ngStyle]="rowLabelStyle">{{ item.label }}</span>
            <span [ngStyle]="rowValueStyle">{{ formatVal(item.value) }}</span>
          </div>
          <div [ngStyle]="trackStyle">
            <div *ngFor="let tick of innerTicks" [ngStyle]="tickStyle(tick)"></div>
            <div [ngStyle]="fillStyle(item.value)"></div>
          </div>
        </div>
        <div [ngStyle]="ticksRowStyle">
          <div *ngFor="let tick of ticks; let i = index" [ngStyle]="tickLabelStyle(i)">{{ formatVal(tick) }}</div>
        </div>
      </ng-container>
      <ng-template #emptyTpl>
        <div [ngStyle]="emptyStyle">No chart data available.</div>
      </ng-template>
    </div>
  `,
})
export class ReportBarChartComponent {
  @Input() title = "";
  @Input() items: { label: string; value: number }[] = [];
  @Input() color: string = T.accent;
  @Input() axisType: "number" | "currency" | "percent" = "number";

  get rows(): any[] {
    return (this.items || []).filter((i) => Number(i.value) > 0).slice(0, 8);
  }
  get axisMax(): number {
    if (this.axisType === "percent") return 100;
    return Math.max(...this.rows.map((i) => Number(i.value) || 0), 1);
  }
  get ticks(): number[] { return buildChartTicks(this.axisMax, 4, this.axisType === "percent" ? 100 : null); }
  get innerTicks(): number[] { return this.ticks.slice(1, -1); }

  formatVal(value: number): string { return formatChartAxisValue(value, this.axisType); }

  rootStyle = { padding: "18px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: "12px" };
  titleStyle = { fontSize: "15px", fontWeight: 800, fontFamily: T.heading };
  rowGridStyle = { display: "grid", gap: "5px" };
  rowHeadStyle = { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "11px" };
  rowLabelStyle = { color: T.ink, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  rowValueStyle = { color: T.inkSoft, fontFamily: T.mono };
  trackStyle = { position: "relative", height: "12px", borderRadius: "999px", background: "rgba(22,34,24,0.08)", overflow: "hidden" };
  tickStyle(tick: number) {
    return {
      position: "absolute",
      top: 0, bottom: 0,
      left: `${(tick / this.axisMax) * 100}%`,
      width: "1px",
      background: "rgba(22,34,24,0.12)",
    };
  }
  fillStyle(value: number) {
    const w = this.axisMax ? (Number(value) || 0) / this.axisMax * 100 : 0;
    return { height: "100%", width: `${Math.max(4, w)}%`, borderRadius: "999px", background: this.color };
  }
  ticksRowStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "6px", fontSize: "10px", color: T.inkSoft, fontFamily: T.mono };
  tickLabelStyle(i: number) {
    return { textAlign: i === 0 ? "left" : i === this.ticks.length - 1 ? "right" : "center" };
  }
  emptyStyle = { padding: "18px", borderRadius: "18px", background: T.bgSoft, color: T.inkSoft, fontSize: "12px" };
}

// ─── Composite report pages ───────────────────────────────────────────
@Component({
  selector: "app-report-channel-overview",
  standalone: true,
  imports: [
    CommonModule, ReportPageComponent, ReportHeaderComponent, ReportKpiTileComponent,
    ReportLineChartComponent, ReportBarChartComponent,
  ],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header [title]="title" [platform]="platform"></app-report-header>
      <ng-container *ngIf="empty; else withData">
        <div [ngStyle]="emptyStyle">No linked {{ platformLabel }} accounts were found for this client.</div>
      </ng-container>
      <ng-template #withData>
        <div [ngStyle]="layoutStyle">
          <div [ngStyle]="kpiGridStyle">
            <app-report-kpi-tile label="Impressions" [value]="formatReportNumber(summary.impressions)"></app-report-kpi-tile>
            <app-report-kpi-tile label="Clicks" [value]="formatReportNumber(summary.clicks)"></app-report-kpi-tile>
            <app-report-kpi-tile label="CTR (%)" [value]="formatReportPercent(summary.ctr)"></app-report-kpi-tile>
            <app-report-kpi-tile label="Cost" [value]="formatReportCurrency(summary.spend)"></app-report-kpi-tile>
            <app-report-kpi-tile label="Average CPC" [value]="formatReportCurrency(summary.cpc)"></app-report-kpi-tile>
            <app-report-kpi-tile [label]="platform === 'meta_ads' ? 'Purchases' : 'Conversions'" [value]="formatReportNumber(summary.conversions, 2)"></app-report-kpi-tile>
            <app-report-kpi-tile [label]="platform === 'meta_ads' ? 'Cost / Purchase' : 'Cost / Conversion'" [value]="formatReportCurrency(summary.costPerConversion)"></app-report-kpi-tile>
            <app-report-kpi-tile [label]="platform === 'meta_ads' ? 'Purchase Conv. Value' : 'Total Conv. Value'" [value]="formatReportCurrency(summary.conversionValue)"></app-report-kpi-tile>
            <app-report-kpi-tile label="ROAS" [value]="formatMetric('roas', summary.roas)"></app-report-kpi-tile>
            <app-report-kpi-tile label="Campaigns" [value]="formatReportNumber(campaigns.length)"></app-report-kpi-tile>
          </div>

          <div [ngStyle]="splitStyle">
            <app-report-line-chart
              [title]="platform === 'meta_ads' ? 'Click Performance' : 'Conversion Performance'"
              [series]="series"
              [metric]="platform === 'meta_ads' ? 'clicks' : 'conversions'"
              [color]="accent"
              axisType="number"
            ></app-report-line-chart>
            <app-report-bar-chart
              title="Top campaigns by spend"
              [items]="campaignBars"
              [color]="accent"
              axisType="currency"
            ></app-report-bar-chart>
          </div>
        </div>
      </ng-template>
    </app-report-page>
  `,
})
export class ReportChannelOverviewComponent {
  @Input() title = "";
  @Input() platform = "google_ads";
  @Input() summary: any = { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0, ctr: 0, cpc: 0, costPerConversion: 0, roas: 0 };
  @Input() series: any[] = [];
  @Input() campaigns: any[] = [];
  @Input() empty = false;

  formatReportNumber = formatReportNumber;
  formatReportCurrency = formatReportCurrency;
  formatReportPercent = formatReportPercent;
  formatMetric = formatMetric;

  get accent(): string { return (PLATFORM_META as any)[this.platform]?.color || T.accent; }
  get platformLabel(): string { return (PLATFORM_META as any)[this.platform]?.label || this.platform; }
  get campaignBars() {
    return (this.campaigns || []).slice(0, 6).map((c: any) => ({ label: c.name, value: Number(c.spend) || 0 }));
  }

  emptyStyle = { padding: "24px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, color: T.inkSoft };
  layoutStyle = { display: "grid", gap: "20px" };
  kpiGridStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px" };
  splitStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" };
}

@Component({
  selector: "app-report-campaign-table-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportTableComponent],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header [title]="title" [platform]="platform"></app-report-header>
      <app-report-table [columns]="columns" [rows]="rows" [emptyLabel]="emptyLabel"></app-report-table>
    </app-report-page>
  `,
})
export class ReportCampaignTablePageComponent {
  @Input() title = "";
  @Input() platform = "google_ads";
  @Input() campaigns: any[] = [];
  @Input() emptyLabel = "";

  get accent(): string { return (PLATFORM_META as any)[this.platform]?.color || T.accent; }
  get rows() { return (this.campaigns || []).slice(0, 12); }
  get columns() {
    const cols: any[] = [
      { label: "Campaign", render: (r: any) => r.name },
      { label: "Impressions", align: "right", render: (r: any) => formatReportNumber(r.impressions) },
      { label: "Clicks", align: "right", render: (r: any) => formatReportNumber(r.clicks) },
    ];
    if (this.platform === "meta_ads") {
      cols.push({ label: "Reach", align: "right", render: (r: any) => formatReportNumber(r.reach) });
    }
    cols.push(
      { label: "CTR (%)", align: "right", render: (r: any) => formatReportPercent(r.impressions ? r.clicks / r.impressions * 100 : 0) },
      { label: "Cost", align: "right", render: (r: any) => formatReportCurrency(r.spend) },
      { label: "Avg CPC", align: "right", render: (r: any) => formatReportCurrency(r.clicks ? r.spend / r.clicks : 0) },
      { label: this.platform === "meta_ads" ? "Purchases" : "Conversions", align: "right", render: (r: any) => formatReportNumber(r.conversions, 2) },
      { label: "Conv. Value", align: "right", render: (r: any) => formatReportCurrency(r.conversionValue || 0) },
      { label: "Cost / Conv.", align: "right", render: (r: any) => formatReportCurrency(r.conversions ? r.spend / r.conversions : 0) },
    );
    return cols;
  }
}

@Component({
  selector: "app-report-google-geography-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportTableComponent],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header title="Geographic Performance" platform="google_ads"></app-report-header>
      <div *ngIf="usingGa4Fallback" [ngStyle]="ga4NoticeStyle">
        Showing city-level data from Google Analytics 4 because Google Ads only returned country-level rows for this account. Geographic breakdown by city requires a Google Ads developer token at Basic Access — apply at ads.google.com/aw/apicenter.
      </div>
      <div *ngIf="!usingGa4Fallback && usingCountryOnly" [ngStyle]="ga4NoticeStyle">
        Google Ads only returned country-level data for this account. Apply for Basic Access on your developer token (ads.google.com/aw/apicenter) and link a GA4 property to this client to surface city-level breakdown.
      </div>
      <div *ngIf="!usingGa4Fallback && !usingCountryOnly && usingLocationViewFallback" [ngStyle]="ga4NoticeStyle">
        Google Ads did not return visitor geography for this account, so this table is using targeted location performance from the account's location criteria.
      </div>
      <app-report-table [columns]="columns" [rows]="rows" [emptyLabel]="emptyLabel"></app-report-table>
    </app-report-page>
  `,
})
export class ReportGoogleGeographyPageComponent {
  @Input() details: any = null;
  @Input() loading = false;

  get accent() { return PLATFORM_META.google_ads.color; }
  get rawRows() { return this.details?.geographies || []; }
  get rows() { return this.rawRows.slice(0, 12); }
  get usingLocationViewFallback() { return this.rawRows.some((r: any) => r.source === "location_view"); }
  get usingGa4Fallback() { return this.rawRows.some((r: any) => r.source === "ga4"); }
  get usingCountryOnly() { return this.rawRows.length > 0 && this.rawRows.every((r: any) => r.source === "country_only"); }
  get geographyError() {
    return (this.details?.errors || []).find((e: any) => /geo|location/i.test(String(e)));
  }
  get emptyLabel() {
    return this.loading ? "Loading geographic performance..." : getGoogleGeographyEmptyLabel(this.geographyError);
  }
  get columns(): any[] {
    if (this.usingGa4Fallback) {
      return [
        { label: "City", render: (r: any) => r.location },
        { label: "Sessions", align: "right", render: (r: any) => formatReportNumber(r.sessions) },
        { label: "Users", align: "right", render: (r: any) => formatReportNumber(r.users) },
        { label: "Key Events", align: "right", render: (r: any) => formatReportNumber(r.keyEvents, 0) },
        { label: "Revenue", align: "right", render: (r: any) => formatReportCurrency(r.revenue) },
      ];
    }
    return [
      { label: "Location", render: (r: any) => r.location },
      { label: "Clicks", align: "right", render: (r: any) => formatReportNumber(r.clicks) },
      { label: "Conversions", align: "right", render: (r: any) => formatReportNumber(r.conversions, 2) },
      { label: "Conversion Cost", align: "right", render: (r: any) => formatReportCurrency(r.costPerConversion) },
      { label: "Total Conversion Value", align: "right", render: (r: any) => formatReportCurrency(r.conversionValue) },
    ];
  }
  ga4NoticeStyle = { marginBottom: "14px", padding: "10px 12px", borderRadius: "16px", background: "rgba(66, 133, 244, 0.08)", color: T.inkSoft, fontSize: "12px" };
}

@Component({
  selector: "app-report-google-device-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportBarChartComponent, ReportTableComponent],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header title="Device Performance" platform="google_ads"></app-report-header>
      <div [ngStyle]="layoutStyle">
        <app-report-bar-chart title="Conversions by device" [items]="bars" [color]="accent" axisType="number"></app-report-bar-chart>
        <app-report-table [columns]="columns" [rows]="rows" [emptyLabel]="emptyLabel"></app-report-table>
      </div>
    </app-report-page>
  `,
})
export class ReportGoogleDevicePageComponent {
  @Input() details: any = null;
  @Input() loading = false;
  get accent() { return PLATFORM_META.google_ads.color; }
  get rawRows() { return this.details?.devices || []; }
  get rows() { return this.rawRows.slice(0, 8); }
  get bars() { return this.rawRows.map((r: any) => ({ label: r.device, value: r.conversions || r.clicks || r.impressions })); }
  get columns(): any[] {
    return [
      { label: "Device", render: (r: any) => r.device },
      { label: "Clicks", align: "right", render: (r: any) => formatReportNumber(r.clicks) },
      { label: "Impressions", align: "right", render: (r: any) => formatReportNumber(r.impressions) },
      { label: "CTR (%)", align: "right", render: (r: any) => formatReportPercent(r.ctr) },
      { label: "Conversions", align: "right", render: (r: any) => formatReportNumber(r.conversions, 2) },
    ];
  }
  get emptyLabel() {
    return this.loading ? "Loading device performance..." : "Device performance is unavailable for the selected Google Ads account.";
  }
  layoutStyle = { display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "18px" };
}

@Component({
  selector: "app-report-google-impression-share-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportDualLineChartComponent],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header title="Impression Share Performance" platform="google_ads"></app-report-header>
      <ng-container *ngIf="rows.length; else empty">
        <app-report-dual-line-chart
          title="Search IS vs Search Budget Lost IS"
          [series]="rows"
          primaryMetric="searchImpressionShare"
          secondaryMetric="searchBudgetLostImpressionShare"
          primaryLabel="Search IS"
          secondaryLabel="Search Budget Lost IS"
          [primaryColor]="accent"
          [secondaryColor]="amber"
          axisType="percent"
        ></app-report-dual-line-chart>
      </ng-container>
      <ng-template #empty>
        <div [ngStyle]="emptyStyle">{{ emptyLabel }}</div>
      </ng-template>
    </app-report-page>
  `,
})
export class ReportGoogleImpressionSharePageComponent {
  @Input() details: any = null;
  @Input() loading = false;
  get accent() { return PLATFORM_META.google_ads.color; }
  amber = T.amber;
  get rows() { return this.details?.impressionShare || []; }
  get emptyLabel() {
    return this.loading ? "Loading impression share performance..." : "Search impression share is unavailable for this account or date range.";
  }
  emptyStyle = { padding: "24px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, color: T.inkSoft };
}

@Component({
  selector: "app-report-google-keyword-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportTableComponent],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header title="Keyword Performance (Top 10)" platform="google_ads"></app-report-header>
      <app-report-table [columns]="columns" [rows]="rows" [emptyLabel]="emptyLabel"></app-report-table>
    </app-report-page>
  `,
})
export class ReportGoogleKeywordPageComponent {
  @Input() details: any = null;
  @Input() loading = false;
  get accent() { return PLATFORM_META.google_ads.color; }
  get rows() { return (this.details?.keywords || []).slice(0, 10); }
  get columns(): any[] {
    return [
      { label: "Keyword", render: (r: any) => r.keyword },
      { label: "Clicks", align: "right", render: (r: any) => formatReportNumber(r.clicks) },
      { label: "Average CPC", align: "right", render: (r: any) => formatReportCurrency(r.averageCpc) },
      { label: "CTR (%)", align: "right", render: (r: any) => formatReportPercent(r.ctr) },
      { label: "Cost", align: "right", render: (r: any) => formatReportCurrency(r.cost) },
      { label: "Conversions", align: "right", render: (r: any) => formatReportNumber(r.conversions, 2) },
      { label: "Cost / Conversion", align: "right", render: (r: any) => formatReportCurrency(r.costPerConversion) },
      { label: "Value / Conv.", align: "right", render: (r: any) => formatReportCurrency(r.valuePerConversion) },
    ];
  }
  get emptyLabel() {
    return this.loading ? "Loading keyword performance..." : "Keyword performance is unavailable for this Google Ads account.";
  }
}

@Component({
  selector: "app-report-meta-ad-preview-card",
  standalone: true,
  imports: [CommonModule, ReportKpiTileComponent, ToneBadgeComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <div [ngStyle]="nameStyle">{{ ad.name }}</div>
        <app-tone-badge [tone]="statusTone">{{ ad.status }}</app-tone-badge>
      </div>
      <div [ngStyle]="previewStyle">
        <img *ngIf="ad.previewImageUrl; else noPreview"
             [src]="ad.previewImageUrl"
             [alt]="ad.name"
             referrerpolicy="no-referrer"
             [ngStyle]="imgStyle" />
        <ng-template #noPreview>
          <div [ngStyle]="placeholderStyle">
            <div [ngStyle]="placeholderTitleStyle">Preview unavailable</div>
            <div [ngStyle]="placeholderBodyStyle">Meta did not return a creative image for this ad, but its performance metrics are included below.</div>
          </div>
        </ng-template>
      </div>
      <div [ngStyle]="copyStyle">
        <div [ngStyle]="badgeRowStyle">
          <app-tone-badge tone="neutral">{{ ad.format || 'Ad' }}</app-tone-badge>
          <app-tone-badge *ngIf="ad.previewCallToAction" tone="positive">{{ ctaLabel }}</app-tone-badge>
        </div>
        <div *ngIf="ad.previewBody" [ngStyle]="bodyStyle">{{ ad.previewBody }}</div>
        <div *ngIf="ad.previewHeadline" [ngStyle]="headlineStyle">{{ ad.previewHeadline }}</div>
        <div *ngIf="ad.previewCaption" [ngStyle]="captionStyle">{{ ad.previewCaption }}</div>
      </div>
      <div [ngStyle]="kpiGridStyle">
        <app-report-kpi-tile label="Purchases" [value]="formatReportNumber(ad.conversions, 2)"></app-report-kpi-tile>
        <app-report-kpi-tile label="Cost / Purchase" [value]="formatReportCurrency(costPerPurchase)"></app-report-kpi-tile>
        <app-report-kpi-tile label="Purchase Value" [value]="formatReportCurrency(ad.conversionValue || 0)"></app-report-kpi-tile>
        <app-report-kpi-tile label="ROAS" [value]="formatMetric('roas', roas)"></app-report-kpi-tile>
        <app-report-kpi-tile label="Spend" [value]="formatReportCurrency(ad.spend)"></app-report-kpi-tile>
        <app-report-kpi-tile label="CTR (%)" [value]="formatReportPercent(ad.ctr)"></app-report-kpi-tile>
      </div>
    </div>
  `,
})
export class ReportMetaAdPreviewCardComponent {
  @Input() ad: any = {};
  formatReportNumber = formatReportNumber;
  formatReportCurrency = formatReportCurrency;
  formatReportPercent = formatReportPercent;
  formatMetric = formatMetric;

  get statusTone(): "neutral" | "warning" | "positive" {
    if (this.ad.status === "paused") return "neutral";
    if (this.ad.status === "learning") return "warning";
    return "positive";
  }
  get ctaLabel(): string { return formatMetaPreviewCta(this.ad.previewCallToAction); }
  get roas(): number { return this.ad.spend ? (Number(this.ad.conversionValue) || 0) / this.ad.spend : 0; }
  get costPerPurchase(): number { return this.ad.conversions ? this.ad.spend / this.ad.conversions : 0; }

  rootStyle = { padding: "18px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: "14px", alignContent: "start" };
  headStyle = { display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" };
  nameStyle = { fontSize: "15px", fontWeight: 900, color: T.ink, lineHeight: 1.25 };
  previewStyle = { borderRadius: "20px", overflow: "hidden", background: T.bgSoft, border: `1px solid ${T.line}`, minHeight: "340px", display: "grid", placeItems: "center" };
  imgStyle = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
  placeholderStyle = { padding: "24px", textAlign: "center", color: T.inkSoft, lineHeight: 1.5 };
  placeholderTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  placeholderBodyStyle = { marginTop: "6px", fontSize: "12px" };
  copyStyle = { display: "grid", gap: "8px" };
  badgeRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  bodyStyle = { fontSize: "12px", color: T.ink, lineHeight: 1.55 };
  headlineStyle = { fontSize: "18px", fontWeight: 900, fontFamily: T.heading, color: T.ink, letterSpacing: "-0.04em", lineHeight: 1.08 };
  captionStyle = { fontSize: "11px", color: T.inkSoft };
  kpiGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" };
}

@Component({
  selector: "app-report-ads-table-page",
  standalone: true,
  imports: [
    CommonModule, ReportPageComponent, ReportHeaderComponent, ReportTableComponent,
    ReportMetaAdPreviewCardComponent,
  ],
  template: `
    <ng-container *ngIf="!rows.length; else withRows">
      <app-report-page [accent]="accent">
        <app-report-header title="Ads Performance" platform="meta_ads"></app-report-header>
        <div [ngStyle]="emptyStyle">No Meta ad-level rows were found for this client.</div>
      </app-report-page>
    </ng-container>
    <ng-template #withRows>
      <ng-container *ngIf="!hasCreativePreview; else withPreviews">
        <app-report-page [accent]="accent">
          <app-report-header title="Ads Performance" platform="meta_ads"></app-report-header>
          <app-report-table [columns]="columns" [rows]="rows" emptyLabel="No Meta ad-level rows were found for this client."></app-report-table>
        </app-report-page>
      </ng-container>
      <ng-template #withPreviews>
        <app-report-page *ngFor="let pageAds of pages; let i = index" [accent]="accent">
          <app-report-header [title]="i === 0 ? 'Ads Performance' : 'Ads Performance (cont.)'" platform="meta_ads"></app-report-header>
          <div [ngStyle]="gridStyleFor(pageAds)">
            <app-report-meta-ad-preview-card *ngFor="let ad of pageAds" [ad]="ad"></app-report-meta-ad-preview-card>
          </div>
        </app-report-page>
      </ng-template>
    </ng-template>
  `,
})
export class ReportAdsTablePageComponent {
  @Input() ads: any[] = [];
  get accent() { return PLATFORM_META.meta_ads.color; }
  get rows() { return (this.ads || []).slice(0, 10); }
  get hasCreativePreview(): boolean { return this.rows.some((r: any) => r.previewImageUrl); }
  get pages(): any[][] { return chunkReportItems(this.rows, 2); }
  get columns(): any[] {
    return [
      { label: "Ad name", render: (r: any) => r.name },
      { label: "Impressions", align: "right", render: (r: any) => formatReportNumber(r.impressions) },
      { label: "Clicks", align: "right", render: (r: any) => formatReportNumber(r.clicks) },
      { label: "Reach", align: "right", render: (r: any) => formatReportNumber(r.reach) },
      { label: "Purchases", align: "right", render: (r: any) => formatReportNumber(r.conversions, 2) },
      { label: "Cost / Purchase", align: "right", render: (r: any) => formatReportCurrency(r.conversions ? r.spend / r.conversions : 0) },
      { label: "Purchase Value", align: "right", render: (r: any) => formatReportCurrency(r.conversionValue || 0) },
      { label: "ROAS", align: "right", render: (r: any) => formatMetric("roas", r.spend ? (r.conversionValue || 0) / r.spend : 0) },
      { label: "Spend", align: "right", render: (r: any) => formatReportCurrency(r.spend) },
    ];
  }
  emptyStyle = { padding: "24px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, color: T.inkSoft };
  gridStyleFor(pageAds: any[]) {
    return { display: "grid", gridTemplateColumns: pageAds.length === 1 ? "1fr" : "1fr 1fr", gap: "18px" };
  }
}

@Component({
  selector: "app-report-analytics-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportKpiTileComponent, ReportBarChartComponent],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header title="Analytics Performance" platform="ga4"></app-report-header>
      <div [ngStyle]="layoutStyle">
        <div [ngStyle]="kpiGridStyle">
          <app-report-kpi-tile label="Sessions" [value]="formatReportNumber(ga4.sessions)"></app-report-kpi-tile>
          <app-report-kpi-tile label="Users" [value]="formatReportNumber(ga4.users)"></app-report-kpi-tile>
          <app-report-kpi-tile label="Engaged Rate" [value]="formatReportPercent(ga4.engagedRate)"></app-report-kpi-tile>
          <app-report-kpi-tile label="Conv. Rate" [value]="formatReportPercent(ga4.conversionRate)"></app-report-kpi-tile>
          <app-report-kpi-tile [label]="client?.category === 'eshop' ? 'Revenue' : 'Leads'"
                              [value]="client?.category === 'eshop' ? formatReportCurrency(ga4.revenueCurrentPeriod) : formatReportNumber(ga4.purchasesOrLeads, 2)"></app-report-kpi-tile>
        </div>
        <app-report-bar-chart title="Traffic mix" [items]="channels" [color]="accent" axisType="percent"></app-report-bar-chart>
      </div>
    </app-report-page>
  `,
})
export class ReportAnalyticsPageComponent {
  @Input() client: any = {};
  @Input() ga4: any = {};
  formatReportNumber = formatReportNumber;
  formatReportCurrency = formatReportCurrency;
  formatReportPercent = formatReportPercent;
  get accent() { return PLATFORM_META.ga4.color; }
  get channels(): any[] {
    return Object.entries(this.ga4?.channels || {}).map(([label, value]: any) => ({ label, value }));
  }
  layoutStyle = { display: "grid", gap: "20px" };
  kpiGridStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px" };
}

@Component({
  selector: "app-report-definitions-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportTableComponent],
  template: `
    <app-report-page [accent]="ink">
      <app-report-header title="Metric Definitions"></app-report-header>
      <app-report-table [columns]="columns" [rows]="rows" emptyLabel=""></app-report-table>
    </app-report-page>
  `,
})
export class ReportDefinitionsPageComponent {
  ink = T.ink;
  rows = [
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
  columns = [
    { label: "Metric", render: (r: any) => r[0] },
    { label: "Description", render: (r: any) => r[1] },
  ];
}

@Component({
  selector: "app-report-executive-summary-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ReportKpiTileComponent],
  template: `
    <app-report-page [accent]="accent">
      <app-report-header title="Executive Summary"></app-report-header>
      <div [ngStyle]="stackStyle">
        <div [ngStyle]="kpiRowStyle">
          <app-report-kpi-tile label="Spend" [value]="formatReportCurrency(totalSummary.spend)" [subValue]="formatReportPercent(budgetPace) + ' of client budget'"></app-report-kpi-tile>
          <app-report-kpi-tile label="Conv. Value" [value]="formatReportCurrency(totalSummary.conversionValue)"></app-report-kpi-tile>
          <app-report-kpi-tile label="ROAS" [value]="formatMetric('roas', totalSummary.roas)"></app-report-kpi-tile>
          <app-report-kpi-tile label="Conversions" [value]="formatReportNumber(totalSummary.conversions, 2)"></app-report-kpi-tile>
          <app-report-kpi-tile label="Date Range" [value]="dateRangeLabel"></app-report-kpi-tile>
        </div>

        <div [ngStyle]="duoStyle">
          <div [ngStyle]="cardStyle">
            <div [ngStyle]="cardTitleStyle">What needs attention</div>
            <ng-container *ngIf="flags.length; else allClear">
              <div *ngFor="let flag of flags" [ngStyle]="flagStyle(flag)">
                <div [ngStyle]="flagLabelStyle(flag)">{{ flag.label }}</div>
                <div [ngStyle]="flagDetailStyle">{{ flag.detail }}</div>
              </div>
            </ng-container>
            <ng-template #allClear>
              <div [ngStyle]="okBoxStyle">No active dashboard red flags for this client in the selected period.</div>
            </ng-template>
          </div>

          <div [ngStyle]="cardStyle">
            <div [ngStyle]="cardTitleStyle">Focus for the next review</div>
            <div *ngFor="let bullet of focusBullets" [ngStyle]="bulletRowStyle">
              <span [ngStyle]="bulletDotStyle(bullet)"></span>
              <span>
                <span [ngStyle]="bulletTitleStyle">{{ bullet.title }}</span>
                <span [ngStyle]="bulletBodyStyle">{{ bullet.body }}</span>
              </span>
            </div>
          </div>
        </div>

        <div [ngStyle]="duoStyle">
          <div [ngStyle]="cardStyle">
            <div [ngStyle]="cardTitleStyle">Best performing campaigns</div>
            <ng-container *ngIf="topCampaigns.length; else noTop">
              <div *ngFor="let c of topCampaigns" [ngStyle]="rowStyle">
                <div>
                  <div [ngStyle]="rowNameStyle">{{ c.name }}</div>
                  <div [ngStyle]="rowSubStyle">{{ platformLabel(c.platform) }} | {{ formatReportCurrency(c.spend || 0) }} spend</div>
                </div>
                <div [ngStyle]="rowMetricStyle">{{ formatMetric('roas', roasOf(c)) }}</div>
              </div>
            </ng-container>
            <ng-template #noTop>
              <div [ngStyle]="emptyRowStyle">No campaign rows available.</div>
            </ng-template>
          </div>
          <div [ngStyle]="cardStyle">
            <div [ngStyle]="cardTitleStyle">Campaigns to inspect</div>
            <ng-container *ngIf="concernCampaigns.length; else noConcern">
              <div *ngFor="let c of concernCampaigns" [ngStyle]="rowStyle">
                <div>
                  <div [ngStyle]="rowNameStyle">{{ c.name }}</div>
                  <div [ngStyle]="rowSubStyle">{{ platformLabel(c.platform) }} | {{ formatReportCurrency(c.spend || 0) }} spend</div>
                </div>
                <div [ngStyle]="rowMetricStyle">{{ formatMetric('roas', roasOf(c)) }}</div>
              </div>
            </ng-container>
            <ng-template #noConcern>
              <div [ngStyle]="emptyRowStyle">No campaign concerns detected from available rows.</div>
            </ng-template>
          </div>
        </div>
      </div>
    </app-report-page>
  `,
})
export class ReportExecutiveSummaryPageComponent {
  @Input() client: any = {};
  @Input() dateRangeLabel = "";
  @Input() totalSummary: any = { spend: 0, conversions: 0, conversionValue: 0, roas: 0 };
  @Input() googleSummary: any = { spend: 0, roas: 0 };
  @Input() metaSummary: any = { spend: 0, roas: 0 };
  @Input() campaigns: any[] = [];
  @Input() googleDetails: any = null;

  formatReportCurrency = formatReportCurrency;
  formatReportNumber = formatReportNumber;
  formatReportPercent = formatReportPercent;
  formatMetric = formatMetric;
  accent = T.accent;

  get flags(): any[] { return (this.client?.health?.flags || []).slice(0, 5); }
  get budgetPace(): number { return this.client?.totalBudget ? (this.client.spend / this.client.totalBudget) * 100 : 0; }
  get bestChannel(): any {
    if (!this.googleSummary?.spend && !this.metaSummary?.spend) return null;
    return this.googleSummary.roas >= this.metaSummary.roas
      ? { label: "Google Ads", summary: this.googleSummary, color: PLATFORM_META.google_ads.color }
      : { label: "Meta Ads", summary: this.metaSummary, color: PLATFORM_META.meta_ads.color };
  }
  get geoAvailable(): boolean { return (this.googleDetails?.geographies || []).length > 0; }
  get topCampaigns(): any[] { return getReportTopCampaigns(this.campaigns); }
  get concernCampaigns(): any[] { return getReportConcernCampaigns(this.campaigns); }

  roasOf(campaign: any): number {
    const spend = Number(campaign?.spend) || 0;
    const cv = Number(campaign?.conversionValue) || 0;
    return spend ? cv / spend : 0;
  }
  platformLabel(platform: string): string { return (PLATFORM_META as any)[platform]?.label || platform; }

  get focusBullets(): any[] {
    const items: any[] = [];
    items.push({
      title: this.bestChannel ? `Protect ${this.bestChannel.label} efficiency` : "Add enough live data for channel comparison",
      body: this.bestChannel
        ? `${this.bestChannel.label} currently leads by ROAS at ${formatMetric("roas", this.bestChannel.summary.roas)} from ${formatReportCurrency(this.bestChannel.summary.spend)} spend.`
        : "The report needs linked live channel data before it can identify a leading channel.",
      color: this.bestChannel?.color || T.inkSoft,
    });
    items.push({
      title: this.geoAvailable ? "Use geographic data in the client conversation" : "Geography may need permission attention",
      body: this.geoAvailable
        ? `${this.googleDetails.geographies.length} geographic rows are available for local performance discussion.`
        : getGoogleGeographyEmptyLabel((this.googleDetails?.errors || []).find((e: any) => /geo|location/i.test(String(e)))),
      color: this.geoAvailable ? PLATFORM_META.google_ads.color : T.amber,
    });
    items.push({
      title: this.client?.ga4?.isLiveGa4 ? "Use GA4 as the measurement cross-check" : "GA4 is not live in this report",
      body: this.client?.ga4?.isLiveGa4
        ? `GA4 shows ${formatReportNumber(this.client.ga4.sessions)} sessions and ${formatReportCurrency(this.client.ga4.revenueCurrentPeriod)} revenue for the selected period.`
        : "Link a GA4 property to make the analytics page and attribution cross-checks live.",
      color: this.client?.ga4?.isLiveGa4 ? PLATFORM_META.ga4.color : T.amber,
    });
    return items;
  }

  stackStyle = { display: "grid", gap: "18px" };
  kpiRowStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px" };
  duoStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" };
  cardStyle = { padding: "20px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: "12px" };
  cardTitleStyle = { fontSize: "15px", fontWeight: 900, fontFamily: T.heading };
  flagStyle(flag: any) {
    return {
      padding: "12px",
      borderRadius: "16px",
      background: flag.tone === "warning" ? T.amberSoft : T.coralSoft,
      display: "grid",
      gap: "4px",
    };
  }
  flagLabelStyle(flag: any) {
    return { fontSize: "12px", fontWeight: 900, color: flag.tone === "warning" ? T.amber : T.coral };
  }
  flagDetailStyle = { fontSize: "11px", color: T.inkSoft, lineHeight: 1.45 };
  okBoxStyle = { padding: "14px", borderRadius: "16px", background: T.accentSoft, color: T.accent, fontSize: "12px", fontWeight: 800 };
  bulletRowStyle = { display: "grid", gridTemplateColumns: "10px 1fr", gap: "10px", alignItems: "start" };
  bulletDotStyle(bullet: any) {
    return { width: "10px", height: "10px", borderRadius: "50%", background: bullet.color, marginTop: "4px" };
  }
  bulletTitleStyle = { display: "block", fontSize: "12px", fontWeight: 900, color: T.ink };
  bulletBodyStyle = { display: "block", marginTop: "4px", fontSize: "11px", color: T.inkSoft, lineHeight: 1.45 };
  rowStyle = { display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", padding: "9px 0", borderBottom: `1px solid ${T.line}` };
  rowNameStyle = { fontSize: "12px", fontWeight: 900, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  rowSubStyle = { marginTop: "4px", fontSize: "10px", color: T.inkSoft };
  rowMetricStyle = { textAlign: "right", fontFamily: T.mono, fontSize: "11px", color: T.ink };
  emptyRowStyle = { padding: "14px", borderRadius: "16px", background: T.bgSoft, color: T.inkSoft, fontSize: "12px" };
}

// ─── Cover ─────────────────────────────────────────────────────────────
@Component({
  selector: "app-report-cover-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportKpiTileComponent],
  template: `
    <app-report-page [accent]="accent">
      <div [ngStyle]="rootStyle">
        <div [ngStyle]="topStackStyle">
          <div [ngStyle]="brandRowStyle">
            <div [ngStyle]="logoStyle">{{ logoText }}</div>
            <div>
              <div [ngStyle]="titleStyle">{{ client?.name }}</div>
              <div [ngStyle]="subtitleStyle">Campaign Performance Report</div>
            </div>
          </div>

          <div [ngStyle]="windowGridStyle">
            <div [ngStyle]="windowPanelStyle">
              <div [ngStyle]="windowKickerStyle">Reporting window</div>
              <div [ngStyle]="windowDateStyle">{{ dateRangeLabel }}</div>
              <div [ngStyle]="windowBodyStyle">
                Generated from linked dashboard campaign data. The report mirrors the monthly client report format with channel KPIs, campaign rankings, ad performance and metric definitions.
              </div>
            </div>
            <div [ngStyle]="primaryKpiGridStyle">
              <app-report-kpi-tile label="Spend" [value]="formatReportCurrency(totalSummary.spend)"></app-report-kpi-tile>
              <app-report-kpi-tile label="Clicks" [value]="formatReportNumber(totalSummary.clicks)"></app-report-kpi-tile>
              <app-report-kpi-tile label="Conversions" [value]="formatReportNumber(totalSummary.conversions, 2)"></app-report-kpi-tile>
              <app-report-kpi-tile label="ROAS" [value]="formatMetric('roas', totalSummary.roas)"></app-report-kpi-tile>
            </div>
          </div>

          <div [ngStyle]="secondaryKpiGridStyle">
            <app-report-kpi-tile label="Reporting Group" [value]="reportingGroupLabel"></app-report-kpi-tile>
            <app-report-kpi-tile label="Client Target" [value]="clientTargetLabel"></app-report-kpi-tile>
            <app-report-kpi-tile label="Channels" [value]="channelLabel"></app-report-kpi-tile>
          </div>
        </div>
        <div [ngStyle]="footerStyle">
          <div>{{ channelLabel }}</div>
          <div>Generated {{ generatedAt }}</div>
        </div>
      </div>
    </app-report-page>
  `,
})
export class ReportCoverPageComponent {
  @Input() client: any = {};
  @Input() dateRangeLabel = "";
  @Input() totalSummary: any = { spend: 0, clicks: 0, conversions: 0, conversionValue: 0, roas: 0 };
  @Input() channelLabel = "No linked channels";

  formatReportCurrency = formatReportCurrency;
  formatReportNumber = formatReportNumber;
  formatMetric = formatMetric;
  accent = T.ink;

  get logoText(): string {
    if (this.client?.logoText) return this.client.logoText;
    const name = String(this.client?.name || "").trim();
    if (!name) return "AP";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  get reportingGroupLabel(): string {
    return String(this.client?.reportingGroup || this.client?.name || "Ungrouped");
  }
  get clientTargetLabel(): string {
    return String(this.client?.focus || "Conversions");
  }
  get generatedAt(): string {
    return getReportDateStamp();
  }

  rootStyle = { display: "grid", gridTemplateRows: "1fr auto", minHeight: "690px" };
  topStackStyle = { display: "grid", alignContent: "center", gap: "24px" };
  brandRowStyle = { display: "flex", alignItems: "center", gap: "16px" };
  logoStyle = {
    width: "68px",
    height: "68px",
    borderRadius: "22px",
    background: `linear-gradient(135deg, ${T.accent}, ${T.sky})`,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: T.heading,
    fontWeight: 800,
    fontSize: "22px",
    letterSpacing: "-0.04em",
    flexShrink: 0,
  };
  titleStyle = { fontSize: "48px", lineHeight: 1, fontWeight: 800, fontFamily: T.heading, letterSpacing: "-0.07em" };
  subtitleStyle = { marginTop: "10px", fontSize: "17px", color: T.inkSoft };

  windowGridStyle = { display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: "24px", alignItems: "stretch" };
  windowPanelStyle = {
    padding: "28px",
    borderRadius: "28px",
    background: "linear-gradient(135deg, #162218, #214e40)",
    color: "#fff",
    display: "grid",
    gap: "18px",
  };
  windowKickerStyle = {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    opacity: 0.78,
    fontWeight: 800,
  };
  windowDateStyle = { fontSize: "38px", fontFamily: T.heading, fontWeight: 800, letterSpacing: "-0.06em" };
  windowBodyStyle = { fontSize: "13px", lineHeight: 1.6, opacity: 0.82 };

  primaryKpiGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" };
  secondaryKpiGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" };

  footerStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    color: T.inkSoft,
    fontSize: "12px",
  };
}


// ─── Strategist diagnosis page (Claude) ────────────────────────────────
@Component({
  selector: "app-report-strategist-page",
  standalone: true,
  imports: [CommonModule, ReportPageComponent, ReportHeaderComponent, ToneBadgeComponent],
  template: `
    <app-report-page accent="#9966e8">
      <app-report-header title="Claude Strategist Diagnosis"></app-report-header>
      <ng-container *ngIf="strategy; else noResult">
        <div [ngStyle]="layoutStyle">
          <div [ngStyle]="topRowStyle">
            <div [ngStyle]="diagBoxStyle">
              <div [ngStyle]="diagLabelStyle">What is not working now</div>
              <div [ngStyle]="diagBodyStyle">{{ strategy.performanceDiagnosis }}</div>
            </div>
            <div [ngStyle]="nextActionStyle">
              <div [ngStyle]="nextActionLabelStyle">Next move</div>
              <div [ngStyle]="nextActionTitleStyle">{{ nextBestAction?.title || "No saved suggestion" }}</div>
              <div [ngStyle]="nextActionBodyStyle">{{ nextBestAction?.action || "Refresh the strategist before exporting." }}</div>
              <div *ngIf="nextBestAction?.expectedImpact" [ngStyle]="nextActionImpactStyle">Impact: {{ nextBestAction.expectedImpact }}</div>
            </div>
          </div>

          <div [ngStyle]="bottomRowStyle">
            <div [ngStyle]="cardStyle">
              <div [ngStyle]="cardTitleStyle">Next actions</div>
              <div *ngFor="let item of orderedRecommendations; let i = index" [ngStyle]="recRowStyle(i)">
                <div [ngStyle]="recHeadStyle">
                  <div [ngStyle]="recTitleStyle">{{ item.title }}</div>
                  <app-tone-badge [tone]="priorityTone(item.priority)">{{ priorityLabel(item.priority) }}</app-tone-badge>
                </div>
                <div [ngStyle]="recActionStyle">{{ item.action }}</div>
                <div [ngStyle]="recWhyStyle">{{ item.why }}</div>
              </div>
            </div>

            <div [ngStyle]="cardStyle">
              <div [ngStyle]="cardTitleStyle">Watchouts</div>
              <div *ngFor="let item of watchouts; let i = index" [ngStyle]="watchoutRowStyle">
                <span [ngStyle]="watchoutDotStyle"></span>
                <span>
                  <span [ngStyle]="watchoutTitleStyle">Watchout {{ i + 1 }}</span>
                  <span [ngStyle]="watchoutBodyStyle">{{ item }}</span>
                </span>
              </div>
              <div *ngIf="(strategy.budgetActions || []).length" [ngStyle]="budgetBoxStyle">
                <div [ngStyle]="budgetTitleStyle">Budget actions</div>
                <div *ngFor="let item of strategy.budgetActions.slice(0, 3)" [ngStyle]="budgetRowStyle">
                  <strong [ngStyle]="budgetChannelStyle">{{ item.channel }}:</strong> {{ item.direction }} {{ item.amountText }} | {{ item.why }}
                </div>
              </div>
            </div>
          </div>

          <div [ngStyle]="footerStyle">Client: {{ client?.name }} | Range: {{ dateRangeLabel }} | Generated {{ generatedAt }}</div>
        </div>
      </ng-container>
      <ng-template #noResult>
        <div [ngStyle]="emptyStyle">
          No Claude strategist result is saved for {{ client?.name }} yet. Run the strategist from the Reports page before generating the PDF.
        </div>
      </ng-template>
    </app-report-page>
  `,
})
export class ReportStrategistPageComponent {
  @Input() client: any = {};
  @Input() dateRangeLabel = "";
  @Input() result: any = null;

  get strategy(): any { return this.result?.strategy || null; }
  get nextBestAction(): any { return this.strategy?.nextBestAction || null; }
  get orderedRecommendations(): any[] {
    return [this.nextBestAction, ...(this.strategy?.recommendations || [])].filter(Boolean).slice(0, 5);
  }
  get watchouts(): string[] { return (this.strategy?.watchouts || []).slice(0, 6); }
  get generatedAt(): string { return formatAiGeneratedAt(this.result?.generatedAt); }
  priorityTone(p: any) { return getAiPriorityTone(p); }
  priorityLabel(p: any) { return getAiPriorityLabel(p); }

  layoutStyle = { display: "grid", gap: "18px" };
  topRowStyle = { display: "grid", gridTemplateColumns: "1fr 0.8fr", gap: "18px" };
  diagBoxStyle = { padding: "22px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: "12px" };
  diagLabelStyle = { fontSize: "12px", color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900 };
  diagBodyStyle = { fontSize: "15px", color: T.ink, lineHeight: 1.65 };
  nextActionStyle = { padding: "22px", borderRadius: "24px", background: "linear-gradient(135deg, #221833, #4f2c7d)", color: "#fff", display: "grid", gap: "10px" };
  nextActionLabelStyle = { fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.78, fontWeight: 900 };
  nextActionTitleStyle = { fontSize: "22px", fontFamily: T.heading, fontWeight: 900, letterSpacing: "-0.04em" };
  nextActionBodyStyle = { fontSize: "12px", lineHeight: 1.55, opacity: 0.84 };
  nextActionImpactStyle = { fontSize: "11px", opacity: 0.74 };

  bottomRowStyle = { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "18px" };
  cardStyle = { padding: "20px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, display: "grid", gap: "12px" };
  cardTitleStyle = { fontSize: "15px", fontWeight: 900, fontFamily: T.heading };
  recRowStyle(i: number) {
    return {
      padding: "12px",
      borderRadius: "16px",
      background: i === 0 ? T.accentSoft : T.bgSoft,
      display: "grid",
      gap: "5px",
    };
  }
  recHeadStyle = { display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" };
  recTitleStyle = { fontSize: "12px", fontWeight: 900, color: T.ink };
  recActionStyle = { fontSize: "11px", color: T.inkSoft, lineHeight: 1.45 };
  recWhyStyle = { fontSize: "10px", color: T.inkMute, lineHeight: 1.4 };
  watchoutRowStyle = { display: "grid", gridTemplateColumns: "10px 1fr", gap: "10px", alignItems: "start" };
  watchoutDotStyle = { width: "10px", height: "10px", borderRadius: "50%", background: T.coral, marginTop: "4px" };
  watchoutTitleStyle = { display: "block", fontSize: "12px", fontWeight: 900, color: T.ink };
  watchoutBodyStyle = { display: "block", marginTop: "4px", fontSize: "11px", color: T.inkSoft, lineHeight: 1.45 };
  budgetBoxStyle = { padding: "12px", borderRadius: "16px", background: T.bgSoft, display: "grid", gap: "8px" };
  budgetTitleStyle = { fontSize: "12px", fontWeight: 900, color: T.ink };
  budgetRowStyle = { fontSize: "11px", color: T.inkSoft, lineHeight: 1.45 };
  budgetChannelStyle = { color: T.ink };
  footerStyle = { fontSize: "11px", color: T.inkSoft };
  emptyStyle = { padding: "26px", borderRadius: "24px", background: "#fff", border: `1px solid ${T.line}`, color: T.inkSoft, lineHeight: 1.6 };
}

// ─── Top-level orchestrator ───────────────────────────────────────────
@Component({
  selector: "app-campaign-report-document",
  standalone: true,
  imports: [
    CommonModule,
    ReportCoverPageComponent,
    ReportExecutiveSummaryPageComponent,
    ReportChannelOverviewComponent,
    ReportCampaignTablePageComponent,
    ReportGoogleGeographyPageComponent,
    ReportGoogleDevicePageComponent,
    ReportGoogleImpressionSharePageComponent,
    ReportGoogleKeywordPageComponent,
    ReportAdsTablePageComponent,
    ReportAnalyticsPageComponent,
    ReportDefinitionsPageComponent,
    ReportStrategistPageComponent,
  ],
  template: `
    <div class="report-print-root" [ngStyle]="rootStyle">
      <app-report-cover-page *ngIf="has('cover')"
        [client]="client" [dateRangeLabel]="dateRangeLabel"
        [totalSummary]="totalSummary" [channelLabel]="channelLabel"
      ></app-report-cover-page>

      <app-report-executive-summary-page *ngIf="has('executive_summary')"
        [client]="client" [dateRangeLabel]="dateRangeLabel"
        [totalSummary]="totalSummary" [googleSummary]="googleSummary" [metaSummary]="metaSummary"
        [campaigns]="campaigns" [googleDetails]="googleDetails"
      ></app-report-executive-summary-page>

      <app-report-strategist-page *ngIf="has('strategist') && strategistResult"
        [client]="client" [dateRangeLabel]="dateRangeLabel" [result]="strategistResult"
      ></app-report-strategist-page>

      <app-report-channel-overview *ngIf="has('google_overview')"
        title="Google Ads Performance Overview" platform="google_ads"
        [summary]="googleSummary" [series]="googleSeries" [campaigns]="googleCampaigns"
        [empty]="!googleCampaigns.length && !googleSummary.spend"
      ></app-report-channel-overview>

      <app-report-google-geography-page *ngIf="has('google_geo')"
        [details]="googleDetails" [loading]="googleReportState?.loading"
      ></app-report-google-geography-page>

      <app-report-google-device-page *ngIf="has('google_device')"
        [details]="googleDetails" [loading]="googleReportState?.loading"
      ></app-report-google-device-page>

      <app-report-google-impression-share-page *ngIf="has('google_impression_share')"
        [details]="googleDetails" [loading]="googleReportState?.loading"
      ></app-report-google-impression-share-page>

      <app-report-campaign-table-page *ngIf="has('google_campaigns')"
        title="Google Campaign Performance" platform="google_ads"
        [campaigns]="googleCampaigns" emptyLabel="No linked Google Ads campaigns were found for this client."
      ></app-report-campaign-table-page>

      <app-report-google-keyword-page *ngIf="has('google_keywords')"
        [details]="googleDetails" [loading]="googleReportState?.loading"
      ></app-report-google-keyword-page>

      <app-report-channel-overview *ngIf="has('meta_overview')"
        title="Facebook Ads Performance Overview" platform="meta_ads"
        [summary]="metaSummary" [series]="metaSeries" [campaigns]="metaCampaigns"
        [empty]="!metaCampaigns.length && !metaSummary.spend"
      ></app-report-channel-overview>

      <app-report-campaign-table-page *ngIf="has('meta_campaigns')"
        title="Facebook Campaign Performance" platform="meta_ads"
        [campaigns]="metaCampaigns" emptyLabel="No linked Meta Ads campaigns were found for this client."
      ></app-report-campaign-table-page>

      <app-report-ads-table-page *ngIf="has('meta_ads')" [ads]="metaAds"></app-report-ads-table-page>

      <app-report-analytics-page *ngIf="has('analytics') && client?.ga4"
        [client]="client" [ga4]="client.ga4"
      ></app-report-analytics-page>

      <app-report-definitions-page *ngIf="has('definitions')"></app-report-definitions-page>
    </div>
  `,
})
export class CampaignReportDocumentComponent {
  @Input() client: any = {};
  @Input() seriesMap: any = {};
  @Input() dateRangeLabel = "";
  @Input() googleReportState: any = { loading: false, details: [] };
  @Input() selectedSections: string[] = [];
  @Input() strategistResult: any = null;

  has(id: string): boolean {
    return Array.isArray(this.selectedSections) && this.selectedSections.includes(id);
  }

  get googleCampaigns(): any[] {
    return (this.client?.campaigns || []).filter((c: any) => c.platform === "google_ads");
  }
  get metaCampaigns(): any[] {
    return (this.client?.campaigns || []).filter((c: any) => c.platform === "meta_ads");
  }
  get metaAds(): any[] {
    return (this.client?.ads || []).filter((a: any) => a.platform === "meta_ads");
  }
  get campaigns(): any[] { return this.client?.campaigns || []; }
  get totalSummary() { return summarizeReportMetrics(this.client?.accounts || []); }
  get googleSummary() {
    return summarizeReportMetrics((this.client?.accounts || []).filter((a: any) => a.platform === "google_ads"));
  }
  get metaSummary() {
    return summarizeReportMetrics((this.client?.accounts || []).filter((a: any) => a.platform === "meta_ads"));
  }
  get googleSeries() { return getPlatformReportSeries(this.client, "google_ads", this.seriesMap); }
  get metaSeries() { return getPlatformReportSeries(this.client, "meta_ads", this.seriesMap); }
  get hasGoogle(): boolean {
    return ((this.client?.accounts || []).filter((a: any) => a.platform === "google_ads").length > 0);
  }
  get hasMeta(): boolean {
    return ((this.client?.accounts || []).filter((a: any) => a.platform === "meta_ads").length > 0);
  }
  get channelLabel(): string {
    const parts = [
      this.hasGoogle ? "Google Ads" : "",
      this.hasMeta ? "Meta Ads" : "",
      this.client?.ga4 ? "GA4" : "",
    ].filter(Boolean);
    return parts.length ? parts.join(" + ") : "No linked channels";
  }
  get googleDetails() {
    return aggregateGoogleReportDetails(this.googleReportState?.details || [], this.client?.id);
  }

  rootStyle = { display: "grid", gap: "26px", justifyItems: "center" };
}
