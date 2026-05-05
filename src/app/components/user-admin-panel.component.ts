// UserAdminPanel — mirrors React component (lines 3429-3592 of adpulse-v5.jsx).
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  T,
  USER_ROLE_META,
  createEmptyUserDraft,
  fitCols,
} from "../foundation/adpulse-foundation";
import {
  AppButtonComponent,
  MetricTileComponent,
  RoleChipComponent,
  ToneBadgeComponent,
  UserAvatarComponent,
} from "./primitives";

@Component({
  selector: "app-user-admin-panel",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppButtonComponent,
    MetricTileComponent,
    RoleChipComponent,
    ToneBadgeComponent,
    UserAvatarComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="kpiRowStyle">
        <app-metric-tile label="Total users" [value]="users.length" subValue="Persisted server-side"></app-metric-tile>
        <app-metric-tile label="Directors" [value]="totalDirectors" subValue="Full portfolio access"></app-metric-tile>
        <app-metric-tile label="Account users" [value]="totalAccounts" subValue="Client-assigned visibility"></app-metric-tile>
      </div>

      <div *ngIf="state?.error" [ngStyle]="errorStyle">{{ state.error }}</div>
      <div *ngIf="state?.notice" [ngStyle]="noticeStyle">{{ state.notice }}</div>

      <div [ngStyle]="layoutStyle">
        <div [ngStyle]="createPanelStyle">
          <div>
            <div [ngStyle]="kickerStyle">Create user</div>
            <div [ngStyle]="titleStyle">New login account</div>
            <div [ngStyle]="leadStyle">
              Create either a Director or an Account user. Account users can then be assigned to clients in Client Studio.
            </div>
          </div>
          <div>
            <div [ngStyle]="labelStyle">Role</div>
            <select [(ngModel)]="createDraft.role" (change)="onCreateRoleChange()" [ngStyle]="fieldStyle">
              <option value="account">Account</option>
              <option value="director">Director</option>
            </select>
          </div>
          <div>
            <div [ngStyle]="labelStyle">Full name</div>
            <input [value]="createDraft.name" (input)="createDraft.name = $any($event.target).value" placeholder="Jane Doe" [ngStyle]="fieldStyle" />
          </div>
          <div>
            <div [ngStyle]="labelStyle">Title</div>
            <input [value]="createDraft.title" (input)="createDraft.title = $any($event.target).value" [placeholder]="createDraft.role === 'director' ? 'Director' : 'Account Manager'" [ngStyle]="fieldStyle" />
          </div>
          <div>
            <div [ngStyle]="labelStyle">Email</div>
            <input [value]="createDraft.email" (input)="createDraft.email = $any($event.target).value" placeholder="jane@company.com" [ngStyle]="fieldStyle" />
          </div>
          <div>
            <div [ngStyle]="labelStyle">Password</div>
            <input type="password" [value]="createDraft.password" (input)="createDraft.password = $any($event.target).value" placeholder="At least 6 characters" [ngStyle]="fieldStyle" />
          </div>
          <app-button tone="primary" (pressed)="onCreate()" [disabled]="state?.savingKey === '__create__'">
            {{ state?.savingKey === '__create__' ? 'Creating...' : 'Create account' }}
          </app-button>
        </div>

        <div [ngStyle]="userListStyle">
          <div *ngFor="let user of users" [ngStyle]="userCardStyle">
            <div [ngStyle]="userHeadStyle">
              <div [ngStyle]="userIdRowStyle">
                <app-user-avatar [user]="user" [size]="40"></app-user-avatar>
                <div>
                  <div [ngStyle]="userNameRowStyle">
                    <div [ngStyle]="userNameStyle">{{ user.name }}</div>
                    <app-role-chip [role]="user.role"></app-role-chip>
                    <app-tone-badge *ngIf="user.id === currentUserId" tone="positive">Current session</app-tone-badge>
                    <app-tone-badge *ngIf="user.isSeeded" tone="neutral">Seeded demo</app-tone-badge>
                  </div>
                  <div [ngStyle]="userEmailStyle">{{ user.email }}</div>
                </div>
              </div>
              <div [ngStyle]="userMetricsRowStyle">
                <app-metric-tile
                  label="Clients"
                  [value]="user.role === 'director' ? 'All' : assignedFor(user).length"
                  [subValue]="user.role === 'director' ? 'Full access' : 'Assigned'"
                ></app-metric-tile>
                <app-metric-tile
                  label="Role"
                  [value]="roleLabel(user.role)"
                  [subValue]="editDraftFor(user).title"
                ></app-metric-tile>
              </div>
            </div>

            <div [ngStyle]="editGridStyle">
              <div>
                <div [ngStyle]="labelStyle">Full name</div>
                <input [value]="editDraftFor(user).name" (input)="onEditField(user, 'name', $any($event.target).value)" [ngStyle]="fieldStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Title</div>
                <input [value]="editDraftFor(user).title" (input)="onEditField(user, 'title', $any($event.target).value)" [ngStyle]="fieldStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Email</div>
                <input [value]="editDraftFor(user).email" (input)="onEditField(user, 'email', $any($event.target).value)" [ngStyle]="fieldStyle" />
              </div>
              <div>
                <div [ngStyle]="labelStyle">Role</div>
                <select [value]="editDraftFor(user).role" (change)="onEditField(user, 'role', $any($event.target).value)" [ngStyle]="fieldStyle">
                  <option value="account">Account</option>
                  <option value="director">Director</option>
                </select>
              </div>
              <div>
                <div [ngStyle]="labelStyle">New password</div>
                <input type="password" [value]="editDraftFor(user).password" (input)="onEditField(user, 'password', $any($event.target).value)" placeholder="Leave blank to keep current password" [ngStyle]="fieldStyle" />
              </div>
            </div>

            <div [ngStyle]="footerRowStyle">
              <div [ngStyle]="badgeRowStyle">
                <app-tone-badge *ngIf="user.role === 'director'" tone="positive">Directors can access all clients</app-tone-badge>
                <ng-container *ngIf="user.role !== 'director'">
                  <ng-container *ngIf="assignedFor(user).length; else noAssign">
                    <app-tone-badge *ngFor="let client of assignedFor(user)" tone="neutral">{{ client.name }}</app-tone-badge>
                  </ng-container>
                  <ng-template #noAssign>
                    <app-tone-badge tone="warning">No clients assigned yet</app-tone-badge>
                  </ng-template>
                </ng-container>
              </div>
              <div [ngStyle]="actionsStyle">
                <app-button tone="danger" (pressed)="deleteUser.emit(user)" [disabled]="!canDelete(user) || state?.savingKey === ('delete:' + user.id)">
                  {{ state?.savingKey === ('delete:' + user.id) ? 'Deleting...' : 'Delete user' }}
                </app-button>
                <app-button tone="primary" (pressed)="onUpdate(user)" [disabled]="state?.savingKey === user.id">
                  {{ state?.savingKey === user.id ? 'Saving...' : 'Save changes' }}
                </app-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UserAdminPanelComponent implements OnChanges {
  @Input() users: any[] = [];
  @Input() clients: any[] = [];
  @Input() currentUserId = "";
  @Input() state: any = { savingKey: "", error: "", notice: "" };

  @Output() createUser = new EventEmitter<any>();
  @Output() updateUser = new EventEmitter<{ id: string; payload: any }>();
  @Output() deleteUser = new EventEmitter<any>();

  createDraft: any = createEmptyUserDraft();
  editDrafts: Record<string, any> = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes["users"]) {
      this.editDrafts = Object.fromEntries(
        (this.users || []).map((user) => [user.id, { ...createEmptyUserDraft(user.role), ...user, password: "" }]),
      );
    }
  }

  get totalDirectors(): number {
    return this.users.filter((u) => u.role === "director").length;
  }
  get totalAccounts(): number {
    return this.users.filter((u) => u.role === "account").length;
  }

  assignedFor(user: any): any[] {
    return this.clients.filter((client) => client.assignedUserIds?.includes(user.id));
  }

  editDraftFor(user: any): any {
    return this.editDrafts[user.id] || { ...createEmptyUserDraft(user.role), ...user, password: "" };
  }

  onEditField(user: any, field: string, value: string) {
    const current = this.editDraftFor(user);
    this.editDrafts = { ...this.editDrafts, [user.id]: { ...current, [field]: value } };
  }

  canDelete(user: any): boolean {
    if (user.id === this.currentUserId) return false;
    if (user.role === "director" && this.totalDirectors <= 1) return false;
    return true;
  }

  roleLabel(role: string): string {
    return (USER_ROLE_META as any)[role]?.label || role;
  }

  onCreateRoleChange() {
    if (this.createDraft.role === "director") {
      this.createDraft.title = "Director";
    } else if (!this.createDraft.title || this.createDraft.title === "Director") {
      this.createDraft.title = "Account Manager";
    }
  }

  onCreate() {
    this.createUser.emit({ ...this.createDraft });
    this.createDraft = createEmptyUserDraft();
  }

  onUpdate(user: any) {
    this.updateUser.emit({ id: user.id, payload: this.editDraftFor(user) });
  }

  // ── Styles ─────────────────────────────────────────────────────────
  rootStyle = { display: "grid", gap: "18px" };
  kpiRowStyle = { display: "grid", gridTemplateColumns: fitCols(180), gap: "12px" };
  errorStyle = {
    padding: "12px 14px",
    borderRadius: "16px",
    background: T.coralSoft,
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };
  noticeStyle = {
    padding: "12px 14px",
    borderRadius: "16px",
    background: T.accentSoft,
    color: T.accent,
    fontSize: "12px",
    fontWeight: 700,
  };
  layoutStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 380px) minmax(0, 1fr)",
    gap: "18px",
  };
  createPanelStyle = {
    padding: "18px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "14px",
    alignSelf: "start",
  };
  kickerStyle = {
    fontSize: "12px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  titleStyle = { marginTop: "8px", fontSize: "22px", fontWeight: 800, fontFamily: T.heading };
  leadStyle = { marginTop: "6px", fontSize: "13px", color: T.inkSoft };
  labelStyle = {
    marginBottom: "6px",
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.08em",
  };
  fieldStyle = {
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
  userListStyle = { display: "grid", gap: "12px" };
  userCardStyle = {
    padding: "18px",
    borderRadius: "24px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "14px",
  };
  userHeadStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  };
  userIdRowStyle = { display: "flex", gap: "12px", alignItems: "center", minWidth: "0" };
  userNameRowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
  userNameStyle = { fontSize: "15px", fontWeight: 800, color: T.ink };
  userEmailStyle = { marginTop: "4px", fontSize: "12px", color: T.inkSoft };
  userMetricsRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
  editGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "12px" };
  footerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  };
  badgeRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  actionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
}
