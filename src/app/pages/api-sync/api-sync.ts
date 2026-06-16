import { AfterViewChecked, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { AuthState, SyncProgress } from '../../models/api.models';

@Component({
  selector: 'app-api-sync',
  imports: [ReactiveFormsModule],
  templateUrl: './api-sync.html',
  styleUrl: './api-sync.scss',
})
export class ApiSyncComponent implements AfterViewChecked {
  readonly stateService = inject(StateService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly isConnecting = signal(false);
  readonly connectError = signal<string | null>(null);
  readonly isSyncing = signal(false);
  readonly syncProgress = signal<SyncProgress | null>(null);
  readonly logs = signal<string>('');

  private shouldScrollLogs = false;

  @ViewChild('logBox') private logBox?: ElementRef<HTMLPreElement>;

  readonly lastSynced = computed(() => {
    const ts = this.stateService.syncedData().lastSynced;
    if (!ts) return null;
    return new Date(ts).toLocaleString();
  });

  readonly form = this.fb.group({
    clientId: [this.stateService.auth()?.clientId ?? '', Validators.required],
    secret: [this.stateService.auth()?.secret ?? '', Validators.required],
  });

  ngAfterViewChecked(): void {
    if (this.shouldScrollLogs && this.logBox) {
      const el = this.logBox.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollLogs = false;
    }
  }

  connect(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { clientId, secret } = this.form.getRawValue();
    this.isConnecting.set(true);
    this.connectError.set(null);

    this.api.authenticate(clientId!, secret!).subscribe({
      next: (token) => {
        const auth: AuthState = {
          clientId: clientId!,
          secret: secret!,
          token: token.accessToken,
          expiresAt: Date.now() + token.expiresIn * 1000,
          characterId: token.characterId,
          characterName: `Character #${token.characterId}`,
          scopes: token.scopes,
        };
        this.stateService.setAuth(auth);
        this.isConnecting.set(false);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        this.connectError.set(msg);
        this.isConnecting.set(false);
      },
    });
  }

  disconnect(): void {
    this.stateService.clearAuth();
    this.form.reset({ clientId: '', secret: '' });
  }

  clearLogs(): void {
    this.logs.set('');
  }

  syncColonies(): void {
    if (this.isSyncing()) return;
    this.startSync('colonies');

    this.api.syncColonies().subscribe({
      next: (p) => this.handleProgress(p),
      complete: () => this.isSyncing.set(false),
      error: () => this.isSyncing.set(false),
    });
  }

  syncAssets(): void {
    if (this.isSyncing()) return;
    this.startSync('assets');

    this.api.syncAssets().subscribe({
      next: (p) => this.handleProgress(p),
      complete: () => this.isSyncing.set(false),
      error: () => this.isSyncing.set(false),
    });
  }

  private startSync(type: string): void {
    this.isSyncing.set(true);
    this.syncProgress.set({ phase: 'Starting…', done: 0, total: 0 });
    this.appendLog(`[${timestamp()}] Starting ${type} sync…`);
  }

  private handleProgress(p: SyncProgress): void {
    this.syncProgress.set(p);
    if (p.log) {
      this.appendLog(p.log.startsWith('\n')
        ? `\n[${timestamp()}]${p.log.slice(1)}`
        : `[${timestamp()}] ${p.log}`);
    }
    if (p.error) {
      this.appendLog(`[${timestamp()}] ERROR: ${p.error}`);
    }
  }

  private appendLog(line: string): void {
    this.logs.update((prev) => prev ? `${prev}\n${line}` : line);
    this.shouldScrollLogs = true;
  }
}

function timestamp(): string {
  return new Date().toLocaleTimeString();
}
