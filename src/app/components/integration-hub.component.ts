// IntegrationHub — mirrors React component (lines 2782-3027 of adpulse-v5.jsx).
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  CONNECTION_GUIDE,
  PLATFORM_META,
  T,
  fitCols,
} from "../foundation/adpulse-foundation";
import {
  AppButtonComponent,
  LogoMarkComponent,
  MetricTileComponent,
  PlatformChipComponent,
  ProviderProfilePillComponent,
  ToneBadgeComponent,
} from "./primitives";

@Component({
  selector: "app-integration-hub",
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    LogoMarkComponent,
    MetricTileComponent,
    PlatformChipComponent,
    ProviderProfilePillComponent,
    ToneBadgeComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="kpiRowStyle">
        <app-metric-tile label="Connected Logins" [value]="providerProfiles.length" subValue="OAuth sessions stored server-side"></app-metric-tile>
        <app-metric-tile label="Synced Assets" [value]="totalAssets" subValue="Ad accounts and GA4 properties"></app-metric-tile>
        <app-metric-tile
          label="Google Ads"
          [value]="assetsForPlatform('google_ads')"
          [subValue]="profilesForPlatform('google_ads').length + ' Google login' + (profilesForPlatform('google_ads').length === 1 ? '' : 's')"
        ></app-metric-tile>
        <app-metric-tile
          label="Meta + GA4"
          [value]="assetsForPlatform('meta_ads') + assetsForPlatform('ga4')"
          subValue="Cross-channel asset catalog"
        ></app-metric-tile>
      </div>

      <div *ngIf="error" [ngStyle]="errorBannerStyle">{{ error }}</div>

      <!-- AI strategist card -->
      <div [ngStyle]="aiCardStyle">
        <div [ngStyle]="aiHeadStyle">
          <div [ngStyle]="minWidthStyle">
            <app-tone-badge [tone]="setupStatus?.configured?.ANTHROPIC_API_KEY ? 'positive' : 'warning'">
              {{ setupStatus?.configured?.ANTHROPIC_API_KEY ? 'AI strategist enabled' : 'AI strategist optional' }}
            </app-tone-badge>
            <div [ngStyle]="aiTitleStyle">AI strategist</div>
            <div [ngStyle]="aiBodyStyle">
              Connect an Anthropic API key to enable Claude Sonnet strategy recommendations on the Accounts and Search Terms screens. This layer reasons over the live dashboard context instead of using a fixed recommendation rule list.
            </div>
          </div>
          <div [ngStyle]="aiBadgesStyle">
            <app-tone-badge *ngIf="setupStatus?.masked?.ANTHROPIC_API_KEY" tone="neutral">
              {{ setupStatus.masked.ANTHROPIC_API_KEY }}
            </app-tone-badge>
            <app-tone-badge tone="neutral">
              {{ setupStatus?.masked?.ANTHROPIC_STRATEGIST_MODEL || 'claude-sonnet-4-6' }}
            </app-tone-badge>
          </div>
        </div>

        <div [ngStyle]="aiFormGridStyle">
          <div>
            <div [ngStyle]="labelStyle">Anthropic API key</div>
            <input
              [value]="aiForm.ANTHROPIC_API_KEY"
              (input)="aiFormChange.emit({ field: 'ANTHROPIC_API_KEY', value: $any($event.target).value })"
              placeholder="sk-ant-..."
              [ngStyle]="aiInputStyle"
            />
          </div>
          <div>
            <div [ngStyle]="labelStyle">Model</div>
            <input
              [value]="aiForm.ANTHROPIC_STRATEGIST_MODEL"
              (input)="aiFormChange.emit({ field: 'ANTHROPIC_STRATEGIST_MODEL', value: $any($event.target).value })"
              placeholder="claude-sonnet-4-6"
              [ngStyle]="aiInputStyle"
            />
          </div>
        </div>

        <div [ngStyle]="aiActionsStyle">
          <app-button tone="primary" (pressed)="saveAiConfig.emit()" [disabled]="aiSetupState?.saving">
            {{ aiSetupState?.saving ? 'Saving...' : 'Save AI settings' }}
          </app-button>
          <div [ngStyle]="aiActionsHintStyle">Leave the model blank to use the default strategist model.</div>
        </div>

        <div *ngIf="aiSetupState?.error" [ngStyle]="aiErrorStyle">{{ aiSetupState.error }}</div>
        <div *ngIf="aiSetupState?.success" [ngStyle]="aiSuccessStyle">{{ aiSetupState.success }}</div>
      </div>

      <!-- Per-platform connect cards -->
      <div [ngStyle]="platformGridStyle">
        <div *ngFor="let platform of platforms" [ngStyle]="platformCardStyle">
          <div [ngStyle]="platformHeadStyle">
            <div [ngStyle]="minWidthStyle">
              <app-platform-chip [platform]="platform"></app-platform-chip>
              <div [ngStyle]="platformTitleStyle">{{ guide(platform).title }}</div>
              <div [ngStyle]="platformBodyStyle">{{ guide(platform).body }}</div>
            </div>
            <app-tone-badge [tone]="configFor(platform).ready ? 'positive' : 'warning'">
              {{ configFor(platform).ready ? 'Ready to connect' : 'Needs credentials' }}
            </app-tone-badge>
          </div>

          <div [ngStyle]="platformKpiRowStyle">
            <app-metric-tile
              label="Connected logins"
              [value]="profilesForPlatform(platform).length"
              subValue="One login can sync many assets"
            ></app-metric-tile>
            <app-metric-tile
              label="Synced assets"
              [value]="assetsForPlatform(platform)"
              [subValue]="platform === 'ga4' ? 'Properties available to link' : 'Accounts available to link'"
            ></app-metric-tile>
          </div>

          <div *ngIf="!configFor(platform).ready" [ngStyle]="missingCredsStyle">
            Missing env vars: {{ configFor(platform).missing.join(', ') }}
          </div>

          <div [ngStyle]="actionsStyle">
            <app-button
              tone="primary"
              (pressed)="connect.emit(platform)"
              [disabled]="!configFor(platform).ready || !!busyMap['connect-' + platform]"
            >
              {{ profilesForPlatform(platform).length ? 'Connect another login' : 'Start login flow' }}
            </app-button>
          </div>

          <ng-container *ngIf="profilesForPlatform(platform).length; else noProfiles">
            <div [ngStyle]="profileListStyle">
              <div *ngFor="let profile of profilesForPlatform(platform)" [ngStyle]="profileCardStyle">
                <div [ngStyle]="profileHeadStyle">
                  <div [ngStyle]="minWidthStyle">
                    <app-provider-profile-pill [profile]="profile"></app-provider-profile-pill>
                    <div [ngStyle]="profileScopeStyle">{{ profile.scopeLabel }} | {{ profile.email || 'Email unavailable' }}</div>
                    <div [ngStyle]="profileExternalStyle">{{ profile.externalId || 'No external ID yet' }}</div>
                  </div>
                  <app-tone-badge [tone]="profile.status === 'attention' || profile.lastError ? 'warning' : 'positive'">
                    {{ profile.status === 'attention' || profile.lastError ? 'Needs attention' : 'Healthy' }}
                  </app-tone-badge>
                </div>

                <div [ngStyle]="profileKpiRowStyle">
                  <app-metric-tile
                    label="Assets"
                    [value]="profile.assets?.length || 0"
                    [subValue]="platform === 'ga4' ? 'GA4 properties' : 'Ad accounts'"
                  ></app-metric-tile>
                  <app-metric-tile
                    label="Clients linked"
                    [value]="linkedClientsFor(profile, platform).length"
                    subValue="Matched from Client Studio"
                  ></app-metric-tile>
                </div>

                <div [ngStyle]="profileNoteStyle">
                  {{ profile.note || 'Connected successfully.' }}<ng-container *ngIf="profile.lastSyncedAt"> Last sync: {{ profile.lastSyncedAt }}.</ng-container><ng-container *ngIf="profile.lastError"> Error: {{ profile.lastError }}</ng-container>
                </div>

                <ng-container *ngIf="profile.assets?.length; else noAssets">
                  <div [ngStyle]="assetChipRowStyle">
                    <div *ngFor="let asset of profile.assets.slice(0, 6)" [ngStyle]="assetChipStyle">
                      <span [ngStyle]="assetNameStyle">{{ asset.name }}</span>
                      <span [ngStyle]="assetIdStyle">{{ asset.externalId }}</span>
                    </div>
                    <app-tone-badge *ngIf="profile.assets.length > 6" tone="neutral">+{{ profile.assets.length - 6 }} more</app-tone-badge>
                  </div>
                </ng-container>
                <ng-template #noAssets>
                  <app-tone-badge tone="warning">No synced assets yet</app-tone-badge>
                </ng-template>

                <div *ngIf="linkedClientsFor(profile, platform).length" [ngStyle]="linkedClientRowStyle">
                  <div *ngFor="let client of linkedClientsFor(profile, platform)" [ngStyle]="linkedClientChipStyle">
                    <app-logo-mark [client]="client" [size]="20"></app-logo-mark>
                    <span [ngStyle]="linkedClientNameStyle">{{ client.name }}</span>
                  </div>
                </div>

                <div [ngStyle]="actionsStyle">
                  <app-button tone="primary" (pressed)="sync.emit(profile.id)" [disabled]="!!busyMap[profile.id]">Sync now</app-button>
                  <app-button (pressed)="disconnect.emit(profile.id)" [disabled]="!!busyMap[profile.id + '-disconnect']">Disconnect</app-button>
                </div>
              </div>
            </div>
          </ng-container>
          <ng-template #noProfiles>
            <div [ngStyle]="noProfilesStyle">
              {{ loading ? 'Checking existing logins...' : ('No ' + platformLabel(platform) + ' login connected yet.') }}
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
})
export class IntegrationHubComponent {
  @Input() providerProfiles: any[] = [];
  @Input() clients: any[] = [];
  @Input() configured: any = {};
  @Input() loading = false;
  @Input() error = "";
  @Input() busyMap: Record<string, boolean> = {};
  @Input() layoutColumns = "minmax(0, 1fr) minmax(0, 1fr)";
  @Input() setupStatus: any = null;
  @Input() aiForm: any = { ANTHROPIC_API_KEY: "", ANTHROPIC_STRATEGIST_MODEL: "" };
  @Input() aiSetupState: any = { saving: false, error: "", success: "" };

  @Output() connect = new EventEmitter<string>();
  @Output() sync = new EventEmitter<string>();
  @Output() disconnect = new EventEmitter<string>();
  @Output() aiFormChange = new EventEmitter<{ field: string; value: string }>();
  @Output() saveAiConfig = new EventEmitter<void>();

  platforms = Object.keys(PLATFORM_META);

  guide(platform: string): any {
    return (CONNECTION_GUIDE as any)[platform] || { title: "", body: "" };
  }
  platformLabel(platform: string): string {
    return (PLATFORM_META as any)[platform]?.label || platform;
  }
  profilesForPlatform(platform: string): any[] {
    return (this.providerProfiles || []).filter((p) => p.platform === platform);
  }
  assetsForPlatform(platform: string): number {
    return this.profilesForPlatform(platform).reduce((acc, p) => acc + (p.assets?.length || 0), 0);
  }
  configFor(platform: string): { ready: boolean; missing: string[] } {
    const c = this.configured?.[platform];
    return {
      ready: c?.ready === true,
      missing: Array.isArray(c?.missing) ? c.missing : [],
    };
  }
  linkedClientsFor(profile: any, platform: string): any[] {
    const ids = new Set((profile.assets || []).map((asset: any) => asset.id));
    return (this.clients || []).filter((client) =>
      (client.linkedAssets?.[platform] || []).some((assetId: string) => ids.has(assetId)),
    );
  }
  get totalAssets(): number {
    return (this.providerProfiles || []).reduce((acc, p) => acc + (p.assets?.length || 0), 0);
  }

  // ── Styles ─────────────────────────────────────────────────────────
  rootStyle = { display: "grid", gap: "18px" };
  kpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(180), gap: "12px" };
  errorBannerStyle = {
    padding: "14px",
    borderRadius: "18px",
    background: T.coralSoft,
    color: T.coral,
    border: "1px solid rgba(215, 93, 66, 0.16)",
    fontSize: "12px",
    fontWeight: 700,
  };
  aiCardStyle = {
    padding: "20px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
  };
  aiHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  minWidthStyle = { minWidth: "0" };
  aiTitleStyle = { marginTop: "10px", fontSize: "18px", fontWeight: 800, fontFamily: T.heading };
  aiBodyStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft, lineHeight: 1.55 };
  aiBadgesStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  aiFormGridStyle = { display: "grid", gridTemplateColumns: fitCols(240), gap: "12px" };
  labelStyle = {
    marginBottom: "6px",
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.08em",
  };
  aiInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: "14px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    outline: "none",
    fontFamily: T.mono,
  };
  aiActionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  aiActionsHintStyle = { fontSize: "12px", color: T.inkSoft };
  aiErrorStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.coralSoft,
    border: "1px solid rgba(215, 93, 66, 0.16)",
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };
  aiSuccessStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.accentSoft,
    border: "1px solid rgba(15, 143, 102, 0.16)",
    color: T.accent,
    fontSize: "12px",
    fontWeight: 700,
  };

  get platformGridStyle() {
    return { display: "grid", gridTemplateColumns: this.layoutColumns, gap: "18px" };
  }
  platformCardStyle = {
    padding: "20px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "16px",
    alignContent: "start",
  };
  platformHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  platformTitleStyle = { marginTop: "10px", fontSize: "18px", fontWeight: 800, fontFamily: T.heading };
  platformBodyStyle = { marginTop: "6px", fontSize: "12px", color: T.inkSoft, lineHeight: 1.55 };
  platformKpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(120), gap: "10px" };
  missingCredsStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.amberSoft,
    color: T.amber,
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1.5,
  };
  actionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
  profileListStyle = { display: "grid", gap: "12px" };
  profileCardStyle = {
    padding: "14px",
    borderRadius: "18px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "12px",
  };
  profileHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  profileScopeStyle = { marginTop: "8px", fontSize: "12px", color: T.inkSoft };
  profileExternalStyle = { marginTop: "4px", fontSize: "11px", color: T.inkSoft };
  profileKpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(120), gap: "10px" };
  profileNoteStyle = { fontSize: "12px", color: T.inkSoft, lineHeight: 1.5 };
  assetChipRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  assetChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    borderRadius: "999px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    maxWidth: "100%",
  };
  assetNameStyle = {
    fontSize: "11px",
    fontWeight: 800,
    color: T.ink,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  assetIdStyle = { fontSize: "10px", color: T.inkSoft };
  linkedClientRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  linkedClientChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    borderRadius: "999px",
    background: T.surfaceMuted,
    border: `1px solid ${T.line}`,
  };
  linkedClientNameStyle = { fontSize: "11px", fontWeight: 700, color: T.ink };
  noProfilesStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    color: T.inkSoft,
    fontSize: "12px",
  };
}
