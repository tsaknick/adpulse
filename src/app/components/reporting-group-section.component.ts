// ReportingGroupSection — mirrors React component (lines 3145-3184).
import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import {
  T,
  fitCols,
  formatCurrency,
  formatMetric,
  formatNumber,
} from "../foundation/adpulse-foundation";
import { MetricTileComponent, StatusPillComponent } from "./primitives";

@Component({
  selector: "app-reporting-group-section",
  standalone: true,
  imports: [CommonModule, MetricTileComponent, StatusPillComponent],
  template: `
    <section [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <div>
          <div [ngStyle]="eyebrowStyle">Reporting Group</div>
          <div [ngStyle]="titleStyle">{{ group?.label }}</div>
          <div [ngStyle]="metaStyle">
            {{ group?.clientsCount }} client{{ group?.clientsCount === 1 ? '' : 's' }} |
            {{ group?.accounts }} account{{ group?.accounts === 1 ? '' : 's' }} |
            {{ group?.activeCampaigns }} active campaign{{ group?.activeCampaigns === 1 ? '' : 's' }}
          </div>
        </div>
        <div [ngStyle]="pillRowStyle">
          <app-status-pill
            [ok]="group?.needsAttention === 0"
            [label]="group?.needsAttention === 0
              ? 'All clients healthy'
              : group?.needsAttention + ' client' + (group?.needsAttention === 1 ? '' : 's') + ' need attention'"
          ></app-status-pill>
        </div>
      </div>

      <div *ngIf="showRollup" [ngStyle]="rollupStyle">
        <app-metric-tile label="Group Budget" [value]="formatCurrency(group?.totalBudget || 0)"></app-metric-tile>
        <app-metric-tile label="Group Spend" [value]="formatCurrency(group?.spend || 0)"></app-metric-tile>
        <app-metric-tile label="Conv. Value" [value]="formatCurrency(group?.conversionValue || 0)"></app-metric-tile>
        <app-metric-tile
          label="ROAS"
          [value]="formatMetric('roas', group?.roas || 0)"
          [accent]="(group?.roas || 0) >= 3 ? T.accent : T.ink"
        ></app-metric-tile>
        <app-metric-tile label="Conversions" [value]="formatNumber(group?.conversions || 0)"></app-metric-tile>
      </div>

      <ng-content></ng-content>
    </section>
  `,
})
export class ReportingGroupSectionComponent {
  @Input() group: any;
  @Input() showRollup = true;

  T = T;
  formatCurrency = formatCurrency;
  formatMetric = formatMetric;
  formatNumber = formatNumber;

  rootStyle = {
    padding: "18px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
  };
  headStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  eyebrowStyle = {
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  titleStyle = {
    marginTop: "6px",
    fontSize: "22px",
    fontWeight: 800,
    fontFamily: T.heading,
    letterSpacing: "-0.05em",
    color: T.ink,
  };
  metaStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft };
  pillRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  rollupStyle = { display: "grid", gridTemplateColumns: fitCols(132), gap: "10px" };
}
