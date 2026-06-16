import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'colonies', pathMatch: 'full' },
  { path: 'colonies', loadComponent: () => import('./pages/colonies/colonies').then(m => m.ColoniesComponent) },
  { path: 'blueprints', loadComponent: () => import('./pages/blueprints/blueprints').then(m => m.BlueprintsComponent) },
  { path: 'surveys', loadComponent: () => import('./pages/surveys/surveys').then(m => m.SurveysComponent) },
  { path: 'production', loadComponent: () => import('./pages/production/production').then(m => m.ProductionComponent) },
  { path: 'api-sync', loadComponent: () => import('./pages/api-sync/api-sync').then(m => m.ApiSyncComponent) },
];
