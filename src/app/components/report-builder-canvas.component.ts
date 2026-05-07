// Drag-and-Drop report widget builder.
// Lets the user assemble custom widgets (KPI tiles, charts, pies, tables) for
// the active client's PDF report. State is persisted via the parent component
// (localStorage cache + server save).
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  KPI_LIBRARY,
  PLATFORM_META,
  T,
  WIDGET_COMPARISON_OPTIONS,
  WIDGET_KIND_OPTIONS,
  WIDGET_METRIC_KEYS,
  WIDGET_PIE_DIMENSION_OPTIONS,
  WIDGET_SCOPE_OPTIONS,
  WIDGET_TABLE_DIMENSION_OPTIONS,
  buildWidgetPieSlices,
  buildWidgetSeries,
  buildWidgetTableRows,
  comparisonMultiplier,
  createDefaultWidget,
  fitCols,
  formatCurrency,
  formatMetric,
  formatNumber,
  formatPercent,
  normalizeReportWidget,
  resolveWidgetSourceItems,
  sumMetric,
} from "../foundation/adpulse-foundation";
import {
  AppButtonComponent,
  EmptyStateComponent,
  ToneBadgeComponent,
} from "./primitives";

@Component({
  selector: "app-report-builder-canvas",
  standalone: true,
  imports: [CommonModule, FormsModule, AppButtonComponent, EmptyStateComponent, ToneBadgeComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <div>
          <div [ngStyle]="titleStyle">Drag-and-drop widget builder</div>
          <div [ngStyle]="leadStyle">
            Σύρε ένα widget στο canvas (ή πάτα Add) και ρύθμισε τι θα δείχνει και πώς. Τα widgets προστίθενται στο PDF report παρακάτω.
          </div>
        </div>
        <app-tone-badge tone="neutral">{{ widgets.length }} widget{{ widgets.length === 1 ? '' : 's' }}</app-tone-badge>
      </div>

      <div [ngStyle]="bodyStyle">
        <!-- Palette -->
        <aside [ngStyle]="paletteStyle">
          <div [ngStyle]="paletteTitleStyle">Widget palette</div>
          <button
            *ngFor="let kind of kindOptions"
            type="button"
            draggable="true"
            (dragstart)="onPaletteDragStart($event, kind.id)"
            (click)="addWidget(kind.id)"
            [ngStyle]="paletteTileStyle"
          >
            <div [ngStyle]="paletteIconStyle">{{ kind.icon }}</div>
            <div>
              <div [ngStyle]="paletteLabelStyle">{{ kind.label }}</div>
              <div [ngStyle]="paletteDescStyle">{{ kind.description }}</div>
            </div>
          </button>
          <div [ngStyle]="paletteHintStyle">Tip: ξεκίνα από KPI tiles για headline metrics και πρόσθεσε ένα Chart για trend.</div>
        </aside>

        <!-- Canvas -->
        <section
          [ngStyle]="canvasStyle"
          (dragover)="onCanvasDragOver($event)"
          (drop)="onCanvasDrop($event)"
        >
          <div *ngIf="!widgets.length" [ngStyle]="emptyStateStyle">
            <div [ngStyle]="emptyTitleStyle">Empty canvas</div>
            <div [ngStyle]="emptyBodyStyle">Σύρε εδώ ένα widget από την παλέτα ή πάτα Add για να ξεκινήσεις.</div>
          </div>

          <article
            *ngFor="let widget of widgets; let i = index"
            [ngStyle]="widgetCardStyle(widget, i === selectedIndex)"
            (click)="selectIndex(i)"
            draggable="true"
            (dragstart)="onWidgetDragStart($event, i)"
            (dragover)="onWidgetDragOver($event)"
            (drop)="onWidgetDrop($event, i)"
          >
            <header [ngStyle]="widgetHeadStyle">
              <div [ngStyle]="widgetIconStyle">{{ kindOf(widget).icon }}</div>
              <div [ngStyle]="widgetTitleColStyle">
                <div [ngStyle]="widgetTitleStyle">{{ widget.title || kindOf(widget).label }}</div>
                <div [ngStyle]="widgetSubtitleStyle">{{ scopeLabel(widget) }} · {{ kindOf(widget).label }} · {{ vizLabel(widget) }}</div>
              </div>
              <div [ngStyle]="widgetActionsStyle" (click)="$event.stopPropagation()">
                <button type="button" [disabled]="i === 0" (click)="moveWidget(i, -1)" [ngStyle]="iconButtonStyle">↑</button>
                <button type="button" [disabled]="i === widgets.length - 1" (click)="moveWidget(i, 1)" [ngStyle]="iconButtonStyle">↓</button>
                <button type="button" (click)="duplicateWidget(i)" [ngStyle]="iconButtonStyle">⎘</button>
                <button type="button" (click)="removeWidget(i)" [ngStyle]="iconRemoveStyle">×</button>
              </div>
            </header>

            <!-- Live preview -->
            <div [ngStyle]="previewStyle">
              <ng-container [ngSwitch]="widget.kind">
                <!-- KPI -->
                <div *ngSwitchCase="'kpi'" [ngStyle]="kpiPreviewStyle(widget)">
                  <div [ngStyle]="kpiLabelStyle">{{ kpiLabel(widget) }}</div>
                  <div [ngStyle]="kpiValueStyle(widget)">{{ kpiValue(widget) }}</div>
                  <div *ngIf="widget.comparison !== 'none'" [ngStyle]="kpiDeltaStyle(widget)">
                    {{ kpiDelta(widget) }}
                  </div>
                  <div *ngIf="widget.viz === 'speedometer'" [ngStyle]="speedometerWrapStyle">
                    <svg viewBox="0 0 120 70" [ngStyle]="speedometerSvgStyle" preserveAspectRatio="xMidYMid meet">
                      <path d="M10 60 A 50 50 0 0 1 110 60" fill="none" [attr.stroke]="T.line" stroke-width="10" stroke-linecap="round"></path>
                      <path d="M10 60 A 50 50 0 0 1 110 60" fill="none" [attr.stroke]="kpiColor(widget)" stroke-width="10" stroke-linecap="round"
                        [attr.stroke-dasharray]="speedometerDashArray(widget)"></path>
                      <line x1="60" y1="60" [attr.x2]="speedometerNeedleX(widget)" [attr.y2]="speedometerNeedleY(widget)" stroke="#162218" stroke-width="2" stroke-linecap="round"></line>
                      <circle cx="60" cy="60" r="4" [attr.fill]="kpiColor(widget)"></circle>
                    </svg>
                  </div>
                </div>

                <!-- Chart (line / bar / area) -->
                <div *ngSwitchCase="'chart'" [ngStyle]="chartWrapStyle">
                  <svg [attr.viewBox]="chartViewBox" [ngStyle]="chartSvgStyle" preserveAspectRatio="none">
                    <ng-container *ngFor="let series of seriesFor(widget); let si = index">
                      <ng-container [ngSwitch]="widget.viz">
                        <polyline *ngSwitchCase="'line'"
                          fill="none"
                          [attr.stroke]="series.color"
                          stroke-width="2"
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
                  <div [ngStyle]="chartLegendStyle">
                    <span *ngFor="let series of seriesFor(widget)" [ngStyle]="chartLegendItemStyle">
                      <span [ngStyle]="chartLegendDotStyle(series.color)"></span>{{ series.label }}
                    </span>
                  </div>
                  <div *ngIf="!seriesFor(widget).length" [ngStyle]="emptyHintStyle">No time-series data for this scope.</div>
                </div>

                <!-- Pie / donut -->
                <div *ngSwitchCase="'pie'" [ngStyle]="pieWrapStyle">
                  <svg viewBox="0 0 120 120" [ngStyle]="pieSvgStyle">
                    <g transform="translate(60 60)">
                      <ng-container *ngFor="let slice of pieSlicesWithGeometry(widget)">
                        <path [attr.d]="slice.path" [attr.fill]="slice.color"></path>
                      </ng-container>
                      <circle *ngIf="widget.viz === 'donut'" r="26" fill="#fff"></circle>
                    </g>
                  </svg>
                  <div [ngStyle]="pieLegendStyle">
                    <div *ngFor="let slice of pieSlicesWithGeometry(widget)" [ngStyle]="pieLegendRowStyle">
                      <span [ngStyle]="pieLegendDotStyle(slice.color)"></span>
                      <span [ngStyle]="pieLegendLabelStyle">{{ slice.label }}</span>
                      <strong [ngStyle]="pieLegendValueStyle">{{ formatMetricValue(widget.metric, slice.value) }}</strong>
                    </div>
                    <div *ngIf="!pieSlicesWithGeometry(widget).length" [ngStyle]="emptyHintStyle">No data for this slice dimension.</div>
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
                        <td *ngFor="let col of tableData(widget).columns.slice(1); let ci = index" [ngStyle]="tableCellNumStyle">
                          {{ formatMetricValue(col.metric, row.cells[ci]) }}
                        </td>
                      </tr>
                      <tr *ngIf="!tableData(widget).rows.length">
                        <td [attr.colspan]="tableData(widget).columns.length" [ngStyle]="tableEmptyCellStyle">No matching rows for this scope.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ng-container>
            </div>

            <!-- Config drawer (only when selected) -->
            <div *ngIf="i === selectedIndex" [ngStyle]="configStyle" (click)="$event.stopPropagation()">
              <div [ngStyle]="configRowStyle">
                <label [ngStyle]="configFieldStyle">
                  <span>Title</span>
                  <input [ngModel]="widget.title" (ngModelChange)="updateField(i, 'title', $event)" [ngStyle]="configInputStyle" />
                </label>
                <label [ngStyle]="configFieldStyle">
                  <span>Visualization</span>
                  <select [ngModel]="widget.viz" (ngModelChange)="updateField(i, 'viz', $event)" [ngStyle]="configInputStyle">
                    <option *ngFor="let opt of kindOf(widget).vizOptions" [value]="opt">{{ vizLabelFor(opt) }}</option>
                  </select>
                </label>
                <label [ngStyle]="configFieldStyle">
                  <span>Scope</span>
                  <select [ngModel]="widget.scope" (ngModelChange)="updateField(i, 'scope', $event)" [ngStyle]="configInputStyle">
                    <option *ngFor="let opt of scopeOptions" [value]="opt.id">{{ opt.label }}</option>
                  </select>
                </label>
                <label *ngIf="widget.scope === 'account'" [ngStyle]="configFieldStyle">
                  <span>Account</span>
                  <select [ngModel]="widget.accountId" (ngModelChange)="updateField(i, 'accountId', $event)" [ngStyle]="configInputStyle">
                    <option value="">All accounts</option>
                    <option *ngFor="let acc of accounts" [value]="acc.id">{{ acc.name }} ({{ platformLabel(acc.platform) }})</option>
                  </select>
                </label>
                <label *ngIf="widget.scope === 'campaign'" [ngStyle]="configFieldStyle">
                  <span>Campaign</span>
                  <select [ngModel]="widget.campaignId" (ngModelChange)="updateField(i, 'campaignId', $event)" [ngStyle]="configInputStyle">
                    <option value="">All campaigns</option>
                    <option *ngFor="let camp of campaigns" [value]="camp.id">{{ camp.name }}</option>
                  </select>
                </label>
              </div>

              <!-- Metric controls -->
              <div [ngStyle]="configRowStyle">
                <label *ngIf="!kindOf(widget).multiMetric" [ngStyle]="configFieldStyle">
                  <span>Metric</span>
                  <select [ngModel]="widget.metric" (ngModelChange)="updateField(i, 'metric', $event)" [ngStyle]="configInputStyle">
                    <option *ngFor="let m of metricKeys" [value]="m">{{ kpiLabelFor(m) }}</option>
                  </select>
                </label>

                <div *ngIf="kindOf(widget).multiMetric" [ngStyle]="configFieldStyle">
                  <span>Metrics</span>
                  <div [ngStyle]="metricChipRowStyle">
                    <button
                      *ngFor="let m of metricKeys"
                      type="button"
                      (click)="toggleMetric(i, m)"
                      [ngStyle]="metricChipStyle((widget.metrics || []).includes(m))"
                    >{{ kpiLabelFor(m) }}</button>
                  </div>
                </div>

                <label *ngIf="widget.kind === 'kpi'" [ngStyle]="configFieldStyle">
                  <span>Comparison</span>
                  <select [ngModel]="widget.comparison" (ngModelChange)="updateField(i, 'comparison', $event)" [ngStyle]="configInputStyle">
                    <option *ngFor="let c of comparisonOptions" [value]="c.id">{{ c.label }}</option>
                  </select>
                </label>
                <label *ngIf="widget.kind === 'pie'" [ngStyle]="configFieldStyle">
                  <span>Split by</span>
                  <select [ngModel]="widget.dimension" (ngModelChange)="updateField(i, 'dimension', $event)" [ngStyle]="configInputStyle">
                    <option *ngFor="let d of pieDimensionOptions" [value]="d.id">{{ d.label }}</option>
                  </select>
                </label>
                <label *ngIf="widget.kind === 'table'" [ngStyle]="configFieldStyle">
                  <span>Rows</span>
                  <select [ngModel]="widget.dimension" (ngModelChange)="updateField(i, 'dimension', $event)" [ngStyle]="configInputStyle">
                    <option *ngFor="let d of tableDimensionOptions" [value]="d.id">{{ d.label }}</option>
                  </select>
                </label>
                <label *ngIf="widget.kind === 'table'" [ngStyle]="configFieldStyle">
                  <span>Row limit</span>
                  <input type="number" min="3" max="20" [ngModel]="widget.rowLimit" (ngModelChange)="updateField(i, 'rowLimit', $event)" [ngStyle]="configInputStyle" />
                </label>
                <label [ngStyle]="configFieldStyle">
                  <span>Width</span>
                  <select [ngModel]="widget.width" (ngModelChange)="updateField(i, 'width', $event)" [ngStyle]="configInputStyle">
                    <option [ngValue]="1">Half</option>
                    <option [ngValue]="2">Full</option>
                  </select>
                </label>
              </div>
            </div>
          </article>
        </section>
      </div>

      <div *ngIf="widgets.length" [ngStyle]="footerStyle">
        <app-button (pressed)="clearAll()">Clear canvas</app-button>
        <app-tone-badge tone="success" *ngIf="saveState === 'saved'">Saved</app-tone-badge>
        <app-tone-badge tone="warning" *ngIf="saveState === 'saving'">Saving…</app-tone-badge>
        <app-tone-badge tone="danger" *ngIf="saveState === 'error'">Save failed</app-tone-badge>
      </div>
    </div>
  `,
})
export class ReportBuilderCanvasComponent {
  @Input() widgets: any[] = [];
  @Input() client: any = null;
  @Input() seriesMap: any = {};
  @Input() saveState: "idle" | "saving" | "saved" | "error" = "idle";
  @Output() widgetsChange = new EventEmitter<any[]>();

  selectedIndex = -1;
  private dragSourceIndex: number | null = null;

  T = T;

  // Static option lists
  kindOptions = WIDGET_KIND_OPTIONS;
  scopeOptions = WIDGET_SCOPE_OPTIONS;
  comparisonOptions = WIDGET_COMPARISON_OPTIONS;
  pieDimensionOptions = WIDGET_PIE_DIMENSION_OPTIONS;
  tableDimensionOptions = WIDGET_TABLE_DIMENSION_OPTIONS;
  metricKeys = WIDGET_METRIC_KEYS;

  formatMetricValue = (metricKey: string, value: number) => formatMetric(metricKey, Number(value) || 0);

  // ─── Derived ──────────────────────────────────────────
  get accounts(): any[] {
    return this.client?.accounts || [];
  }

  get campaigns(): any[] {
    if (!this.client) return [];
    return (this.client.campaigns || []).slice(0, 200);
  }

  kindOf(widget: any) {
    return WIDGET_KIND_OPTIONS.find((k) => k.id === widget.kind) || WIDGET_KIND_OPTIONS[0];
  }
  scopeLabel(widget: any) {
    return WIDGET_SCOPE_OPTIONS.find((s) => s.id === widget.scope)?.label || "Whole client";
  }
  vizLabel(widget: any) {
    return this.vizLabelFor(widget.viz);
  }
  vizLabelFor(viz: string): string {
    return ({
      value: "Single value",
      speedometer: "Speedometer",
      line: "Line chart",
      bar: "Bar chart",
      area: "Area chart",
      pie: "Pie chart",
      donut: "Donut chart",
      table: "Table",
    } as any)[viz] || viz;
  }
  kpiLabelFor(key: string): string {
    return KPI_LIBRARY[key]?.label || key;
  }
  platformLabel(platform: string): string {
    return PLATFORM_META[platform]?.label || platform;
  }

  // ─── Mutations ────────────────────────────────────────
  addWidget(kindId: string) {
    const widget = createDefaultWidget(kindId);
    const next = [...this.widgets, widget];
    this.widgetsChange.emit(next);
    this.selectedIndex = next.length - 1;
  }
  duplicateWidget(index: number) {
    const original = this.widgets[index];
    if (!original) return;
    const copy = normalizeReportWidget({ ...original, id: undefined, title: `${original.title} (copy)` });
    const next = [...this.widgets.slice(0, index + 1), copy, ...this.widgets.slice(index + 1)];
    this.widgetsChange.emit(next);
    this.selectedIndex = index + 1;
  }
  removeWidget(index: number) {
    const next = [...this.widgets.slice(0, index), ...this.widgets.slice(index + 1)];
    this.widgetsChange.emit(next);
    if (this.selectedIndex === index) this.selectedIndex = -1;
    else if (this.selectedIndex > index) this.selectedIndex -= 1;
  }
  moveWidget(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= this.widgets.length) return;
    const next = [...this.widgets];
    [next[index], next[target]] = [next[target], next[index]];
    this.widgetsChange.emit(next);
    this.selectedIndex = target;
  }
  clearAll() {
    if (!this.widgets.length) return;
    if (typeof window !== "undefined" && !window.confirm("Remove all widgets from this report?")) return;
    this.widgetsChange.emit([]);
    this.selectedIndex = -1;
  }
  updateField(index: number, field: string, value: any) {
    const widget = this.widgets[index];
    if (!widget) return;
    let coerced: any = value;
    if (field === "rowLimit" || field === "width") coerced = Number(value);
    const updated = normalizeReportWidget({ ...widget, [field]: coerced });
    const next = [...this.widgets];
    next[index] = updated;
    this.widgetsChange.emit(next);
  }
  toggleMetric(index: number, metric: string) {
    const widget = this.widgets[index];
    if (!widget) return;
    const current = Array.isArray(widget.metrics) ? [...widget.metrics] : [];
    const at = current.indexOf(metric);
    if (at >= 0) {
      if (current.length > 1) current.splice(at, 1);
    } else {
      if (current.length < 4) current.push(metric);
    }
    const updated = normalizeReportWidget({ ...widget, metrics: current });
    const next = [...this.widgets];
    next[index] = updated;
    this.widgetsChange.emit(next);
  }
  selectIndex(index: number) {
    this.selectedIndex = this.selectedIndex === index ? -1 : index;
  }

  // ─── Drag & drop ──────────────────────────────────────
  onPaletteDragStart(event: DragEvent, kindId: string) {
    event.dataTransfer?.setData("text/widget-kind", kindId);
    event.dataTransfer && (event.dataTransfer.effectAllowed = "copy");
  }
  onCanvasDragOver(event: DragEvent) {
    event.preventDefault();
  }
  onCanvasDrop(event: DragEvent) {
    event.preventDefault();
    const kindId = event.dataTransfer?.getData("text/widget-kind");
    if (kindId) {
      this.addWidget(kindId);
      return;
    }
    if (this.dragSourceIndex !== null) {
      this.dragSourceIndex = null;
    }
  }
  onWidgetDragStart(event: DragEvent, index: number) {
    this.dragSourceIndex = index;
    event.dataTransfer?.setData("text/widget-index", String(index));
    event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
  }
  onWidgetDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer && (event.dataTransfer.dropEffect = "move");
  }
  onWidgetDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const kindId = event.dataTransfer?.getData("text/widget-kind");
    if (kindId) {
      const widget = createDefaultWidget(kindId);
      const next = [...this.widgets];
      next.splice(targetIndex + 1, 0, widget);
      this.widgetsChange.emit(next);
      this.selectedIndex = targetIndex + 1;
      return;
    }
    const sourceIndex = this.dragSourceIndex ?? Number(event.dataTransfer?.getData("text/widget-index"));
    this.dragSourceIndex = null;
    if (!Number.isFinite(sourceIndex) || sourceIndex === targetIndex) return;
    const next = [...this.widgets];
    const [moved] = next.splice(sourceIndex as number, 1);
    next.splice(targetIndex, 0, moved);
    this.widgetsChange.emit(next);
    this.selectedIndex = targetIndex;
  }

  // ─── KPI rendering ────────────────────────────────────
  kpiLabel(widget: any) {
    return KPI_LIBRARY[widget.metric]?.label || widget.metric;
  }
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
  speedometerDashArray(widget: any) {
    const items = resolveWidgetSourceItems(widget, this.client);
    const value = sumMetric(items, widget.metric);
    const target = this.speedometerTarget(widget);
    const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
    const arc = 157;
    return `${(ratio * arc).toFixed(1)} ${arc}`;
  }
  speedometerNeedleX(widget: any) {
    const angle = this.speedometerAngle(widget);
    return (60 + Math.cos(angle) * 42).toFixed(1);
  }
  speedometerNeedleY(widget: any) {
    const angle = this.speedometerAngle(widget);
    return (60 + Math.sin(angle) * 42).toFixed(1);
  }
  private speedometerAngle(widget: any) {
    const items = resolveWidgetSourceItems(widget, this.client);
    const value = sumMetric(items, widget.metric);
    const target = this.speedometerTarget(widget);
    const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
    return Math.PI + ratio * Math.PI;
  }
  private speedometerTarget(widget: any) {
    if (widget.scope === "client") {
      const budget = (this.client?.budgets || []).reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0);
      if (budget > 0 && (widget.metric === "spend" || widget.metric === "revenue")) return budget;
    }
    const items = resolveWidgetSourceItems(widget, this.client);
    const v = sumMetric(items, widget.metric);
    return v > 0 ? v * 1.4 : 1;
  }

  // ─── Chart rendering ──────────────────────────────────
  chartViewBox = "0 0 320 110";
  seriesFor(widget: any) {
    return buildWidgetSeries(widget, this.client, this.seriesMap || {});
  }
  private chartBounds(widget: any) {
    const all = this.seriesFor(widget).flatMap((s: any) => s.points.map((p: any) => p.value));
    const max = all.length ? Math.max(...all, 1) : 1;
    return { max, min: 0 };
  }
  seriesPolylinePoints(series: any, widget: any) {
    if (!series.points.length) return "";
    const { max } = this.chartBounds(widget);
    const w = 320;
    const h = 100;
    const step = series.points.length > 1 ? w / (series.points.length - 1) : w;
    return series.points
      .map((p: any, idx: number) => {
        const x = idx * step;
        const y = h - (p.value / max) * (h - 10);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }
  seriesAreaPath(series: any, widget: any) {
    if (!series.points.length) return "";
    const { max } = this.chartBounds(widget);
    const w = 320;
    const h = 100;
    const step = series.points.length > 1 ? w / (series.points.length - 1) : w;
    const segs = series.points
      .map((p: any, idx: number) => {
        const x = idx * step;
        const y = h - (p.value / max) * (h - 10);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
    return `${segs} L ${w} ${h} L 0 ${h} Z`;
  }
  seriesBars(series: any, widget: any, seriesIndex: number) {
    const total = this.seriesFor(widget).length;
    if (!series.points.length) return [];
    const { max } = this.chartBounds(widget);
    const w = 320;
    const h = 100;
    const groupWidth = w / series.points.length;
    const innerGap = 2;
    const barWidth = Math.max(1, (groupWidth - innerGap) / total);
    return series.points.map((p: any, idx: number) => {
      const x = idx * groupWidth + barWidth * seriesIndex;
      const barHeight = (p.value / max) * (h - 10);
      return { x: x.toFixed(1), y: (h - barHeight).toFixed(1), w: barWidth.toFixed(1), h: barHeight.toFixed(1) };
    });
  }

  // ─── Pie rendering ────────────────────────────────────
  pieSlicesWithGeometry(widget: any) {
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

  // ─── Table rendering ──────────────────────────────────
  tableData(widget: any) {
    return buildWidgetTableRows(widget, this.client);
  }

  // ─── Styles ───────────────────────────────────────────
  rootStyle = {
    padding: "20px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
  };
  headStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" };
  titleStyle = { fontSize: "16px", fontWeight: 800, fontFamily: T.heading };
  leadStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft, lineHeight: 1.5 };
  bodyStyle = { display: "grid", gridTemplateColumns: "minmax(220px, 260px) 1fr", gap: "16px", alignItems: "flex-start" };

  paletteStyle = {
    display: "grid",
    gap: "8px",
    padding: "14px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    borderRadius: "20px",
    alignContent: "start",
  };
  paletteTitleStyle = { fontSize: "11px", fontWeight: 800, color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em" };
  paletteTileStyle = {
    display: "grid",
    gridTemplateColumns: "32px 1fr",
    gap: "10px",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "14px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    cursor: "grab",
    textAlign: "left",
    fontFamily: T.font,
  };
  paletteIconStyle = { fontSize: "18px", textAlign: "center" };
  paletteLabelStyle = { fontSize: "12px", fontWeight: 800, color: T.ink };
  paletteDescStyle = { fontSize: "11px", color: T.inkSoft, lineHeight: 1.4 };
  paletteHintStyle = {
    fontSize: "11px",
    color: T.inkMute,
    padding: "10px 12px",
    background: T.surfaceStrong,
    borderRadius: "12px",
    border: `1px dashed ${T.line}`,
    lineHeight: 1.4,
  };

  canvasStyle = {
    minHeight: "260px",
    padding: "14px",
    borderRadius: "20px",
    background: T.bgSoft,
    border: `1px dashed ${T.lineStrong}`,
    display: "grid",
    gap: "12px",
    alignContent: "start",
  };
  emptyStateStyle = {
    padding: "30px",
    textAlign: "center",
    color: T.inkSoft,
    background: T.surfaceStrong,
    borderRadius: "16px",
    border: `1px dashed ${T.line}`,
  };
  emptyTitleStyle = { fontSize: "14px", fontWeight: 800, color: T.ink, fontFamily: T.heading };
  emptyBodyStyle = { fontSize: "12px", marginTop: "6px", lineHeight: 1.5 };

  widgetCardStyle(widget: any, selected: boolean) {
    return {
      padding: "14px",
      background: T.surfaceStrong,
      borderRadius: "18px",
      border: `1px solid ${selected ? T.lineStrong : T.line}`,
      boxShadow: selected ? T.shadow : "none",
      display: "grid",
      gap: "12px",
      gridColumn: widget.width === 2 ? "1 / -1" : "auto",
      cursor: "pointer",
      transition: "border-color 160ms ease, box-shadow 160ms ease",
    };
  }
  widgetHeadStyle = { display: "flex", alignItems: "center", gap: "10px" };
  widgetIconStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: T.bgSoft,
    fontSize: "16px",
    color: T.ink,
  };
  widgetTitleColStyle = { display: "grid", flex: "1 1 auto", minWidth: 0 };
  widgetTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.ink, fontFamily: T.heading, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  widgetSubtitleStyle = { fontSize: "11px", color: T.inkSoft };
  widgetActionsStyle = { display: "flex", gap: "4px" };
  iconButtonStyle = {
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    border: `1px solid ${T.line}`,
    background: T.surface,
    color: T.inkSoft,
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  };
  iconRemoveStyle = {
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    border: `1px solid rgba(215, 93, 66, 0.32)`,
    background: T.coralSoft,
    color: T.coral,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 800,
  };

  previewStyle = { display: "grid", gap: "10px" };

  // KPI styles
  kpiPreviewStyle(widget: any) {
    return {
      padding: "14px 16px",
      borderRadius: "16px",
      background: T.bgSoft,
      border: `1px solid ${T.line}`,
      display: "grid",
      gap: "6px",
    };
  }
  kpiLabelStyle = { fontSize: "11px", color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 };
  kpiValueStyle(widget: any) {
    return {
      fontSize: "26px",
      fontWeight: 900,
      color: this.kpiColor(widget),
      fontFamily: T.heading,
      letterSpacing: "-0.04em",
    };
  }
  kpiDeltaStyle(widget: any) {
    return { fontSize: "12px", color: T.inkSoft, fontWeight: 700 };
  }
  speedometerWrapStyle = { width: "160px", maxWidth: "100%" };
  speedometerSvgStyle = { width: "100%", height: "auto", display: "block" };

  // Chart styles
  chartWrapStyle = {
    background: T.bgSoft,
    borderRadius: "16px",
    padding: "10px 14px",
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "8px",
  };
  chartSvgStyle = { width: "100%", height: "120px" };
  chartLegendStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
  chartLegendItemStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: T.inkSoft, fontWeight: 700 };
  chartLegendDotStyle(color: string) {
    return { width: "8px", height: "8px", borderRadius: "50%", background: color };
  }
  emptyHintStyle = { fontSize: "11px", color: T.inkMute, fontStyle: "italic" };

  // Pie styles
  pieWrapStyle = {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: "12px",
    alignItems: "center",
    background: T.bgSoft,
    borderRadius: "16px",
    padding: "12px",
    border: `1px solid ${T.line}`,
  };
  pieSvgStyle = { width: "100%", height: "auto", display: "block" };
  pieLegendStyle = { display: "grid", gap: "6px" };
  pieLegendRowStyle = { display: "flex", alignItems: "center", gap: "8px" };
  pieLegendDotStyle(color: string) {
    return { width: "10px", height: "10px", borderRadius: "3px", background: color };
  }
  pieLegendLabelStyle = { fontSize: "12px", color: T.ink, flex: "1 1 auto" };
  pieLegendValueStyle = { fontSize: "12px", fontWeight: 800, color: T.ink };

  // Table styles
  tableWrapStyle = {
    background: T.bgSoft,
    borderRadius: "16px",
    border: `1px solid ${T.line}`,
    overflow: "hidden",
  };
  tableStyle = { width: "100%", borderCollapse: "collapse", fontFamily: T.font, fontSize: "12px" };
  tableHeadStyle = {
    padding: "8px 10px",
    background: T.surfaceStrong,
    color: T.inkMute,
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
    textAlign: "left",
    borderBottom: `1px solid ${T.line}`,
  };
  tableCellStyle = { padding: "8px 10px", color: T.ink, fontWeight: 700, borderBottom: `1px solid ${T.line}` };
  tableCellNumStyle = { padding: "8px 10px", color: T.ink, fontWeight: 700, borderBottom: `1px solid ${T.line}`, textAlign: "right" };
  tableEmptyCellStyle = { padding: "16px", color: T.inkMute, textAlign: "center", fontStyle: "italic" };

  // Config drawer styles
  configStyle = {
    padding: "12px",
    borderRadius: "14px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "10px",
  };
  configRowStyle = { display: "grid", gridTemplateColumns: fitCols(160), gap: "10px" };
  configFieldStyle = {
    display: "grid",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 800,
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
  configInputStyle = {
    padding: "8px 10px",
    borderRadius: "10px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "12px",
    fontFamily: T.font,
    fontWeight: 700,
    textTransform: "none",
    letterSpacing: "normal",
  };
  metricChipRowStyle = { display: "flex", flexWrap: "wrap", gap: "6px" };
  metricChipStyle(active: boolean) {
    return {
      padding: "5px 9px",
      borderRadius: "999px",
      border: `1px solid ${active ? T.lineStrong : T.line}`,
      background: active ? T.accentSoft : T.surfaceStrong,
      color: active ? T.accent : T.inkSoft,
      fontSize: "11px",
      fontWeight: 800,
      cursor: "pointer",
      textTransform: "none",
      letterSpacing: "normal",
    };
  }
  footerStyle = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
}
