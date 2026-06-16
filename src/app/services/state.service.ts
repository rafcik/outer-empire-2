import { Injectable, computed, effect, signal } from '@angular/core';
import { AuthState, ProductionPlan, SyncedData } from '../models/api.models';

const AUTH_KEY = 'oe2_auth';
const DATA_KEY = 'oe2_data';
const PRODUCTION_KEY = 'oe2_production';

const EMPTY_DATA: SyncedData = {
  lastSynced: null,
  colonies: [],
  assetLocations: [],
};

@Injectable({ providedIn: 'root' })
export class StateService {
  readonly auth = signal<AuthState | null>(this.loadAuth());
  readonly syncedData = signal<SyncedData>(this.loadData());
  readonly productionPlan = signal<ProductionPlan>(this.loadProductionPlan());

  readonly isAuthenticated = computed(() => {
    const a = this.auth();
    return !!a && Date.now() < a.expiresAt;
  });

  readonly characterName = computed(() => {
    const a = this.auth();
    return a ? a.characterName : '';
  });

  readonly scopes = computed(() => this.auth()?.scopes ?? []);

  constructor() {
    effect(() => {
      const a = this.auth();
      if (a) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(a));
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
    });

    effect(() => {
      localStorage.setItem(DATA_KEY, JSON.stringify(this.syncedData()));
    });

    effect(() => {
      localStorage.setItem(PRODUCTION_KEY, JSON.stringify(this.productionPlan()));
    });
  }

  setAuth(auth: AuthState): void {
    this.auth.set(auth);
  }

  clearAuth(): void {
    this.auth.set(null);
  }

  setSyncedData(data: SyncedData): void {
    this.syncedData.set(data);
  }

  setProductionPlan(plan: ProductionPlan): void {
    this.productionPlan.set(plan);
  }

  private loadAuth(): AuthState | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? (JSON.parse(raw) as AuthState) : null;
    } catch {
      return null;
    }
  }

  private loadData(): SyncedData {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      return raw ? (JSON.parse(raw) as SyncedData) : { ...EMPTY_DATA };
    } catch {
      return { ...EMPTY_DATA };
    }
  }

  private loadProductionPlan(): ProductionPlan {
    try {
      const raw = localStorage.getItem(PRODUCTION_KEY);
      return raw ? (JSON.parse(raw) as ProductionPlan) : { planets: [] };
    } catch {
      return { planets: [] };
    }
  }
}
