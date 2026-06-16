import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, map } from 'rxjs';
import {
  AssetBlueprint,
  AssetCrateContents,
  AssetLocation,
  AssetLocationDetail,
  AssetLocationWithDetail,
  AssetSurvey,
  ColonyBuildings,
  ColonyFullData,
  ColonyListItem,
  ColonySummary,
  ColonyWarehouse,
  ColonyWorkers,
  ServiceResponse,
  SyncProgress,
  TokenResponse,
} from '../models/api.models';
import { StateService } from './state.service';

const PROXY = 'https://outer-empire-2.pasiut11.workers.dev';

// 1.1 s between calls keeps us safely under the 60 req / 60 s account limit
const INTER_CALL_DELAY_MS = 1100;
const MAX_RETRIES = 4;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly state = inject(StateService);

  // ── Auth ──────────────────────────────────────────────────────────────────

  authenticate(clientId: string, secret: string): Observable<TokenResponse> {
    return this.http
      .post<ServiceResponse<TokenResponse>>(`${PROXY}/v1/auth/token`, {
        clientId,
        secret,
        grantType: 'client_credentials',
      })
      .pipe(
        map((r) => {
          if (!r.success) throw new Error(r.returnString);
          return r.data;
        }),
      );
  }

  // ── Single-resource getters (public for ad-hoc use) ───────────────────────

  getColonyList(): Observable<ColonyListItem[]> {
    return this.get<{ colonies: ColonyListItem[] }>('/v1/colonies').pipe(
      map((d) => d.colonies),
    );
  }

  getColonySummary(id: number): Observable<ColonySummary> {
    return this.get<ColonySummary>(`/v1/colonies/${id}`);
  }

  getColonyBuildings(id: number): Observable<ColonyBuildings> {
    return this.get<ColonyBuildings>(`/v1/colonies/${id}/buildings`);
  }

  getColonyWarehouse(id: number): Observable<ColonyWarehouse> {
    return this.get<ColonyWarehouse>(`/v1/colonies/${id}/warehouse`);
  }

  getColonyWorkers(id: number): Observable<ColonyWorkers> {
    return this.get<ColonyWorkers>(`/v1/colonies/${id}/workers`);
  }

  getAssetLocations(): Observable<AssetLocation[]> {
    return this.get<{ locations: AssetLocation[] }>('/v1/assets/locations').pipe(
      map((d) => d.locations),
    );
  }

  getAssetLocationDetail(locationId: number, locationType: string): Observable<AssetLocationDetail> {
    return this.get<AssetLocationDetail>(
      `/v1/assets/locations/${locationId}?locationType=${encodeURIComponent(locationType)}`,
    );
  }

  getAssetBlueprint(blueprintId: number): Observable<AssetBlueprint> {
    return this.get<AssetBlueprint>(`/v1/assets/blueprints/${blueprintId}`);
  }

  getAssetSurvey(surveyId: number): Observable<AssetSurvey> {
    return this.get<AssetSurvey>(`/v1/assets/surveys/${surveyId}`);
  }

  getAssetCrate(crateId: number): Observable<AssetCrateContents> {
    return this.get<AssetCrateContents>(`/v1/assets/crates/${crateId}`);
  }

  // ── High-level sync ───────────────────────────────────────────────────────

  syncColonies(): Observable<SyncProgress> {
    const progress$ = new Subject<SyncProgress>();
    const emit = (phase: string, done: number, total: number, log?: string) =>
      progress$.next({ phase, done, total, log });

    const run = async (): Promise<void> => {
      emit('Fetching colony list…', 0, 0, 'Fetching colony list…');
      const list = await this.fetch<{ colonies: ColonyListItem[] }>('/v1/colonies',
        (msg) => emit('Fetching colony list…', 0, 0, msg),
      ).then((d) => d.colonies);

      const total = list.length;
      emit('Colony list loaded', 0, total, `Found ${total} coloni${total === 1 ? 'y' : 'es'}`);

      const colonies: ColonyFullData[] = [];

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const label = item.colonyName;
        emit(`Syncing: ${label}`, i, total, `\n→ ${label} (${item.systemName})`);

        const log = (msg: string) => emit(`Syncing: ${label}`, i, total, msg);

        const summary = await this.fetchOptional<ColonySummary>(
          `/v1/colonies/${item.colonyId}`, 'summary', log,
        );
        const buildings = await this.fetchOptional<ColonyBuildings>(
          `/v1/colonies/${item.colonyId}/buildings`, 'buildings', log,
        );
        const warehouse = await this.fetchOptional<ColonyWarehouse>(
          `/v1/colonies/${item.colonyId}/warehouse`, 'warehouse', log,
        );
        const workers = await this.fetchOptional<ColonyWorkers>(
          `/v1/colonies/${item.colonyId}/workers`, 'workers', log,
        );

        colonies.push({ listItem: item, summary, buildings, warehouse, workers });
        emit(`Syncing: ${label}`, i + 1, total);
      }

      const current = this.state.syncedData();
      this.state.setSyncedData({ ...current, lastSynced: new Date().toISOString(), colonies });

      emit('Done', total, total, `\n✓ Colony sync complete (${total} colonies)`);
      progress$.complete();
    };

    run().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      progress$.next({ phase: 'Error', done: 0, total: 0, error: msg, log: `\n✗ Error: ${msg}` });
      progress$.complete();
    });

    return progress$.asObservable();
  }

  syncAssets(): Observable<SyncProgress> {
    const progress$ = new Subject<SyncProgress>();
    const emit = (phase: string, done: number, total: number, log?: string) =>
      progress$.next({ phase, done, total, log });

    const run = async (): Promise<void> => {
      emit('Fetching asset locations…', 0, 0, 'Fetching asset locations…');
      const locations = await this.fetch<{ locations: AssetLocation[] }>('/v1/assets/locations',
        (msg) => emit('Fetching asset locations…', 0, 0, msg),
      ).then((d) => d.locations);

      const total = locations.length;
      emit('Locations loaded', 0, total, `Found ${total} location${total === 1 ? '' : 's'}`);

      const assetLocations: AssetLocationWithDetail[] = [];

      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        const label = `${loc.locationName} (${loc.systemName})`;
        emit(`Syncing assets at: ${loc.locationName}`, i, total, `\n→ ${label}`);

        const log = (msg: string) => emit(`Syncing assets at: ${loc.locationName}`, i, total, msg);

        const detail = await this.fetchOptional<AssetLocationDetail>(
          `/v1/assets/locations/${loc.locationId}?locationType=${encodeURIComponent(loc.locationType)}`,
          'location detail', log,
        );

        const crateContents: Record<number, AssetCrateContents> = {};
        const blueprintDetails: Record<number, AssetBlueprint> = {};
        const surveyDetails: Record<number, AssetSurvey> = {};

        if (detail) {
          for (const item of detail.cargo) {
            if (item.typeC === 'Bp') {
              const bp = await this.fetchOptional<AssetBlueprint>(
                `/v1/assets/blueprints/${item.id}`,
                `blueprint "${item.resourceName}"`, log,
              );
              if (bp) blueprintDetails[item.id] = bp;
            } else if (item.typeC === 'Sc') {
              const sv = await this.fetchOptional<AssetSurvey>(
                `/v1/assets/surveys/${item.id}`,
                `survey "${item.resourceName}"`, log,
              );
              if (sv) surveyDetails[item.id] = sv;
            } else if (item.typeC === 'Cr') {
              const cr = await this.fetchOptional<AssetCrateContents>(
                `/v1/assets/crates/${item.id}`,
                `crate "${item.resourceName}"`, log,
              );
              if (cr) crateContents[item.id] = cr;
            }
          }
        }

        assetLocations.push({
          locationMeta: loc,
          detail: detail ?? { cargo: [], ships: [] },
          crateContents,
          blueprintDetails,
          surveyDetails,
        });
        emit(`Syncing assets at: ${loc.locationName}`, i + 1, total);
      }

      const current = this.state.syncedData();
      this.state.setSyncedData({ ...current, lastSynced: new Date().toISOString(), assetLocations });

      emit('Done', total, total, `\n✓ Asset sync complete (${total} locations)`);
      progress$.complete();
    };

    run().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      progress$.next({ phase: 'Error', done: 0, total: 0, error: msg, log: `\n✗ Error: ${msg}` });
      progress$.complete();
    });

    return progress$.asObservable();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private get<T>(path: string): Observable<T> {
    return this.http
      .get<ServiceResponse<T>>(`${PROXY}${path}`, { headers: this.authHeaders() })
      .pipe(
        map((r) => {
          if (!r.success) throw new Error(r.returnString);
          return r.data;
        }),
      );
  }

  private authHeaders(): HttpHeaders {
    const token = this.state.auth()?.token ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** Fetch with inter-call delay, 429 retry, and optional log callback. */
  private async fetch<T>(path: string, onLog?: (msg: string) => void): Promise<T> {
    await sleep(INTER_CALL_DELAY_MS);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await toPromise(this.get<T>(path));
      } catch (err: unknown) {
        const waitMs = parse429WaitMs(err);
        if (waitMs === null || attempt === MAX_RETRIES - 1) throw err;
        const waitSec = Math.round(waitMs / 1000);
        onLog?.(`  ⚠ Rate limited — waiting ${waitSec}s…`);
        await sleep(waitMs);
        onLog?.(`  ↻ Retrying…`);
      }
    }
    throw new Error('Max retries exceeded');
  }

  /** fetch() that catches errors and returns null, logging success/failure. */
  private async fetchOptional<T>(
    path: string,
    label: string,
    onLog: (msg: string) => void,
  ): Promise<T | null> {
    try {
      const result = await this.fetch<T>(path, onLog);
      onLog(`  ✓ ${label}`);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onLog(`  ✗ ${label}: ${msg}`);
      return null;
    }
  }
}

function toPromise<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parse429WaitMs(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  if (e['status'] !== 429) return null;

  // Try to extract "Try again in X seconds" from error body
  const body = e['error'] as Record<string, unknown> | null;
  const rawMsg = typeof body?.['message'] === 'string' ? body['message'] : '';
  const match = /(\d+)\s*second/i.exec(rawMsg);
  const seconds = match ? parseInt(match[1], 10) : 35;

  return (seconds + 2) * 1000; // add 2 s buffer
}
