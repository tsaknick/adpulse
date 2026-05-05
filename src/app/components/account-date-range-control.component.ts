// AccountDateRangeControl — mirrors React function in adpulse-v5.jsx (lines 8036-8104).
import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  ACCOUNT_DATE_RANGE_OPTIONS,
  T,
  isValidAccountDateRange,
} from "../foundation/adpulse-foundation";

@Component({
  selector: "app-account-date-range-control",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngStyle]="rootStyle">
      <div>
        <div [ngStyle]="labelStyle">{{ label }}</div>
        <div [ngStyle]="hintStyle()">{{ hintText() }}</div>
      </div>

      <div [ngStyle]="rowStyle">
        <select
          [value]="value.preset"
          (change)="onPreset($any($event.target).value)"
          [ngStyle]="presetStyle"
        >
          <option *ngFor="let option of options" [value]="option.value">{{ option.label }}</option>
        </select>

        <ng-container *ngIf="value.preset === 'CUSTOM'">
          <input type="date" [value]="value.startDate" (input)="onStart($any($event.target).value)" [ngStyle]="inputStyle" />
          <input type="date" [value]="value.endDate" (input)="onEnd($any($event.target).value)" [ngStyle]="inputStyle" />
        </ng-container>
      </div>
    </div>
  `,
})
export class AccountDateRangeControlComponent {
  @Input() value: any = { preset: "THIS_MONTH", startDate: "", endDate: "" };
  @Input() label = "Account data range";
  @Output() valueChange = new EventEmitter<any>();

  options = ACCOUNT_DATE_RANGE_OPTIONS;

  rootStyle = {
    padding: "16px",
    borderRadius: "22px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  };
  labelStyle = {
    fontSize: "12px",
    color: T.inkMute,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  };
  rowStyle = { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" };
  inputStyle = {
    padding: "10px 12px",
    borderRadius: "14px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: T.font,
  };
  get presetStyle() {
    return { ...this.inputStyle, minWidth: "180px" };
  }

  hintStyle() {
    const valid = isValidAccountDateRange(this.value);
    return { marginTop: "4px", fontSize: "12px", color: valid ? T.inkSoft : T.coral };
  }

  hintText() {
    const value = this.value;
    if (value?.preset === "CUSTOM") {
      return isValidAccountDateRange(value)
        ? `${value.startDate} to ${value.endDate}`
        : "Choose a valid start and end date.";
    }
    const found = ACCOUNT_DATE_RANGE_OPTIONS.find((option) => option.value === value?.preset);
    return found?.label || "This month";
  }

  onPreset(next: string) {
    this.valueChange.emit({ ...this.value, preset: next });
  }
  onStart(next: string) {
    this.valueChange.emit({ ...this.value, startDate: next });
  }
  onEnd(next: string) {
    this.valueChange.emit({ ...this.value, endDate: next });
  }
}
