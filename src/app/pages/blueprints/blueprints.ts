import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StateService } from '../../services/state.service';
import { AssetBlueprint } from '../../models/api.models';

@Component({
  selector: 'app-blueprints',
  imports: [RouterLink],
  template: `
    <div class="blueprints-page">
      <h2 class="page-title">Blueprints</h2>

      @if (!blueprints().length) {
        <div class="empty-state">
          <p>No blueprint data yet.</p>
          <a routerLink="/api-sync" class="link">Go to API Sync → Sync Assets</a>
        </div>
      } @else {
        <p class="count">{{ blueprints().length }} blueprint(s)</p>
        <div class="bp-table-wrap">
          <table class="bp-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Evo</th>
                <th scope="col">Mfg time</th>
                <th scope="col">Output</th>
                <th scope="col">Resources required</th>
              </tr>
            </thead>
            <tbody>
              @for (bp of blueprints(); track bp.blueprint.id) {
                <tr>
                  <td class="td-name">{{ bp.blueprint.name }}</td>
                  <td>{{ bp.blueprint.type }}</td>
                  <td>{{ bp.blueprint.evolution }}</td>
                  <td>{{ formatTime(bp.blueprint.manufactureTime) }}</td>
                  <td>× {{ bp.blueprint.manufactureAmount }}</td>
                  <td class="td-resources">
                    @for (r of bp.resourcesRequired; track r.resourceId) {
                      <span class="resource-chip" [class]="'rarity-' + r.rarityClassification.toLowerCase()">
                        {{ r.resourceName }} ×{{ r.resourceAmount }}
                      </span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .blueprints-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #e0e4f0;
      margin: 0;
    }

    .count {
      font-size: 0.85rem;
      color: #6a708a;
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

    .bp-table-wrap {
      overflow-x: auto;
    }

    .bp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      th, td {
        padding: 0.6rem 0.875rem;
        text-align: left;
        border-bottom: 1px solid #2a2a4a;
      }

      th {
        color: #6a708a;
        font-weight: 500;
        white-space: nowrap;
        background: #1a1a2e;
        position: sticky;
        top: 0;
      }

      td {
        color: #c0c4d8;
        vertical-align: top;
      }

      tr:hover td {
        background: rgba(124, 140, 255, 0.05);
      }
    }

    .td-name {
      font-weight: 500;
      color: #e0e4f0;
      white-space: nowrap;
    }

    .td-resources {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }

    .resource-chip {
      font-size: 0.75rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      background: #0f0f1a;
      border: 1px solid #2a2a4a;
      white-space: nowrap;
    }

    .rarity-common    { border-color: #4a4a6a; }
    .rarity-uncommon  { border-color: #4c8a4c; color: #7dcc7d; }
    .rarity-rare      { border-color: #4a7aaa; color: #7aafee; }
    .rarity-epic      { border-color: #7a4aaa; color: #c07aee; }
    .rarity-legendary { border-color: #aa7a2a; color: #eec07a; }
  `,
})
export class BlueprintsComponent {
  private readonly state = inject(StateService);

  readonly blueprints = computed<AssetBlueprint[]>(() => {
    const bps: AssetBlueprint[] = [];
    for (const loc of this.state.syncedData().assetLocations) {
      for (const bp of Object.values(loc.blueprintDetails)) {
        bps.push(bp);
      }
    }
    return bps;
  });

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
