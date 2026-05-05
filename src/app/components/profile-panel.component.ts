// Mirror of React `ProfilePanel` from adpulse-v5.jsx (lines 3354-3427).

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { T, USER_ROLE_META, fitCols } from "../foundation/adpulse-foundation";
import {
  AppButtonComponent,
  LogoMarkComponent,
  MetricTileComponent,
  RoleChipComponent,
  ToneBadgeComponent,
  UserAvatarComponent,
} from "./primitives";

@Component({
  selector: "app-profile-panel",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppButtonComponent,
    LogoMarkComponent,
    MetricTileComponent,
    RoleChipComponent,
    ToneBadgeComponent,
    UserAvatarComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headerStyle">
        <div [ngStyle]="identityRowStyle">
          <app-user-avatar [user]="user" [size]="42"></app-user-avatar>
          <div [ngStyle]="identityCopyStyle">
            <div [ngStyle]="nameRowStyle">
              <div [ngStyle]="nameStyle">{{ user?.name }}</div>
              <app-role-chip [role]="user?.role"></app-role-chip>
            </div>
            <div [ngStyle]="emailStyle">{{ user?.email }}</div>
          </div>
        </div>
        <app-button (pressed)="close.emit()">Close</app-button>
      </div>

      <div [ngStyle]="metricGridStyle">
        <app-metric-tile
          label="Access"
          [value]="user?.role === 'director' ? 'All' : assignedClients.length"
          [subValue]="user?.role === 'director' ? 'Full client portfolio' : 'Assigned clients'"
        ></app-metric-tile>
        <app-metric-tile
          label="Role"
          [value]="roleLabel"
          [subValue]="user?.title"
        ></app-metric-tile>
      </div>

      <div [ngStyle]="formStackStyle">
        <div>
          <div [ngStyle]="labelStyle">Display name</div>
          <input
            [ngModel]="draft?.name"
            (ngModelChange)="draftChange.emit({ field: 'name', value: $event })"
            name="profile-name"
            [ngStyle]="inputStyle"
          />
        </div>
        <div>
          <div [ngStyle]="labelStyle">Title</div>
          <input
            [ngModel]="draft?.title"
            (ngModelChange)="draftChange.emit({ field: 'title', value: $event })"
            name="profile-title"
            [ngStyle]="inputStyle"
          />
        </div>
      </div>

      <div [ngStyle]="accessStackStyle">
        <div [ngStyle]="labelStyle">Client access</div>
        <div *ngIf="user?.role === 'director'" [ngStyle]="directorBlockStyle">
          Directors can view and manage every client, every account and all assignments.
        </div>
        <ng-container *ngIf="user?.role !== 'director'">
          <div *ngIf="assignedClients.length; else noAssignments" [ngStyle]="assignedRowStyle">
            <div *ngFor="let client of assignedClients" [ngStyle]="assignedChipStyle">
              <app-logo-mark [client]="client" [size]="24"></app-logo-mark>
              <span [ngStyle]="assignedNameStyle">{{ client.name }}</span>
            </div>
          </div>
          <ng-template #noAssignments>
            <app-tone-badge tone="warning">No clients assigned yet</app-tone-badge>
          </ng-template>
        </ng-container>
      </div>

      <div [ngStyle]="footerRowStyle">
        <div [ngStyle]="footerActionsStyle">
          <app-button tone="primary" (pressed)="save.emit()">Save profile</app-button>
          <app-button (pressed)="logout.emit()">Sign out</app-button>
        </div>
      </div>
    </div>
  `,
})
export class ProfilePanelComponent {
  @Input() user: any = null;
  @Input() draft: { name: string; title: string } = { name: "", title: "" };
  @Input() assignedClients: any[] = [];

  @Output() draftChange = new EventEmitter<{ field: "name" | "title"; value: string }>();
  @Output() save = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  get roleLabel(): string {
    return (USER_ROLE_META as any)[this.user?.role]?.label || this.user?.role || "";
  }

  // ── Styles ───────────────────────────────────────────────────────
  rootStyle = {
    width: "min(100%, 420px)",
    padding: "20px",
    borderRadius: "24px",
    background: "rgba(255, 252, 247, 0.98)",
    border: `1px solid ${T.lineStrong}`,
    boxShadow: "0 24px 60px rgba(25, 36, 29, 0.18)",
    backdropFilter: "blur(20px) saturate(1.08)",
    display: "grid",
    gap: "16px",
  };

  headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  };

  identityRowStyle = { display: "flex", gap: "12px", alignItems: "center", minWidth: "0" };
  identityCopyStyle = { minWidth: "0" };
  nameRowStyle = { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" };
  nameStyle = { fontSize: "16px", fontWeight: 800, fontFamily: T.heading };
  emailStyle = { marginTop: "4px", fontSize: "12px", color: T.inkSoft };

  metricGridStyle = { display: "grid", gridTemplateColumns: fitCols(120), gap: "10px" };

  formStackStyle = { display: "grid", gap: "12px" };

  labelStyle = {
    marginBottom: "6px",
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.08em",
  };

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

  accessStackStyle = { display: "grid", gap: "8px" };

  directorBlockStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.accentSoft,
    color: T.accent,
    fontSize: "12px",
    fontWeight: 700,
  };

  assignedRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };

  assignedChipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    borderRadius: "999px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
  };

  assignedNameStyle = { fontSize: "11px", fontWeight: 700, color: T.ink };

  footerRowStyle = {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "space-between",
  };

  footerActionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
}
