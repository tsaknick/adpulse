// Top-level shell. Mirrors the React `AdPulse` default-export component
// (adpulse-v5.jsx line 10131 onward) — bootstrap, view router, profile drawer.
// Big screens are gradually replaced with React-fidelity components.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";

import {
  ACCOUNTS_BASE,
  ADS_BASE,
  CAMPAIGNS_BASE,
  DEMO_USER_PASSWORD,
  GA4_BASE,
  STORAGE_KEYS,
  T,
  buildLiveGa4Summary,
  createEmptyClientDirectoryState,
  createEmptyGa4LiveState,
  createEmptyGoogleAdsLiveState,
  createEmptyGoogleAdsReportState,
  createEmptyIntegrationSnapshot,
  createEmptyMetaAdsLiveState,
  createEmptyTikTokAdsLiveState,
  createEmptyUserDirectoryState,
  evaluateHealth,
  fitCols,
  getAccountDateRangePayload,
  getConversionValue,
  getDefaultAccountDateRange,
  hydrateClients,
  hydrateUsers,
  isStoppedCampaign,
  readStoredValue,
  sanitizeGoogleAdsId,
  splitTotal,
} from "./foundation/adpulse-foundation";
import { groupClientsByReportingGroup } from "./foundation/post-foundation-helpers";
import { IntegrationApiService } from "./integration-api.service";

import { AppShellComponent } from "./components/app-shell.component";
import { LoginScreenComponent } from "./components/login-screen.component";
import { SetupWizardComponent } from "./components/setup-wizard.component";
import { FiltersBarComponent } from "./components/filters-bar.component";
import { AccountDateRangeControlComponent } from "./components/account-date-range-control.component";
import { ReportingGroupSectionComponent } from "./components/reporting-group-section.component";
import { OverviewCardComponent, OverviewRowComponent } from "./components/overview-card.component";
import { EmptyStateComponent, ToastStackComponent } from "./components/primitives";
import { AlertLaneComponent } from "./components/alert-lane.component";
import { UserAdminPanelComponent } from "./components/user-admin-panel.component";
import { IntegrationHubComponent } from "./components/integration-hub.component";
import { ClientStudioComponent } from "./components/client-studio.component";
import { SearchTermsWorkbenchComponent } from "./components/search-terms-workbench.component";
import { AnalyticsViewComponent } from "./components/analytics-view.component";
import { AccountStackComponent } from "./components/account-stack.component";
import { ReportsViewComponent } from "./components/reports-view.component";

type ViewKey = "overview" | "accounts" | "search_terms" | "analytics" | "reports" | "alerts" | "studio" | "users" | "connections";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppShellComponent,
    LoginScreenComponent,
    SetupWizardComponent,
    FiltersBarComponent,
    AccountDateRangeControlComponent,
    ReportingGroupSectionComponent,
    OverviewCardComponent,
    OverviewRowComponent,
    EmptyStateComponent,
    ToastStackComponent,
    AlertLaneComponent,
    UserAdminPanelComponent,
    IntegrationHubComponent,
    ClientStudioComponent,
    SearchTermsWorkbenchComponent,
    AnalyticsViewComponent,
    AccountStackComponent,
    ReportsViewComponent,
  ],
  template: `
    <ng-container *ngIf="setupComplete === false">
      <app-setup-wizard
        (complete)="onSetupComplete()"
        (statusUpdate)="onSetupStatusUpdate($event)"
      ></app-setup-wizard>
    </ng-container>

    <ng-container *ngIf="setupComplete !== false">
      <app-login-screen
        *ngIf="!currentUser"
        [users]="users"
        [demoUsers]="demoUsers"
        [form]="loginForm"
        [error]="loginError"
        (formChange)="onLoginFormChange($event)"
        (submit)="handleLogin()"
        (quickLogin)="handleQuickLogin($event)"
      ></app-login-screen>

      <ng-container *ngIf="currentUser">
        <app-shell
          [view]="view"
          [navItems]="navItems"
          [currentUser]="currentUser"
          [isDirector]="isDirector"
          [accessibleClientCount]="accessibleClients.length"
          [showProfile]="profileOpen"
          [profileDraft]="profileDraft"
          [assignedClients]="currentUserAssignedClients"
          (viewChange)="setView($event)"
          (toggleProfile)="toggleProfile()"
          (profileDraftChange)="onProfileDraftChange($event)"
          (saveProfile)="saveProfile()"
          (logout)="handleLogout()"
        >
          <ng-container [ngSwitch]="view">
            <ng-container *ngSwitchCase="'overview'">
              <div [ngStyle]="liveDataBarStyle">
                <div [ngStyle]="liveDataBarLeftStyle">
                  <span [ngStyle]="liveDataBarLabelStyle">Live data</span>
                  <span [ngStyle]="liveDataBarStatusStyle">{{ liveDataStatusLabel }}</span>
                </div>
                <button type="button" (click)="reloadLiveData(false)" [ngStyle]="liveDataReloadStyle">Reload data</button>
              </div>

              <div *ngFor="let err of liveDataErrors" [ngStyle]="liveDataErrorStyle">
                <strong>{{ err.label }}:</strong> {{ err.message }}
              </div>

              <app-filters-bar
                [search]="search"
                [statusFilter]="statusFilter"
                [categoryFilter]="categoryFilter"
                [sortBy]="sortBy"
                [overviewMode]="overviewMode"
                [showModeToggle]="true"
                [showGroupingToggle]="true"
                [groupByReporting]="groupByReporting"
                [count]="filteredClients.length"
                (searchChange)="search = $event"
                (statusFilterChange)="statusFilter = $event"
                (categoryFilterChange)="categoryFilter = $event"
                (sortByChange)="sortBy = $event"
                (overviewModeChange)="overviewMode = $any($event)"
                (groupByReportingChange)="groupByReporting = $event"
              ></app-filters-bar>

              <app-empty-state
                *ngIf="filteredClients.length === 0"
                [title]="clients.length ? 'No clients match the current filters' : 'No live clients yet'"
                [body]="clients.length ? 'Try a different search or switch back to all clients.' : 'Open Client Studio, add a client, then link synced assets to start seeing live data.'"
              ></app-empty-state>

              <ng-container *ngIf="filteredClients.length > 0">
                <ng-container *ngIf="overviewMode === 'grid'">
                  <ng-container *ngIf="groupByReporting; else flatGrid">
                    <app-reporting-group-section
                      *ngFor="let group of filteredClientGroups"
                      [group]="group"
                    >
                      <div [ngStyle]="gridStyle">
                        <app-overview-card
                          *ngFor="let client of group.clients"
                          [client]="client"
                          [users]="accountUsers"
                          (openAccounts)="jumpToAccounts(client.id)"
                          (edit)="jumpToStudio(client.id)"
                          (resolveIssue)="resolveClientIssue($event)"
                        ></app-overview-card>
                      </div>
                    </app-reporting-group-section>
                  </ng-container>
                  <ng-template #flatGrid>
                    <div [ngStyle]="gridStyle">
                      <app-overview-card
                        *ngFor="let client of filteredClients"
                        [client]="client"
                        [users]="accountUsers"
                        (openAccounts)="jumpToAccounts(client.id)"
                        (edit)="jumpToStudio(client.id)"
                        (resolveIssue)="resolveClientIssue($event)"
                      ></app-overview-card>
                    </div>
                  </ng-template>
                </ng-container>

                <ng-container *ngIf="overviewMode === 'list'">
                  <ng-container *ngIf="groupByReporting; else flatList">
                    <app-reporting-group-section
                      *ngFor="let group of filteredClientGroups"
                      [group]="group"
                    >
                      <div [ngStyle]="listStyle">
                        <app-overview-row
                          *ngFor="let client of group.clients"
                          [client]="client"
                          [users]="accountUsers"
                          (openAccounts)="jumpToAccounts(client.id)"
                          (edit)="jumpToStudio(client.id)"
                          (resolveIssue)="resolveClientIssue($event)"
                        ></app-overview-row>
                      </div>
                    </app-reporting-group-section>
                  </ng-container>
                  <ng-template #flatList>
                    <div [ngStyle]="listStyle">
                      <app-overview-row
                        *ngFor="let client of filteredClients"
                        [client]="client"
                        [users]="accountUsers"
                        (openAccounts)="jumpToAccounts(client.id)"
                        (edit)="jumpToStudio(client.id)"
                        (resolveIssue)="resolveClientIssue($event)"
                      ></app-overview-row>
                    </div>
                  </ng-template>
                </ng-container>
              </ng-container>
            </ng-container>

            <ng-container *ngSwitchCase="'alerts'">
              <app-alert-lane
                title="Red lane / needs focus"
                description="Clients listed here failed at least one rule. Resolve flags inline or open the account stack for deeper work."
                [items]="redClients"
                [ok]="false"
                [users]="accountUsers"
                (openAccounts)="jumpToAccounts($event)"
                (edit)="jumpToStudio($event)"
                (resolveIssue)="resolveClientIssue($event)"
              ></app-alert-lane>
              <app-alert-lane
                title="Green lane / all clear"
                description="These clients passed alert checks for the selected period."
                [items]="greenClients"
                [ok]="true"
                [users]="accountUsers"
                (openAccounts)="jumpToAccounts($event)"
                (edit)="jumpToStudio($event)"
                (resolveIssue)="resolveClientIssue($event)"
              ></app-alert-lane>
            </ng-container>

            <ng-container *ngSwitchCase="'users'">
              <app-user-admin-panel
                [users]="users"
                [clients]="clients"
                [currentUserId]="currentUserId"
                [state]="userDirectoryState"
                (createUser)="onCreateUser($event)"
                (updateUser)="onUpdateUser($event)"
                (deleteUser)="onDeleteUser($event)"
              ></app-user-admin-panel>
            </ng-container>

            <ng-container *ngSwitchCase="'connections'">
              <app-integration-hub
                [providerProfiles]="providerProfiles"
                [clients]="enrichedClients"
                [configured]="integrationState?.configured || {}"
                [loading]="!!integrationState?.loading"
                [error]="integrationState?.error || ''"
                [busyMap]="integrationBusy"
                [setupStatus]="setupStatus"
                [aiForm]="aiForm"
                [aiSetupState]="aiSetupState"
                (connect)="onConnectProvider($event)"
                (sync)="onSyncProvider($event)"
                (disconnect)="onDisconnectProvider($event)"
                (aiFormChange)="onAiFormChange($event)"
                (saveAiConfig)="onSaveAiConfig()"
              ></app-integration-hub>
            </ng-container>

            <ng-container *ngSwitchCase="'studio'">
              <app-client-studio
                [clients]="clients"
                [accounts]="studioAccounts"
                [users]="users"
                [providerProfiles]="providerProfiles"
                [selectedClientId]="selectedClientId"
                [draft]="studioDraft"
                [canManageAssignments]="isDirector"
                [canEditCoreSettings]="isDirector"
                [onOpenConnectionsAvailable]="isDirector"
                [state]="studioState"
                (selectClient)="onStudioSelectClient($event)"
                (draftChange)="onStudioDraftChange($event)"
                (save)="onSaveStudio()"
                (createClient)="onCreateStudioClient()"
                (deleteClient)="onDeleteStudioClient($event)"
                (openConnections)="setView('connections')"
              ></app-client-studio>
            </ng-container>

                        <ng-container *ngSwitchCase="'search_terms'">
              <app-search-terms-workbench
                [clients]="enrichedClients"
                [providerProfiles]="providerProfiles"
                [aiReady]="!!setupStatus?.configured?.ANTHROPIC_API_KEY"
                [onOpenConnectionsAvailable]="isDirector"
                (openConnections)="setView('connections')"
              ></app-search-terms-workbench>
            </ng-container>

                        <ng-container *ngSwitchCase="'analytics'">
              <app-analytics-view
                [clients]="enrichedClients"
                [selectedClientId]="analyticsClientId"
                [seriesMap]="seriesMap"
                [dateRangeLabel]="analyticsDateRangeLabel"
                [liveState]="ga4LiveState"
                [charts]="charts"
                (clientChange)="analyticsClientId = $event"
                (addChartPreset)="onAddChartPreset($event)"
                (removeChart)="onRemoveChart($event)"
                (clearCharts)="onClearCharts()"
              ></app-analytics-view>
            </ng-container>

                        <ng-container *ngSwitchCase="'accounts'">
              <div [ngStyle]="liveDataBarStyle">
                <div [ngStyle]="liveDataBarLeftStyle">
                  <span [ngStyle]="liveDataBarLabelStyle">Live data</span>
                  <span [ngStyle]="liveDataBarStatusStyle">{{ liveDataStatusLabel }}</span>
                </div>
                <button type="button" (click)="reloadLiveData(false)" [ngStyle]="liveDataReloadStyle">Reload data</button>
              </div>

              <div *ngFor="let err of liveDataErrors" [ngStyle]="liveDataErrorStyle">
                <strong>{{ err.label }}:</strong> {{ err.message }}
              </div>

              <app-filters-bar
                [search]="search"
                [statusFilter]="statusFilter"
                [categoryFilter]="categoryFilter"
                [sortBy]="sortBy"
                [overviewMode]="overviewMode"
                [showModeToggle]="false"
                [showGroupingToggle]="true"
                [groupByReporting]="groupByReporting"
                [count]="filteredClients.length"
                (searchChange)="search = $event"
                (statusFilterChange)="statusFilter = $event"
                (categoryFilterChange)="categoryFilter = $event"
                (sortByChange)="sortBy = $event"
                (groupByReportingChange)="groupByReporting = $event"
              ></app-filters-bar>

              <app-account-date-range-control
                [value]="accountsDateRange"
                (valueChange)="onAccountsDateRangeChange($event)"
              ></app-account-date-range-control>

              <app-empty-state
                *ngIf="!filteredClients.length"
                title="No live clients yet"
                body="Open Client Studio, add a client, then link synced ad accounts to populate this screen."
              ></app-empty-state>

              <ng-container *ngIf="filteredClients.length > 0">
                <ng-container *ngIf="groupByReporting; else flatStack">
                  <app-reporting-group-section
                    *ngFor="let group of filteredClientGroups"
                    [group]="group"
                  >
                    <div [ngStyle]="listStyle">
                      <app-account-stack
                        *ngFor="let client of group.clients"
                        [client]="client"
                        [users]="accountUsers"
                        [campaigns]="client.campaigns || []"
                        [ads]="client.ads || []"
                        [dateRangeLabel]="analyticsDateRangeLabel"
                        (resolveIssue)="resolveClientIssue($event)"
                      ></app-account-stack>
                    </div>
                  </app-reporting-group-section>
                </ng-container>
                <ng-template #flatStack>
                  <div [ngStyle]="listStyle">
                    <app-account-stack
                      *ngFor="let client of filteredClients"
                      [client]="client"
                      [users]="accountUsers"
                      [campaigns]="client.campaigns || []"
                      [ads]="client.ads || []"
                      [dateRangeLabel]="analyticsDateRangeLabel"
                      (resolveIssue)="resolveClientIssue($event)"
                    ></app-account-stack>
                  </div>
                </ng-template>
              </ng-container>
            </ng-container>

                        <ng-container *ngSwitchCase="'reports'">
              <app-reports-view
                [clients]="enrichedClients"
                [selectedClientId]="reportClientId"
                [seriesMap]="seriesMap"
                [dateRangeLabel]="analyticsDateRangeLabel"
                [dateRangeValue]="accountsDateRange"
                [reportPreset]="reportPreset"
                [selectedSections]="reportSections"
                [scheduleDraft]="reportScheduleDraft"
                [readinessItems]="reportReadinessItems"
                [builderCue]="reportBuilderCue"
                [googleReportState]="googleAdsReportState"
                (clientChange)="reportClientId = $event"
                (dateRangeChange)="onAccountsDateRangeChange($event)"
                (presetChange)="reportPreset = $event"
                (sectionsChange)="reportSections = $event"
                (scheduleDraftChange)="reportScheduleDraft = $event"
                (saveSchedule)="onSaveReportSchedule($event)"
              ></app-reports-view>
            </ng-container>

                        <ng-container *ngSwitchDefault>
              <div [ngStyle]="placeholderStyle">
                <div [ngStyle]="placeholderTitleStyle">{{ viewLabel }}</div>
                <div [ngStyle]="placeholderBodyStyle">
                  This screen is being ported from the React reference. Use the Overview tab to preview the new look while the rest land.
                </div>
              </div>
            </ng-container>
          </ng-container>
        </app-shell>
      </ng-container>
    </ng-container>

    <app-toast-stack [items]="toasts" (dismiss)="dismissToast($event)"></app-toast-stack>
  `,
  styles: [],
})
export class AppComponent implements OnInit, OnDestroy {
  readonly platforms = ["google_ads", "meta_ads", "tiktok_ads", "ga4"];

  view: ViewKey = "overview";
  search = "";
  statusFilter: "all" | "red" | "green" = "all";
  categoryFilter = "all";
  sortBy = "priority";
  overviewMode: "grid" | "list" = "grid";
  groupByReporting = false;

  users: any[] = [];
  clients: any[] = [];
  accountsDateRange = getDefaultAccountDateRange();
  integrationState: any = { ...createEmptyIntegrationSnapshot(), loading: true, error: "" };
  userDirectoryState: any = createEmptyUserDirectoryState();
  clientDirectoryState: any = createEmptyClientDirectoryState();
  googleAdsLiveState: any = createEmptyGoogleAdsLiveState();
  googleAdsReportState: any = createEmptyGoogleAdsReportState();
  metaAdsLiveState: any = createEmptyMetaAdsLiveState();
  tiktokAdsLiveState: any = createEmptyTikTokAdsLiveState();
  ga4LiveState: any = createEmptyGa4LiveState();
  integrationBusy: Record<string, boolean> = {};

  currentUserId = "";
  setupComplete: boolean | null = null;
  setupStatus: any = null;
  profileOpen = false;
  profileDraft = { name: "", title: "" };
  loginForm = { email: "director@adpulse.local", password: DEMO_USER_PASSWORD };
  loginError = "";
  toasts: any[] = [];
  selectedClientId = "";

  private oauthMessageHandler = (event: MessageEvent) => this.handleOAuthMessage(event);

  constructor(private api: IntegrationApiService) {}

  async ngOnInit() {
    if (typeof window !== "undefined") {
      this.currentUserId = readStoredValue(STORAGE_KEYS.session, "") || "";
      window.addEventListener("message", this.oauthMessageHandler);
    }
    await this.bootstrap();
  }

  ngOnDestroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.oauthMessageHandler);
    }
  }

  private async bootstrap() {
    try {
      const status: any = await this.api.fetchSetupStatus();
      this.setupStatus = status;
      this.setupComplete = !!status?.allReady;
    } catch {
      this.setupComplete = true;
    }

    this.userDirectoryState = { ...this.userDirectoryState, loading: true, error: "" };
    try {
      const payload: any = await this.api.fetchUsers();
      this.users = hydrateUsers(payload?.users);
      this.userDirectoryState = { ...this.userDirectoryState, loading: false, error: "" };
    } catch (error: any) {
      this.userDirectoryState = {
        ...this.userDirectoryState,
        loading: false,
        error: error?.message || "Could not load saved users.",
      };
      this.pushToast(error?.message || "Could not load saved users.", "danger", "Users");
    }

    this.clientDirectoryState = { ...this.clientDirectoryState, loading: true, error: "" };
    try {
      const payload: any = await this.api.fetchClients();
      const stored = Array.isArray(payload?.clients) ? payload.clients : [];
      this.clients = hydrateClients(stored);
      this.clientDirectoryState = { ...this.clientDirectoryState, loading: false, error: "", notice: "" };
    } catch (error: any) {
      this.clients = hydrateClients([]);
      this.clientDirectoryState = {
        ...this.clientDirectoryState,
        loading: false,
        error: error?.message || "Could not load saved clients.",
      };
    }

    await this.refreshIntegrations({ silent: true });
    this.ensureStudioDraft();
    this.reloadLiveData(false);
  }

  private async refreshIntegrations({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) {
      this.integrationState = { ...this.integrationState, loading: true, error: "" };
    }
    try {
      const snapshot: any = await this.api.fetchIntegrationSnapshot();
      this.integrationState = {
        loading: false,
        error: "",
        connections: snapshot?.connections || [],
        configured: snapshot?.configured || {},
      };
    } catch (error: any) {
      this.integrationState = {
        ...this.integrationState,
        loading: false,
        error: error?.message || "Could not load integrations.",
      };
    }
  }

  private handleOAuthMessage(event: MessageEvent) {
    const data: any = event?.data;
    if (!data || data.source !== "adpulse-oauth") return;
    if (data.ok) {
      this.refreshIntegrations({ silent: true }).then(() => this.reloadLiveData(true));
      this.pushToast("Connection completed successfully.", "success", "Integrations");
    } else {
      this.integrationState = {
        ...this.integrationState,
        loading: false,
        error: data.error || "The provider login did not complete.",
      };
      this.pushToast(data.error || "The provider login did not complete.", "danger", "Integrations");
    }
  }

  get currentUser(): any {
    return this.users.find((user) => user.id === this.currentUserId) || null;
  }
  get isDirector(): boolean {
    return this.currentUser?.role === "director";
  }
  get demoUsers(): any[] {
    return this.users.filter((user) => user.isSeeded);
  }
  get accountUsers(): any[] {
    return this.users.filter((user) => user.role === "account");
  }
  get accessibleClients(): any[] {
    if (!this.currentUser) return [];
    if (this.isDirector) return this.clients;
    return this.clients.filter((client) => client.assignedUserIds?.includes(this.currentUserId));
  }
  get currentUserAssignedClients(): any[] {
    if (!this.currentUser || this.isDirector) return [];
    return this.accessibleClients;
  }
  get providerProfiles(): any[] {
    return this.integrationState?.connections || [];
  }

  get enrichedClients(): any[] {
    return this.accessibleClients.map((client) => this.enrichClient(client));
  }

  private enrichClient(client: any): any {
    // Mirrors React enrichment (adpulse-v5.jsx ~line 10780): merges live data
    // from googleAdsLiveState / metaAdsLiveState / tiktokAdsLiveState /
    // ga4LiveState into the client when assets are linked, otherwise falls
    // back to the seed demo data.
    const hasAnyProviders = this.providerProfiles.length > 0;

    const liveGoogleAccounts = this.googleAdsLiveState.accounts.filter((a: any) => a.clientId === client.id);
    const liveGoogleCampaigns = this.googleAdsLiveState.campaigns.filter((c: any) => c.clientId === client.id);
    const liveGoogleAds = this.googleAdsLiveState.ads.filter((a: any) => a.clientId === client.id);
    const liveMetaAccounts = this.metaAdsLiveState.accounts.filter((a: any) => a.clientId === client.id);
    const liveMetaCampaigns = this.metaAdsLiveState.campaigns.filter((c: any) => c.clientId === client.id);
    const liveMetaAds = this.metaAdsLiveState.ads.filter((a: any) => a.clientId === client.id);
    const liveTikTokAccounts = this.tiktokAdsLiveState.accounts.filter((a: any) => a.clientId === client.id);
    const liveTikTokCampaigns = this.tiktokAdsLiveState.campaigns.filter((c: any) => c.clientId === client.id);
    const liveTikTokAds = this.tiktokAdsLiveState.ads.filter((a: any) => a.clientId === client.id);
    const liveGa4Reports = this.ga4LiveState.properties.filter((p: any) => p.clientId === client.id);

    const linkedAssetCounts = {
      google_ads: Array.isArray(client.linkedAssets?.google_ads) ? client.linkedAssets.google_ads.length : 0,
      meta_ads: Array.isArray(client.linkedAssets?.meta_ads) ? client.linkedAssets.meta_ads.length : 0,
      tiktok_ads: Array.isArray(client.linkedAssets?.tiktok_ads) ? client.linkedAssets.tiktok_ads.length : 0,
      ga4: Array.isArray(client.linkedAssets?.ga4) ? client.linkedAssets.ga4.length : 0,
    };
    const hasLinkedGoogle = linkedAssetCounts.google_ads > 0;
    const hasLinkedMeta = linkedAssetCounts.meta_ads > 0;
    const hasLinkedTikTok = linkedAssetCounts.tiktok_ads > 0;
    const hasLinkedGa4 = linkedAssetCounts.ga4 > 0;
    const hasStoredLinkedAssets = hasLinkedGoogle || hasLinkedMeta || hasLinkedTikTok || hasLinkedGa4;

    const useLiveGoogle = hasLinkedGoogle;
    const useLiveMeta = hasLinkedMeta;
    const useLiveTikTok = hasLinkedTikTok;
    const useLiveGa4 = hasLinkedGa4;

    const syncingPlatforms = [
      hasLinkedGoogle && this.googleAdsLiveState.loading ? "google_ads" : "",
      hasLinkedMeta && this.metaAdsLiveState.loading ? "meta_ads" : "",
      hasLinkedTikTok && this.tiktokAdsLiveState.loading ? "tiktok_ads" : "",
      hasLinkedGa4 && this.ga4LiveState.loading ? "ga4" : "",
    ].filter(Boolean);

    const effectiveConnections = {
      google_ads: hasAnyProviders || hasStoredLinkedAssets ? hasLinkedGoogle : !!client.connections?.google_ads,
      meta_ads: hasAnyProviders || hasStoredLinkedAssets ? hasLinkedMeta : !!client.connections?.meta_ads,
      tiktok_ads: hasAnyProviders || hasStoredLinkedAssets ? hasLinkedTikTok : !!client.connections?.tiktok_ads,
      ga4: hasAnyProviders || hasStoredLinkedAssets ? hasLinkedGa4 : !!client.connections?.ga4,
    } as any;

    const visibleAccounts = [
      ...ACCOUNTS_BASE.filter((a: any) =>
        a.clientId === client.id
        && effectiveConnections[a.platform]
        && (!useLiveGoogle || a.platform !== "google_ads")
        && (!useLiveMeta || a.platform !== "meta_ads")
        && (!useLiveTikTok || a.platform !== "tiktok_ads"),
      ),
      ...(useLiveGoogle ? liveGoogleAccounts : []),
      ...(useLiveMeta ? liveMetaAccounts : []),
      ...(useLiveTikTok ? liveTikTokAccounts : []),
    ];
    const visibleCampaigns = [
      ...CAMPAIGNS_BASE.filter((c: any) =>
        c.clientId === client.id
        && effectiveConnections[c.platform]
        && (!useLiveGoogle || c.platform !== "google_ads")
        && (!useLiveMeta || c.platform !== "meta_ads")
        && (!useLiveTikTok || c.platform !== "tiktok_ads"),
      ),
      ...(useLiveGoogle ? liveGoogleCampaigns : []),
      ...(useLiveMeta ? liveMetaCampaigns : []),
      ...(useLiveTikTok ? liveTikTokCampaigns : []),
    ];
    const visibleAds = [
      ...ADS_BASE.filter((a: any) =>
        a.clientId === client.id
        && effectiveConnections[a.platform]
        && (!useLiveGoogle || a.platform !== "google_ads")
        && (!useLiveMeta || a.platform !== "meta_ads")
        && (!useLiveTikTok || a.platform !== "tiktok_ads"),
      ),
      ...(useLiveGoogle ? liveGoogleAds : []),
      ...(useLiveMeta ? liveMetaAds : []),
      ...(useLiveTikTok ? liveTikTokAds : []),
    ];

    const ga4 = effectiveConnections.ga4
      ? useLiveGa4 ? buildLiveGa4Summary(client, liveGa4Reports, this.ga4LiveState) : (GA4_BASE as any)[client.id]
      : null;

    const sumByKey = (items: any[], key: string) =>
      items.reduce((total, item) => total + (Number(item?.[key]) || 0), 0);
    const spend = sumByKey(visibleAccounts, "spend");
    const clicks = sumByKey(visibleAccounts, "clicks");
    const impressions = sumByKey(visibleAccounts, "impressions");
    const conversions = sumByKey(visibleAccounts, "conversions");
    const conversionValue = visibleAccounts.reduce((acc: number, a: any) => acc + getConversionValue(a), 0);

    const googleBudget = effectiveConnections.google_ads ? Number(client.budgets?.google_ads) || 0 : 0;
    const metaBudget = effectiveConnections.meta_ads ? Number(client.budgets?.meta_ads) || 0 : 0;
    const tiktokBudget = effectiveConnections.tiktok_ads ? Number(client.budgets?.tiktok_ads) || 0 : 0;
    const totalBudget = googleBudget + metaBudget + tiktokBudget;

    const roas = spend > 0 ? conversionValue / spend : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const activeCampaigns = visibleCampaigns.filter((c: any) => !isStoppedCampaign(c)).length;
    const stoppedCampaigns = visibleCampaigns.filter((c: any) => isStoppedCampaign(c)).length;
    const liveAds = visibleAds.filter((a: any) => a.status === "live" || a.status === "learning").length;

    const shouldPauseHealthChecks = (effectiveConnections.google_ads || effectiveConnections.meta_ads || effectiveConnections.tiktok_ads) && visibleAccounts.length === 0;
    const enriched: any = {
      ...client,
      connections: effectiveConnections,
      accounts: visibleAccounts,
      campaigns: visibleCampaigns,
      ads: visibleAds,
      ga4,
      linkedAssetCount: Object.values(linkedAssetCounts).reduce((acc: number, n: any) => acc + n, 0),
      linkedAssetCounts,
      syncingPlatforms,
      spend,
      clicks,
      impressions,
      conversions,
      conversionValue,
      ctr: impressions ? +(ctr).toFixed(2) : 0,
      cpc: clicks ? +(cpc).toFixed(2) : 0,
      roas: +roas.toFixed(2),
      totalBudget,
      activeCampaigns,
      stoppedCampaigns,
      liveAds,
    };
    enriched.health = shouldPauseHealthChecks
      ? { ok: true, flags: [], score: 0 }
      : evaluateHealth(
          { ...enriched, budgets: { ...(client.budgets || {}), google_ads: googleBudget, meta_ads: metaBudget, tiktok_ads: tiktokBudget } },
          visibleAccounts,
          visibleCampaigns,
          ga4,
        );
    return enriched;
  }

  private countLinkedAssets(client: any): number {
    const linked = client?.linkedAssets || {};
    return this.platforms.reduce((acc, platform) => acc + (linked[platform]?.length || 0), 0);
  }
  private countLinkedAssetsByPlatform(client: any) {
    const linked = client?.linkedAssets || {};
    return this.platforms.reduce((acc: any, platform) => {
      acc[platform] = linked[platform]?.length || 0;
      return acc;
    }, {});
  }

  get filteredClients(): any[] {
    const term = this.search.trim().toLowerCase();
    let list = this.enrichedClients.filter((client) => {
      if (this.categoryFilter !== "all" && client.category !== this.categoryFilter) return false;
      if (this.statusFilter === "red" && client.health?.ok) return false;
      if (this.statusFilter === "green" && !client.health?.ok) return false;
      if (term) {
        const haystack = `${client.name} ${client.focus || ""} ${client.reportingGroup || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    if (this.sortBy === "spend") list = list.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    else if (this.sortBy === "budget") list = list.sort((a, b) => (b.totalBudget || 0) - (a.totalBudget || 0));
    else if (this.sortBy === "roas") list = list.sort((a, b) => (b.roas || 0) - (a.roas || 0));
    else if (this.sortBy === "name") list = list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    else list = list.sort((a, b) => (a.health?.ok === b.health?.ok ? 0 : a.health?.ok ? 1 : -1));
    return list;
  }

  get filteredClientGroups(): any[] {
    return groupClientsByReportingGroup(this.filteredClients);
  }

  get navItems() {
    const base = [
      { key: "overview", label: "Overview" },
      { key: "accounts", label: "Accounts" },
      { key: "search_terms", label: "Search Terms" },
      { key: "analytics", label: "Analytics" },
      { key: "reports", label: "Reports" },
      { key: "alerts", label: "Alerts" },
      { key: "studio", label: "Studio" },
    ];
    if (this.isDirector) {
      base.push({ key: "users", label: "Users" });
      base.push({ key: "connections", label: "Connections" });
    }
    return base;
  }

  get viewLabel(): string {
    return this.navItems.find((n) => n.key === this.view)?.label || "Coming next";
  }

  setView(next: string) { this.view = next as ViewKey; }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
    if (this.profileOpen && this.currentUser) {
      this.profileDraft = {
        name: this.currentUser.name || "",
        title: this.currentUser.title || "",
      };
    }
  }
  onProfileDraftChange(payload: { field: "name" | "title"; value: string }) {
    this.profileDraft = { ...this.profileDraft, [payload.field]: payload.value };
  }
  async saveProfile() {
    if (!this.currentUser) return;
    const draft = this.profileDraft;
    try {
      await this.api.updateUser(this.currentUser.id, { name: draft.name, title: draft.title });
      this.users = this.users.map((user) =>
        user.id === this.currentUser.id ? { ...user, name: draft.name, title: draft.title } : user,
      );
      this.profileOpen = false;
      this.pushToast("Profile saved.", "success", "Profile");
    } catch (error: any) {
      this.pushToast(error?.message || "Could not save profile.", "danger", "Profile");
    }
  }

  onLoginFormChange({ field, value }: { field: string; value: string }) {
    this.loginForm = { ...this.loginForm, [field]: value };
    this.loginError = "";
  }

  async handleLogin() {
    try {
      const result: any = await this.api.loginUser(this.loginForm);
      if (result?.ok) {
        this.currentUserId = result.user?.id || "";
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(this.currentUserId));
        }
        this.loginError = "";
      } else {
        this.loginError = result?.error || "Could not sign in.";
      }
    } catch (error: any) {
      this.loginError = error?.message || "Could not sign in.";
    }
  }
  handleQuickLogin(userId: string) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return;
    this.currentUserId = userId;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userId));
    }
  }
  handleLogout() {
    this.currentUserId = "";
    this.profileOpen = false;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.session);
    }
  }

  onSetupComplete() {
    this.setupComplete = true;
    this.refreshIntegrations({ silent: true });
  }
  onSetupStatusUpdate(status: any) {
    this.setupStatus = status;
    if (status?.allReady) this.setupComplete = true;
  }

  jumpToAccounts(clientId: string) { this.selectedClientId = clientId; this.setView("accounts"); }
  jumpToStudio(clientId: string) {
    this.selectedClientId = clientId;
    const target = this.clients.find((c) => c.id === clientId);
    this.studioDraft = target ? JSON.parse(JSON.stringify(target)) : null;
    this.setView("studio");
  }
  resolveClientIssue({ clientId, flagId }: { clientId: string; flagId: string }) {
    this.clients = this.clients.map((client) => {
      if (client.id !== clientId) return client;
      const next = { ...client, resolvedIssues: [...(client.resolvedIssues || [])] };
      if (!next.resolvedIssues.includes(flagId)) next.resolvedIssues.push(flagId);
      return next;
    });
  }

  // ── Alerts derived state ───────────────────────────────────────────
  get redClients(): any[] {
    return this.enrichedClients.filter((client) => !client.health?.ok);
  }
  get greenClients(): any[] {
    return this.enrichedClients.filter((client) => client.health?.ok);
  }

  // ── Users handlers ─────────────────────────────────────────────────
  async onCreateUser(payload: any) {
    this.userDirectoryState = { ...this.userDirectoryState, savingKey: "__create__", error: "", notice: "" };
    try {
      const result: any = await this.api.createUser(payload);
      if (result?.ok && result.user) {
        this.users = [...this.users, result.user];
        this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", error: "", notice: "User created." };
        this.pushToast("User created.", "success", "Users");
      } else {
        this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", error: result?.error || "Could not create user." };
      }
    } catch (error: any) {
      this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", error: error?.message || "Could not create user." };
    }
  }

  async onUpdateUser(payload: { id: string; payload: any }) {
    this.userDirectoryState = { ...this.userDirectoryState, savingKey: payload.id, error: "", notice: "" };
    try {
      const result: any = await this.api.updateUser(payload.id, payload.payload);
      if (result?.ok && result.user) {
        this.users = this.users.map((u) => (u.id === payload.id ? result.user : u));
        this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", notice: "User updated." };
        this.pushToast("User saved.", "success", "Users");
      } else {
        this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", error: result?.error || "Could not save user." };
      }
    } catch (error: any) {
      this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", error: error?.message || "Could not save user." };
    }
  }

  async onDeleteUser(user: any) {
    this.userDirectoryState = { ...this.userDirectoryState, savingKey: `delete:${user.id}`, error: "", notice: "" };
    try {
      const result: any = await this.api.deleteUser(user.id);
      if (result?.ok !== false) {
        this.users = this.users.filter((u) => u.id !== user.id);
        this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", notice: "User deleted." };
        this.pushToast("User deleted.", "success", "Users");
      } else {
        this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", error: result?.error || "Could not delete user." };
      }
    } catch (error: any) {
      this.userDirectoryState = { ...this.userDirectoryState, savingKey: "", error: error?.message || "Could not delete user." };
    }
  }

  // ── Connections / IntegrationHub handlers ──────────────────────────
  aiForm: any = { ANTHROPIC_API_KEY: "", ANTHROPIC_STRATEGIST_MODEL: "" };
  aiSetupState: any = { saving: false, error: "", success: "" };

  onConnectProvider(platform: string) {
    if (typeof window === "undefined") return;
    const url = this.api.getProviderStartUrl(platform);
    this.integrationBusy = { ...this.integrationBusy, [`connect-${platform}`]: true };
    const win = window.open(url, "adpulse-oauth", "width=520,height=720");
    const timer = setInterval(() => {
      if (win?.closed) {
        clearInterval(timer);
        this.integrationBusy = { ...this.integrationBusy, [`connect-${platform}`]: false };
      }
    }, 600);
  }

  async onSyncProvider(profileId: string) {
    this.integrationBusy = { ...this.integrationBusy, [profileId]: true };
    try {
      await this.api.syncIntegrationProfile(profileId);
      await this.refreshIntegrations({ silent: true });
      this.reloadLiveData(true);
      this.pushToast("Profile synced.", "success", "Integrations");
    } catch (error: any) {
      this.pushToast(error?.message || "Sync failed.", "danger", "Integrations");
    }
    this.integrationBusy = { ...this.integrationBusy, [profileId]: false };
  }

  async onDisconnectProvider(profileId: string) {
    this.integrationBusy = { ...this.integrationBusy, [`${profileId}-disconnect`]: true };
    try {
      await this.api.disconnectIntegrationProfile(profileId);
      await this.refreshIntegrations({ silent: true });
      this.reloadLiveData(true);
      this.pushToast("Profile disconnected.", "success", "Integrations");
    } catch (error: any) {
      this.pushToast(error?.message || "Disconnect failed.", "danger", "Integrations");
    }
    this.integrationBusy = { ...this.integrationBusy, [`${profileId}-disconnect`]: false };
  }

  onAiFormChange({ field, value }: { field: string; value: string }) {
    this.aiForm = { ...this.aiForm, [field]: value };
    this.aiSetupState = { ...this.aiSetupState, error: "", success: "" };
  }

  async onSaveAiConfig() {
    const payload = Object.fromEntries(Object.entries(this.aiForm).filter(([, v]) => String(v || "").trim()));
    if (!Object.keys(payload).length) {
      this.aiSetupState = { saving: false, error: "Add an Anthropic API key before saving.", success: "" };
      return;
    }
    this.aiSetupState = { saving: true, error: "", success: "" };
    try {
      const result: any = await this.api.saveSetupCredentials(payload);
      if (result?.ok) {
        this.setupStatus = result.status || this.setupStatus;
        this.aiForm = { ANTHROPIC_API_KEY: "", ANTHROPIC_STRATEGIST_MODEL: "" };
        this.aiSetupState = { saving: false, error: "", success: result.message || "AI strategist credentials saved." };
        this.pushToast("AI strategist credentials saved.", "success", "AI strategist");
      } else {
        this.aiSetupState = { saving: false, error: result?.error || "Could not save AI settings.", success: "" };
      }
    } catch (error: any) {
      this.aiSetupState = { saving: false, error: error?.message || "Could not save AI settings.", success: "" };
    }
  }

    // ── Studio derived state ───────────────────────────────────────────
  studioDraft: any = null;
  studioState: any = { savingKey: "", error: "", notice: "" };

  get studioAccounts(): any[] {
    return (this.clients || []).flatMap((client) => (client.accounts || []).map((account: any) => ({
      ...account,
      clientId: client.id,
    })));
  }

  ensureStudioDraft() {
    if (!this.studioDraft && this.clients.length) {
      const target = this.clients.find((c) => c.id === this.selectedClientId) || this.clients[0];
      this.selectedClientId = target.id;
      this.studioDraft = JSON.parse(JSON.stringify(target));
    }
  }

  onStudioSelectClient(clientId: string) {
    this.selectedClientId = clientId;
    const target = this.clients.find((c) => c.id === clientId);
    this.studioDraft = target ? JSON.parse(JSON.stringify(target)) : null;
  }
  onStudioDraftChange(next: any) {
    this.studioDraft = next ? { ...next } : null;
  }
  async onSaveStudio() {
    if (!this.studioDraft) return;
    const id = this.studioDraft.id;
    this.studioState = { ...this.studioState, savingKey: id, error: "", notice: "" };
    try {
      const result: any = await this.api.saveClientRecord(id, this.studioDraft);
      if (result?.ok && result.client) {
        this.clients = this.clients.map((c) => (c.id === id ? result.client : c));
        this.studioDraft = JSON.parse(JSON.stringify(result.client));
        this.studioState = { savingKey: "", error: "", notice: "Client saved." };
        this.pushToast("Client saved.", "success", "Client Studio");
      } else {
        this.studioState = { savingKey: "", error: result?.error || "Could not save client.", notice: "" };
      }
    } catch (error: any) {
      this.studioState = { savingKey: "", error: error?.message || "Could not save client.", notice: "" };
    }
  }
  onCreateStudioClient() {
    const id = `client-${Date.now()}`;
    const draft = {
      id,
      name: "New client",
      focus: "Conversions",
      reportingGroup: "New",
      owner: "",
      category: "lead_gen",
      accent: "#0f8f66",
      accent2: "#78d1ad",
      logoText: "NC",
      budgets: { google_ads: 0, meta_ads: 0, tiktok_ads: 0, ga4: 0 },
      connections: { google_ads: false, meta_ads: false, tiktok_ads: false, ga4: false },
      linkedAssets: { google_ads: [], meta_ads: [], tiktok_ads: [], ga4: [] },
      assignedUserIds: [],
      rules: { pacingTolerance: 12, revenueDropTolerance: 5, cpcMax: 6, cpmMax: 12, stoppedCampaigns: false, searchTerms: {} },
      accounts: [],
      campaigns: [],
      ads: [],
    };
    this.clients = [...this.clients, draft];
    this.selectedClientId = id;
    this.studioDraft = JSON.parse(JSON.stringify(draft));
  }
  async onDeleteStudioClient(client: any) {
    if (!client?.id) return;
    this.studioState = { ...this.studioState, savingKey: `delete:${client.id}`, error: "", notice: "" };
    try {
      await this.api.deleteClientRecord(client.id);
      this.clients = this.clients.filter((c) => c.id !== client.id);
      if (this.selectedClientId === client.id) {
        this.selectedClientId = this.clients[0]?.id || "";
        this.studioDraft = this.clients[0] ? JSON.parse(JSON.stringify(this.clients[0])) : null;
      }
      this.studioState = { savingKey: "", error: "", notice: "Client deleted." };
      this.pushToast("Client deleted.", "success", "Client Studio");
    } catch (error: any) {
      this.studioState = { savingKey: "", error: error?.message || "Could not delete client.", notice: "" };
    }
  }

    // ── Analytics derived state ────────────────────────────────────────
  analyticsClientId = "";
  charts: any[] = [];
  seriesMap: Record<string, any[]> = {};

  get analyticsDateRangeLabel(): string {
    const range = this.accountsDateRange;
    if (range?.preset === "CUSTOM") return `${range.startDate} → ${range.endDate}`;
    const map: Record<string, string> = {
      THIS_MONTH: "This month",
      LAST_7_DAYS: "Last 7 days",
      LAST_30_DAYS: "Last 30 days",
      LAST_MONTH: "Last month",
    };
    return map[range?.preset] || "This month";
  }

  onAddChartPreset(preset: any) {
    const id = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.charts = [...this.charts, { id, ...preset }];
  }
  onRemoveChart(chart: any) {
    this.charts = this.charts.filter((c) => c.id !== chart.id);
  }
  onClearCharts() {
    this.charts = [];
  }

    // ── Reports state + handlers ───────────────────────────────────────
  reportClientId = "";
  reportPreset = "full";
  reportSections: string[] = [];
  reportScheduleDraft: any = { frequency: "monthly", weekday: "monday", dayOfMonth: "1", recipients: "", notes: "" };
  reportSchedulePlans: Record<string, any> = {};
  reportBuilderCue: any = null;

  get reportReadinessItems(): { label: string; body: string; ok: boolean }[] {
    const client = this.enrichedClients.find((c) => c.id === this.reportClientId) || this.enrichedClients[0] || null;
    if (!client) return [];
    const items: { label: string; body: string; ok: boolean }[] = [];
    items.push({
      label: "Linked accounts",
      body: client.accounts?.length ? `${client.accounts.length} live ad accounts ready.` : "No ad accounts linked yet — values will read as zero.",
      ok: !!client.accounts?.length,
    });
    items.push({
      label: "GA4 connection",
      body: client.ga4 ? `${client.ga4.propertyName || "GA4 property"} returning daily rows.` : "GA4 not connected — analytics page will be skipped.",
      ok: !!client.ga4,
    });
    items.push({
      label: "Health checks",
      body: client.health?.ok ? "All alert checks pass for this period." : `${client.health?.flags?.length || 0} active issues will appear in the report.`,
      ok: !!client.health?.ok,
    });
    items.push({
      label: "Schedule plan",
      body: this.reportSchedulePlans[client.id] ? "Saved schedule plan in place." : "No recurring schedule saved yet.",
      ok: !!this.reportSchedulePlans[client.id],
    });
    return items;
  }

  onSaveReportSchedule(payload: { clientId: string; schedule: any }) {
    this.reportSchedulePlans = { ...this.reportSchedulePlans, [payload.clientId]: payload.schedule };
    this.reportBuilderCue = { tone: "success", message: "Schedule plan saved." };
    setTimeout(() => (this.reportBuilderCue = null), 3200);
    this.pushToast("Report schedule saved.", "success", "Reports");
  }

    // ── Live data fetching ─────────────────────────────────────────────
  // Builds per-platform request lists from accessibleClients × linkedAssets,
  // then calls the corresponding /api/{platform}/live-overview endpoint.
  // Mirrors the React useEffects (adpulse-v5.jsx ~line 10500 onward).

  private get providerAssetLookup(): Record<string, Map<string, any>> {
    const lookup: Record<string, Map<string, any>> = {
      google_ads: new Map(), meta_ads: new Map(), tiktok_ads: new Map(), ga4: new Map(),
    };
    for (const profile of this.providerProfiles || []) {
      const platform = profile.platform;
      if (!lookup[platform]) continue;
      for (const asset of profile.assets || []) {
        lookup[platform].set(asset.id, { ...asset, connectionId: profile.id, connectionStatus: profile.status });
      }
    }
    return lookup;
  }

  private buildPlatformRequests(platform: string): any[] {
    const lookup = this.providerAssetLookup[platform];
    if (!lookup) return [];
    return this.accessibleClients.flatMap((client: any) => {
      const linked = (client.linkedAssets?.[platform] || [])
        .map((id: string) => lookup.get(id))
        .filter((asset: any) => asset && (platform !== "google_ads" || asset.type !== "Manager account") && sanitizeGoogleAdsId(asset.externalId));
      if (!linked.length) return [];
      const budgetHints = splitTotal(Number(client.budgets?.[platform]) || 0, linked.length, `${client.id}-${platform}-budget`);
      return linked.map((asset: any, i: number) => {
        const base: any = {
          key: `${client.id}:${asset.id}`,
          clientId: client.id,
          connectionId: asset.connectionId,
          assetId: asset.id,
          budgetHint: budgetHints[i] || 0,
        };
        if (platform === "google_ads") base.customerId = sanitizeGoogleAdsId(asset.externalId);
        else if (platform === "meta_ads") base.adAccountId = sanitizeGoogleAdsId(asset.externalId);
        else if (platform === "tiktok_ads") base.advertiserId = sanitizeGoogleAdsId(asset.externalId);
        else if (platform === "ga4") base.propertyId = sanitizeGoogleAdsId(asset.externalId);
        return base;
      });
    });
  }

  /** Triggers a fresh fetch of all four platforms' live overviews. */
  async reloadLiveData(silent = true) {
    if (!this.currentUser) return;
    const dateRangePayload = getAccountDateRangePayload(this.accountsDateRange);

    const googleRequests = this.buildPlatformRequests("google_ads");
    const metaRequests = this.buildPlatformRequests("meta_ads");
    const tiktokRequests = this.buildPlatformRequests("tiktok_ads");
    const ga4Requests = this.buildPlatformRequests("ga4");

    if (googleRequests.length) {
      this.googleAdsLiveState = { ...this.googleAdsLiveState, loading: true, error: "" };
      this.googleAdsReportState = { ...this.googleAdsReportState, loading: true, error: "" };
      this.api.fetchGoogleAdsReportDetails({ ...dateRangePayload, requests: googleRequests })
        .then((data: any) => {
          this.googleAdsReportState = {
            loading: false,
            error: data?.error || "",
            generatedAt: data?.generatedAt || "",
            details: Array.isArray(data?.details) ? data.details : [],
            errors: Array.isArray(data?.errors) ? data.errors : [],
          };
        })
        .catch((error: any) => {
          this.googleAdsReportState = { ...createEmptyGoogleAdsReportState(), error: error?.message || "Could not load Google Ads report details." };
        });
      this.api.fetchGoogleAdsLiveOverview({ ...dateRangePayload, requests: googleRequests })
        .then((data: any) => {
          if (data?.error) {
            this.googleAdsLiveState = { ...createEmptyGoogleAdsLiveState(), error: data.error };
            if (!silent) this.pushToast(data.error, "danger", "Google Ads");
            return;
          }
          this.googleAdsLiveState = {
            loading: false,
            error: "",
            generatedAt: data?.generatedAt || "",
            accounts: Array.isArray(data?.accounts) ? data.accounts : [],
            campaigns: Array.isArray(data?.campaigns) ? data.campaigns : [],
            ads: Array.isArray(data?.ads) ? data.ads : [],
            errors: Array.isArray(data?.errors) ? data.errors : [],
          };
        })
        .catch((error: any) => {
          this.googleAdsLiveState = { ...createEmptyGoogleAdsLiveState(), error: error?.message || "Could not load Google Ads live data." };
          if (!silent) this.pushToast(this.googleAdsLiveState.error, "danger", "Google Ads");
        });
    } else {
      this.googleAdsLiveState = createEmptyGoogleAdsLiveState();
    }

    if (metaRequests.length) {
      this.metaAdsLiveState = { ...this.metaAdsLiveState, loading: true, error: "" };
      this.api.fetchMetaAdsLiveOverview({ ...dateRangePayload, requests: metaRequests })
        .then((data: any) => {
          if (data?.error) {
            this.metaAdsLiveState = { ...createEmptyMetaAdsLiveState(), error: data.error };
            if (!silent) this.pushToast(data.error, "danger", "Meta Ads");
            return;
          }
          this.metaAdsLiveState = {
            loading: false,
            error: "",
            generatedAt: data?.generatedAt || "",
            accounts: Array.isArray(data?.accounts) ? data.accounts : [],
            campaigns: Array.isArray(data?.campaigns) ? data.campaigns : [],
            ads: Array.isArray(data?.ads) ? data.ads : [],
            errors: Array.isArray(data?.errors) ? data.errors : [],
          };
        })
        .catch((error: any) => {
          this.metaAdsLiveState = { ...createEmptyMetaAdsLiveState(), error: error?.message || "Could not load Meta Ads live data." };
          if (!silent) this.pushToast(this.metaAdsLiveState.error, "danger", "Meta Ads");
        });
    } else {
      this.metaAdsLiveState = createEmptyMetaAdsLiveState();
    }

    if (tiktokRequests.length) {
      this.tiktokAdsLiveState = { ...this.tiktokAdsLiveState, loading: true, error: "" };
      this.api.fetchTikTokAdsLiveOverview({ ...dateRangePayload, requests: tiktokRequests })
        .then((data: any) => {
          if (data?.error) {
            this.tiktokAdsLiveState = { ...createEmptyTikTokAdsLiveState(), error: data.error };
            if (!silent) this.pushToast(data.error, "danger", "TikTok Ads");
            return;
          }
          this.tiktokAdsLiveState = {
            loading: false,
            error: "",
            generatedAt: data?.generatedAt || "",
            accounts: Array.isArray(data?.accounts) ? data.accounts : [],
            campaigns: Array.isArray(data?.campaigns) ? data.campaigns : [],
            ads: Array.isArray(data?.ads) ? data.ads : [],
            errors: Array.isArray(data?.errors) ? data.errors : [],
          };
        })
        .catch((error: any) => {
          this.tiktokAdsLiveState = { ...createEmptyTikTokAdsLiveState(), error: error?.message || "Could not load TikTok Ads live data." };
          if (!silent) this.pushToast(this.tiktokAdsLiveState.error, "danger", "TikTok Ads");
        });
    } else {
      this.tiktokAdsLiveState = createEmptyTikTokAdsLiveState();
    }

    if (ga4Requests.length) {
      this.ga4LiveState = { ...this.ga4LiveState, loading: true, error: "" };
      this.api.fetchGa4LiveOverview({ ...dateRangePayload, requests: ga4Requests })
        .then((data: any) => {
          if (data?.error) {
            this.ga4LiveState = { ...createEmptyGa4LiveState(), error: data.error };
            if (!silent) this.pushToast(data.error, "danger", "GA4");
            return;
          }
          this.ga4LiveState = {
            loading: false,
            error: "",
            generatedAt: data?.generatedAt || "",
            properties: Array.isArray(data?.properties) ? data.properties : [],
            errors: Array.isArray(data?.errors) ? data.errors : [],
          };
        })
        .catch((error: any) => {
          this.ga4LiveState = { ...createEmptyGa4LiveState(), error: error?.message || "Could not load GA4 live data." };
          if (!silent) this.pushToast(this.ga4LiveState.error, "danger", "GA4");
        });
    } else {
      this.ga4LiveState = createEmptyGa4LiveState();
    }
  }

  onAccountsDateRangeChange(value: any) {
    this.accountsDateRange = value;
    this.reloadLiveData(true);
  }

    // ── Live-data UI banner ────────────────────────────────────────────
  get liveDataStatusLabel(): string {
    const parts: string[] = [];
    const states: Record<string, any> = {
      "Google Ads": this.googleAdsLiveState,
      "Meta Ads": this.metaAdsLiveState,
      "TikTok Ads": this.tiktokAdsLiveState,
      "GA4": this.ga4LiveState,
    };
    for (const [label, state] of Object.entries(states)) {
      if (state.loading) parts.push(`${label} syncing`);
      else if (state.error) parts.push(`${label} error`);
      else if ((state.accounts?.length || 0) > 0 || (state.properties?.length || 0) > 0) parts.push(`${label} live`);
    }
    return parts.length ? parts.join(" - ") : "Demo data (no live rows yet)";
  }

  get liveDataErrors(): { label: string; message: string }[] {
    const out: { label: string; message: string }[] = [];
    if (this.googleAdsLiveState?.error) out.push({ label: "Google Ads", message: this.googleAdsLiveState.error });
    if (this.metaAdsLiveState?.error) out.push({ label: "Meta Ads", message: this.metaAdsLiveState.error });
    if (this.tiktokAdsLiveState?.error) out.push({ label: "TikTok Ads", message: this.tiktokAdsLiveState.error });
    if (this.ga4LiveState?.error) out.push({ label: "GA4", message: this.ga4LiveState.error });
    return out;
  }

  liveDataBarStyle = {
    padding: "12px 14px",
    borderRadius: "16px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  };
  liveDataBarLeftStyle = { display: "flex", flexDirection: "column", gap: "2px" };
  liveDataBarLabelStyle = {
    fontSize: "10px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  liveDataBarStatusStyle = { fontSize: "12px", color: T.inkSoft };
  liveDataReloadStyle = {
    padding: "8px 14px",
    borderRadius: "12px",
    border: "none",
    background: T.ink,
    color: "#fff",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: T.font,
  };
  liveDataErrorStyle = {
    padding: "10px 14px",
    borderRadius: "14px",
    background: T.coralSoft,
    border: "1px solid rgba(215, 93, 66, 0.18)",
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };

    pushToast(message: string, tone: "success" | "info" | "warning" | "danger" = "success", title = "") {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.toasts = [...this.toasts, { id, message, tone, title }];
    setTimeout(() => this.dismissToast(id), 4500);
  }
  dismissToast(id: string) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }

  gridStyle = { display: "grid", gridTemplateColumns: fitCols(360), gap: "18px" };
  listStyle = { display: "grid", gap: "16px" };
  placeholderStyle = {
    padding: "32px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    color: T.inkSoft,
  };
  placeholderTitleStyle = {
    fontSize: "20px",
    fontWeight: 800,
    fontFamily: T.heading,
    color: T.ink,
    letterSpacing: "-0.05em",
  };
  placeholderBodyStyle = { marginTop: "8px", fontSize: "13px" };
}
