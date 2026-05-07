// Print-friendly rendering of the user's custom Drag-and-Drop widgets.
// Mirrors the canvas's preview output but in a layout suitable for the PDF
// (no controls, no drag affordances, no config drawer).
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import {
  KPI_LIBRARY,
  T,
  WIDGET_KIND_OPTIONS,
  buildWidgetPieSlices,
  buildWidgetSeries,
  buildWidgetTableRows,
  comparisonMultiplier,
  formatMetric,
  formatPercent,
  resolveWidgetSourceItems,
  sumMetric,
} from "../foundation/adpulse-foundation";

@Component({
  selector: "app-report-custom-widgets-page",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="ref-report-page" [ngStyle]="pageStyle">
      <header [ngStyle]="headerStyle">
        <div [ngStyle]="kickerStyle">Custom report widgets</div>
        <div [ngStyle]="titleStyle">{{ client?.name || 'Client' }} — Tailored insights</div>
        <div [ngStyle]="subtitleStyle">{{ dateRangeLabel }} · {{ widgets.length }} widget{{ widgets.length === 1 ? '' : 's' }}</div>
      </header>

      <div [ngStyle]="gridStyle">
        <article *ngFor="let widget of widgets" [ngStyle]="cardStyle(widget)">
          <header [ngStyle]="cardHeadStyle">
            <div [ngStyle]="cardIconStyle">{{ kindOf(widget).icon }}</div>
            <div>
              <div [ngStyle]="cardTitleStyle">{{ widget.title || kindOf(widget).label }}</div>
              <div [ngStyle]="cardSubtitleStyle">{{ kindOf(widget).label }} · {{ vizLabel(widget) }}</div>
            </div>
          </header>

          <ng-container [ngSwitch]="widget.kind">
            <!-- KPI -->
            <div *ngSwitchCase="'kpi'" [ngStyle]="kpiStyle">
              <div [ngStyle]="kpiLabelStyle">{{ kpiLabel(widget) }}</div>
              <div [ngStyle]="kpiValueStyle(widget)">{{ kpiValue(widget) }}</div>
              <div *ngIf="widget.comparison !== 'none'" [ngStyle]="kpiDeltaStyle">{{ kpiDelta(widget) }}</div>
            </div>

            <!-- Chart -->
            <div *ngSwitchCase="'chart'" [ngStyle]="chartStyle">
              <svg viewBox="0 0 320 110" [ngStyle]="svgStyle" preserveAspectRatio="none">
                <ng-container *ngFor="let series of seriesFor(widget); let si = index">
                  <ng-container [ngSwitch]="widget.viz">
                    <polyline *ngSwitchCase="'line'" fill="none"
                      [attr.stroke]="series.color" stroke-width="2"
                      [attr.points]="seriesPolylinePoints(series, widget)"></polyline>
                    <path *ngSwitchCase="'area'"
                      [attr.fill]="series.color + '33'"
                      [attr.stroke]="series.color"
                      stroke-width="2"
                      [attr.d]="seriesAreaPath(series, widget)"></path>
                    <ng-container *ngSwitchCase="'bar'">
                      <rect *ngFor="let bar of seriesBars(series, widget, si)"
                        [attr.x]="bar.x" [attr.y]="bar.y"
                        [attr.width]="bar.w" [attr.height]="bar.h"
                        [attr.fill]="series.color" rx="1"></rect>
                    </ng-container>
                  </ng-container>
                </ng-container>
              </svg>
              <div [ngStyle]="legendStyle">
                <span *ngFor="let series of seriesFor(widget)" [ngStyle]="legendItemStyle">
                  <span [ngStyle]="legendDotStyle(series.color)"></span>{{ series.label }}
                </span>
              </div>
            </div>

            <!-- Pie -->
            <div *ngSwitchCase="'pie'" [ngStyle]="pieWrapStyle">
              <svg viewBox="0 0 120 120" [ngStyle]="pieSvgStyle">
                <g transform="translate(60 60)">
                  <ng-container *ngFor="let slice of pieSlicesGeo(widget)">
                    <path [attr.d]="slice.path" [attr.fill]="slice.color"></path>
                  </ng-container>
                  <circle *ngIf="widget.viz === 'donut'" r="26" fill="#fff"></circle>
                </g>
              </svg>
              <div [ngStyle]="pieLegendStyle">
                <div *ngFor="let slice of pieSlicesGeo(widget)" [ngStyle]="pieLegendRowStyle">
                  <span [ngStyle]="legendDotStyle(slice.color)"></span>
                  <span [ngStyle]="pieLegendLabelStyle">{{ slice.label }}</span>
                  <strong>{{ formatMetricValue(widget.metric, slice.value) }}</strong>
                </div>
              </div>
            </div>

            <!-- Table -->
            <div *ngSwitchCase="'table'" [ngStyle]="tableWrapStyle">
              <table [ngStyle]="tableStyle">
                <thead>
                  <tr>
                    <th *ngFor="let col of tableData(widget).columns" [ngStyle]="tableHeadStyle">{{ col.label }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of tableData(widget).rows">
                    <td [ngStyle]="tableCellStyle">{{ row.name }}</td>
                    <td *ngFor="let col of tableData(widget).columns.slice(1); let ci = index"
                        [ngStyle]="tableCellNumStyle">
                      {{ formatMetricValue(col.metric, row.cells[ci]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ng-container>
        </article>
      </div>
    </section>
  `,
})
export class ReportCustomWidgetsPageComponent {
  @Input() widgets: any[] = [];
  @Input() client: any = null;
  @Input() seriesMap: any = {};
  @Input() dateRangeLabel = "";

  formatMetricValue = (metricKey: string, value: number) => formatMetric(metricKey, Number(value) || 0);

  kindOf(widget: any) {
    return WIDGET_KIND_OPTIONS.find((k) => k.id === widget.kind) || WIDGET_KIND_OPTIONS[0];
  }
  vizLabel(widget: any): string {
    return ({
      value: "Single value",
      speedometer: "Speedometer",
      line: "Line chart",
      bar: "Bar chart",
      area: "Area chart",
      pie: "Pie",
      donut: "Donut",
      table: "Table",
    } as any)[widget.viz] || widget.viz;
  }
  kpiLabel(widget: any) { return KPI_LIBRARY[widget.metric]?.label || widget.metric; }
  kpiValue(widget: any) {
    const items = resolveWidgetSourceItems(widget, this.client);
    return formatMetric(widget.metric, sumMetric(items, widget.metric));
  }
  kpiColor(widget: any) {
    return KPI_LIBRARY[widget.metric]?.color || T.accent;
  }
  kpiDelta(widget: any) {
    const items = resolveWidgetSourceItems(widget, this.client);
    const value = sumMetric(items, widget.metric);
    const mult = comparisonMultiplier(widget.comparison);
    if (!mult || !value) return "—";
    const previous = value * mult;
    if (previous === 0) return "";
    const pct = ((value - previous) / previous) * 100;
    const arrow = pct >= 0 ? "▲" : "▼";
    const tag = widget.comparison === "yoy" ? "vs LY" : "vs prev";
    return `${arrow} ${formatPercent(Math.abs(pct), 1)} ${tag}`;
  }

  // Chart helpers (mirror canvas geometry)
  seriesFor(widget: any) {
    return buildWidgetSeries(widget, this.client, this.seriesMap || {});
  }
  private chartMax(widget: any): number {
    const all = this.seriesFor(widget).flatMap((s: any) => s.points.map((p: any) => p.value));
    return all.length ? Math.max(...all, 1) : 1;
  }
  seriesPolylinePoints(series: any, widget: any) {
    if (!series.points.length) return "";
    const max = this.chartMax(widget);
    const w = 320;
    const h = 100;
    const step = series.points.length > 1 ? w / (series.points.length - 1) : w;
    return series.points
      .map((p: any, idx: number) => `${(idx * step).toFixed(1)},${(h - (p.value / max) * (h - 10)).toFixed(1)}`)
      .join(" ");
  }
  seriesAreaPath(series: any, widget: any) {
    if (!series.points.length) return "";
    const max = this.chartMax(widget);
    const w = 320;
    const h = 100;
    const step = series.points.length > 1 ? w / (series.points.length - 1) : w;
    const segs = series.points
      .map((p: any, idx: number) => `${idx === 0 ? "M" : "L"} ${(idx * step).toFixed(1)} ${(h - (p.value / max) * (h - 10)).toFixed(1)}`)
      .join(" ");
    return `${segs} L ${w} ${h} L 0 ${h} Z`;
  }
  seriesBars(series: any, widget: any, seriesIndex: number) {
    if (!series.points.length) return [];
    const total = this.seriesFor(widget).length;
    const max = this.chartMax(widget);
    const w = 320;
    const h = 100;
    const groupWidth = w / series.points.length;
    const barWidth = Math.max(1, (groupWidth - 2) / total);
    return series.points.map((p: any, idx: number) => {
      const x = idx * groupWidth + barWidth * seriesIndex;
      const barH = (p.value / max) * (h - 10);
      return { x: x.toFixed(1), y: (h - barH).toFixed(1), w: barWidth.toFixed(1), h: barH.toFixed(1) };
    });
  }
  pieSlicesGeo(widget: any) {
    const slices = buildWidgetPieSlices(widget, this.client);
    const total = slices.reduce((acc: number, s: any) => acc + (Number(s.value) || 0), 0);
    if (total <= 0) return [];
    let cumulative = 0;
    const radius = 50;
    return slices.map((slice: any) => {
      const fraction = (Number(slice.value) || 0) / total;
      const startAngle = cumulative * Math.PI * 2;
      cumulative += fraction;
      const endAngle = cumulative * Math.PI * 2;
      const largeArc = fraction > 0.5 ? 1 : 0;
      const x1 = Math.cos(startAngle - Math.PI / 2) * radius;
      const y1 = Math.sin(startAngle - Math.PI / 2) * radius;
      const x2 = Math.cos(endAngle - Math.PI / 2) * radius;
      const y2 = Math.sin(endAngle - Math.PI / 2) * radius;
      const path =
        fraction >= 0.999
          ? `M 0 -${radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 -${radius} Z`
          : `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      return { ...slice, path };
    });
  }
  tableData(widget: any) {
    return buildWidgetTableRows(widget, this.client);
  }

  // ─── Styles ───────────────────────────────────────────
  pageStyle = {
    padding: "32px",
    background: "#fff",
    border: `1px solid ${T.line}`,
    borderRadius: "16px",
    display: "grid",
    gap: "20px",
    breakInside: "avoid",
  };
  headerStyle = { display: "grid", gap: "4px" };
  kickerStyle = { fontSize: "11px", fontWeight: 800, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.1em" };
  titleStyle = { fontSize: "22px", fontWeight: 900, fontFamily: T.heading, color: T.ink, letterSpacing: "-0.03em" };
  subtitleStyle = { fontSize: "12px", color: T.inkSoft };
  gridStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" };

  cardStyle(widget: any) {
    return {
      background: T.bgSoft,
      border: `1px solid ${T.line}`,
      borderRadius: "14px",
      padding: "14px",
      display: "grid",
      gap: "10px",
      gridColumn: widget.width === 2 ? "1 / -1" : "auto",
      breakInside: "avoid",
    };
  }
  cardHeadStyle = { display: "flex", alignItems: "center", gap: "10px" };
  cardIconStyle = {
    width: "30px",
    height: "30px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: "#fff",
    border: `1px solid ${T.line}`,
    fontSize: "15px",
  };
  cardTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.ink, fontFamily: T.heading };
  cardSubtitleStyle = { fontSize: "10px", color: T.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 };

  kpiStyle = { padding: "10px 12px", display: "grid", gap: "5px" };
  kpiLabelStyle = { fontSize: "11px", fontWeight: 800, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em" };
  kpiValueStyle(widget: any) {
    return { fontSize: "26px", fontWeight: 900, color: this.kpiColor(widget), fontFamily: T.heading, letterSpacing: "-0.04em" };
  }
  kpiDeltaStyle = { fontSize: "12px", color: T.inkSoft, fontWeight: 700 };

  chartStyle = { display: "grid", gap: "6px" };
  svgStyle = { width: "100%", height: "120px" };
  legendStyle = { display: "flex", flexWrap: "wrap", gap: "10px" };
  legendItemStyle = { display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: T.inkSoft, fontWeight: 700 };
  legendDotStyle(color: string) {
    return { width: "8px", height: "8px", borderRadius: "50%", background: color };
  }

  pieWrapStyle = { display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px", alignItems: "center" };
  pieSvgStyle = { width: "120px", height: "120px" };
  pieLegendStyle = { display: "grid", gap: "5px" };
  pieLegendRowStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: T.ink };
  pieLegendLabelStyle = { flex: "1 1 auto" };

  tableWrapStyle = { background: "#fff", border: `1px solid ${T.line}`, borderRadius: "10px", overflow: "hidden" };
  tableStyle = { width: "100%", borderCollapse: "collapse", fontFamily: T.font, fontSize: "11px" };
  tableHeadStyle = {
    padding: "6px 8px",
    background: T.bgSoft,
    color: T.inkMute,
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
    textAlign: "left",
    borderBottom: `1px solid ${T.line}`,
  };
  tableCellStyle = { padding: "6px 8px", color: T.ink, fontWeight: 700, borderBottom: `1px solid ${T.line}` };
  tableCellNumStyle = { padding: "6px 8px", color: T.ink, fontWeight: 700, borderBottom: `1px solid ${T.line}`, textAlign: "right" };
}
