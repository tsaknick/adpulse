// Standalone primitive components — each mirrors a small React function component
// from adpulse-v5.jsx. Inline styles are bound via [ngStyle] for pixel parity.

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  CATEGORIES,
  PLATFORM_META,
  T,
  USER_ROLE_META,
  formatCurrency,
  formatMetric,
  formatNumber,
  getCategoryMeta,
  getClientLogoText,
} from "../foundation/adpulse-foundation";

// =====================================================================
// LogoMark
// =====================================================================
@Component({
  selector: "app-logo-mark",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <img
        *ngIf="client?.logoImage; else letters"
        [src]="client.logoImage"
        [alt]="(client?.name || '') + ' logo'"
        [ngStyle]="imgStyle"
      />
      <ng-template #letters>{{ client?.logoText || logoText }}</ng-template>
    </div>
  `,
})
export class LogoMarkComponent {
  @Input() client: any = {};
  @Input() size = 44;

  get logoText(): string {
    return getClientLogoText(this.client?.name);
  }

  get rootStyle() {
    const size = this.size;
    const c = this.client || {};
    return {
      width: size + "px",
      height: size + "px",
      borderRadius: Math.round(size * 0.34) + "px",
      background: `linear-gradient(135deg, ${c.accent}, ${c.accent2})`,
      color: "#fff",
      fontFamily: T.heading,
      fontWeight: 700,
      fontSize: size * 0.28 + "px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 10px 22px ${c.accent}33`,
      letterSpacing: "-0.04em",
      flexShrink: 0,
      overflow: "hidden",
    };
  }

  get imgStyle() {
    const padding = Math.max(4, Math.round(this.size * 0.08));
    return {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      background: "#fff",
      padding: padding + "px",
    };
  }
}

// =====================================================================
// StatusPill
// =====================================================================
@Component({
  selector: "app-status-pill",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <span [ngStyle]="dotStyle"></span>
      {{ label || (ok ? 'Green / healthy' : 'Red / needs focus') }}
    </div>
  `,
})
export class StatusPillComponent {
  @Input() ok = false;
  @Input() label = "";

  get rootStyle() {
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "7px 12px",
      borderRadius: "999px",
      background: this.ok ? T.accentSoft : T.coralSoft,
      color: this.ok ? T.accent : T.coral,
      fontSize: "12px",
      fontWeight: 700,
      whiteSpace: "nowrap",
      maxWidth: "100%",
    };
  }

  get dotStyle() {
    return {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: this.ok ? T.accent : T.coral,
      boxShadow: `0 0 0 4px ${this.ok ? "rgba(15, 143, 102, 0.14)" : "rgba(215, 93, 66, 0.14)"}`,
    };
  }
}

// =====================================================================
// CategoryChip
// =====================================================================
@Component({
  selector: "app-category-chip",
  standalone: true,
  imports: [CommonModule],
  template: `<span [ngStyle]="rootStyle">{{ meta.label }}</span>`,
})
export class CategoryChipComponent {
  @Input() category = "";

  get meta() {
    return getCategoryMeta(this.category);
  }

  get rootStyle() {
    const meta = this.meta;
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: "999px",
      background: meta.tint,
      color: meta.color,
      fontSize: "11px",
      fontWeight: 700,
    };
  }
}

// =====================================================================
// RoleChip
// =====================================================================
@Component({
  selector: "app-role-chip",
  standalone: true,
  imports: [CommonModule],
  template: `<span [ngStyle]="rootStyle">{{ meta.label }}</span>`,
})
export class RoleChipComponent {
  @Input() role = "account";

  get meta() {
    return (USER_ROLE_META as any)[this.role] || USER_ROLE_META.account;
  }

  get rootStyle() {
    const meta = this.meta;
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: "999px",
      background: meta.tint,
      color: meta.color,
      fontSize: "11px",
      fontWeight: 700,
    };
  }
}

// =====================================================================
// UserAvatar
// =====================================================================
@Component({
  selector: "app-user-avatar",
  standalone: true,
  imports: [CommonModule],
  template: `<div [ngStyle]="rootStyle">{{ user?.initials }}</div>`,
})
export class UserAvatarComponent {
  @Input() user: any = {};
  @Input() size = 32;

  get rootStyle() {
    const size = this.size;
    const u = this.user || {};
    return {
      width: size + "px",
      height: size + "px",
      borderRadius: Math.round(size * 0.38) + "px",
      background: `linear-gradient(135deg, ${u.accent}, ${u.accent2})`,
      color: "#fff",
      fontFamily: T.heading,
      fontWeight: 800,
      fontSize: Math.max(11, size * 0.3) + "px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      letterSpacing: "-0.04em",
      boxShadow: `0 10px 20px ${u.accent}24`,
      flexShrink: 0,
    };
  }
}

// =====================================================================
// PlatformChip
// =====================================================================
@Component({
  selector: "app-platform-chip",
  standalone: true,
  imports: [CommonModule],
  template: `
    <span *ngIf="meta" [ngStyle]="rootStyle">
      <span [ngStyle]="badgeStyle">{{ meta.short }}</span>
      {{ meta.label }}
    </span>
  `,
})
export class PlatformChipComponent {
  @Input() platform = "";

  get meta() {
    return (PLATFORM_META as any)[this.platform];
  }

  get rootStyle() {
    const meta = this.meta;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 10px",
      borderRadius: "999px",
      background: meta.tint,
      color: meta.color,
      fontSize: "11px",
      fontWeight: 700,
    };
  }

  get badgeStyle() {
    const meta = this.meta;
    return {
      width: "18px",
      height: "18px",
      borderRadius: "7px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: `${meta.color}18`,
      border: `1px solid ${meta.color}22`,
    };
  }
}

// =====================================================================
// ToneBadge
// =====================================================================
@Component({
  selector: "app-tone-badge",
  standalone: true,
  imports: [CommonModule],
  template: `<span [ngStyle]="rootStyle"><ng-content></ng-content></span>`,
})
export class ToneBadgeComponent {
  @Input() tone: "neutral" | "positive" | "danger" | "warning" = "neutral";

  private get theme() {
    const tones: Record<string, any> = {
      neutral: { background: T.surfaceStrong, color: T.inkSoft, border: T.line },
      positive: { background: T.accentSoft, color: T.accent, border: "rgba(15, 143, 102, 0.14)" },
      danger: { background: T.coralSoft, color: T.coral, border: "rgba(215, 93, 66, 0.14)" },
      warning: { background: T.amberSoft, color: T.amber, border: "rgba(199, 147, 33, 0.16)" },
    };
    return tones[this.tone] || tones["neutral"];
  }

  get rootStyle() {
    const theme = this.theme;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      borderRadius: "999px",
      background: theme.background,
      color: theme.color,
      border: `1px solid ${theme.border}`,
      fontSize: "11px",
      fontWeight: 800,
      lineHeight: 1,
    };
  }
}

// =====================================================================
// ActionCue
// =====================================================================
@Component({
  selector: "app-action-cue",
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [ngStyle]="rootStyle">
      <span [ngStyle]="dotStyle"></span>
      <span [ngStyle]="textStyle"><ng-content></ng-content></span>
    </span>
  `,
})
export class ActionCueComponent {
  @Input() tone: "neutral" | "success" | "info" | "warning" | "danger" = "neutral";

  private get theme() {
    const tones: Record<string, any> = {
      neutral: { background: T.surfaceStrong, color: T.inkSoft, border: T.line, dot: T.inkMute },
      success: { background: T.accentSoft, color: T.accent, border: "rgba(15, 143, 102, 0.16)", dot: T.accent },
      info: { background: "rgba(45, 108, 223, 0.10)", color: T.sky, border: "rgba(45, 108, 223, 0.16)", dot: T.sky },
      warning: { background: T.amberSoft, color: T.amber, border: "rgba(199, 147, 33, 0.16)", dot: T.amber },
      danger: { background: T.coralSoft, color: T.coral, border: "rgba(215, 93, 66, 0.16)", dot: T.coral },
    };
    return tones[this.tone] || tones["neutral"];
  }

  get rootStyle() {
    const theme = this.theme;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "7px 11px",
      borderRadius: "999px",
      background: theme.background,
      color: theme.color,
      border: `1px solid ${theme.border}`,
      fontSize: "11px",
      fontWeight: 800,
      lineHeight: 1,
      maxWidth: "100%",
    };
  }

  get dotStyle() {
    return {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: this.theme.dot,
      flexShrink: 0,
    };
  }

  get textStyle() {
    return { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  }
}

// =====================================================================
// AppButton — generic Button replacement
// =====================================================================
@Component({
  selector: "app-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="handleClick()"
      [disabled]="disabled"
      [ngStyle]="rootStyle"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class AppButtonComponent {
  @Input() active = false;
  @Input() tone: "soft" | "primary" | "danger" | "success" = "soft";
  @Input() disabled = false;
  @Input() emphasize = false;
  @Output() pressed = new EventEmitter<void>();

  handleClick() {
    if (!this.disabled) this.pressed.emit();
  }

  get rootStyle() {
    const isPrimary = this.tone === "primary";
    const isDanger = this.tone === "danger";
    const isSuccess = this.tone === "success";
    const disabled = this.disabled;
    const active = this.active;
    const emphasize = this.emphasize;

    return {
      padding: "10px 14px",
      borderRadius: "12px",
      border: isPrimary || isDanger || isSuccess ? "none" : `1px solid ${active ? T.lineStrong : T.line}`,
      background: disabled
        ? T.bgSoft
        : isSuccess
          ? T.accent
          : isPrimary
            ? T.ink
            : isDanger
              ? T.coral
              : active
                ? T.accentSoft
                : T.surfaceStrong,
      color: disabled
        ? T.inkMute
        : isPrimary || isDanger || isSuccess
          ? "#fff"
          : active
            ? T.accent
            : T.inkSoft,
      fontSize: "12px",
      fontWeight: 800,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: T.font,
      maxWidth: "100%",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.7 : 1,
      transform: emphasize ? "translateY(-1px) scale(1.02)" : "translateY(0) scale(1)",
      boxShadow: emphasize
        ? `0 14px 30px ${isSuccess ? "rgba(15, 143, 102, 0.28)" : "rgba(22, 34, 24, 0.12)"}`
        : "none",
      transition:
        "transform 180ms ease, box-shadow 220ms ease, background 220ms ease, color 220ms ease, border-color 220ms ease, opacity 220ms ease",
    };
  }
}

// =====================================================================
// MetricTile
// =====================================================================
@Component({
  selector: "app-metric-tile",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="labelStyle">{{ label }}</div>
      <div [ngStyle]="valueStyle">{{ value }}</div>
      <div *ngIf="subValue" [ngStyle]="subValueStyle">{{ subValue }}</div>
    </div>
  `,
})
export class MetricTileComponent {
  @Input() label = "";
  @Input() value: string | number = "";
  @Input() subValue: string | number | null = null;
  @Input() accent: string | null = null;

  rootStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.surfaceMuted,
    border: `1px solid ${T.line}`,
    display: "grid",
    alignContent: "start",
    minHeight: "92px",
  };

  labelStyle = {
    fontSize: "11px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };

  get valueStyle() {
    return {
      marginTop: "6px",
      fontSize: "clamp(1.2rem, 1.7vw, 1.75rem)",
      color: this.accent || T.ink,
      fontWeight: 800,
      fontFamily: T.heading,
      letterSpacing: "-0.05em",
      lineHeight: 1.05,
    };
  }

  subValueStyle = {
    marginTop: "4px",
    fontSize: "11px",
    color: T.inkSoft,
  };
}

// =====================================================================
// ProgressRail
// =====================================================================
@Component({
  selector: "app-progress-rail",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="trackStyle">
        <div [ngStyle]="markerStyle"></div>
        <div [ngStyle]="fillStyle"></div>
      </div>
      <span [ngStyle]="labelStyle">{{ percent }}%</span>
    </div>
  `,
})
export class ProgressRailComponent {
  @Input() current = 0;
  @Input() target = 0;

  get ratio() {
    return this.target > 0 ? this.current / this.target : 1;
  }
  get tone() {
    const r = this.ratio;
    return r > 1.1 || r < 0.9 ? T.coral : T.accent;
  }
  get percent() {
    return (this.ratio * 100).toFixed(0);
  }

  rootStyle = { display: "flex", alignItems: "center", gap: "10px" };

  trackStyle = {
    flex: 1,
    height: "8px",
    borderRadius: "999px",
    background: "rgba(22, 34, 24, 0.08)",
    position: "relative",
    overflow: "hidden",
  };

  markerStyle = {
    position: "absolute",
    left: "100%",
    top: "-2px",
    width: "2px",
    height: "12px",
    background: T.inkMute,
    opacity: 0.45,
  };

  get fillStyle() {
    return {
      width: `${Math.min(this.ratio, 1.28) * 100}%`,
      height: "100%",
      borderRadius: "999px",
      background: this.tone,
    };
  }

  get labelStyle() {
    return {
      minWidth: "52px",
      textAlign: "right",
      fontSize: "11px",
      fontWeight: 800,
      color: this.tone,
      fontFamily: T.mono,
    };
  }
}

// =====================================================================
// AlertList
// =====================================================================
@Component({
  selector: "app-alert-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="health?.ok; else flagsBlock" [ngStyle]="okStyle">
      No red flags. This client is clean at a glance.
    </div>
    <ng-template #flagsBlock>
      <div [ngStyle]="listStyle">
        <div *ngFor="let flag of (health?.flags || []).slice(0, 3)" [ngStyle]="flagWrapStyle(flag)">
          <div [ngStyle]="flagRowStyle">
            <div [ngStyle]="flagBodyStyle">
              <div [ngStyle]="labelStyle">{{ flag.label }}</div>
              <div [ngStyle]="detailStyle">{{ flag.detail }}</div>
            </div>
            <button
              *ngIf="clientId && flag.id"
              type="button"
              (click)="onResolve(flag)"
              [ngStyle]="buttonStyle(flag)"
            >Mark resolved</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class AlertListComponent {
  @Input() health: any = { ok: true, flags: [] };
  @Input() clientId = "";
  @Output() resolveIssue = new EventEmitter<{ clientId: string; flagId: string }>();

  okStyle = {
    padding: "12px",
    borderRadius: "14px",
    background: T.accentSoft,
    color: T.accent,
    fontSize: "12px",
    fontWeight: 700,
  };
  listStyle = { display: "grid", gap: "8px" };
  flagRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  };
  flagBodyStyle = { minWidth: "0", flex: "1 1 180px" };
  labelStyle = { fontSize: "12px", fontWeight: 800 };
  detailStyle = { marginTop: "3px", fontSize: "11px", color: T.inkSoft };

  flagWrapStyle(flag: any) {
    const warning = flag.tone === "warning";
    return {
      padding: "12px",
      borderRadius: "14px",
      background: warning ? T.amberSoft : T.coralSoft,
      color: warning ? T.amber : T.coral,
      border: `1px solid ${warning ? "rgba(199, 147, 33, 0.12)" : "rgba(215, 93, 66, 0.10)"}`,
    };
  }

  buttonStyle(flag: any) {
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

  onResolve(flag: any) {
    if (this.clientId && flag?.id) {
      this.resolveIssue.emit({ clientId: this.clientId, flagId: flag.id });
    }
  }
}

// =====================================================================
// EmptyState
// =====================================================================
@Component({
  selector: "app-empty-state",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="titleStyle">{{ title }}</div>
      <div [ngStyle]="bodyStyle">{{ body }}</div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = "";
  @Input() body = "";

  rootStyle = {
    padding: "28px",
    borderRadius: "18px",
    background: T.surface,
    border: `1px dashed ${T.lineStrong}`,
    color: T.inkSoft,
    textAlign: "center",
  };
  titleStyle = { fontSize: "14px", fontWeight: 800, color: T.ink };
  bodyStyle = { marginTop: "8px", fontSize: "12px" };
}

// =====================================================================
// AssignedUsersStrip
// =====================================================================
@Component({
  selector: "app-assigned-users-strip",
  standalone: true,
  imports: [CommonModule, UserAvatarComponent, ToneBadgeComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="labelStyle">{{ label }}</div>
      <div *ngIf="assignedUsers.length; else unassigned" [ngStyle]="rowStyle">
        <div *ngFor="let user of assignedUsers" [ngStyle]="chipStyle">
          <app-user-avatar [user]="user" [size]="24"></app-user-avatar>
          <span [ngStyle]="nameStyle">{{ user.name }}</span>
        </div>
      </div>
      <ng-template #unassigned>
        <app-tone-badge tone="warning">Unassigned</app-tone-badge>
      </ng-template>
    </div>
  `,
})
export class AssignedUsersStripComponent {
  @Input() client: any = {};
  @Input() users: any[] = [];
  @Input() label = "Assigned";

  get assignedUsers() {
    const ids: string[] = this.client?.assignedUserIds || [];
    return this.users.filter((user) => ids.includes(user.id));
  }

  rootStyle = { display: "grid", gap: "8px" };
  labelStyle = {
    fontSize: "10px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  rowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  chipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
  };
  nameStyle = { fontSize: "11px", fontWeight: 700, color: T.ink };
}

// =====================================================================
// ProviderProfilePill
// =====================================================================
@Component({
  selector: "app-provider-profile-pill",
  standalone: true,
  imports: [CommonModule, PlatformChipComponent, ToneBadgeComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <app-platform-chip [platform]="profile?.platform"></app-platform-chip>
      <app-tone-badge [tone]="tone">{{ profile?.name }}</app-tone-badge>
    </div>
  `,
})
export class ProviderProfilePillComponent {
  @Input() profile: any = {};

  get tone(): "warning" | "positive" {
    return this.profile?.status === "attention" || this.profile?.status === "error" ? "warning" : "positive";
  }

  rootStyle = { display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" };
}

// =====================================================================
// ToastStack
// =====================================================================
@Component({
  selector: "app-toast-stack",
  standalone: true,
  imports: [CommonModule, ActionCueComponent],
  template: `
    <div *ngIf="items.length" [ngStyle]="rootStyle">
      <div *ngFor="let toast of items" [ngStyle]="toastStyle">
        <app-action-cue [tone]="toneFor(toast)">
          {{ toast.title || (toneFor(toast) === 'danger' ? 'Action failed' : 'Saved') }}
        </app-action-cue>
        <div [ngStyle]="bodyStyle">
          <div [ngStyle]="msgStyle">{{ toast.message }}</div>
        </div>
        <button type="button" (click)="dismiss.emit(toast.id)" [ngStyle]="closeStyle">Close</button>
      </div>
    </div>
  `,
})
export class ToastStackComponent {
  @Input() items: any[] = [];
  @Output() dismiss = new EventEmitter<string>();

  toneFor(toast: any): "danger" | "warning" | "info" | "success" {
    if (toast.tone === "danger") return "danger";
    if (toast.tone === "warning") return "warning";
    if (toast.tone === "info") return "info";
    return "success";
  }

  rootStyle = {
    position: "fixed",
    top: "18px",
    right: "18px",
    zIndex: 50,
    display: "grid",
    gap: "10px",
    width: "min(360px, calc(100vw - 24px))",
  };
  toastStyle = {
    padding: "14px",
    borderRadius: "18px",
    background: "#fff",
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  };
  bodyStyle = { minWidth: "0", flex: 1 };
  msgStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  closeStyle = {
    border: "none",
    background: "transparent",
    color: T.inkMute,
    cursor: "pointer",
    fontFamily: T.font,
    fontSize: "12px",
    fontWeight: 800,
    padding: 0,
  };
}

// =====================================================================
// LiveDataCue
// =====================================================================
@Component({
  selector: "app-live-data-cue",
  standalone: true,
  imports: [CommonModule, ActionCueComponent],
  template: `
    <ng-container *ngIf="message">
      <app-action-cue *ngIf="compact" tone="info">
        {{ syncing ? linkedAssetCount + ' linked asset' + (linkedAssetCount === 1 ? '' : 's') + ' syncing'
                   : linkedAssetCount + ' linked asset' + (linkedAssetCount === 1 ? '' : 's') + ' connected' }}
      </app-action-cue>
      <div *ngIf="!compact" [ngStyle]="boxStyle">
        <div [ngStyle]="titleStyle">
          {{ syncing ? 'Live data is syncing' : 'Linked assets are ready' }}
        </div>
        <div [ngStyle]="bodyStyle">{{ message }}</div>
      </div>
    </ng-container>
  `,
})
export class LiveDataCueComponent {
  @Input() client: any = {};
  @Input() compact = false;

  get linkedAssetCount(): number {
    return this.client?.linkedAssetCount || 0;
  }
  get syncing(): boolean {
    return !!this.client?.syncingPlatforms?.length;
  }
  get message(): string {
    return getClientLiveDataMessageLocal(this.client);
  }

  boxStyle = {
    padding: "16px 16px",
    borderRadius: "16px",
    background: "rgba(45, 108, 223, 0.08)",
    border: "1px solid rgba(45, 108, 223, 0.14)",
  };
  titleStyle = { fontSize: "13px", fontWeight: 800, color: T.sky };
  bodyStyle = { marginTop: "5px", fontSize: "12px", color: T.inkSoft };
}

// Helpers (mirrored from React file beyond the foundation cut-off).
function formatInlineList(items: string[]): string {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getClientLinkedPlatforms(client: any): string[] {
  return Object.entries(client?.linkedAssetCounts || {})
    .filter(([, count]) => (count as number) > 0)
    .map(([platform]) => platform);
}

function getClientLiveDataMessageLocal(client: any): string {
  const linkedAssetCount = client?.linkedAssetCount || 0;
  if (!linkedAssetCount) return "";

  const platformLabels = formatInlineList(
    (client.syncingPlatforms?.length ? client.syncingPlatforms : getClientLinkedPlatforms(client))
      .map((platform: string) => (PLATFORM_META as any)[platform]?.label || platform)
      .filter(Boolean) as string[]
  );
  const assetLabel = `${linkedAssetCount} linked asset${linkedAssetCount === 1 ? "" : "s"}`;
  const verb = linkedAssetCount === 1 ? "is" : "are";

  if (client.syncingPlatforms?.length) {
    return `${assetLabel} ${verb} syncing${platformLabels ? ` from ${platformLabels}` : ""}. The client board will fill in as live data arrives.`;
  }

  return `${assetLabel} ${verb} connected${platformLabels ? ` from ${platformLabels}` : ""}, but no live rows have arrived yet for this date range.`;
}
