// ConnectedAssetDropdown — simplified port of React component (lines 4199-4397).
// This v1 lays down the multi-select interaction + chip list. Full popover
// + search/filter polish lands in a follow-up.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  PLATFORM_META,
  T,
} from "../foundation/adpulse-foundation";
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
        <div [ngStyle]="minWidthStyle">
          <app-platform-chip [platform]="platform"></app-platform-chip>
          <div [ngStyle]="titleStyle">{{ platformLabel }}</div>
          <div *ngIf="helperText" [ngStyle]="helperStyle">{{ helperText }}</div>
        </div>
        <app-tone-badge [tone]="selectedAssetIds.length ? 'positive' : 'warning'">
          {{ selectedAssetIds.length || 0 }} linked
        </app-tone-badge>
      </div>

      <div [ngStyle]="actionRowStyle">
        <app-button
          (pressed)="open = !open"
          [disabled]="!canEditCoreSettings || !assets.length"
        >{{ open ? 'Close picker' : selectedAssetIds.length ? 'Edit selection' : 'Pick assets' }}</app-button>
        <app-button
          *ngIf="selectedAssetIds.length && canEditCoreSettings"
          (pressed)="clearSelection.emit()"
        >Clear</app-button>
        <app-button *ngIf="onOpenConnectionsAvailable" (pressed)="openConnections.emit()">Manage logins</app-button>
      </div>

      <div *ngIf="!assets.length" [ngStyle]="emptyStyle">
        No synced {{ platformLabel }} assets yet. Connect a login in the Connections tab.
      </div>

      <div *ngIf="open && assets.length" [ngStyle]="popoverStyle">
        <div *ngFor="let asset of assets" [ngStyle]="assetRowStyle(asset)">
          <label [ngStyle]="assetLabelStyle">
            <input
              type="checkbox"
              [checked]="selectedAssetIds.includes(asset.id)"
              [disabled]="!canEditCoreSettings"
              (change)="toggleAsset.emit(asset.id)"
            />
            <span [ngStyle]="assetNameStyle">{{ asset.name }}</span>
            <span [ngStyle]="assetExternalStyle">{{ asset.externalId }}</span>
          </label>
          <div [ngStyle]="assetSummaryStyle">{{ summary(asset) }}</div>
        </div>
      </div>

      <div *ngIf="selectedAssets.length" [ngStyle]="chipsStyle">
        <div *ngFor="let asset of selectedAssets" [ngStyle]="chipStyle">
          <span [ngStyle]="chipNameStyle">{{ asset.name }}</span>
          <span [ngStyle]="chipExternalStyle">{{ asset.externalId }}</span>
          <button
            *ngIf="canEditCoreSettings"
            type="button"
            (click)="toggleAsset.emit(asset.id)"
            [ngStyle]="chipRemoveStyle"
          >×</button>
        </div>
      </div>
    </div>
  `,
})
export class ConnectedAssetDropdownComponent {
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

  get platformLabel(): string {
    return (PLATFORM_META as any)[this.platform]?.label || this.platform;
  }
  summary(asset: any) {
    return formatConnectedAssetSummary(this.platform, asset);
  }

  rootStyle = {
    padding: "16px",
    borderRadius: "20px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "12px",
  };
  headStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  minWidthStyle = { minWidth: "0" };
  titleStyle = { marginTop: "8px", fontSize: "14px", fontWeight: 800, fontFamily: T.heading, color: T.ink };
  helperStyle = { marginTop: "4px", fontSize: "11px", color: T.inkSoft, lineHeight: 1.45 };
  actionRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  emptyStyle = {
    padding: "10px 12px",
    borderRadius: "12px",
    background: T.surfaceStrong,
    border: `1px dashed ${T.line}`,
    color: T.inkSoft,
    fontSize: "12px",
  };
  popoverStyle = {
    padding: "10px",
    borderRadius: "16px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "8px",
    maxHeight: "260px",
    overflow: "auto",
  };
  assetRowStyle(asset: any) {
    return {
      padding: "8px 10px",
      borderRadius: "12px",
      background: this.selectedAssetIds.includes(asset.id) ? T.accentSoft : T.bgSoft,
      border: `1px solid ${T.line}`,
      display: "grid",
      gap: "4px",
    };
  }
  assetLabelStyle = { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "12px" };
  assetNameStyle = { fontWeight: 800, color: T.ink };
  assetExternalStyle = { fontSize: "11px", color: T.inkSoft, fontFamily: T.mono };
  assetSummaryStyle = { marginLeft: "26px", fontSize: "11px", color: T.inkSoft, lineHeight: 1.4 };
  chipsStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  chipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    borderRadius: "999px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
  };
  chipNameStyle = { fontSize: "11px", fontWeight: 700, color: T.ink };
  chipExternalStyle = { fontSize: "10px", color: T.inkSoft, fontFamily: T.mono };
  chipRemoveStyle = {
    border: "none",
    background: "transparent",
    color: T.inkMute,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 800,
    padding: "0 4px",
  };
}
