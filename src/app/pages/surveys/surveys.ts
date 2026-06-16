import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StateService } from '../../services/state.service';
import { AssetSurvey } from '../../models/api.models';

@Component({
  selector: 'app-surveys',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="surveys-page">
      <h2 class="page-title">Survey Reports</h2>

      @if (!surveys().length) {
        <div class="empty-state">
          <p>No survey data yet.</p>
          <a routerLink="/api-sync" class="link">Go to API Sync → Sync Assets</a>
        </div>
      } @else {
        <p class="count">{{ surveys().length }} survey report(s)</p>
        <div class="survey-list">
          @for (sv of surveys(); track sv.survey.id) {
            <div class="survey-card">
              <div class="survey-header">
                <span class="survey-object">{{ sv.survey.objectType }} — Object #{{ sv.survey.systemObjectId }}</span>
                <span class="survey-date">{{ formatDate(sv.survey.scanDate) }}</span>
              </div>
              <p class="survey-char">Scanned by {{ sv.survey.scanCharacter }}</p>

              @if (sv.survey.resources.length) {
                <div class="resource-table-wrap">
                  <table class="resource-table">
                    <thead>
                      <tr>
                        <th scope="col">Resource</th>
                        <th scope="col">Rarity</th>
                        <th scope="col">Abundance</th>
                        <th scope="col">Accessibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of sv.survey.resources; track r.resourceId) {
                        <tr>
                          <td class="td-name">{{ r.resourceName }}</td>
                          <td>
                            <span class="rarity-badge" [class]="'rarity-' + r.rarityClassification.toLowerCase()">
                              {{ r.rarityClassification }}
                            </span>
                          </td>
                          <td>{{ r.abundance }}</td>
                          <td>
                            <div class="acc-bar-track">
                              <div class="acc-bar-fill" [style.width.%]="r.accessibility * 100"></div>
                            </div>
                            <span class="acc-val">{{ (r.accessibility * 100) | number:'1.0-1' }}%</span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .surveys-page {
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

    .survey-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .survey-card {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .survey-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .survey-object {
      font-weight: 600;
      color: #e0e4f0;
    }

    .survey-date {
      font-size: 0.8rem;
      color: #6a708a;
    }

    .survey-char {
      font-size: 0.85rem;
      color: #8a90b0;
      margin: 0;
    }

    .resource-table-wrap {
      overflow-x: auto;
    }

    .resource-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;

      th, td {
        padding: 0.5rem 0.75rem;
        text-align: left;
        border-bottom: 1px solid #2a2a4a;
      }

      th {
        color: #6a708a;
        font-weight: 500;
        white-space: nowrap;
        background: #0f0f1a;
      }

      td {
        color: #c0c4d8;
        vertical-align: middle;
      }

      tr:last-child td { border-bottom: none; }
      tr:hover td { background: rgba(124, 140, 255, 0.04); }
    }

    .td-name {
      font-weight: 500;
      color: #e0e4f0;
      white-space: nowrap;
    }

    .rarity-badge {
      font-size: 0.75rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      background: #0f0f1a;
      border: 1px solid #2a2a4a;
    }

    .rarity-common    { border-color: #4a4a6a; color: #8a90b0; }
    .rarity-uncommon  { border-color: #4c8a4c; color: #7dcc7d; }
    .rarity-rare      { border-color: #4a7aaa; color: #7aafee; }
    .rarity-epic      { border-color: #7a4aaa; color: #c07aee; }
    .rarity-legendary { border-color: #aa7a2a; color: #eec07a; }

    .acc-bar-track {
      display: inline-block;
      width: 80px;
      height: 5px;
      background: #0f0f1a;
      border-radius: 3px;
      overflow: hidden;
      vertical-align: middle;
      margin-right: 0.4rem;
    }

    .acc-bar-fill {
      background: #4caf88;
      height: 100%;
      border-radius: 3px;
    }

    .acc-val {
      font-size: 0.8rem;
      color: #8a90b0;
    }
  `,
})
export class SurveysComponent {
  private readonly state = inject(StateService);

  readonly surveys = computed<AssetSurvey[]>(() => {
    const result: AssetSurvey[] = [];
    for (const loc of this.state.syncedData().assetLocations) {
      for (const sv of Object.values(loc.surveyDetails)) {
        result.push(sv);
      }
    }
    return result;
  });

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }
}
