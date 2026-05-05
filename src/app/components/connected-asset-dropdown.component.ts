// ConnectedAssetDropdown — full port of React component (4199-4396).
// Mirrors the searchable dropdown experience: chip list of selected assets,
// expand/collapse picker with search-by-name/ID, filtered asset cards with
// type badges, and helper text.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from "@angular/core";
import { PLATFORM_META, T } from "../foundation/adpulse-foundation";
import { formatConnectedAssetSummary } from "../foundation/post-foundation-helpers";
import {
  AppButtonComponent,
  PlatformChipComponent,
  ToneBadgeComponent,
} from "./primitives";

@Component({
  selector: "app-connected-asset-dropdown",
  standalone: true,
  imports: [CommonModule, AppButtonComponent, PlatformChipComponent, ToneBadgeComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <app-platform-chip [platform]="platform"></app-platform-chip>
        <app-tone-badge [tone]="selectedAssets.length ? 'positive' : 'warning'">
          {{ selectedAssets.length ? selectedAssets.length + ' asset' + (selectedAssets.length === 1 ? '' : 's') + ' linked' : 'No assets linked' }}
        </app-tone-badge>
      </div>

      <ng-container *ngIf="!assets.length; else hasAssets">
        <div [ngStyle]="emptyStackStyle">
          <div [ngStyle]="hintTextStyle">
            No synced {{ platformLabel }} assets are available yet.
          </div>
          <app-button *ngIf="canEditCoreSettings" (pressed)="openConnections.emit()">Open Connections</app-button>
          <div *ngIf="!canEditCoreSettings" [ngStyle]="hintTextStyle">
            Ask a director to connect and sync this platform from the Connections screen.
          </div>
        </div>
      </ng-container>

      <ng-template #hasAssets>
        <!-- Selected chips -->
        <div *ngIf="selectedAssets.length; else noSelectionHint" [ngStyle]="chipRowStyle">
          <button
            *ngFor="let asset of selectedAssets"
            type="button"
            (click)="toggleAsset.emit(asset.id)"
            [ngStyle]="chipStyle"
          >
            <span [ngStyle]="chipNameStyle">{{ asset.name }}</span>
            <span [ngStyle]="chipExternalStyle">{{ asset.externalId }}</span>
            <span [ngStyle]="chipRemoveLabelStyle">Remove</span>
          </button>
        </div>
        <ng-template #noSelectionHint>
          <div [ngStyle]="hintTextStyle">Select the synced assets that belong to this client.</div>
        </ng-template>

        <!-- Toggle -->
        <button type="button" (click)="open = !open" [ngStyle]="toggleButtonStyle">
          <div [ngStyle]="toggleHeadStyle">
            <div [ngStyle]="toggleTitleStyle">{{ platformLabel }} selector</div>
            <div [ngStyle]="toggleSubStyle">{{ open ? 'Hide options' : 'Open dropdown' }}</div>
          </div>
          <div [ngStyle]="toggleSummaryStyle">{{ toggleSummaryText }}</div>
        </button>

        <!-- Open dropdown body -->
        <div *ngIf="open" [ngStyle]="dropdownStyle">
          <div [ngStyle]="filterRowStyle">
            <input
              [value]="query"
              (input)="onQuery($any($event.target).value)"
              placeholder="Search by name, ID or connection"
              [ngStyle]="searchInputStyle"
            />
            <app-tone-badge tone="neutral">{{ filteredAssets.length }} match{{ filteredAssets.length === 1 ? '' : 'es' }}</app-tone-badge>
            <app-button (pressed)="onQuery('')" [disabled]="!query">Clear search</app-button>
            <app-button (pressed)="clearSelection.emit()" [disabled]="!selectedAssets.length">Clear selected</app-button>
          </div>

          <div [ngStyle]="resultsScrollStyle">
            <ng-container *ngIf="filteredAssets.length; else noMatch">
              <button
                *ngFor="let asset of filteredAssets"
                type="button"
                (click)="toggleAsset.emit(asset.id)"
                [ngStyle]="resultCardStyle(asset)"
              >
                <div [ngStyle]="resultHeadStyle">
                  <div [ngStyle]="resultTitleStyle(asset)">{{ asset.name }}</div>
                  <app-tone-badge [tone]="resultBadgeTone(asset)">{{ resultBadgeLabel(asset) }}</app-tone-badge>
                </div>
                <div [ngStyle]="resultSubtitleStyle">{{ asset.subtitle || asset.connectionName }}</div>
                <div [ngStyle]="resultSummaryStyle">{{ summary(asset) }}</div>
                <div [ngStyle]="resultExternalStyle">{{ asset.externalId }}</div>
              </button>
            </ng-container>
            <ng-template #noMatch>
              <div [ngStyle]="noMatchStyle">No {{ platformLabel }} assets match this search yet.</div>
            </ng-template>
          </div>
        </div>

        <div *ngIf="helperText" [ngStyle]="hintTextStyle">{{ helperText }}</div>
      </ng-template>
    </div>
  `,
})
export class ConnectedAssetDropdownComponent implements OnChanges {
  @Input() platform = "";
  @Input() assets: any[] = [];
  @Input() selectedAssetIds: string[] = [];
  @Input() selectedAssets: any[] = [];
  @Input() helperText = "";
  @Input() canEditCoreSettings = true;
  @Input() onOpenConnectionsAvailable = false;

  @Output() toggleAsset = new EventEmitter<string>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() openConnections = new EventEmitter<void>();

  open = false;
  query = "";

  ngOnChanges(changes: SimpleChanges) {
    if (changes["assets"] && !this.assets?.length) {
      this.open = false;
      this.query = "";
    }
  }

  onQuery(value: string) {
    this.query = value || "";
  }

  get platformLabel(): string {
    return (PLATFORM_META as any)[this.platform]?.label || this.platform;
  }

  get filteredAssets(): any[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.assets;
    return this.assets.filter((asset) =>
      [asset.name, asset.externalId, asset.connectionName, asset.subtitle, asset.type, asset.catalogNote]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }

  get toggleSummaryText(): string {
    if (this.selectedAssets.length) {
      const preview = this.selectedAssets.slice(0, 2).map((a) => a.name).join(", ");
      const overflow = this.selectedAssets.length > 2 ? ` +${this.selectedAssets.length - 2} more` : "";
      return `${this.selectedAssets.length} selected | ${preview}${overflow}`;
    }
    const noun = this.platform === "ga4" ? "properties" : "accounts";
    return `Search ${this.assets.length} synced ${noun}`;
  }

  summary(asset: any): string {
    return formatConnectedAssetSummary(this.platform, asset);
  }

  resultBadgeTone(asset: any): "positive" | "neutral" {
    return this.selectedAssetIds.includes(asset.id) ? "positive" : "neutral";
  }
  resultBadgeLabel(asset: any): string {
    if (this.selectedAssetIds.includes(asset.id)) return "Selected";
    if (this.platform === "google_ads" && asset.type === "Manager account") return "Manager (MCC)";
    return asset.type || "Available";
  }

  // ── Styles ─────────────────────────────────────────────────────────
  rootStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "10px",
  };
  headStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  };
  emptyStackStyle = { display: "grid", gap: "10px" };
  hintTextStyle = { fontSize: "11px", color: T.inkSoft };
  chipRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  chipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    borderRadius: "999px",
    background: T.accentSoft,
    border: "1px solid rgba(15, 143, 102, 0.16)",
    color: T.accent,
    fontFamily: T.font,
    cursor: "pointer",
  };
  chipNameStyle = { fontSize: "11px", fontWeight: 800 };
  chipExternalStyle = { fontSize: "10px", color: T.inkSoft };
  chipRemoveLabelStyle = { fontSize: "10px", fontWeight: 800 };
  toggleButtonStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "16px",
    border: `1px solid ${T.line}`,
    background: T.bgSoft,
    color: T.ink,
    textAlign: "left",
    cursor: "pointer",
    fontFamily: T.font,
    display: "grid",
    gap: "4px",
  };
  toggleHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  };
  toggleTitleStyle = { fontSize: "12px", fontWeight: 800, color: T.ink };
  toggleSubStyle = { fontSize: "11px", color: T.inkSoft };
  toggleSummaryStyle = { fontSize: "11px", color: T.inkSoft };
  dropdownStyle = {
    display: "grid",
    gap: "10px",
    padding: "12px",
    borderRadius: "16px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
  };
  filterRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  searchInputStyle = {
    flex: "1 1 220px",
    minWidth: "0",
    padding: "10px 12px",
    borderRadius: "12px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "12px",
    fontFamily: T.font,
    outline: "none",
  };
  resultsScrollStyle = {
    display: "grid",
    gap: "8px",
    maxHeight: "260px",
    overflowY: "auto",
    paddingRight: "2px",
  };
  resultCardStyle(asset: any) {
    const selected = this.selectedAssetIds.includes(asset.id);
    return {
      padding: "12px",
      borderRadius: "14px",
      border: `1px solid ${selected ? "rgba(15, 143, 102, 0.20)" : T.line}`,
      background: selected ? T.accentSoft : T.surfaceStrong,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: T.font,
      display: "grid",
      gap: "4px",
    };
  }
  resultHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  };
  resultTitleStyle(asset: any) {
    const selected = this.selectedAssetIds.includes(asset.id);
    return { fontSize: "12px", fontWeight: 800, color: selected ? T.accent : T.ink };
  }
  resultSubtitleStyle = { fontSize: "11px", color: T.inkSoft };
  resultSummaryStyle = { fontSize: "10px", color: T.inkSoft };
  resultExternalStyle = { fontSize: "10px", color: T.inkMute };
  noMatchStyle = {
    padding: "12px",
    borderRadius: "14px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    fontSize: "11px",
    color: T.inkSoft,
  };
}
