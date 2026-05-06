// Reports view — substantive port of React ReportCenter (6181-6627).
// v1 includes the client picker, preset selector, section toggles, readiness
// panel, schedule plan editor, and a streamlined print preview document
// (cover + KPI section + alerts + definitions). Full per-section report
// pages (geography / device / impression share / Meta ad previews) are
// stubbed in the preview and ported in a follow-up.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  DEFAULT_REPORT_SECTION_IDS,
  REPORT_PRESETS,
  REPORT_SECTION_OPTIONS,
  T,
  fitCols,
  formatCurrency,
  formatMetric,
  formatNumber,
} from "../foundation/adpulse-foundation";
import { groupClientsByReportingGroup } from "../foundation/post-foundation-helpers";
import {
  ActionCueComponent,
  AppButtonComponent,
  EmptyStateComponent,
  LogoMarkComponent,
  MetricTileComponent,
  PlatformChipComponent,
  ToneBadgeComponent,
} from "./primitives";
import { AccountDateRangeControlComponent } from "./account-date-range-control.component";
import { CampaignReportDocumentComponent } from "./campaign-report-document.component";

@Component({
  selector: "app-reports-view",
  standalone: true,
  imports: [
    CommonModule,
    AccountDateRangeControlComponent,
    ActionCueComponent,
    AppButtonComponent,
    EmptyStateComponent,
    LogoMarkComponent,
    MetricTileComponent,
    PlatformChipComponent,
    ToneBadgeComponent,
    CampaignReportDocumentComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="controlsStyle">
        <div>
          <div [ngStyle]="titleStyle">Campaign PDF reports</div>
          <div [ngStyle]="leadStyle">
            Template follows the sample report: overview KPIs, channel charts, campaign tables, ad tables and metric definitions. Choose "Save as PDF" when the print dialog opens.
          </div>
        </div>
        <div [ngStyle]="controlRightStyle">
          <select
            [value]="selectedClientId || ''"
            (change)="clientChange.emit($any($event.target).value)"
            [ngStyle]="clientSelectStyle"
          >
            <optgroup *ngFor="let group of reportGroups" [label]="group.label">
              <option *ngFor="let client of group.clients" [value]="client.id">{{ client.name }}</option>
            </optgroup>
          </select>
          <app-button tone="primary" [disabled]="!selectedClient" (pressed)="generatePdf()">Generate PDF</app-button>
        </div>
      </div>

      <div *ngIf="selectedGroup" [ngStyle]="groupStripStyle">
        <app-action-cue tone="success">Reporting group: {{ selectedGroup.label }}</app-action-cue>
        <app-action-cue tone="info">Target: {{ selectedClient?.focus }}</app-action-cue>
        <app-tone-badge tone="neutral">{{ selectedGroup.clientsCount }} clients in group</app-tone-badge>
        <app-tone-badge tone="neutral">Group spend {{ formatCurrency(selectedGroup.spend || 0) }}</app-tone-badge>
      </div>

      <app-account-date-range-control
        [value]="dateRangeValue"
        (valueChange)="dateRangeChange.emit($event)"
      ></app-account-date-range-control>

      <ng-container *ngIf="!selectedClient; else builderAndPreview">
        <app-empty-state title="No clients available" body="Add a client in Client Studio to start building reports."></app-empty-state>
      </ng-container>
      <ng-template #builderAndPreview>
        <!-- Builder -->
        <div [ngStyle]="builderStyle">
          <div [ngStyle]="builderHeadStyle">
            <div>
              <div [ngStyle]="sectionTitleStyle">Report builder</div>
              <div [ngStyle]="sectionLeadStyle">Pick a preset, then toggle sections on or off as needed.</div>
            </div>
            <app-action-cue *ngIf="cueText" [tone]="$any(cueTone)">{{ cueText }}</app-action-cue>
          </div>

          <div [ngStyle]="presetRowStyle">
            <button
              *ngFor="let preset of presets"
              type="button"
              (click)="applyPreset(preset.id)"
              [ngStyle]="presetButtonStyle(preset.id)"
            >
              <div [ngStyle]="presetLabelStyle">{{ preset.label }}</div>
              <div [ngStyle]="presetDescStyle">{{ preset.description }}</div>
            </button>
          </div>

          <div [ngStyle]="sectionGridStyle">
            <label *ngFor="let section of sectionOptions" [ngStyle]="sectionToggleStyle(section.id)">
              <input
                type="checkbox"
                [checked]="selectedSet.has(section.id)"
                (change)="toggleSection(section.id)"
              />
              <div>
                <div [ngStyle]="sectionToggleLabelStyle">{{ section.label }}</div>
                <div [ngStyle]="sectionToggleDescStyle">{{ section.description }}</div>
              </div>
            </label>
          </div>

          <div [ngStyle]="builderActionsStyle">
            <app-button (pressed)="selectAll()">Select all</app-button>
            <app-button (pressed)="reset()">Reset to full</app-button>
            <app-tone-badge tone="neutral">{{ selectedSections.length }} sections selected</app-tone-badge>
          </div>

          <!-- Readiness panel -->
          <div [ngStyle]="readinessGridStyle">
            <div *ngFor="let item of readinessItems" [ngStyle]="readinessItemStyle(item)">
              <div [ngStyle]="readinessLabelStyle">{{ item.label }}</div>
              <div [ngStyle]="readinessBodyStyle">{{ item.body }}</div>
            </div>
          </div>

          <!-- Schedule plan -->
          <div [ngStyle]="scheduleStyle">
            <div [ngStyle]="sectionTitleStyle">Recurring schedule</div>
            <div [ngStyle]="sectionLeadStyle">Save a default delivery cadence for this client.</div>
            <div [ngStyle]="scheduleFormStyle">
              <label [ngStyle]="scheduleLabelStyle">
                <span>Frequency</span>
                <select [value]="scheduleDraft.frequency" (change)="onSchedField('frequency', $any($event.target).value)" [ngStyle]="scheduleSelectStyle">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label *ngIf="scheduleDraft.frequency === 'weekly'" [ngStyle]="scheduleLabelStyle">
                <span>Day of week</span>
                <select [value]="scheduleDraft.weekday" (change)="onSchedField('weekday', $any($event.target).value)" [ngStyle]="scheduleSelectStyle">
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                </select>
              </label>
              <label *ngIf="scheduleDraft.frequency === 'monthly'" [ngStyle]="scheduleLabelStyle">
                <span>Day of month</span>
                <input type="number" min="1" max="28" [value]="scheduleDraft.dayOfMonth" (input)="onSchedField('dayOfMonth', $any($event.target).value)" [ngStyle]="scheduleInputStyle" />
              </label>
              <label [ngStyle]="scheduleLabelStyle">
                <span>Recipients</span>
                <input [value]="scheduleDraft.recipients" (input)="onSchedField('recipients', $any($event.target).value)" placeholder="alice@client.com, bob@client.com" [ngStyle]="scheduleInputStyle" />
              </label>
              <label [ngStyle]="scheduleLabelStyle">
                <span>Notes</span>
                <input [value]="scheduleDraft.notes" (input)="onSchedField('notes', $any($event.target).value)" [ngStyle]="scheduleInputStyle" />
              </label>
            </div>
            <app-button tone="primary" (pressed)="saveSchedule.emit({ clientId: selectedClient.id, schedule: scheduleDraft })">Save schedule</app-button>
          </div>
        </div>

        <!-- Print preview -->
        <app-campaign-report-document
          [client]="selectedClient"
          [seriesMap]="seriesMap"
          [dateRangeLabel]="dateRangeLabel"
          [googleReportState]="googleReportState"
          [selectedSections]="selectedSections"
        ></app-campaign-report-document>
      </ng-template>
    </div>
  `,
})
export class ReportsViewComponent {
  @Input() clients: any[] = [];
  @Input() selectedClientId = "";
  @Input() seriesMap: any = {};
  @Input() dateRangeLabel = "";
  @Input() dateRangeValue: any = { preset: "THIS_MONTH", startDate: "", endDate: "" };
  @Input() reportPreset = "full";
  @Input() selectedSections: string[] = DEFAULT_REPORT_SECTION_IDS.slice();
  @Input() scheduleDraft: any = { frequency: "monthly", weekday: "monday", dayOfMonth: "1", recipients: "", notes: "" };
  @Input() readinessItems: { label: string; body: string; ok: boolean }[] = [];
  @Input() builderCue: any = null;
  @Input() googleReportState: any = { loading: false, details: [] };

  @Output() clientChange = new EventEmitter<string>();
  @Output() dateRangeChange = new EventEmitter<any>();
  @Output() presetChange = new EventEmitter<string>();
  @Output() sectionsChange = new EventEmitter<string[]>();
  @Output() scheduleDraftChange = new EventEmitter<any>();
  @Output() saveSchedule = new EventEmitter<{ clientId: string; schedule: any }>();

  presets = REPORT_PRESETS;
  sectionOptions = REPORT_SECTION_OPTIONS;

  formatCurrency = formatCurrency;
  formatNumber = formatNumber;
  formatMetric = formatMetric;

  get reportGroups(): any[] {
    return groupClientsByReportingGroup(this.clients);
  }
  get selectedClient(): any {
    return this.clients.find((c) => c.id === this.selectedClientId) || this.clients[0] || null;
  }
  get selectedGroup(): any {
    if (!this.selectedClient) return null;
    return this.reportGroups.find((g) => g.clients.some((c: any) => c.id === this.selectedClient.id)) || null;
  }
  get selectedSet(): Set<string> {
    return new Set(this.selectedSections);
  }
  get cueText(): string {
    return this.builderCue?.message || "";
  }
  get cueTone(): string {
    return this.builderCue?.tone || "neutral";
  }

  applyPreset(presetId: string) {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return;
    this.presetChange.emit(presetId);
    this.sectionsChange.emit(REPORT_SECTION_OPTIONS.map((s) => s.id).filter((id) => preset.sections.includes(id)));
  }
  toggleSection(sectionId: string) {
    const set = new Set(this.selectedSections);
    if (set.has(sectionId)) set.delete(sectionId);
    else set.add(sectionId);
    this.presetChange.emit("custom");
    this.sectionsChange.emit(REPORT_SECTION_OPTIONS.map((s) => s.id).filter((id) => set.has(id)));
  }
  selectAll() {
    this.presetChange.emit("custom");
    this.sectionsChange.emit(REPORT_SECTION_OPTIONS.map((s) => s.id));
  }
  reset() {
    this.applyPreset("full");
  }
  onSchedField(field: string, value: any) {
    this.scheduleDraftChange.emit({ ...this.scheduleDraft, [field]: value });
  }
  generatePdf() {
    if (typeof window !== "undefined") window.print();
  }

  // Channel rollups for the cover/preview KPIs
  channelSpend(platform: string): number {
    return (this.selectedClient?.accounts || [])
      .filter((a: any) => a.platform === platform)
      .reduce((acc: number, a: any) => acc + (Number(a.spend) || 0), 0);
  }
  channelClicks(platform: string): number {
    return (this.selectedClient?.accounts || [])
      .filter((a: any) => a.platform === platform)
      .reduce((acc: number, a: any) => acc + (Number(a.clicks) || 0), 0);
  }
  channelConversions(platform: string): number {
    return (this.selectedClient?.accounts || [])
      .filter((a: any) => a.platform === platform)
      .reduce((acc: number, a: any) => acc + (Number(a.conversions) || 0), 0);
  }
  channelRoas(platform: string): number {
    const spend = this.channelSpend(platform);
    if (!spend) return 0;
    const value = (this.selectedClient?.accounts || [])
      .filter((a: any) => a.platform === platform)
      .reduce((acc: number, a: any) => acc + (Number(a.conversionValue) || 0), 0);
    return value / spend;
  }

  get supportedDocSections(): string[] {
    return ["cover", "executive_summary", "google_overview", "meta_overview", "analytics", "definitions"];
  }
  get unsupportedSelectedSections(): any[] {
    const supported = new Set(this.supportedDocSections);
    return this.sectionOptions.filter((s) => this.selectedSet.has(s.id) && !supported.has(s.id));
  }
  get hasUnsupportedSection(): boolean {
    return this.unsupportedSelectedSections.length > 0;
  }
  get unsupportedSectionLabels(): string {
    return this.unsupportedSelectedSections.map((s) => s.label).join(", ");
  }

  // ── Styles ─────────────────────────────────────────────────────────
  rootStyle = { display: "grid", gap: "18px" };
  controlsStyle = {
    padding: "18px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    flexWrap: "wrap",
    alignItems: "center",
  };
  titleStyle = { fontSize: "18px", fontWeight: 800, fontFamily: T.heading };
  leadStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft };
  controlRightStyle = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  clientSelectStyle = {
    width: "260px",
    maxWidth: "100%",
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
  groupStripStyle = {
    padding: "16px",
    borderRadius: "22px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  };
  builderStyle = {
    padding: "20px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
  };
  builderHeadStyle = { display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" };
  sectionTitleStyle = { fontSize: "16px", fontWeight: 800, fontFamily: T.heading };
  sectionLeadStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft };
  presetRowStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "10px" };
  presetButtonStyle(id: string) {
    const active = this.reportPreset === id;
    return {
      padding: "12px",
      borderRadius: "16px",
      border: `1px solid ${active ? T.lineStrong : T.line}`,
      background: active ? T.accentSoft : T.surfaceStrong,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: T.font,
      display: "grid",
      gap: "5px",
    };
  }
  presetLabelStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  presetDescStyle = { fontSize: "11px", color: T.inkSoft, lineHeight: 1.4 };

  sectionGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "8px" };
  sectionToggleStyle(id: string) {
    const active = this.selectedSet.has(id);
    return {
      display: "flex",
      gap: "10px",
      padding: "10px",
      borderRadius: "12px",
      border: `1px solid ${active ? T.lineStrong : T.line}`,
      background: active ? T.accentSoft : T.surfaceStrong,
      cursor: "pointer",
    };
  }
  sectionToggleLabelStyle = { fontSize: "12px", fontWeight: 800, color: T.ink };
  sectionToggleDescStyle = { marginTop: "3px", fontSize: "11px", color: T.inkSoft, lineHeight: 1.4 };
  builderActionsStyle = { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" };

  readinessGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "10px" };
  readinessItemStyle(item: any) {
    return {
      padding: "12px",
      borderRadius: "14px",
      background: item.ok ? T.accentSoft : T.amberSoft,
      border: `1px solid ${item.ok ? "rgba(15, 143, 102, 0.16)" : "rgba(199, 147, 33, 0.18)"}`,
    };
  }
  readinessLabelStyle = { fontSize: "12px", fontWeight: 800, color: T.ink };
  readinessBodyStyle = { marginTop: "4px", fontSize: "11px", color: T.inkSoft, lineHeight: 1.45 };

  scheduleStyle = {
    padding: "16px",
    borderRadius: "20px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "10px",
  };
  scheduleFormStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "12px" };
  scheduleLabelStyle = {
    display: "grid",
    gap: "6px",
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.08em",
  };
  scheduleSelectStyle = {
    padding: "10px 12px",
    borderRadius: "12px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    fontFamily: T.font,
  };
  scheduleInputStyle = {
    padding: "10px 12px",
    borderRadius: "12px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    fontFamily: T.font,
  };

  previewStyle = { display: "grid", gap: "18px", justifyItems: "center" };
  docStyle = {
    width: "min(880px, 100%)",
    background: "#fff",
    border: `1px solid ${T.line}`,
    borderRadius: "20px",
    boxShadow: T.shadow,
    padding: "32px",
    display: "grid",
    gap: "26px",
  };
  docSectionStyle = { display: "grid", gap: "14px" };
  coverHeadStyle = { display: "flex", gap: "14px", alignItems: "center" };
  docKickerStyle = {
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 800,
  };
  docTitleStyle = { fontSize: "26px", fontWeight: 900, fontFamily: T.heading, letterSpacing: "-0.04em", color: T.ink };
  docDateStyle = { fontSize: "12px", color: T.inkSoft, marginTop: "4px" };
  coverKpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(140), gap: "10px" };

  docSectionTitleStyle = { fontSize: "18px", fontWeight: 800, fontFamily: T.heading, color: T.ink, letterSpacing: "-0.03em" };
  docSectionBodyStyle = { fontSize: "13px", color: T.inkSoft, lineHeight: 1.6 };
  docSectionRowStyle = { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" };
  docFlagListStyle = { display: "grid", gap: "8px" };
  docFlagStyle(flag: any) {
    const warning = flag.tone === "warning";
    return {
      padding: "12px 14px",
      borderRadius: "12px",
      background: warning ? T.amberSoft : T.coralSoft,
      color: warning ? T.amber : T.coral,
      fontSize: "12px",
    };
  }
  defListStyle = {
    display: "grid",
    gap: "8px",
    fontSize: "13px",
    color: T.ink,
    paddingLeft: "18px",
  };
  stubSectionStyle = {
    padding: "16px",
    borderRadius: "16px",
    background: T.bgSoft,
    border: `1px dashed ${T.lineStrong}`,
    display: "grid",
    gap: "8px",
  };
}
