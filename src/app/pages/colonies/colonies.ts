import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-colonies',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="colonies-page">
      <h2 class="page-title">Colonies</h2>

      @if (!colonies().length) {
        <div class="empty-state">
          <p>No colony data yet.</p>
          <a routerLink="/api-sync" class="link">Go to API Sync to fetch colonies</a>
        </div>
      } @else {
        <div class="colony-grid">
          @for (colony of colonies(); track colony.listItem.colonyId) {
            <div class="colony-card">
              <div class="colony-header">
                <span class="colony-name">{{ colony.listItem.colonyName }}</span>
                <span class="colony-system">{{ colony.listItem.systemName }}</span>
              </div>

              <div class="colony-meta">
                <span class="meta-item">Size {{ colony.listItem.colonySize }}</span>
                @if (colony.buildings) {
                  <span class="meta-item">{{ colony.buildings.buildings.length }} buildings</span>
                }
                @if (colony.warehouse) {
                  <span class="meta-item">
                    Warehouse {{ colony.warehouse.contents.length }} items
                  </span>
                }
              </div>

              @if (colony.workers?.workforceOverview; as wf) {
                <div class="workforce-row">
                  <span class="wf-label">Blue collar</span>
                  <span>{{ wf.blueCollarAllocated }} / {{ wf.blueCollarAllocated + wf.blueCollarUnallocated }}</span>
                  <span class="wf-label">White collar</span>
                  <span>{{ wf.whiteCollarAllocated }} / {{ wf.whiteCollarAllocated + wf.whiteCollarUnallocated }}</span>
                </div>
              }

              @if (colony.buildings?.colonyCapacities; as cap) {
                <div class="capacities">
                  <div class="cap-bar">
                    <span class="cap-label">Power</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [style.width.%]="cap.powerGenerated > 0 ? (cap.powerDraw / cap.powerGenerated) * 100 : 100"
                        [class.bar-warn]="cap.powerDraw > cap.powerGenerated"
                      ></div>
                    </div>
                    <span class="cap-val">{{ cap.powerDraw | number:'1.0-1' }} / {{ cap.powerGenerated }}</span>
                  </div>
                  <div class="cap-bar">
                    <span class="cap-label">Warehouse</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [style.width.%]="cap.warehouseCapacity > 0 ? (cap.warehouseUsed / cap.warehouseCapacity) * 100 : 0"
                        [class.bar-warn]="cap.warehouseUsed >= cap.warehouseCapacity"
                      ></div>
                    </div>
                    <span class="cap-val">{{ cap.warehouseUsed }} / {{ cap.warehouseCapacity }}</span>
                  </div>
                </div>
              }

              @if (colony.listItem.workerCurrentAttitude !== undefined) {
                <div class="attitude">
                  <span class="att-label">Worker attitude</span>
                  <span class="att-value" [class.att-pos]="colony.listItem.workerCurrentAttitude >= 0">
                    {{ colony.listItem.workerCurrentAttitude >= 0 ? '+' : '' }}{{ colony.listItem.workerCurrentAttitude }}
                  </span>
                </div>
              }

              @if (colony.summary?.notices?.length) {
                <details class="notices">
                  <summary>{{ colony.summary!.notices.length }} notice(s)</summary>
                  <ul>
                    @for (n of colony.summary!.notices; track n.noticeDt) {
                      <li>{{ n.noticeText }}</li>
                    }
                  </ul>
                </details>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .colonies-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #e0e4f0;
      margin: 0;
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

    .colony-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }

    .colony-card {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .colony-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
    }

    .colony-name {
      font-weight: 600;
      color: #e0e4f0;
      font-size: 1rem;
    }

    .colony-system {
      font-size: 0.8rem;
      color: #6a708a;
    }

    .colony-meta {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .meta-item {
      font-size: 0.8rem;
      color: #8a90b0;
      background: #0f0f1a;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .workforce-row {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      gap: 0.4rem 0.75rem;
      font-size: 0.8rem;
      align-items: center;
    }

    .wf-label {
      color: #6a708a;
    }

    .capacities {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .cap-bar {
      display: grid;
      grid-template-columns: 70px 1fr 80px;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
    }

    .cap-label {
      color: #6a708a;
      text-align: right;
    }

    .bar-track {
      background: #0f0f1a;
      border-radius: 3px;
      height: 5px;
      overflow: hidden;
    }

    .bar-fill {
      background: #7c8cff;
      height: 100%;
      border-radius: 3px;
      max-width: 100%;
      transition: width 0.3s;
    }

    .bar-warn {
      background: #ff6b6b;
    }

    .cap-val {
      color: #8a90b0;
      font-size: 0.75rem;
    }

    .attitude {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .att-label { color: #6a708a; }
    .att-value { color: #ff6b6b; font-weight: 600; }
    .att-pos { color: #4caf88; }

    .notices {
      font-size: 0.8rem;

      summary {
        cursor: pointer;
        color: #7c8cff;
        user-select: none;
      }

      ul {
        margin: 0.4rem 0 0;
        padding-left: 1.25rem;
        color: #8a90b0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
    }
  `,
})
export class ColoniesComponent {
  private readonly state = inject(StateService);
  readonly colonies = computed(() => this.state.syncedData().colonies);
}
