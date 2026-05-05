// ClientStudio — mirrors React component (lines 8106-8668).
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  CATEGORIES,
  CLIENT_TARGET_OPTIONS,
  PLATFORM_META,
  T,
  fitCols,
  formatCurrency,
  getClientLogoText,
  getEmptyLinkedAssets,
  normalizeClientTarget,
  normalizeSearchTermRules,
} from "../foundation/adpulse-foundation";
import {
  ActionCueComponent,
  AppButtonComponent,
  LogoMarkComponent,
  MetricTileComponent,
  RoleChipComponent,
  StatusPillComponent,
  ToneBadgeComponent,
  UserAvatarComponent,
} from "./primitives";
import { ConnectedAssetDropdownComponent } from "./connected-asset-dropdown.component";

@Component({
  selector: "app-client-studio",
  standalone: true,
  imports: [
    CommonModule,
    ActionCueComponent,
    AppButtonComponent,
    LogoMarkComponent,
    MetricTileComponent,
    RoleChipComponent,
    StatusPillComponent,
    ToneBadgeComponent,
    UserAvatarComponent,
    ConnectedAssetDropdownComponent,
  ],
  template: `
    <ng-container *ngIf="!draft; else editor">
      <div [ngStyle]="emptyStateStyle">
        <div>
          <div [ngStyle]="emptyTitleStyle">No live clients yet</div>
          <div [ngStyle]="emptyBodyStyle">
            Demo clients have been removed. Create a client, then link synced Google, Meta, TikTok or GA4 assets here.
          </div>
        </div>
        <app-button *ngIf="canEditCoreSettings" tone="primary" (pressed)="createClient.emit()">Add client</app-button>
      </div>
    </ng-container>
    <ng-template #editor>
      <div [ngStyle]="layoutStyle">
        <!-- Sidebar -->
        <div [ngStyle]="sidebarStyle">
          <div>
            <div [ngStyle]="sidebarKickerStyle">Client Studio</div>
            <div [ngStyle]="sidebarTitleStyle">
              {{ canEditCoreSettings ? 'Budgets, categories, alert rules and connections.' : 'Budgets, connected assets and alert rules for your assigned clients.' }}
            </div>
          </div>
          <app-button *ngIf="canEditCoreSettings" tone="primary" (pressed)="createClient.emit()">Add client</app-button>

          <div [ngStyle]="clientListStyle">
            <button
              *ngFor="let client of clients"
              type="button"
              (click)="selectClient.emit(client.id)"
              [ngStyle]="clientButtonStyle(client)"
            >
              <div [ngStyle]="clientRowStyle">
                <app-logo-mark [client]="client" [size]="32"></app-logo-mark>
                <div [ngStyle]="clientCopyStyle">
                  <div [ngStyle]="clientNameStyle(client)">{{ client.name }}</div>
                  <div [ngStyle]="clientFocusStyle">Target: {{ client.focus }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Editor body -->
        <div [ngStyle]="editorStackStyle">
          <div *ngIf="state?.error" [ngStyle]="errorBannerStyle">{{ state.error }}</div>
          <div *ngIf="!state?.error && state?.notice" [ngStyle]="noticeBannerStyle">{{ state.notice }}</div>

          <div [ngStyle]="cardStyle">
            <div [ngStyle]="cardHeadStyle">
              <div [ngStyle]="cardLeftStyle">
                <app-logo-mark [client]="draft" [size]="48"></app-logo-mark>
                <div [ngStyle]="minWidthStyle">
                  <div [ngStyle]="draftTitleStyle">{{ draft.name }}</div>
                  <div [ngStyle]="draftMetaStyle">
                    Target: {{ draft.focus }} | reporting group {{ draft.reportingGroup }}
                  </div>
                </div>
              </div>
              <div [ngStyle]="cardActionsStyle">
                <app-action-cue [tone]="actionCue.tone">{{ actionCue.label }}</app-action-cue>
                <app-button
                  *ngIf="canEditCoreSettings && draft?.id"
                  tone="danger"
                  (pressed)="deleteClient.emit(draft)"
                  [disabled]="state?.savingKey === ('delete:' + draft.id)"
                >{{ state?.savingKey === ('delete:' + draft.id) ? 'Deleting...' : 'Delete client' }}</app-button>
                <app-button
                  tone="primary"
                  (pressed)="save.emit()"
                  [disabled]="state?.savingKey === draft.id"
                >{{ state?.savingKey === draft.id ? 'Saving...' : (canEditCoreSettings ? 'Save client' : 'Save settings') }}</app-button>
                <app-status-pill [ok]="connectionStackOk" label="Connection stack"></app-status-pill>
              </div>
            </div>

            <div *ngIf="!canEditCoreSettings" [ngStyle]="lockedNoticeStyle">
              Account users can update channel budgets, connected assets and alert thresholds here. Client metadata, category and assignments stay director-only.
            </div>

            <div [ngStyle]="formGridStyle">
              <div>
                <div [ngStyle]="labelStyle">Client name</div>
                <input
                  [disabled]="!canEditCoreSettings"
                  [value]="draft.name"
                  (input)="onName($any($event.target).value)"
                  [ngStyle]="canEditCoreSettings ? inputStyle : lockedInputStyle"
                />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Client target</div>
                <select
                  [disabled]="!canEditCoreSettings"
                  [value]="targetValue"
                  (change)="onField('focus', $any($event.target).value)"
                  [ngStyle]="canEditCoreSettings ? inputStyle : lockedInputStyle"
                >
                  <option *ngFor="let option of targetOptions" [value]="option">{{ option }}</option>
                </select>
              </div>
              <div>
                <div [ngStyle]="labelStyle">Reporting group</div>
                <input
                  [disabled]="!canEditCoreSettings"
                  [value]="draft.reportingGroup"
                  (input)="onField('reportingGroup', $any($event.target).value)"
                  [ngStyle]="canEditCoreSettings ? inputStyle : lockedInputStyle"
                />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Account owner</div>
                <input
                  [disabled]="!canEditCoreSettings"
                  [value]="draft.owner"
                  (input)="onField('owner', $any($event.target).value)"
                  [ngStyle]="canEditCoreSettings ? inputStyle : lockedInputStyle"
                />
              </div>
            </div>

            <div [ngStyle]="logoBlockStyle">
              <div [ngStyle]="logoHeadStyle">
                <div>
                  <div [ngStyle]="cardSectionTitleStyle">Client logo</div>
                  <div [ngStyle]="cardSectionLeadStyle">Upload a logo for cards, reports and client selectors.</div>
                </div>
                <div [ngStyle]="logoActionsStyle">
                  <app-logo-mark [client]="draft" [size]="56"></app-logo-mark>
                  <ng-container *ngIf="canEditCoreSettings">
                    <input #logoFileInput type="file" accept="image/*" (change)="onLogoFile($event)" [ngStyle]="hiddenStyle" />
                    <app-button (pressed)="logoFileInput.click()">Upload logo</app-button>
                    <app-button (pressed)="onClearLogo()" [disabled]="!draft.logoImage">Remove logo</app-button>
                  </ng-container>
                </div>
              </div>
              <div *ngIf="logoError" [ngStyle]="logoErrorStyle">{{ logoError }}</div>
            </div>

            <div [ngStyle]="categoryRowStyle">
              <button
                *ngFor="let category of categories"
                type="button"
                [disabled]="!canEditCoreSettings"
                (click)="onField('category', category.key)"
                [ngStyle]="categoryBtnStyle(category)"
              >{{ category.label }}</button>
            </div>

            <div *ngIf="canManageAssignments" [ngStyle]="assignmentsBlockStyle">
              <div [ngStyle]="logoHeadStyle">
                <div>
                  <div [ngStyle]="cardSectionTitleStyle">Assigned team</div>
                  <div [ngStyle]="cardSectionLeadStyle">A client can be assigned to more than one account user.</div>
                </div>
                <app-tone-badge [tone]="(draft.assignedUserIds?.length || 0) ? 'positive' : 'warning'">
                  {{ draft.assignedUserIds?.length || 0 }} assigned user{{ (draft.assignedUserIds?.length || 0) === 1 ? '' : 's' }}
                </app-tone-badge>
              </div>

              <div [ngStyle]="assignmentGridStyle">
                <button
                  *ngFor="let user of accountUsers"
                  type="button"
                  (click)="toggleAssignedUser(user.id)"
                  [ngStyle]="assignmentBtnStyle(user)"
                >
                  <app-user-avatar [user]="user" [size]="34"></app-user-avatar>
                  <div [ngStyle]="minWidthStyle">
                    <div [ngStyle]="assignmentNameRowStyle">
                      <div [ngStyle]="assignmentNameStyle(user)">{{ user.name }}</div>
                      <app-role-chip [role]="user.role"></app-role-chip>
                    </div>
                    <div [ngStyle]="assignmentTitleStyle">{{ user.title }}</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div [ngStyle]="duoStyle">
            <div [ngStyle]="duoCardStyle">
              <div [ngStyle]="cardSectionTitleStyle">Channel budgets</div>
              <div [ngStyle]="budgetListStyle">
                <div *ngFor="let platform of mediaPlatforms">
                  <div [ngStyle]="labelStyle">{{ platformLabel(platform) }}</div>
                  <input
                    type="number"
                    [value]="draft.budgets?.[platform] || 0"
                    (input)="onBudget(platform, $any($event.target).valueAsNumber)"
                    [ngStyle]="inputStyle"
                  />
                </div>
              </div>
              <app-metric-tile
                label="Monthly total"
                [value]="formatCurrency(monthlyTotal)"
                subValue="Used by the pace alert engine"
              ></app-metric-tile>
            </div>

            <div [ngStyle]="duoCardStyle">
              <div [ngStyle]="cardSectionTitleStyle">Connected assets</div>
              <app-connected-asset-dropdown
                *ngFor="let platform of allPlatforms"
                [platform]="platform"
                [assets]="liveAssetsForPlatform(platform)"
                [selectedAssetIds]="draft.linkedAssets?.[platform] || []"
                [selectedAssets]="selectedAssetsFor(platform)"
                [helperText]="helperTextFor(platform)"
                [canEditCoreSettings]="canEditCoreSettings"
                [onOpenConnectionsAvailable]="!!onOpenConnectionsAvailable"
                (toggleAsset)="onToggleAsset(platform, $event)"
                (clearSelection)="onClearLinked(platform)"
                (openConnections)="openConnections.emit()"
              ></app-connected-asset-dropdown>
            </div>
          </div>

          <div [ngStyle]="cardStyle">
            <div [ngStyle]="cardSectionTitleStyle">Custom alert rules</div>
            <div [ngStyle]="formGridStyle">
              <div>
                <div [ngStyle]="labelStyle">Pace tolerance %</div>
                <input type="number" [value]="draft.rules?.pacingTolerance || 0" (input)="onRule('pacingTolerance', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Revenue drop %</div>
                <input type="number" [value]="draft.rules?.revenueDropTolerance || 0" (input)="onRule('revenueDropTolerance', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Max CPC</div>
                <input type="number" step="0.1" [value]="draft.rules?.cpcMax || 0" (input)="onRule('cpcMax', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Max CPM</div>
                <input type="number" step="0.1" [value]="draft.rules?.cpmMax || 0" (input)="onRule('cpmMax', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
            </div>
            <label [ngStyle]="checkboxRowStyle">
              <input type="checkbox" [checked]="!!draft.rules?.stoppedCampaigns" (change)="onRule('stoppedCampaigns', $any($event.target).checked)" />
              Notify only when a campaign stops in the last 24 hours
            </label>
          </div>

          <div [ngStyle]="cardStyle">
            <div [ngStyle]="cardHeadStyle">
              <div>
                <div [ngStyle]="cardSectionTitleStyle">Search term auto-tagging</div>
                <div [ngStyle]="cardSectionLeadStyle">
                  These thresholds are applied to live search terms for this client. Manual tags still override auto tags.
                </div>
              </div>
              <app-tone-badge [tone]="searchTermRules.autoTaggingEnabled ? 'positive' : 'warning'">
                {{ searchTermRules.autoTaggingEnabled ? 'Auto-tagging on' : 'Auto-tagging off' }}
              </app-tone-badge>
            </div>
            <label [ngStyle]="checkboxRowStyle">
              <input type="checkbox" [checked]="searchTermRules.autoTaggingEnabled" (change)="onSearchTermRule('autoTaggingEnabled', $any($event.target).checked)" />
              Automatically tag live search terms using these thresholds
            </label>
            <div [ngStyle]="formGridStyle">
              <div>
                <div [ngStyle]="labelStyle">Good min conversions</div>
                <input type="number" min="0" step="1" [value]="searchTermRules.goodMinConversions" (input)="onSearchTermRule('goodMinConversions', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Good max CPA</div>
                <input type="number" min="0" step="1" [value]="searchTermRules.goodMaxCostPerConversion" (input)="onSearchTermRule('goodMaxCostPerConversion', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
                <div [ngStyle]="labelHintStyle">Use 0 to ignore CPA for good tags.</div>
              </div>
              <div>
                <div [ngStyle]="labelStyle">Bad spend no conv.</div>
                <input type="number" min="0" step="1" [value]="searchTermRules.badNoConversionSpend" (input)="onSearchTermRule('badNoConversionSpend', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Bad clicks no conv.</div>
                <input type="number" min="0" step="1" [value]="searchTermRules.badNoConversionClicks" (input)="onSearchTermRule('badNoConversionClicks', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Bad max relevance</div>
                <input type="number" min="0" max="100" step="1" [value]="searchTermRules.badMaxRelevanceScore" (input)="onSearchTermRule('badMaxRelevanceScore', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Neutral min clicks</div>
                <input type="number" min="0" step="1" [value]="searchTermRules.neutralMinClicks" (input)="onSearchTermRule('neutralMinClicks', $any($event.target).valueAsNumber)" [ngStyle]="inputStyle" />
                <div [ngStyle]="labelHintStyle">Terms below this stay untagged unless Good/Bad thresholds fire.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class ClientStudioComponent {
  @Input() clients: any[] = [];
  @Input() accounts: any[] = [];
  @Input() users: any[] = [];
  @Input() providerProfiles: any[] = [];
  @Input() selectedClientId = "";
  @Input() draft: any = null;
  @Input() layoutColumns = "minmax(260px, 320px) minmax(0, 1fr)";
  @Input() canManageAssignments = false;
  @Input() canEditCoreSettings = true;
  @Input() onOpenConnectionsAvailable = false;
  @Input() state: any = { savingKey: "", error: "", notice: "" };

  @Output() selectClient = new EventEmitter<string>();
  @Output() draftChange = new EventEmitter<any>();
  @Output() save = new EventEmitter<void>();
  @Output() createClient = new EventEmitter<void>();
  @Output() deleteClient = new EventEmitter<any>();
  @Output() openConnections = new EventEmitter<void>();

  logoError = "";

  categories = CATEGORIES;
  targetOptions = CLIENT_TARGET_OPTIONS;
  formatCurrency = formatCurrency;
  mediaPlatforms = ["google_ads", "meta_ads", "tiktok_ads"];
  allPlatforms = Object.keys(PLATFORM_META);

  get targetValue(): string {
    return normalizeClientTarget(this.draft?.focus);
  }
  get connectionStackOk(): boolean {
    return Object.values(this.draft?.connections || {}).filter(Boolean).length > 1;
  }
  get monthlyTotal(): number {
    const b = this.draft?.budgets || {};
    return (Number(b.google_ads) || 0) + (Number(b.meta_ads) || 0) + (Number(b.tiktok_ads) || 0);
  }
  get accountUsers(): any[] {
    return this.users.filter((u) => u.role === "account");
  }
  get searchTermRules() {
    return normalizeSearchTermRules(this.draft?.category, this.draft?.rules?.searchTerms);
  }
  get actionCue(): { tone: any; label: string } {
    if (this.state?.savingKey === this.draft?.id) return { tone: "info", label: "Saving changes..." };
    if (this.state?.error) return { tone: "danger", label: this.state.error };
    if (this.logoError) return { tone: "warning", label: this.logoError };
    if (this.state?.notice) return { tone: "success", label: this.state.notice };
    return { tone: "success", label: "All changes saved" };
  }

  liveAssetsForPlatform(platform: string): any[] {
    return (this.providerProfiles || [])
      .filter((p) => p.platform === platform)
      .flatMap((profile) =>
        (profile.assets || []).map((asset: any) => ({
          ...asset,
          connectionName: profile.name,
          connectionStatus: profile.status,
        })),
      );
  }
  selectedAssetsFor(platform: string): any[] {
    const ids: string[] = this.draft?.linkedAssets?.[platform] || [];
    return this.liveAssetsForPlatform(platform).filter((a) => ids.includes(a.id));
  }
  helperTextFor(platform: string): string {
    if (platform === "ga4") return "Pick the GA4 property or properties that belong to this client.";
    const accounts = (this.accounts || []).filter((a: any) => a.clientId === this.draft?.id && a.platform === platform);
    if (accounts.length) return accounts.map((a) => a.name).join(", ");
    return `Use these synced ${this.platformLabel(platform)} accounts when you marry platform accounts with this client.`;
  }

  platformLabel(platform: string): string {
    return (PLATFORM_META as any)[platform]?.label || platform;
  }

  // ── Mutators (mutate draft in place + emit) ──────────────────────
  onField(field: string, value: any) {
    if (!this.draft) return;
    this.draft[field] = value;
    this.draftChange.emit(this.draft);
  }
  onName(value: string) {
    if (!this.draft) return;
    this.draft.name = value;
    if (!this.draft.logoImage) {
      this.draft.logoText = getClientLogoText(value);
    }
    this.draftChange.emit(this.draft);
  }
  onBudget(platform: string, value: number) {
    if (!this.draft) return;
    this.draft.budgets = { ...(this.draft.budgets || {}), [platform]: value || 0 };
    this.draftChange.emit(this.draft);
  }
  onRule(field: string, value: any) {
    if (!this.draft) return;
    this.draft.rules = { ...(this.draft.rules || {}), [field]: value };
    this.draftChange.emit(this.draft);
  }
  onSearchTermRule(field: string, value: any) {
    if (!this.draft) return;
    const current = normalizeSearchTermRules(this.draft.category, this.draft.rules?.searchTerms);
    this.draft.rules = {
      ...(this.draft.rules || {}),
      searchTerms: { ...current, [field]: value },
    };
    this.draftChange.emit(this.draft);
  }
  toggleAssignedUser(userId: string) {
    if (!this.draft) return;
    const ids: string[] = this.draft.assignedUserIds || [];
    this.draft.assignedUserIds = ids.includes(userId)
      ? ids.filter((id) => id !== userId)
      : [...ids, userId];
    this.draftChange.emit(this.draft);
  }
  onToggleAsset(platform: string, assetId: string) {
    if (!this.draft) return;
    const linked = this.draft.linkedAssets || getEmptyLinkedAssets();
    const current: string[] = Array.isArray(linked[platform]) ? linked[platform] : [];
    const next = current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : [...current, assetId];
    this.draft.linkedAssets = { ...linked, [platform]: Array.from(new Set(next)) };
    this.draft.connections = { ...(this.draft.connections || {}), [platform]: next.length > 0 };
    this.draftChange.emit(this.draft);
  }
  onClearLinked(platform: string) {
    if (!this.draft) return;
    const linked = this.draft.linkedAssets || getEmptyLinkedAssets();
    this.draft.linkedAssets = { ...linked, [platform]: [] };
    this.draft.connections = { ...(this.draft.connections || {}), [platform]: false };
    this.draftChange.emit(this.draft);
  }
  onLogoFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      this.logoError = "Choose an image file for the client logo.";
      return;
    }
    if (file.size > 1_500_000) {
      this.logoError = "Logo files must be under 1.5 MB.";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        this.logoError = "Could not read that logo file.";
        return;
      }
      this.logoError = "";
      this.draft.logoImage = result;
      this.draft.logoText = this.draft.logoText || getClientLogoText(this.draft.name);
      this.draftChange.emit(this.draft);
    };
    reader.onerror = () => (this.logoError = "Could not read that logo file.");
    reader.readAsDataURL(file);
  }
  onClearLogo() {
    if (!this.draft) return;
    this.logoError = "";
    this.draft.logoImage = "";
    this.draft.logoText = getClientLogoText(this.draft.name);
    this.draftChange.emit(this.draft);
  }

  // ── Styles ─────────────────────────────────────────────────────────
  emptyStateStyle = {
    padding: "24px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "14px",
  };
  emptyTitleStyle = { fontSize: "18px", fontWeight: 800, fontFamily: T.heading };
  emptyBodyStyle = { marginTop: "6px", fontSize: "13px", color: T.inkSoft };

  get layoutStyle() {
    return { display: "grid", gridTemplateColumns: this.layoutColumns, gap: "18px" };
  }

  sidebarStyle = {
    padding: "18px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "12px",
    alignSelf: "start",
  };
  sidebarKickerStyle = {
    fontSize: "12px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  sidebarTitleStyle = { marginTop: "8px", fontSize: "15px", fontWeight: 800, color: T.ink };
  clientListStyle = { display: "grid", gap: "8px" };
  clientButtonStyle(client: any) {
    const active = this.selectedClientId === client.id;
    return {
      padding: "12px",
      borderRadius: "16px",
      border: `1px solid ${active ? "rgba(15, 143, 102, 0.22)" : T.line}`,
      background: active ? T.accentSoft : T.surfaceStrong,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: T.font,
    };
  }
  clientRowStyle = { display: "flex", gap: "10px", alignItems: "center" };
  clientCopyStyle = { minWidth: "0" };
  clientNameStyle(client: any) {
    return {
      fontSize: "13px",
      fontWeight: 800,
      color: this.selectedClientId === client.id ? T.accent : T.ink,
    };
  }
  clientFocusStyle = { marginTop: "3px", fontSize: "11px", color: T.inkSoft };

  editorStackStyle = { display: "grid", gap: "18px" };
  errorBannerStyle = {
    padding: "12px 14px",
    borderRadius: "16px",
    background: T.coralSoft,
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };
  noticeBannerStyle = {
    padding: "12px 14px",
    borderRadius: "16px",
    background: T.accentSoft,
    color: T.accent,
    fontSize: "12px",
    fontWeight: 700,
  };
  cardStyle = {
    padding: "20px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "18px",
  };
  cardHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  };
  cardLeftStyle = { display: "flex", gap: "14px", minWidth: "0", flexWrap: "wrap" };
  minWidthStyle = { minWidth: "0" };
  draftTitleStyle = { fontSize: "22px", fontWeight: 800, fontFamily: T.heading };
  draftMetaStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft };
  cardActionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
  lockedNoticeStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: "rgba(45, 108, 223, 0.10)",
    border: "1px solid rgba(45, 108, 223, 0.14)",
    color: T.sky,
    fontSize: "12px",
    fontWeight: 700,
  };
  formGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "12px" };
  labelStyle = {
    marginBottom: "6px",
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.08em",
  };
  labelHintStyle = { marginTop: "5px", fontSize: "11px", color: T.inkMute };
  inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: "14px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    outline: "none",
    fontFamily: T.font,
  };
  get lockedInputStyle() {
    return { ...this.inputStyle, background: T.bgSoft, color: T.inkSoft, cursor: "not-allowed" };
  }
  hiddenStyle = { display: "none" };
  logoBlockStyle = {
    padding: "18px",
    borderRadius: "22px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "12px",
  };
  logoHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  };
  logoActionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  logoErrorStyle = {
    padding: "10px 12px",
    borderRadius: "12px",
    background: T.amberSoft,
    color: T.amber,
    fontSize: "12px",
    fontWeight: 700,
  };
  cardSectionTitleStyle = { fontSize: "16px", fontWeight: 800, fontFamily: T.heading };
  cardSectionLeadStyle = { marginTop: "4px", fontSize: "12px", color: T.inkSoft };
  categoryRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
  categoryBtnStyle(category: any) {
    const active = this.draft?.category === category.key;
    return {
      padding: "10px 13px",
      borderRadius: "999px",
      border: `1px solid ${active ? `${category.color}44` : T.line}`,
      background: active ? category.tint : T.surfaceStrong,
      color: active ? category.color : T.inkSoft,
      cursor: this.canEditCoreSettings ? "pointer" : "not-allowed",
      fontFamily: T.font,
      fontSize: "12px",
      fontWeight: 800,
      opacity: this.canEditCoreSettings ? 1 : 0.56,
    };
  }
  assignmentsBlockStyle = {
    padding: "18px",
    borderRadius: "22px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "12px",
  };
  assignmentGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "10px" };
  assignmentBtnStyle(user: any) {
    const assigned = this.draft?.assignedUserIds?.includes(user.id);
    return {
      padding: "12px",
      borderRadius: "18px",
      border: `1px solid ${assigned ? `${user.accent}44` : T.line}`,
      background: assigned ? `${user.accent}12` : T.surfaceStrong,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: T.font,
      display: "flex",
      gap: "10px",
      alignItems: "center",
    };
  }
  assignmentNameRowStyle = { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" };
  assignmentNameStyle(user: any) {
    const assigned = this.draft?.assignedUserIds?.includes(user.id);
    return { fontSize: "13px", fontWeight: 800, color: assigned ? user.accent : T.ink };
  }
  assignmentTitleStyle = { marginTop: "4px", fontSize: "11px", color: T.inkSoft };

  duoStyle = { display: "grid", gridTemplateColumns: fitCols(280), gap: "18px" };
  duoCardStyle = {
    padding: "20px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "14px",
  };
  budgetListStyle = { display: "grid", gap: "12px" };

  checkboxRowStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: T.inkSoft };
}
