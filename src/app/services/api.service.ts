import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, concat, concatMap, defer, from, map, tap } from 'rxjs';
import {
  AssetBlueprint,
  AssetCrateContents,
  AssetLocation,
  AssetLocationDetail,
  AssetLocationWithDetail,
  AssetSurvey,
  AuthState,
  ColonyBuildings,
  ColonyFullData,
  ColonyListItem,
  ColonySummary,
  ColonyWarehouse,
  ColonyWorkers,
  ServiceResponse,
  SyncProgress,
  SyncedData,
  TokenResponse,
} from '../models/api.models';
import { StateService } from './state.service';

const PROXY = 'https://outer-empire-2.pasiut11.workers.dev';

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

  // ── Colonies ─────────────────────────────────────────────────────────────

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

  // ── Assets ────────────────────────────────────────────────────────────────

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

    const run = async (): Promise<void> => {
      const colonies: ColonyFullData[] = [];

      const list = await firstValue(this.getColonyList());
      const total = list.length;

      progress$.next({ phase: 'Fetching colony list…', done: 0, total });

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        progress$.next({ phase: `Syncing: ${item.colonyName}`, done: i, total });

        const [summary, buildings, warehouse, workers] = await Promise.allSettled([
          firstValue(this.getColonySummary(item.colonyId)),
          firstValue(this.getColonyBuildings(item.colonyId)),
          firstValue(this.getColonyWarehouse(item.colonyId)),
          firstValue(this.getColonyWorkers(item.colonyId)),
        ]);

        colonies.push({
          listItem: item,
          summary: summary.status === 'fulfilled' ? summary.value : null,
          buildings: buildings.status === 'fulfilled' ? buildings.value : null,
          warehouse: warehouse.status === 'fulfilled' ? warehouse.value : null,
          workers: workers.status === 'fulfilled' ? workers.value : null,
        });
      }

      const current = this.state.syncedData();
      this.state.setSyncedData({
        ...current,
        lastSynced: new Date().toISOString(),
        colonies,
      });

      progress$.next({ phase: 'Done', done: total, total });
      progress$.complete();
    };

    run().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      progress$.next({ phase: 'Error', done: 0, total: 0, error: msg });
      progress$.complete();
    });

    return progress$.asObservable();
  }

  syncAssets(): Observable<SyncProgress> {
    const progress$ = new Subject<SyncProgress>();

    const run = async (): Promise<void> => {
      const assetLocations: AssetLocationWithDetail[] = [];

      const locations = await firstValue(this.getAssetLocations());
      const total = locations.length;

      progress$.next({ phase: 'Fetching asset locations…', done: 0, total });

      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        progress$.next({ phase: `Syncing assets at: ${loc.locationName}`, done: i, total });

        const detail = await firstValue(
          this.getAssetLocationDetail(loc.locationId, loc.locationType),
        );

        const crateContents: Record<number, AssetCrateContents> = {};
        const blueprintDetails: Record<number, AssetBlueprint> = {};
        const surveyDetails: Record<number, AssetSurvey> = {};

        for (const item of detail.cargo) {
          if (item.typeC === 'Bp') {
            const bp = await firstValue(this.getAssetBlueprint(item.id)).catch(() => null);
            if (bp) blueprintDetails[item.id] = bp;
          } else if (item.typeC === 'Sc') {
            const sv = await firstValue(this.getAssetSurvey(item.id)).catch(() => null);
            if (sv) surveyDetails[item.id] = sv;
          } else if (item.typeC === 'Cr') {
            const cr = await firstValue(this.getAssetCrate(item.id)).catch(() => null);
            if (cr) crateContents[item.id] = cr;
          }
        }

        assetLocations.push({ locationMeta: loc, detail, crateContents, blueprintDetails, surveyDetails });
      }

      const current = this.state.syncedData();
      this.state.setSyncedData({
        ...current,
        lastSynced: new Date().toISOString(),
        assetLocations,
      });

      progress$.next({ phase: 'Done', done: total, total });
      progress$.complete();
    };

    run().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      progress$.next({ phase: 'Error', done: 0, total: 0, error: msg });
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
}

function firstValue<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}
