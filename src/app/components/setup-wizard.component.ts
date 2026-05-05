// SetupWizard — mirrors React component (lines 9812-10129).
import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, OnInit } from "@angular/core";
import { T } from "../foundation/adpulse-foundation";
import { IntegrationApiService } from "../integration-api.service";

@Component({
  selector: "app-setup-wizard",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="containerStyle">
        <div [ngStyle]="titleBlockStyle">
          <div [ngStyle]="logoStyle">A</div>
          <h1 [ngStyle]="headingStyle">AdPulse Setup</h1>
          <p [ngStyle]="leadStyle">
            One-time setup — connect your Google &amp; Meta developer apps so AdPulse can use OAuth to pull your ad accounts.
          </p>
        </div>

        <div [ngStyle]="stepperStyle">
          <div *ngFor="let s of steps; let i = index" [ngStyle]="stepCellStyle">
            <div [ngStyle]="stepBarStyle(i)"></div>
            <div [ngStyle]="stepLabelStyle(i)">{{ s.label }}</div>
          </div>
        </div>

        <div *ngIf="status" [ngStyle]="badgeWrapStyle">
          <div *ngFor="let entry of statusEntries" [ngStyle]="badgeStyle(entry.ok)">
            <span [ngStyle]="checkStyle(entry.ok)">{{ entry.ok ? '✓' : '·' }}</span>
            {{ entry.label }}
            <span *ngIf="entry.masked" [ngStyle]="maskedStyle">{{ entry.masked }}</span>
          </div>
        </div>

        <!-- Step 0: Google Cloud OAuth Client -->
        <div *ngIf="step === 0" [ngStyle]="cardStyle">
          <h3 [ngStyle]="cardTitleStyle">Google Cloud — OAuth Client</h3>
          <p [ngStyle]="cardLeadStyle">
            Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" [ngStyle]="linkStyle">Cloud Console → Credentials</a>
            → Create OAuth Client ID (Web app). Add your redirect URIs (see setup guide).
          </p>
          <div [ngStyle]="fieldStyle">
            <label [ngStyle]="labelStyle">Google Client ID</label>
            <input [value]="form.GOOGLE_CLIENT_ID" (input)="onChange('GOOGLE_CLIENT_ID', $any($event.target).value)" placeholder="123456789-abc.apps.googleusercontent.com" [ngStyle]="inputStyle" />
          </div>
          <div [ngStyle]="fieldStyle">
            <label [ngStyle]="labelStyle">Google Client Secret</label>
            <input [value]="form.GOOGLE_CLIENT_SECRET" (input)="onChange('GOOGLE_CLIENT_SECRET', $any($event.target).value)" placeholder="GOCSPX-xxxxxx" [ngStyle]="inputStyle" />
          </div>
          <button (click)="step = 1" [ngStyle]="primaryBtnStyle">Next: Google Ads Token →</button>
        </div>

        <!-- Step 1: Google Ads -->
        <div *ngIf="step === 1" [ngStyle]="cardStyle">
          <h3 [ngStyle]="cardTitleStyle">Google Ads — Developer Token</h3>
          <p [ngStyle]="cardLeadStyle">
            Go to your <a href="https://ads.google.com/aw/apicenter" target="_blank" rel="noreferrer" [ngStyle]="linkStyle">Google Ads Manager → API Center</a>
            and copy the developer token (22 characters).
          </p>
          <div [ngStyle]="fieldStyle">
            <label [ngStyle]="labelStyle">Developer Token</label>
            <input [value]="form.GOOGLE_ADS_DEVELOPER_TOKEN" (input)="onChange('GOOGLE_ADS_DEVELOPER_TOKEN', $any($event.target).value)" placeholder="xxxxxxxxxxxxxxxxxxxxxx" [ngStyle]="inputStyle" />
          </div>
          <div [ngStyle]="optionalGroupStyle">
            <div>
              <div [ngStyle]="optionalTitleStyle">AI strategist (optional)</div>
              <div [ngStyle]="optionalBodyStyle">Add an Anthropic API key now if you want Claude Sonnet strategy recommendations on the Accounts and Search Terms screens.</div>
            </div>
            <div [ngStyle]="fieldStyle">
              <label [ngStyle]="labelStyle">Anthropic API key</label>
              <input [value]="form.ANTHROPIC_API_KEY" (input)="onChange('ANTHROPIC_API_KEY', $any($event.target).value)" placeholder="sk-ant-..." [ngStyle]="inputStyle" />
            </div>
            <div [ngStyle]="fieldStyle">
              <label [ngStyle]="labelStyle">Strategist model</label>
              <input [value]="form.ANTHROPIC_STRATEGIST_MODEL" (input)="onChange('ANTHROPIC_STRATEGIST_MODEL', $any($event.target).value)" placeholder="claude-sonnet-4-6" [ngStyle]="inputStyle" />
            </div>
          </div>
          <div [ngStyle]="navRowStyle">
            <button (click)="step = 0" [ngStyle]="secondaryBtnStyle">← Back</button>
            <button (click)="step = 2" [ngStyle]="primaryBtnStyle">Next: Meta →</button>
          </div>
        </div>

        <!-- Step 2: Meta + TikTok -->
        <div *ngIf="step === 2" [ngStyle]="cardStyle">
          <h3 [ngStyle]="cardTitleStyle">Meta — App Credentials</h3>
          <p [ngStyle]="cardLeadStyle">
            Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" [ngStyle]="linkStyle">Meta Developer Portal → My Apps</a>
            → your app → Settings → Basic → copy App ID &amp; Secret.
          </p>
          <div [ngStyle]="fieldStyle">
            <label [ngStyle]="labelStyle">Meta App ID</label>
            <input [value]="form.META_APP_ID" (input)="onChange('META_APP_ID', $any($event.target).value)" placeholder="123456789" [ngStyle]="inputStyle" />
          </div>
          <div [ngStyle]="fieldStyle">
            <label [ngStyle]="labelStyle">Meta App Secret</label>
            <input [value]="form.META_APP_SECRET" (input)="onChange('META_APP_SECRET', $any($event.target).value)" placeholder="abcdef123456..." [ngStyle]="inputStyle" />
          </div>
          <div [ngStyle]="optionalGroupStyle">
            <div>
              <div [ngStyle]="optionalTitleStyle">TikTok Ads (optional)</div>
              <div [ngStyle]="optionalBodyStyle">Save these only if you want TikTok advertiser logins in the Connections tab.</div>
            </div>
            <div [ngStyle]="fieldStyle">
              <label [ngStyle]="labelStyle">TikTok App ID</label>
              <input [value]="form.TIKTOK_APP_ID" (input)="onChange('TIKTOK_APP_ID', $any($event.target).value)" placeholder="1234567890123456789" [ngStyle]="inputStyle" />
            </div>
            <div [ngStyle]="fieldStyle">
              <label [ngStyle]="labelStyle">TikTok App Secret</label>
              <input [value]="form.TIKTOK_APP_SECRET" (input)="onChange('TIKTOK_APP_SECRET', $any($event.target).value)" placeholder="tiktok-secret..." [ngStyle]="inputStyle" />
            </div>
          </div>
          <div [ngStyle]="navRowStyle">
            <button (click)="step = 1" [ngStyle]="secondaryBtnStyle">← Back</button>
            <button (click)="handleSave()" [disabled]="saving" [ngStyle]="saveBtnStyle">
              {{ saving ? 'Saving...' : 'Save all credentials' }}
            </button>
          </div>
        </div>

        <!-- Step 3: Done -->
        <div *ngIf="step === 3" [ngStyle]="doneStyle">
          <div [ngStyle]="doneIconStyle">✓</div>
          <h3 [ngStyle]="doneTitleStyle">All set!</h3>
          <p [ngStyle]="doneLeadStyle">
            Credentials configured. Use "Login with Google" and "Login with Meta" in the Connections tab.
          </p>
          <button (click)="complete.emit()" [ngStyle]="primaryBtnStyle">Open AdPulse →</button>
        </div>

        <div *ngIf="error" [ngStyle]="errorBoxStyle">{{ error }}</div>
        <div *ngIf="success" [ngStyle]="successBoxStyle">{{ success }}</div>

        <div *ngIf="step < 3" [ngStyle]="skipWrapStyle">
          <button (click)="complete.emit()" [ngStyle]="skipBtnStyle">
            Skip — I already have .env.local configured
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SetupWizardComponent implements OnInit {
  @Output() complete = new EventEmitter<void>();
  @Output() statusUpdate = new EventEmitter<any>();

  step = 0;
  status: any = null;
  saving = false;
  error = "";
  success = "";

  form: Record<string, string> = {
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_ADS_DEVELOPER_TOKEN: "",
    META_APP_ID: "",
    META_APP_SECRET: "",
    TIKTOK_APP_ID: "",
    TIKTOK_APP_SECRET: "",
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_STRATEGIST_MODEL: "",
  };

  steps = [
    { label: "Google Cloud", desc: "OAuth Client" },
    { label: "Google Ads", desc: "Dev Token" },
    { label: "Meta / TikTok", desc: "App credentials" },
    { label: "Done", desc: "Ready" },
  ];

  constructor(private api: IntegrationApiService) {}

  async ngOnInit() {
    try {
      const data = await this.api.fetchSetupStatus();
      this.status = data;
      if (data?.allReady) this.step = 3;
    } catch {}
  }

  get statusEntries(): { key: string; label: string; ok: boolean; masked?: string }[] {
    if (!this.status?.configured) return [];
    return Object.entries(this.status.configured).map(([key, ok]) => ({
      key,
      label: key.replace(/_/g, " "),
      ok: !!ok,
      masked: ok && this.status.masked?.[key] ? this.status.masked[key] : "",
    }));
  }

  onChange(field: string, value: string) {
    this.form[field] = value;
    this.error = "";
  }

  async handleSave() {
    this.saving = true;
    this.error = "";
    this.success = "";
    try {
      const nonEmpty = Object.fromEntries(Object.entries(this.form).filter(([, v]) => v.trim()));
      if (Object.keys(nonEmpty).length === 0) {
        this.error = "Paste at least one credential to save.";
        this.saving = false;
        return;
      }
      const result: any = await this.api.saveSetupCredentials(nonEmpty);
      if (result?.ok) {
        this.success = result.message || "Saved!";
        this.status = result.status || null;
        this.statusUpdate.emit(this.status);
        this.form = {
          GOOGLE_CLIENT_ID: "",
          GOOGLE_CLIENT_SECRET: "",
          GOOGLE_ADS_DEVELOPER_TOKEN: "",
          META_APP_ID: "",
          META_APP_SECRET: "",
          TIKTOK_APP_ID: "",
          TIKTOK_APP_SECRET: "",
          ANTHROPIC_API_KEY: "",
          ANTHROPIC_STRATEGIST_MODEL: "",
        };
        if (result.status?.allReady) {
          setTimeout(() => this.complete.emit(), 1500);
        }
      } else {
        this.error = result?.error || "Save failed.";
      }
    } catch (err: any) {
      this.error = err?.message || "Could not reach the server.";
    }
    this.saving = false;
  }

  // ── Styles ─────────────────────────────────────────────────────────
  rootStyle = {
    minHeight: "100vh",
    background: T.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: T.font,
    padding: "24px",
  };
  containerStyle = { width: "100%", maxWidth: "580px" };
  titleBlockStyle = { textAlign: "center", marginBottom: "28px" };
  logoStyle = {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: T.accent,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontSize: "18px",
    marginBottom: "12px",
  };
  headingStyle = { margin: 0, fontSize: "26px", fontWeight: 800, fontFamily: T.heading, color: T.ink };
  leadStyle = { margin: "8px 0 0", color: T.inkSoft, fontSize: "14px", lineHeight: "1.5" };

  stepperStyle = { display: "flex", gap: "4px", marginBottom: "24px" };
  stepCellStyle = { flex: 1, textAlign: "center" };
  stepBarStyle(i: number) {
    return {
      height: "4px",
      borderRadius: "2px",
      marginBottom: "6px",
      background: i <= this.step ? T.accent : T.lineStrong,
      transition: "background 0.3s",
    };
  }
  stepLabelStyle(i: number) {
    return { fontSize: "10px", fontWeight: 700, color: i <= this.step ? T.accent : T.inkMute };
  }

  badgeWrapStyle = {
    background: T.surface,
    borderRadius: T.radius + "px",
    border: `1px solid ${T.line}`,
    padding: "14px",
    marginBottom: "14px",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  };
  badgeStyle(ok: boolean) {
    return {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "8px",
      background: ok ? T.accentSoft : T.coralSoft,
      fontSize: "11px",
      fontWeight: 600,
      color: ok ? T.accent : T.coral,
    };
  }
  checkStyle(ok: boolean) {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      background: ok ? T.accentSoft : T.coralSoft,
      color: ok ? T.accent : T.coral,
      fontSize: "11px",
      fontWeight: 700,
      flexShrink: 0,
    };
  }
  maskedStyle = { fontFamily: T.mono, fontSize: "10px", opacity: 0.7 };

  cardStyle = {
    background: T.surface,
    borderRadius: T.radius + "px",
    border: `1px solid ${T.line}`,
    padding: "20px",
    marginBottom: "14px",
  };
  cardTitleStyle = { margin: "0 0 4px", fontSize: "16px", fontWeight: 700 };
  cardLeadStyle = { margin: "0 0 16px", fontSize: "12px", color: T.inkSoft, lineHeight: "1.5" };
  linkStyle = { color: T.accent };
  fieldStyle = { marginBottom: "12px" };
  labelStyle = {
    fontSize: "11px",
    fontWeight: 700,
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
    display: "block",
  };
  inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: T.radiusSm + "px",
    border: `1.5px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    fontFamily: T.mono,
    outline: "none",
    boxSizing: "border-box",
  };
  optionalGroupStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "12px",
    marginBottom: "16px",
  };
  optionalTitleStyle = { fontSize: "12px", fontWeight: 800, color: T.ink };
  optionalBodyStyle = { marginTop: "4px", fontSize: "12px", color: T.inkSoft, lineHeight: "1.5" };

  navRowStyle = { display: "flex", gap: "8px" };
  primaryBtnStyle = {
    padding: "9px 20px",
    borderRadius: T.radiusSm + "px",
    border: "none",
    background: T.ink,
    color: "#fff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: T.font,
  };
  secondaryBtnStyle = {
    padding: "9px 16px",
    borderRadius: T.radiusSm + "px",
    border: `1.5px solid ${T.lineStrong}`,
    background: "transparent",
    color: T.inkSoft,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: T.font,
  };
  get saveBtnStyle() {
    return {
      ...this.primaryBtnStyle,
      background: T.accent,
      opacity: this.saving ? 0.7 : 1,
    };
  }

  doneStyle = {
    background: T.surface,
    borderRadius: T.radius + "px",
    border: `1px solid ${T.line}`,
    padding: "32px",
    marginBottom: "14px",
    textAlign: "center",
  };
  doneIconStyle = {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: T.accentSoft,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: T.accent,
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "12px",
  };
  doneTitleStyle = { margin: "0 0 6px", fontSize: "18px", fontWeight: 700 };
  doneLeadStyle = { margin: "0 0 20px", color: T.inkSoft, fontSize: "13px", lineHeight: "1.5" };

  errorBoxStyle = {
    padding: "10px 14px",
    borderRadius: "10px",
    marginTop: "10px",
    background: T.coralSoft,
    color: T.coral,
    fontSize: "12px",
    fontWeight: 600,
    border: `1px solid ${T.coral}20`,
  };
  successBoxStyle = {
    padding: "10px 14px",
    borderRadius: "10px",
    marginTop: "10px",
    background: T.accentSoft,
    color: T.accent,
    fontSize: "12px",
    fontWeight: 600,
    border: `1px solid ${T.accent}20`,
  };
  skipWrapStyle = { textAlign: "center", marginTop: "16px" };
  skipBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: T.inkMute,
    fontSize: "12px",
    fontFamily: T.font,
    textDecoration: "underline",
  };
}
