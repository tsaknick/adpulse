// Mirror of the React shell from adpulse-v5.jsx around line 11540 onward:
// outer min-height shell, fixed radial gradient backdrop, max-width inner
// container, glassmorphism top bar with brand + nav + profile button.

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, HostListener, Input, Output } from "@angular/core";

import { CALENDAR, T } from "../foundation/adpulse-foundation";
import { AppButtonComponent, UserAvatarComponent } from "./primitives";
import { ProfilePanelComponent } from "./profile-panel.component";

interface NavItem {
  key: string;
  label: string;
}

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [CommonModule, AppButtonComponent, UserAvatarComponent, ProfilePanelComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="bgGlowStyle"></div>

      <div [ngStyle]="innerStyle">
        <div [ngStyle]="topBarStyle">
          <div [ngStyle]="topRowStyle">
            <!-- Brand block -->
            <div [ngStyle]="brandRowStyle">
              <div [ngStyle]="brandMarkStyle">AP</div>
              <div>
                <div [ngStyle]="brandTitleStyle">AdPulse</div>
                <div [ngStyle]="brandSubtitleStyle">
                  {{ calendarLabel }} | {{ accessSummary }}
                </div>
              </div>
            </div>

            <!-- Nav + profile -->
            <div [ngStyle]="rightClusterStyle">
              <div [ngStyle]="navRowStyle">
                <app-button
                  *ngFor="let item of navItems"
                  [active]="view === item.key"
                  (pressed)="viewChange.emit(item.key)"
                >{{ item.label }}</app-button>
              </div>

              <button type="button" (click)="toggleProfile.emit()" [ngStyle]="profileBtnStyle">
                <app-user-avatar [user]="currentUser" [size]="34"></app-user-avatar>
                <div [ngStyle]="profileCopyStyle">
                  <div [ngStyle]="profileNameStyle">{{ currentUser?.name }}</div>
                  <div [ngStyle]="profileTitleStyle">{{ currentUser?.title }}</div>
                </div>
              </button>
            </div>
          </div>

          <div *ngIf="showProfile" [ngStyle]="profilePanelRowStyle">
            <app-profile-panel
              [user]="currentUser"
              [draft]="profileDraft"
              [assignedClients]="assignedClients"
              (draftChange)="profileDraftChange.emit($event)"
              (save)="saveProfile.emit()"
              (close)="toggleProfile.emit()"
              (logout)="logout.emit()"
            ></app-profile-panel>
          </div>
        </div>

        <div [ngStyle]="viewStackStyle">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  @Input() view = "overview";
  @Input() navItems: NavItem[] = [];
  @Input() currentUser: any = null;
  @Input() isDirector = false;
  @Input() accessibleClientCount = 0;
  @Input() showProfile = false;
  @Input() profileDraft: { name: string; title: string } = { name: "", title: "" };
  @Input() assignedClients: any[] = [];

  @Output() viewChange = new EventEmitter<string>();
  @Output() toggleProfile = new EventEmitter<void>();
  @Output() profileDraftChange = new EventEmitter<{ field: "name" | "title"; value: string }>();
  @Output() saveProfile = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  readonly calendarLabel = CALENDAR.monthLabel;

  @HostListener("window:resize")
  onResize() {
    this.viewportWidth = window.innerWidth || 1440;
  }

  get accessSummary(): string {
    if (this.isDirector) return "full portfolio access";
    return `${this.accessibleClientCount} assigned client${this.accessibleClientCount === 1 ? "" : "s"}`;
  }

  get shellMaxWidth(): number {
    const w = this.viewportWidth;
    if (w >= 1880) return 1740;
    if (w >= 1680) return 1640;
    if (w >= 1440) return 1540;
    if (w >= 1200) return 1380;
    return 1120;
  }

  // ── Styles ───────────────────────────────────────────────────────
  get rootStyle() {
    return {
      minHeight: "100vh",
      background: T.bg,
      color: T.ink,
      fontFamily: T.font,
      letterSpacing: "-0.01em",
      position: "relative",
    };
  }

  bgGlowStyle = {
    position: "fixed",
    inset: "0",
    background:
      "radial-gradient(circle at 12% 18%, rgba(15, 143, 102, 0.08), transparent 24%), radial-gradient(circle at 88% 12%, rgba(215, 93, 66, 0.07), transparent 26%), radial-gradient(circle at 50% 100%, rgba(45, 108, 223, 0.05), transparent 28%)",
    pointerEvents: "none",
    zIndex: 0,
  };

  get innerStyle() {
    return {
      position: "relative",
      maxWidth: this.shellMaxWidth + "px",
      margin: "0 auto",
      padding: "clamp(12px, 2vw, 24px)",
      overflowX: "hidden",
      zIndex: 1,
    };
  }

  topBarStyle = {
    padding: "16px",
    borderRadius: "24px",
    background: "rgba(255, 255, 255, 0.62)",
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    backdropFilter: "blur(14px)",
    display: "grid",
    gap: "16px",
    marginBottom: "20px",
  };

  topRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "center",
  };

  brandRowStyle = { display: "flex", alignItems: "center", gap: "12px" };

  brandMarkStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #0f8f66, #2d6cdf)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontFamily: T.heading,
    letterSpacing: "-0.04em",
  };

  brandTitleStyle = { fontSize: "18px", fontWeight: 800, fontFamily: T.heading };
  brandSubtitleStyle = { fontSize: "12px", color: T.inkSoft };

  rightClusterStyle = {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
    marginLeft: "auto",
  };

  navRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };

  profileBtnStyle = {
    padding: "7px 10px",
    borderRadius: "18px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    cursor: "pointer",
    fontFamily: T.font,
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  profileCopyStyle = { textAlign: "left" };
  profileNameStyle = { fontSize: "12px", fontWeight: 800, color: T.ink };
  profileTitleStyle = { fontSize: "11px", color: T.inkSoft };

  profilePanelRowStyle = { display: "flex", justifyContent: "flex-end" };

  viewStackStyle = { display: "grid", gap: "18px" };
}
