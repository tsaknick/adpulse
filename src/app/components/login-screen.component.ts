// Mirror of React `LoginScreen` from adpulse-v5.jsx (lines 3186-3352).
// Styles are bound via [ngStyle] so visuals stay 1:1 with the React source.

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { DEMO_USER_PASSWORD, T, fitCols } from "../foundation/adpulse-foundation";
import { MetricTileComponent, RoleChipComponent, UserAvatarComponent } from "./primitives";

@Component({
  selector: "app-login-screen",
  standalone: true,
  imports: [CommonModule, FormsModule, MetricTileComponent, RoleChipComponent, UserAvatarComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="gridStyle">
        <!-- Brand panel -->
        <div [ngStyle]="brandPanelStyle">
          <div [ngStyle]="brandGlow"></div>
          <div [ngStyle]="brandStackStyle">
            <div [ngStyle]="brandRowStyle">
              <div [ngStyle]="brandMarkStyle">AP</div>
              <div>
                <div [ngStyle]="brandTitleStyle">AdPulse</div>
                <div [ngStyle]="brandSubtitleStyle">Director + Account access for client-based ad operations</div>
              </div>
            </div>

            <div>
              <div [ngStyle]="headlineStyle">
                Login for role-based visibility and client assignment control.
              </div>
              <div [ngStyle]="bodyStyle">
                Directors get full access across all customers. Account users only see the clients assigned to them, across overview, accounts, analytics and alerts.
              </div>
            </div>

            <div [ngStyle]="metricGridStyle">
              <app-metric-tile label="Roles" value="2" subValue="Director + Account"></app-metric-tile>
              <app-metric-tile label="Assignments" value="Multi-user" subValue="One client can belong to multiple account users"></app-metric-tile>
              <app-metric-tile label="Profile" value="Included" subValue="Each user gets profile + access summary"></app-metric-tile>
            </div>
          </div>
        </div>

        <!-- Login form -->
        <div [ngStyle]="formPanelStyle">
          <div>
            <div [ngStyle]="kickerStyle">Sign in</div>
            <div [ngStyle]="welcomeStyle">Welcome back</div>
            <div [ngStyle]="hintStyle">
              Use your saved credentials. Seeded demo users still use password
              <span [ngStyle]="monoStyle">{{ demoPassword }}</span>.
            </div>
          </div>

          <form (submit)="onSubmit($event)" [ngStyle]="formStyle">
            <div>
              <div [ngStyle]="labelStyle">Email</div>
              <input
                [ngModel]="form.email"
                (ngModelChange)="formChange.emit({ field: 'email', value: $event })"
                name="email"
                placeholder="director@adpulse.local"
                autocomplete="email"
                [ngStyle]="inputStyle"
              />
            </div>

            <div>
              <div [ngStyle]="labelStyle">Password</div>
              <input
                type="password"
                [ngModel]="form.password"
                (ngModelChange)="formChange.emit({ field: 'password', value: $event })"
                name="password"
                placeholder="demo123"
                autocomplete="current-password"
                [ngStyle]="inputStyle"
              />
            </div>

            <div *ngIf="error" [ngStyle]="errorStyle">{{ error }}</div>

            <button type="submit" [ngStyle]="submitStyle">Login</button>
          </form>

          <div [ngStyle]="quickStackStyle">
            <div [ngStyle]="labelStyle">Quick demo access</div>
            <ng-container *ngIf="(demoUsers || []).length; else noDemo">
              <button
                *ngFor="let user of demoUsers; trackBy: trackById"
                type="button"
                (click)="quickLogin.emit(user.id)"
                [ngStyle]="quickButtonStyle"
              >
                <div [ngStyle]="quickRowStyle">
                  <app-user-avatar [user]="user"></app-user-avatar>
                  <div [ngStyle]="quickInfoStyle">
                    <div [ngStyle]="quickNameRowStyle">
                      <div [ngStyle]="quickNameStyle">{{ user.name }}</div>
                      <app-role-chip [role]="user.role"></app-role-chip>
                    </div>
                    <div [ngStyle]="quickEmailStyle">{{ user.email }}</div>
                  </div>
                </div>
                <div [ngStyle]="quickCtaStyle">Use demo</div>
              </button>
            </ng-container>
            <ng-template #noDemo>
              <div [ngStyle]="emptyDemoStyle">
                No seeded demo users are available in this environment.
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginScreenComponent {
  @Input() users: any[] = [];
  @Input() demoUsers: any[] = [];
  @Input() form: { email: string; password: string } = { email: "", password: "" };
  @Input() error = "";

  @Output() formChange = new EventEmitter<{ field: "email" | "password"; value: string }>();
  @Output() submit = new EventEmitter<void>();
  @Output() quickLogin = new EventEmitter<string>();

  readonly demoPassword = DEMO_USER_PASSWORD;

  trackById(_: number, item: any) {
    return item?.id || _;
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.submit.emit();
  }

  // ── Styles (inline for 1:1 React parity) ─────────────────────────
  rootStyle = {
    minHeight: "100vh",
    background: T.bg,
    color: T.ink,
    fontFamily: T.font,
    letterSpacing: "-0.01em",
    padding: "clamp(16px, 3vw, 36px)",
  };

  gridStyle = {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: fitCols(360),
    gap: "22px",
    alignItems: "start",
  };

  brandPanelStyle = {
    position: "relative",
    padding: "clamp(24px, 3vw, 34px)",
    borderRadius: "30px",
    overflow: "hidden",
    background: "linear-gradient(135deg, #fff7ea 0%, #f7efe5 42%, #edf6f1 100%)",
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "18px",
    minHeight: "460px",
  };

  brandGlow = {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top right, rgba(15, 143, 102, 0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(45, 108, 223, 0.10), transparent 36%)",
    pointerEvents: "none",
  };

  brandStackStyle = { position: "relative", display: "grid", gap: "18px" };
  brandRowStyle = { display: "inline-flex", alignItems: "center", gap: "10px" };

  brandMarkStyle = {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #0f8f66, #2d6cdf)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontFamily: T.heading,
  };

  brandTitleStyle = { fontSize: "20px", fontWeight: 800, fontFamily: T.heading };
  brandSubtitleStyle = { fontSize: "12px", color: T.inkSoft };

  headlineStyle = {
    fontSize: "clamp(2.1rem, 4vw, 3.4rem)",
    lineHeight: 1.02,
    fontWeight: 800,
    fontFamily: T.heading,
    letterSpacing: "-0.05em",
  };

  bodyStyle = {
    marginTop: "12px",
    fontSize: "15px",
    color: T.inkSoft,
    maxWidth: "620px",
    lineHeight: 1.5,
  };

  metricGridStyle = { display: "grid", gridTemplateColumns: fitCols(150), gap: "12px" };

  formPanelStyle = {
    padding: "clamp(22px, 2.5vw, 28px)",
    borderRadius: "28px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "18px",
  };

  kickerStyle = {
    fontSize: "12px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };

  welcomeStyle = { marginTop: "8px", fontSize: "24px", fontWeight: 800, fontFamily: T.heading };
  hintStyle = { marginTop: "6px", fontSize: "13px", color: T.inkSoft };
  monoStyle = { fontFamily: T.mono, color: T.ink };

  formStyle = { display: "grid", gap: "12px" };

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
    padding: "13px 14px",
    borderRadius: "16px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    outline: "none",
    fontFamily: T.font,
  };

  errorStyle = {
    padding: "11px 12px",
    borderRadius: "14px",
    background: T.coralSoft,
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };

  submitStyle = {
    padding: "11px 14px",
    borderRadius: "12px",
    border: "none",
    background: T.ink,
    color: "#fff",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: T.font,
  };

  quickStackStyle = { display: "grid", gap: "10px" };

  quickButtonStyle = {
    padding: "12px",
    borderRadius: "18px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: T.font,
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
  };

  quickRowStyle = { display: "flex", gap: "12px", alignItems: "center", minWidth: "0" };
  quickInfoStyle = { minWidth: "0" };
  quickNameRowStyle = { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" };
  quickNameStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  quickEmailStyle = { marginTop: "4px", fontSize: "11px", color: T.inkSoft };
  quickCtaStyle = { fontSize: "11px", fontWeight: 800, color: T.inkSoft, whiteSpace: "nowrap" };

  emptyDemoStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.bgSoft,
    color: T.inkSoft,
    fontSize: "12px",
  };
}
