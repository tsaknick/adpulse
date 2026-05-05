// AlertLane — mirrors React component (lines 7817-7922 of adpulse-v5.jsx).
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { T, formatCurrency } from "../foundation/adpulse-foundation";
import {
  AppButtonComponent,
  AssignedUsersStripComponent,
  CategoryChipComponent,
  LogoMarkComponent,
  StatusPillComponent,
} from "./primitives";

@Component({
  selector: "app-alert-lane",
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AssignedUsersStripComponent,
    CategoryChipComponent,
    LogoMarkComponent,
    StatusPillComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div>
        <div [ngStyle]="headRowStyle">
          <app-status-pill [ok]="ok" [label]="title"></app-status-pill>
          <div [ngStyle]="countStyle">{{ items.length }} clients</div>
        </div>
        <div [ngStyle]="descStyle">{{ description }}</div>
      </div>

      <div [ngStyle]="cardListStyle">
        <div *ngFor="let client of items" [ngStyle]="cardStyle">
          <div [ngStyle]="cardHeadStyle">
            <div [ngStyle]="cardLeftStyle">
              <app-logo-mark [client]="client" [size]="36"></app-logo-mark>
              <div [ngStyle]="cardCopyStyle">
                <div [ngStyle]="titleRowStyle">
                  <div [ngStyle]="nameStyle">{{ client.name }}</div>
                  <app-category-chip [category]="client.category"></app-category-chip>
                </div>
                <div [ngStyle]="metaStyle">
                  Budget {{ fc(client.totalBudget) }} | Spend {{ fc(client.spend) }}
                </div>
              </div>
            </div>
            <app-status-pill [ok]="client.health?.ok"></app-status-pill>
          </div>

          <div *ngIf="client.health?.ok; else flagsBlock" [ngStyle]="okMessageStyle">
            All alert checks passed.
          </div>
          <ng-template #flagsBlock>
            <div [ngStyle]="flagsListStyle">
              <div *ngFor="let flag of client.health?.flags || []" [ngStyle]="flagRowStyle">
                <div [ngStyle]="flagBodyStyle">
                  <span [ngStyle]="flagLabelStyle(flag)">{{ flag.label }}</span>
                  <span [ngStyle]="flagDetailStyle"> | {{ flag.detail }}</span>
                </div>
                <button
                  *ngIf="flag.id"
                  type="button"
                  [ngStyle]="resolveButtonStyle(flag)"
                  (click)="resolveIssue.emit({ clientId: client.id, flagId: flag.id })"
                >Mark resolved</button>
              </div>
            </div>
          </ng-template>

          <app-assigned-users-strip [client]="client" [users]="users"></app-assigned-users-strip>

          <div [ngStyle]="actionsStyle">
            <app-button tone="primary" (pressed)="openAccounts.emit(client.id)">Open accounts</app-button>
            <app-button (pressed)="edit.emit(client.id)">Edit rules</app-button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AlertLaneComponent {
  @Input() title = "";
  @Input() description = "";
  @Input() items: any[] = [];
  @Input() ok = false;
  @Input() users: any[] = [];

  @Output() openAccounts = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() resolveIssue = new EventEmitter<{ clientId: string; flagId: string }>();

  fc(value: any) {
    return formatCurrency(value || 0);
  }

  get rootStyle() {
    return {
      padding: "18px",
      borderRadius: "24px",
      background: this.ok ? "rgba(223, 245, 234, 0.55)" : "rgba(253, 233, 228, 0.74)",
      border: `1px solid ${this.ok ? "rgba(15, 143, 102, 0.16)" : "rgba(215, 93, 66, 0.16)"}`,
      display: "grid",
      gap: "14px",
    };
  }
  headRowStyle = { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" };
  countStyle = { fontSize: "12px", color: T.inkSoft };
  descStyle = { marginTop: "10px", fontSize: "12px", color: T.inkSoft };
  cardListStyle = { display: "grid", gap: "12px" };

  get cardStyle() {
    return {
      padding: "14px",
      borderRadius: "18px",
      background: T.surfaceStrong,
      border: `1px solid ${this.ok ? "rgba(15, 143, 102, 0.14)" : "rgba(215, 93, 66, 0.14)"}`,
      display: "grid",
      gap: "10px",
    };
  }
  cardHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  };
  cardLeftStyle = { display: "flex", gap: "12px", minWidth: "0", flex: "1 1 220px" };
  cardCopyStyle = { minWidth: "0" };
  titleRowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
  nameStyle = { fontSize: "14px", fontWeight: 800, color: T.ink };
  metaStyle = { marginTop: "4px", fontSize: "11px", color: T.inkSoft };

  okMessageStyle = { fontSize: "12px", color: T.accent, fontWeight: 800 };

  flagsListStyle = { display: "grid", gap: "8px" };
  flagRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    fontSize: "12px",
  };
  flagBodyStyle = { minWidth: "0", flex: "1 1 220px" };
  flagLabelStyle(flag: any) {
    return { fontWeight: 800, color: flag.tone === "warning" ? T.amber : T.coral };
  }
  flagDetailStyle = { color: T.inkSoft };
  resolveButtonStyle(flag: any) {
    const warning = flag.tone === "warning";
    return {
      border: `1px solid ${warning ? "rgba(199, 147, 33, 0.22)" : "rgba(215, 93, 66, 0.22)"}`,
      background: T.surfaceStrong,
      color: warning ? T.amber : T.coral,
      borderRadius: "10px",
      padding: "6px 9px",
      fontSize: "11px",
      fontWeight: 800,
      cursor: "pointer",
      fontFamily: T.font,
      whiteSpace: "nowrap",
    };
  }

  actionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
}
