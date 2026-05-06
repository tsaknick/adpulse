// AI strategist primitives — full port of React AiRecommendationCard,
// AiStrategyOutput, AiStrategistChatPanel from adpulse-v5.jsx (3691-3935).
// Used inline by AccountStack, SearchTermsWorkbench and ReportCenter to render
// Claude diagnosis + recommendations + chat thread.
// @ts-nocheck
/* eslint-disable */

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  T,
  fitCols,
  formatAiGeneratedAt,
  getAiAreaLabel,
  getAiConfidenceLabel,
  getAiPriorityLabel,
  getAiPriorityTone,
} from "../foundation/adpulse-foundation";
import { AppButtonComponent, ToneBadgeComponent } from "./primitives";

// ─────────────────────────────────────────────────────────────────────
// AiRecommendationCard
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-ai-recommendation-card",
  standalone: true,
  imports: [CommonModule, ToneBadgeComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headStyle">
        <div [ngStyle]="titleStyle">{{ item?.title }}</div>
        <div [ngStyle]="badgeRowStyle">
          <app-tone-badge [tone]="priorityTone(item?.priority)">{{ priorityLabel(item?.priority) }}</app-tone-badge>
          <app-tone-badge tone="neutral">{{ areaLabel(item?.area) }}</app-tone-badge>
          <app-tone-badge [tone]="confidenceTone(item?.confidence)">{{ confidenceLabel(item?.confidence) }}</app-tone-badge>
        </div>
      </div>
      <div [ngStyle]="actionStyle">{{ item?.action }}</div>
      <div [ngStyle]="whyStyle">{{ item?.why }}</div>
      <div *ngIf="item?.expectedImpact" [ngStyle]="impactStyle">Expected impact: {{ item.expectedImpact }}</div>
    </div>
  `,
})
export class AiRecommendationCardComponent {
  @Input() item: any = null;
  priorityTone(p: any) { return getAiPriorityTone(p); }
  priorityLabel(p: any) { return getAiPriorityLabel(p); }
  areaLabel(a: any) { return getAiAreaLabel(a); }
  confidenceLabel(c: any) { return getAiConfidenceLabel(c); }
  confidenceTone(c: any): "positive" | "warning" | "neutral" {
    return c === "high" ? "positive" : c === "low" ? "warning" : "neutral";
  }

  rootStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "8px",
  };
  headStyle = { display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  titleStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  badgeRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  actionStyle = { fontSize: "12px", color: T.ink, lineHeight: 1.6 };
  whyStyle = { fontSize: "12px", color: T.inkSoft, lineHeight: 1.55 };
  impactStyle = { fontSize: "11px", color: T.inkMute, lineHeight: 1.5 };
}

// ─────────────────────────────────────────────────────────────────────
// AiStrategyOutput — full diagnosis + recommendations panel
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-ai-strategy-output",
  standalone: true,
  imports: [CommonModule, ToneBadgeComponent, AiRecommendationCardComponent],
  template: `
    <div *ngIf="strategy" [ngStyle]="rootStyle">
      <div [ngStyle]="metaRowStyle">
        <div [ngStyle]="metaInnerStyle">
          <app-tone-badge *ngIf="result?.model" tone="neutral">{{ result.model }}</app-tone-badge>
          <app-tone-badge *ngIf="result?.generatedAt" tone="neutral">{{ generatedAt }}</app-tone-badge>
          <app-tone-badge *ngIf="result?.cached" tone="warning">Cached result</app-tone-badge>
        </div>
      </div>

      <div [ngStyle]="diagBoxStyle">
        <div [ngStyle]="diagLabelStyle">What's not working</div>
        <div [ngStyle]="diagBodyStyle">{{ strategy.performanceDiagnosis }}</div>
      </div>

      <div *ngIf="strategy.nextBestAction" [ngStyle]="sectionStackStyle">
        <div [ngStyle]="sectionTitleStyle">Next move</div>
        <app-ai-recommendation-card [item]="strategy.nextBestAction"></app-ai-recommendation-card>
      </div>

      <div *ngIf="(strategy.recommendations || []).length" [ngStyle]="sectionStackStyle">
        <div [ngStyle]="sectionTitleStyle">Next steps</div>
        <div [ngStyle]="sectionStackStyle">
          <app-ai-recommendation-card *ngFor="let item of strategy.recommendations" [item]="item"></app-ai-recommendation-card>
        </div>
      </div>

      <div *ngIf="(strategy.keywordOpportunities || []).length" [ngStyle]="sectionStackStyle">
        <div [ngStyle]="sectionTitleStyle">Keyword opportunities</div>
        <div [ngStyle]="cardGridStyle">
          <div *ngFor="let item of strategy.keywordOpportunities" [ngStyle]="suggestionCardStyle">
            <div [ngStyle]="suggestionHeadStyle">
              <div [ngStyle]="suggestionTitleStyle">{{ item.keyword }}</div>
              <app-tone-badge [tone]="priorityTone(item.priority)">{{ priorityLabel(item.priority) }}</app-tone-badge>
            </div>
            <div [ngStyle]="muteStyle">Match type: {{ item.suggestedMatchType || 'For review' }}</div>
            <div [ngStyle]="bodyStyle">{{ item.why }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="(strategy.negativeKeywordSuggestions || []).length" [ngStyle]="sectionStackStyle">
        <div [ngStyle]="sectionTitleStyle">Negative keyword suggestions</div>
        <div [ngStyle]="cardGridStyle">
          <div *ngFor="let item of strategy.negativeKeywordSuggestions" [ngStyle]="suggestionCardStyle">
            <div [ngStyle]="suggestionHeadStyle">
              <div [ngStyle]="suggestionTitleStyle">{{ item.keyword }}</div>
              <app-tone-badge [tone]="priorityTone(item.priority)">{{ priorityLabel(item.priority) }}</app-tone-badge>
            </div>
            <div [ngStyle]="muteStyle">Suggestion: {{ item.suggestedMatchType || 'Negative keyword' }}</div>
            <div [ngStyle]="bodyStyle">{{ item.why }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="(strategy.budgetActions || []).length" [ngStyle]="sectionStackStyle">
        <div [ngStyle]="sectionTitleStyle">Budget actions</div>
        <div [ngStyle]="sectionStackStyle">
          <div *ngFor="let item of strategy.budgetActions" [ngStyle]="suggestionCardStyle">
            <div [ngStyle]="budgetHeadStyle">
              <div [ngStyle]="suggestionTitleStyle">{{ item.channel || 'Channel budget' }}</div>
              <div [ngStyle]="badgeRowStyle">
                <app-tone-badge *ngIf="item.amountText" tone="neutral">{{ item.amountText }}</app-tone-badge>
                <app-tone-badge [tone]="priorityTone(item.priority)">{{ priorityLabel(item.priority) }}</app-tone-badge>
              </div>
            </div>
            <div [ngStyle]="bodyStrongStyle">{{ item.direction }}</div>
            <div [ngStyle]="bodyStyle">{{ item.why }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="(strategy.experiments || []).length" [ngStyle]="sectionStackStyle">
        <div [ngStyle]="sectionTitleStyle">Experiments</div>
        <div [ngStyle]="experimentGridStyle">
          <div *ngFor="let item of strategy.experiments" [ngStyle]="suggestionCardStyle">
            <div [ngStyle]="suggestionTitleStyle">{{ item.title }}</div>
            <div [ngStyle]="bodyStyle">{{ item.hypothesis }}</div>
            <div [ngStyle]="muteStyle">Success metric: {{ item.successMetric }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="(strategy.watchouts || []).length" [ngStyle]="watchoutBoxStyle">
        <div [ngStyle]="watchoutTitleStyle">Watchouts</div>
        <div [ngStyle]="watchoutListStyle">
          <div *ngFor="let item of strategy.watchouts" [ngStyle]="bodyStyle">{{ item }}</div>
        </div>
      </div>
    </div>
  `,
})
export class AiStrategyOutputComponent {
  @Input() result: any = null;
  get strategy(): any { return this.result?.strategy || null; }
  get generatedAt(): string { return formatAiGeneratedAt(this.result?.generatedAt); }
  priorityTone(p: any) { return getAiPriorityTone(p); }
  priorityLabel(p: any) { return getAiPriorityLabel(p); }

  rootStyle = { display: "grid", gap: "12px" };
  metaRowStyle = { display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  metaInnerStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };

  diagBoxStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "10px",
  };
  diagLabelStyle = { fontSize: "11px", color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 };
  diagBodyStyle = { marginTop: "6px", fontSize: "13px", color: T.ink, lineHeight: 1.65 };

  sectionStackStyle = { display: "grid", gap: "10px" };
  sectionTitleStyle = { fontSize: "12px", fontWeight: 800, color: T.ink, fontFamily: T.heading };

  cardGridStyle = { display: "grid", gridTemplateColumns: fitCols(220), gap: "10px" };
  experimentGridStyle = { display: "grid", gridTemplateColumns: fitCols(240), gap: "10px" };
  suggestionCardStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "8px",
  };
  suggestionHeadStyle = { display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" };
  suggestionTitleStyle = { fontSize: "13px", fontWeight: 800, color: T.ink };
  budgetHeadStyle = { display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  badgeRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  muteStyle = { fontSize: "11px", color: T.inkMute };
  bodyStyle = { fontSize: "12px", color: T.inkSoft, lineHeight: 1.55 };
  bodyStrongStyle = { fontSize: "12px", color: T.ink };

  watchoutBoxStyle = {
    padding: "14px",
    borderRadius: "16px",
    background: T.amberSoft,
    border: "1px solid rgba(199, 147, 33, 0.16)",
    display: "grid",
    gap: "8px",
  };
  watchoutTitleStyle = { fontSize: "12px", fontWeight: 800, color: T.amber, fontFamily: T.heading };
  watchoutListStyle = { display: "grid", gap: "6px" };
}

// ─────────────────────────────────────────────────────────────────────
// AiStrategistChatPanel
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-ai-strategist-chat-panel",
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headRowStyle">
        <div>
          <div [ngStyle]="titleStyle">Strategist chat</div>
          <div [ngStyle]="leadStyle">
            Comment on the diagnosis, correct assumptions, and the next strategist refresh will use your notes automatically.
          </div>
        </div>
        <app-button *ngIf="hasMessages" (pressed)="clear.emit()" [disabled]="loading">Clear chat context</app-button>
      </div>

      <div [ngStyle]="threadBoxStyle">
        <ng-container *ngIf="hasMessages; else emptyThread">
          <div *ngFor="let entry of thread; let i = index" [ngStyle]="bubbleStyle(entry)">
            <div [ngStyle]="bubbleLabelStyle">{{ entry.role === 'user' ? 'You' : 'Strategist' }}</div>
            <div [ngStyle]="bubbleTextStyle">{{ entry.text }}</div>
          </div>
        </ng-container>
        <ng-template #emptyThread>
          <div [ngStyle]="emptyStyle">
            No chat notes yet. Ask the strategist to refine a recommendation, explain a watchout, or adapt to your client-specific reality.
          </div>
        </ng-template>
      </div>

      <div *ngIf="error" [ngStyle]="errorStyle">{{ error }}</div>

      <div [ngStyle]="composerStyle">
        <textarea
          [value]="draft"
          (input)="draftChange.emit($any($event.target).value)"
          [disabled]="disabled || loading"
          rows="4"
          placeholder="Example: For this client we care more about lead quality than volume. Align the next recommendations with that."
          [ngStyle]="textareaStyle"
        ></textarea>
        <div [ngStyle]="composerActionsStyle">
          <app-button tone="primary" (pressed)="send.emit()" [disabled]="disabled || loading || !draft || !draft.trim()">
            {{ loading ? 'Sending...' : 'Send to strategist' }}
          </app-button>
          <div [ngStyle]="composerHintStyle">Your notes stay attached to this client and date range.</div>
        </div>
      </div>
    </div>
  `,
})
export class AiStrategistChatPanelComponent {
  @Input() thread: any[] = [];
  @Input() draft = "";
  @Input() loading = false;
  @Input() error = "";
  @Input() disabled = false;

  @Output() draftChange = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  get hasMessages(): boolean { return Array.isArray(this.thread) && this.thread.length > 0; }

  rootStyle = { display: "grid", gap: "12px" };
  headRowStyle = { display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  titleStyle = { fontSize: "13px", fontWeight: 900, color: T.ink, fontFamily: T.heading };
  leadStyle = { marginTop: "4px", fontSize: "12px", color: T.inkSoft, lineHeight: 1.5 };

  threadBoxStyle = {
    padding: "14px",
    borderRadius: "18px",
    background: T.surfaceStrong,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "10px",
    maxHeight: "360px",
    overflowY: "auto",
  };
  bubbleStyle(entry: any) {
    const isUser = entry?.role === "user";
    return {
      justifySelf: isUser ? "end" : "start",
      maxWidth: "84%",
      padding: "11px 12px",
      borderRadius: "16px",
      background: isUser ? T.accentSoft : T.bgSoft,
      border: `1px solid ${isUser ? "rgba(15, 143, 102, 0.16)" : T.line}`,
      display: "grid",
      gap: "6px",
    };
  }
  bubbleLabelStyle = { fontSize: "10px", color: T.inkMute, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 };
  bubbleTextStyle = { fontSize: "12px", color: T.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" };
  emptyStyle = { padding: "10px", fontSize: "12px", color: T.inkSoft, lineHeight: 1.55 };
  errorStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.coralSoft,
    border: "1px solid rgba(215, 93, 66, 0.16)",
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };
  composerStyle = { display: "grid", gap: "10px" };
  textareaStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: "16px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
    fontFamily: T.font,
    lineHeight: 1.55,
  };
  composerActionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  composerHintStyle = { fontSize: "11px", color: T.inkSoft };
}

// ─────────────────────────────────────────────────────────────────────
// AiStrategistPanel — high-level wrapper that combines the run button,
// "needs setup" guard, the output panel and the chat thread. Used by
// AccountStack, SearchTermsWorkbench, and ReportCenter.
// ─────────────────────────────────────────────────────────────────────
@Component({
  selector: "app-ai-strategist-panel",
  standalone: true,
  imports: [
    CommonModule, AppButtonComponent, ToneBadgeComponent,
    AiStrategyOutputComponent, AiStrategistChatPanelComponent,
  ],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="headRowStyle">
        <div>
          <div [ngStyle]="titleStyle">{{ title }}</div>
          <div [ngStyle]="leadStyle">{{ lead }}</div>
        </div>
        <app-tone-badge [tone]="cueTone">{{ cueLabel }}</app-tone-badge>
      </div>

      <ng-container *ngIf="!aiReady; else readyBlock">
        <div [ngStyle]="leadStyle">
          Add an Anthropic API key to enable Claude strategy. Once configured, AdPulse analyzes live structure, pacing, efficiency and goals before suggesting the next move.
        </div>
        <div *ngIf="canOpenConnections" [ngStyle]="actionRowStyle">
          <app-button (pressed)="openConnections.emit()">Open Connections</app-button>
        </div>
      </ng-container>

      <ng-template #readyBlock>
        <div *ngIf="state?.error && !state?.data" [ngStyle]="errorStyle">{{ state.error }}</div>

        <ng-container *ngIf="state?.data; else runCta">
          <app-ai-strategy-output [result]="state.data"></app-ai-strategy-output>
          <app-ai-strategist-chat-panel
            [thread]="chatThread"
            [draft]="chatDraft"
            [loading]="!!chatState?.loading"
            [error]="chatState?.error || ''"
            [disabled]="!aiReady || !state?.data"
            (draftChange)="chatDraftChange.emit($event)"
            (send)="sendChat.emit()"
            (clear)="clearChat.emit()"
          ></app-ai-strategist-chat-panel>
        </ng-container>
        <ng-template #runCta>
          <div [ngStyle]="leadStyle">{{ runHint }}</div>
        </ng-template>

        <div [ngStyle]="actionRowStyle">
          <app-button tone="primary" (pressed)="run.emit()" [disabled]="!!state?.loading">
            {{ state?.loading ? 'Running strategist...' : (state?.data ? (chatThread?.length ? 'Refresh with chat context' : 'Refresh analysis') : 'Run AI strategist') }}
          </app-button>
        </div>
      </ng-template>
    </div>
  `,
})
export class AiStrategistPanelComponent {
  @Input() title = "AI strategist";
  @Input() lead = "Model-backed strategy guidance for this client and date range.";
  @Input() runHint = "Run the strategist to interpret the current account structure, live performance, and channel mix for this period.";
  @Input() aiReady = false;
  @Input() canOpenConnections = false;
  @Input() state: any = { loading: false, error: "", data: null };
  @Input() chatThread: any[] = [];
  @Input() chatDraft = "";
  @Input() chatState: any = { loading: false, error: "" };

  @Output() run = new EventEmitter<void>();
  @Output() sendChat = new EventEmitter<void>();
  @Output() clearChat = new EventEmitter<void>();
  @Output() chatDraftChange = new EventEmitter<string>();
  @Output() openConnections = new EventEmitter<void>();

  get cueTone(): "danger" | "info" | "success" | "neutral" {
    if (this.state?.error) return "danger";
    if (this.state?.loading) return "info";
    if (this.state?.data) return "success";
    return "neutral";
  }
  get cueLabel(): string {
    if (!this.aiReady) return "Needs Claude key";
    if (this.state?.loading) return "Running strategist";
    if (this.state?.data) return "Strategy ready";
    return "Ready to analyze";
  }

  rootStyle = {
    padding: "16px",
    borderRadius: "20px",
    background: T.bgSoft,
    border: `1px solid ${T.line}`,
    display: "grid",
    gap: "12px",
  };
  headRowStyle = { display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" };
  titleStyle = { fontSize: "15px", fontWeight: 800, fontFamily: T.heading, color: T.ink };
  leadStyle = { marginTop: "4px", fontSize: "12px", color: T.inkSoft, lineHeight: 1.55 };
  actionRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
  errorStyle = {
    padding: "12px",
    borderRadius: "16px",
    background: T.coralSoft,
    border: "1px solid rgba(215, 93, 66, 0.16)",
    color: T.coral,
    fontSize: "12px",
    fontWeight: 700,
  };
}
