// FiltersBar — mirrors React FiltersBar (lines 7924-8034 of adpulse-v5.jsx).
import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CATEGORIES, T } from "../foundation/adpulse-foundation";
import { AppButtonComponent } from "./primitives";

@Component({
  selector: "app-filters-bar",
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  template: `
    <div [ngStyle]="rootStyle">
      <div [ngStyle]="rowOneStyle">
        <div [ngStyle]="searchWrapStyle">
          <input
            [value]="search"
            (input)="searchChange.emit($any($event.target).value)"
            placeholder="Search client, target or reporting group"
            [ngStyle]="searchInputStyle"
          />
        </div>
        <select
          [value]="sortBy"
          (change)="sortByChange.emit($any($event.target).value)"
          [ngStyle]="sortStyle"
        >
          <option value="priority">Sort: Priority</option>
          <option value="spend">Sort: Spend</option>
          <option value="budget">Sort: Budget</option>
          <option value="roas">Sort: ROAS</option>
          <option value="name">Sort: Name</option>
        </select>
        <div *ngIf="showModeToggle" [ngStyle]="toggleRowStyle">
          <app-button [active]="overviewMode === 'grid'" (pressed)="overviewModeChange.emit('grid')">Grid</app-button>
          <app-button [active]="overviewMode === 'list'" (pressed)="overviewModeChange.emit('list')">List</app-button>
        </div>
        <app-button
          *ngIf="showGroupingToggle"
          [active]="groupByReporting"
          (pressed)="groupByReportingChange.emit(!groupByReporting)"
        >Reporting groups</app-button>
      </div>

      <div [ngStyle]="rowTwoStyle">
        <div [ngStyle]="toggleRowStyle">
          <app-button
            *ngFor="let item of statusOptions"
            [active]="statusFilter === item.key"
            (pressed)="statusFilterChange.emit(item.key)"
          >{{ item.label }}</app-button>
        </div>
        <div [ngStyle]="toggleRowStyle">
          <app-button
            [active]="categoryFilter === 'all'"
            (pressed)="categoryFilterChange.emit('all')"
          >All categories</app-button>
          <app-button
            *ngFor="let category of categories"
            [active]="categoryFilter === category.key"
            (pressed)="categoryFilterChange.emit(category.key)"
          >{{ category.label }}</app-button>
        </div>
        <div [ngStyle]="countStyle">{{ count }} clients in view</div>
      </div>
    </div>
  `,
})
export class FiltersBarComponent {
  @Input() search = "";
  @Input() statusFilter = "all";
  @Input() categoryFilter = "all";
  @Input() sortBy = "priority";
  @Input() overviewMode: "grid" | "list" = "grid";
  @Input() showModeToggle = false;
  @Input() showGroupingToggle = false;
  @Input() groupByReporting = false;
  @Input() count = 0;

  @Output() searchChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<string>();
  @Output() categoryFilterChange = new EventEmitter<string>();
  @Output() sortByChange = new EventEmitter<string>();
  @Output() overviewModeChange = new EventEmitter<string>();
  @Output() groupByReportingChange = new EventEmitter<boolean>();

  categories = CATEGORIES;
  statusOptions = [
    { key: "all", label: "All clients" },
    { key: "red", label: "Red only" },
    { key: "green", label: "Green only" },
  ];

  rootStyle = {
    padding: "18px",
    borderRadius: "22px",
    background: T.surface,
    border: `1px solid ${T.line}`,
    boxShadow: T.shadow,
    display: "grid",
    gap: "14px",
  };
  rowOneStyle = { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" };
  rowTwoStyle = {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
  };
  searchWrapStyle = { position: "relative", flex: "1 1 260px" };
  searchInputStyle = {
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
  sortStyle = {
    width: "100%",
    maxWidth: "220px",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: "16px",
    border: `1px solid ${T.line}`,
    background: T.surfaceStrong,
    color: T.ink,
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: T.font,
    cursor: "pointer",
  };
  toggleRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  countStyle = { fontSize: "12px", color: T.inkSoft, fontWeight: 700 };
}
