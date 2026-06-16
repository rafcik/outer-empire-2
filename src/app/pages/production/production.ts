import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssetBlueprint } from '../../models/api.models';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-production',
  imports: [RouterLink],
  template: `
    <div class="production-page">
      <h2 class="page-title">Production</h2>

      @if (!allColonies().length) {
        <div class="empty-state">
          <p>No colony data yet.</p>
          <a routerLink="/api-sync" class="link">Go to API Sync to fetch colonies</a>
        </div>
      } @else {

        <div class="toolbar">
          <label for="planet-select" class="sr-only">Add planet to production plan</label>
          <select
            id="planet-select"
            class="planet-select"
            [disabled]="!availableColonies().length"
            (change)="onPlanetSelect($event)"
          >
            <option value="">
              {{ availableColonies().length ? '+ Add planet…' : 'All colonies added' }}
            </option>
            @for (c of availableColonies(); track c.listItem.colonyId) {
              <option [value]="c.listItem.colonyId">
                {{ c.listItem.colonyName }} ({{ c.listItem.systemName }})
              </option>
            }
          </select>
        </div>

        @if (!planWithData().length) {
          <p class="hint">Select a planet above to start planning production.</p>
        }

        @for (entry of planWithData(); track entry.planet.colonyId) {
          <div class="planet-card">
            <div class="planet-header">
              <div class="planet-title">
                <span class="planet-name">{{ entry.colony?.listItem?.colonyName ?? 'Unknown colony #' + entry.planet.colonyId }}</span>
                <span class="planet-sys">{{ entry.colony?.listItem?.systemName }}</span>
              </div>
              <button
                class="btn-icon btn-danger-icon"
                (click)="removePlanet(entry.planet.colonyId)"
                aria-label="Remove planet from plan"
              >✕</button>
            </div>

            @if (entry.queueWithResources.length) {
              <div class="queue">
                @for (qi of entry.queueWithResources; track $index) {
                  <div class="queue-item">
                    <div class="qi-header">
                      <span class="qi-name">{{ qi.bpName }}</span>
                      <span class="qi-qty">× {{ qi.item.quantity }}</span>
                      <button
                        class="btn-icon btn-danger-icon btn-sm-icon"
                        (click)="removeQueueItem(entry.planet.colonyId, $index)"
                        [attr.aria-label]="'Remove ' + qi.bpName + ' from queue'"
                      >✕</button>
                    </div>
                    @if (qi.resources.length) {
                      <div class="resources-grid">
                        <span class="rg-header">Resource</span>
                        <span class="rg-header rg-right">Per unit</span>
                        <span class="rg-header rg-right">Total</span>
                        <span class="rg-header rg-right">On planet</span>
                        <span class="rg-header rg-right">Missing</span>
                        @for (r of qi.resources; track r.resourceId) {
                          <span class="rg-name">{{ r.resourceName }}</span>
                          <span class="rg-right">{{ r.perUnit }}</span>
                          <span class="rg-right">{{ r.total }}</span>
                          <span class="rg-right">{{ r.onPlanet }}</span>
                          <span class="rg-right" [class.missing-val]="r.missing > 0">
                            {{ r.missing > 0 ? r.missing : '—' }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            @if (addingToPlanetId() === entry.planet.colonyId) {
              <div class="add-panel">
                <input
                  type="text"
                  class="filter-input"
                  placeholder="Filter blueprints…"
                  [value]="blueprintFilter()"
                  (input)="blueprintFilter.set($any($event.target).value)"
                  aria-label="Filter blueprints"
                  autofocus
                />
                <div class="bp-list" role="listbox" aria-label="Select blueprint">
                  @if (!filteredBlueprints().length) {
                    <p class="no-results">No blueprints match.</p>
                  }
                  @for (bp of filteredBlueprints(); track bp.blueprint.id) {
                    <button
                      class="bp-option"
                      [class.bp-selected]="selectedBpId() === bp.blueprint.id"
                      [class.bp-in-queue]="entry.inQueueBpIds.has(bp.blueprint.id)"
                      (click)="selectedBpId.set(bp.blueprint.id)"
                      role="option"
                      [attr.aria-selected]="selectedBpId() === bp.blueprint.id"
                    >
                      <span class="bp-opt-name">{{ bp.blueprint.name }}</span>
                      <span class="bp-opt-type">{{ bp.blueprint.type }}</span>
                      @if (entry.inQueueBpIds.has(bp.blueprint.id)) {
                        <span class="bp-in-queue-badge">in queue</span>
                      }
                    </button>
                  }
                </div>
                <div class="add-actions">
                  <label [for]="'qty-' + entry.planet.colonyId" class="qty-label">Quantity:</label>
                  <input
                    [id]="'qty-' + entry.planet.colonyId"
                    type="number"
                    min="1"
                    class="qty-input"
                    [value]="addQty()"
                    (input)="onQtyInput($event)"
                  />
                  <button
                    class="btn btn-primary"
                    [disabled]="!selectedBpId()"
                    (click)="confirmAddItem(entry.planet.colonyId)"
                  >Add to queue</button>
                  <button class="btn" (click)="cancelAddItem()">Cancel</button>
                </div>
              </div>
            } @else {
              <button class="btn btn-add-item" (click)="startAddItem(entry.planet.colonyId)">
                + Add item to queue
              </button>
            }
          </div>
        }

        @if (globalSummary().length) {
          <div class="global-summary">
            <h3 class="section-title">All resources needed</h3>
            <div class="summary-grid">
              <span class="sg-header">Resource</span>
              <span class="sg-header sg-right">Total needed</span>
              <span class="sg-header sg-right">Total on hand</span>
              <span class="sg-header sg-right">Missing</span>
              @for (r of globalSummary(); track r.resourceId) {
                <span class="sg-name">{{ r.resourceName }}</span>
                <span class="sg-right">{{ r.totalNeeded }}</span>
                <span class="sg-right">{{ r.totalOnHand }}</span>
                <span class="sg-right" [class.missing-val]="r.totalMissing > 0">
                  {{ r.totalMissing > 0 ? r.totalMissing : '—' }}
                </span>
              }
            </div>
          </div>
        }

      }
    </div>
  `,
  styles: `
    .production-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #e0e4f0;
      margin: 0;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6a708a;
    }

    .link {
      color: #7c8cff;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .hint {
      color: #6a708a;
      font-size: 0.875rem;
      margin: 0;
    }

    /* toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .planet-select {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      color: #c0c4d8;
      padding: 0.45rem 0.75rem;
      font-size: 0.875rem;
      cursor: pointer;
      min-width: 260px;

      &:disabled {
        opacity: 0.5;
        cursor: default;
      }

      &:focus {
        outline: 2px solid #7c8cff;
        outline-offset: 2px;
      }
    }

    /* planet card */
    .planet-card {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .planet-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .planet-title {
      flex: 1;
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
    }

    .planet-name {
      font-weight: 600;
      font-size: 1rem;
      color: #e0e4f0;
    }

    .planet-sys {
      font-size: 0.8rem;
      color: #6a708a;
    }

    /* icon buttons */
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.4rem;
      border-radius: 4px;
      font-size: 0.9rem;
      line-height: 1;
      transition: background 0.15s;
    }

    .btn-danger-icon {
      color: #ff6b6b;
      &:hover { background: rgba(255, 107, 107, 0.15); }
      &:focus { outline: 2px solid #ff6b6b; outline-offset: 2px; }
    }

    .btn-sm-icon {
      font-size: 0.75rem;
      padding: 0.15rem 0.3rem;
    }

    /* queue */
    .queue {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .queue-item {
      background: #0f0f1a;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      padding: 0.6rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .qi-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .qi-name {
      flex: 1;
      font-weight: 500;
      color: #e0e4f0;
      font-size: 0.9rem;
    }

    .qi-qty {
      font-size: 0.85rem;
      color: #7c8cff;
      font-weight: 600;
    }

    /* resources grid: 5 columns */
    .resources-grid {
      display: grid;
      grid-template-columns: 1fr repeat(4, 90px);
      gap: 0.2rem 0.5rem;
      font-size: 0.8rem;
    }

    .rg-header {
      color: #6a708a;
      font-size: 0.75rem;
      font-weight: 500;
      padding-bottom: 0.2rem;
      border-bottom: 1px solid #2a2a4a;
    }

    .rg-right { text-align: right; }

    .rg-name {
      color: #c0c4d8;
    }

    .resources-grid span:not(.rg-header):not(.rg-name) {
      color: #8a90b0;
      text-align: right;
    }

    .missing-val {
      color: #ff6b6b !important;
      font-weight: 600;
    }

    /* add panel */
    .add-panel {
      background: #0f0f1a;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-input {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 5px;
      color: #c0c4d8;
      padding: 0.4rem 0.6rem;
      font-size: 0.875rem;
      width: 100%;
      box-sizing: border-box;

      &:focus {
        outline: 2px solid #7c8cff;
        outline-offset: 2px;
      }

      &::placeholder { color: #4a4a6a; }
    }

    .bp-list {
      max-height: 220px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border: 1px solid #2a2a4a;
      border-radius: 5px;
      padding: 0.25rem;
      background: #1a1a2e;
    }

    .no-results {
      color: #6a708a;
      font-size: 0.8rem;
      text-align: center;
      padding: 0.5rem;
      margin: 0;
    }

    .bp-option {
      background: none;
      border: none;
      border-radius: 4px;
      padding: 0.35rem 0.5rem;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #c0c4d8;
      transition: background 0.1s;

      &:hover { background: rgba(124, 140, 255, 0.1); }
      &:focus { outline: 2px solid #7c8cff; outline-offset: 1px; }
    }

    .bp-selected {
      background: rgba(124, 140, 255, 0.2) !important;
      color: #e0e4f0;
    }

    .bp-in-queue {
      opacity: 0.65;
    }

    .bp-opt-name {
      flex: 1;
      font-weight: 500;
    }

    .bp-opt-type {
      font-size: 0.75rem;
      color: #6a708a;
    }

    .bp-in-queue-badge {
      font-size: 0.7rem;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      background: #2a2a4a;
      color: #6a708a;
    }

    .add-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .qty-label {
      font-size: 0.85rem;
      color: #8a90b0;
    }

    .qty-input {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 5px;
      color: #c0c4d8;
      padding: 0.35rem 0.5rem;
      font-size: 0.875rem;
      width: 70px;

      &:focus {
        outline: 2px solid #7c8cff;
        outline-offset: 2px;
      }
    }

    /* buttons */
    .btn {
      padding: 0.4rem 0.875rem;
      border-radius: 5px;
      font-size: 0.875rem;
      cursor: pointer;
      border: 1px solid #2a2a4a;
      background: #1a1a2e;
      color: #c0c4d8;
      transition: background 0.15s, border-color 0.15s;

      &:hover { background: #242440; border-color: #3a3a6a; }
      &:focus { outline: 2px solid #7c8cff; outline-offset: 2px; }
      &:disabled { opacity: 0.4; cursor: default; }
    }

    .btn-primary {
      background: #7c8cff;
      border-color: #7c8cff;
      color: #0f0f1a;
      font-weight: 600;

      &:hover:not(:disabled) { background: #9aaaf8; border-color: #9aaaf8; }
    }

    .btn-add-item {
      align-self: flex-start;
      font-size: 0.85rem;
      color: #7c8cff;
      border-color: #7c8cff;

      &:hover { background: rgba(124, 140, 255, 0.1); }
    }

    /* global summary */
    .global-summary {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #e0e4f0;
      margin: 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr repeat(3, 110px);
      gap: 0.25rem 0.5rem;
      font-size: 0.85rem;
    }

    .sg-header {
      color: #6a708a;
      font-size: 0.75rem;
      font-weight: 500;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid #2a2a4a;
    }

    .sg-right { text-align: right; }

    .sg-name {
      color: #c0c4d8;
    }

    .summary-grid span:not(.sg-header):not(.sg-name) {
      color: #8a90b0;
      text-align: right;
    }
  `,
})
export class ProductionComponent {
  private readonly state = inject(StateService);

  readonly addingToPlanetId = signal<number | null>(null);
  readonly blueprintFilter = signal('');
  readonly selectedBpId = signal<number | null>(null);
  readonly addQty = signal(1);

  readonly allColonies = computed(() => this.state.syncedData().colonies);

  readonly allBlueprintsMap = computed(() => {
    const map = new Map<number, AssetBlueprint>();
    for (const loc of this.state.syncedData().assetLocations) {
      for (const bp of Object.values(loc.blueprintDetails)) {
        map.set(bp.blueprint.id, bp);
      }
    }
    return map;
  });

  readonly warehouseMap = computed(() => {
    const map = new Map<number, Map<number, number>>();
    for (const c of this.allColonies()) {
      if (c.warehouse) {
        const rMap = new Map<number, number>();
        for (const item of c.warehouse.contents) {
          rMap.set(item.typeId, (rMap.get(item.typeId) ?? 0) + item.amount);
        }
        map.set(c.listItem.colonyId, rMap);
      }
    }
    return map;
  });

  readonly availableColonies = computed(() => {
    const usedIds = new Set(this.state.productionPlan().planets.map(p => p.colonyId));
    return this.allColonies().filter(c => !usedIds.has(c.listItem.colonyId));
  });

  readonly planWithData = computed(() => {
    const bpMap = this.allBlueprintsMap();
    const wMap = this.warehouseMap();
    const colonies = this.allColonies();

    return this.state.productionPlan().planets.map(planet => {
      const colony = colonies.find(c => c.listItem.colonyId === planet.colonyId);
      const warehouse = wMap.get(planet.colonyId) ?? new Map<number, number>();

      return {
        planet,
        colony,
        inQueueBpIds: new Set(planet.queue.map(q => q.blueprintId)),
        queueWithResources: planet.queue.map(item => {
          const bp = bpMap.get(item.blueprintId);
          return {
            item,
            bpName: bp?.blueprint.name ?? `Unknown blueprint #${item.blueprintId}`,
            resources: bp
              ? bp.resourcesRequired.map(r => ({
                  resourceId: r.resourceId,
                  resourceName: r.resourceName,
                  perUnit: r.resourceAmount,
                  total: r.resourceAmount * item.quantity,
                  onPlanet: warehouse.get(r.resourceId) ?? 0,
                  missing: Math.max(
                    0,
                    r.resourceAmount * item.quantity - (warehouse.get(r.resourceId) ?? 0),
                  ),
                }))
              : [],
          };
        }),
      };
    });
  });

  readonly filteredBlueprints = computed(() => {
    const filter = this.blueprintFilter().toLowerCase().trim();
    const bps = Array.from(this.allBlueprintsMap().values());
    if (!filter) return bps;
    return bps.filter(bp => bp.blueprint.name.toLowerCase().includes(filter));
  });

  readonly globalSummary = computed(() => {
    const bpMap = this.allBlueprintsMap();
    const wMap = this.warehouseMap();
    const plan = this.state.productionPlan();

    const summary = new Map<
      number,
      { resourceId: number; resourceName: string; totalNeeded: number; totalOnHand: number; totalMissing: number }
    >();

    for (const planet of plan.planets) {
      for (const item of planet.queue) {
        const bp = bpMap.get(item.blueprintId);
        if (!bp) continue;
        for (const r of bp.resourcesRequired) {
          const entry = summary.get(r.resourceId) ?? {
            resourceId: r.resourceId,
            resourceName: r.resourceName,
            totalNeeded: 0,
            totalOnHand: 0,
            totalMissing: 0,
          };
          entry.totalNeeded += r.resourceAmount * item.quantity;
          summary.set(r.resourceId, entry);
        }
      }
    }

    for (const planet of plan.planets) {
      const warehouse = wMap.get(planet.colonyId) ?? new Map<number, number>();
      for (const entry of summary.values()) {
        entry.totalOnHand += warehouse.get(entry.resourceId) ?? 0;
      }
    }

    for (const entry of summary.values()) {
      entry.totalMissing = Math.max(0, entry.totalNeeded - entry.totalOnHand);
    }

    return Array.from(summary.values()).sort((a, b) => b.totalMissing - a.totalMissing);
  });

  onPlanetSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const id = +select.value;
    if (!id) return;
    const current = this.state.productionPlan();
    if (current.planets.some(p => p.colonyId === id)) return;
    this.state.setProductionPlan({
      planets: [...current.planets, { colonyId: id, queue: [] }],
    });
    select.value = '';
  }

  removePlanet(colonyId: number): void {
    if (this.addingToPlanetId() === colonyId) this.cancelAddItem();
    const current = this.state.productionPlan();
    this.state.setProductionPlan({
      planets: current.planets.filter(p => p.colonyId !== colonyId),
    });
  }

  startAddItem(colonyId: number): void {
    this.addingToPlanetId.set(colonyId);
    this.blueprintFilter.set('');
    this.selectedBpId.set(null);
    this.addQty.set(1);
  }

  cancelAddItem(): void {
    this.addingToPlanetId.set(null);
    this.blueprintFilter.set('');
    this.selectedBpId.set(null);
    this.addQty.set(1);
  }

  confirmAddItem(colonyId: number): void {
    const bpId = this.selectedBpId();
    const qty = this.addQty();
    if (!bpId || qty < 1) return;
    const current = this.state.productionPlan();
    this.state.setProductionPlan({
      planets: current.planets.map(p =>
        p.colonyId !== colonyId ? p : { ...p, queue: [...p.queue, { blueprintId: bpId, quantity: qty }] },
      ),
    });
    this.cancelAddItem();
  }

  removeQueueItem(colonyId: number, index: number): void {
    const current = this.state.productionPlan();
    this.state.setProductionPlan({
      planets: current.planets.map(p =>
        p.colonyId !== colonyId ? p : { ...p, queue: p.queue.filter((_, i) => i !== index) },
      ),
    });
  }

  onQtyInput(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    this.addQty.set(val > 0 ? val : 1);
  }
}
