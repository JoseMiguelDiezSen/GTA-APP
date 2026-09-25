import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { UserProfile, SocialClubSyncPayload, AuthRequest, AuthResponse, SaveProfileRequest } from '../models/user-profile';

const LOCAL_STORAGE_KEY = 'gtaapp_user_profile_v1';
const LOCAL_STORAGE_GAMERTAG_KEY = 'gtaapp_active_gamertag';
const LOCAL_STORAGE_PIN_KEY = 'gtaapp_active_pin';

const DEFAULT_PROFILE: UserProfile = {
  nickname: 'Jugador de Los Santos',
  platform: 'pc',
  characterSlot: 0,
  isSyncedWithSocialClub: false,
  ownedPropertyIds: [],
  collectedItemIds: [],
  highlightOwnedProperties: true,
  hideCollectedItems: false
};

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private readonly apiUrl = '/api/user';
  private profileSubject = new BehaviorSubject<UserProfile>(this.loadInitialProfile());
  private activeGamertagSubject = new BehaviorSubject<string | null>(this.loadStoredGamertag());
  private isCloudSyncedSubject = new BehaviorSubject<boolean>(false);

  public profile$: Observable<UserProfile> = this.profileSubject.asObservable();
  public activeGamertag$: Observable<string | null> = this.activeGamertagSubject.asObservable();
  public isCloudSynced$: Observable<boolean> = this.isCloudSyncedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.autoConnectIfSaved();
  }

  public get currentProfile(): UserProfile {
    return this.profileSubject.value;
  }

  public get currentGamertag(): string | null {
    return this.activeGamertagSubject.value;
  }

  public get isCloudConnected(): boolean {
    return this.isCloudSyncedSubject.value;
  }

  /**
   * Intenta auto-conectar con el servidor si existen Gamertag y PIN guardados en este navegador.
   */
  private autoConnectIfSaved(): void {
    const savedGamertag = this.loadStoredGamertag();
    const savedPin = this.loadStoredPin();

    if (savedGamertag && savedPin) {
      this.connectAccount(savedGamertag, savedPin).subscribe({
        next: (res) => {
          if (!res.success) {
            // Si el PIN cambió en el servidor o falló, desconectar credenciales
            this.disconnectAccount();
          }
        },
        error: () => {
          // Si el servidor no responde temporalmente, mantener modo local
        }
      });
    } else {
      this.refreshLegacyFromServer();
    }
  }

  /**
   * Conecta o registra una cuenta en la nube mediante Gamertag + PIN.
   */
  public connectAccount(gamertag: string, pin: string): Observable<AuthResponse> {
    const payload: AuthRequest = {
      gamertag: gamertag.trim(),
      pin: pin.trim(),
      currentProfile: this.currentProfile
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth`, payload).pipe(
      tap((res) => {
        if (res.success && res.gamertag) {
          try {
            localStorage.setItem(LOCAL_STORAGE_GAMERTAG_KEY, res.gamertag);
            localStorage.setItem(LOCAL_STORAGE_PIN_KEY, pin.trim());
          } catch (e) {
            // Ignorar errores de quota
          }

          this.activeGamertagSubject.next(res.gamertag);
          this.isCloudSyncedSubject.next(true);

          if (res.profile) {
            this.setProfile(res.profile);
          }
        }
      }),
      catchError((err) => {
        const errorMsg = err?.error?.message || 'Error al conectar con el servidor.';
        return of({
          success: false,
          message: errorMsg
        } as AuthResponse);
      })
    );
  }

  /**
   * Cierra la sesión en la nube y vuelve al perfil local en este dispositivo.
   */
  public disconnectAccount(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_GAMERTAG_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PIN_KEY);
    } catch (e) {
      // Ignorar
    }

    this.activeGamertagSubject.next(null);
    this.isCloudSyncedSubject.next(false);
  }

  /**
   * Refresca el perfil desde el servidor .NET (modo anónimo o legacy)
   */
  public refreshLegacyFromServer(): void {
    this.http.get<UserProfile>(`${this.apiUrl}/profile`).pipe(
      catchError(() => of(null)),
      tap(serverProfile => {
        if (serverProfile && !this.isCloudConnected) {
          const merged = { ...this.currentProfile, ...serverProfile };
          this.setProfile(merged);
        }
      })
    ).subscribe();
  }

  /**
   * Actualiza datos de perfil (alias, propiedades, dinero, etc.) y los persiste local y en la nube.
   */
  public saveProfile(changes: Partial<UserProfile>): Observable<UserProfile> {
    const updated = { ...this.currentProfile, ...changes };
    this.setProfile(updated);

    const gamertag = this.currentGamertag;
    const pin = this.loadStoredPin();

    if (gamertag && pin && this.isCloudConnected) {
      const saveReq: SaveProfileRequest = {
        gamertag,
        pin,
        profile: updated
      };

      return this.http.post<AuthResponse>(`${this.apiUrl}/save`, saveReq).pipe(
        catchError(() => of({ success: false, profile: updated } as AuthResponse)),
        map(res => res.profile || updated)
      );
    }

    // Modo local / anónimo fallback
    return this.http.post<UserProfile>(`${this.apiUrl}/profile`, updated).pipe(
      catchError(() => of(updated)),
      tap(res => {
        if (res) this.setProfile(res);
      })
    );
  }

  /**
   * Procesa la sincronización de SCAPI (Opción A)
   */
  public syncFromSocialClub(payload: SocialClubSyncPayload): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.apiUrl}/sync`, payload).pipe(
      catchError(() => {
        const fallback: UserProfile = {
          ...this.currentProfile,
          rockstarId: payload.rockstarId || this.currentProfile.rockstarId,
          nickname: payload.nickname || this.currentProfile.nickname,
          avatarUrl: payload.avatarUrl || this.currentProfile.avatarUrl,
          platform: (payload.platform as any) || this.currentProfile.platform,
          characterSlot: payload.characterSlot ?? this.currentProfile.characterSlot,
          rank: payload.rank ?? this.currentProfile.rank,
          cash: payload.cash ?? this.currentProfile.cash,
          bank: payload.bank ?? this.currentProfile.bank,
          ownedPropertyIds: payload.ownedPropertyIds || this.currentProfile.ownedPropertyIds,
          collectedItemIds: payload.collectedItemIds || this.currentProfile.collectedItemIds,
          isSyncedWithSocialClub: true,
          lastSyncDate: new Date().toISOString()
        };
        this.setProfile(fallback);
        return of(fallback);
      }),
      tap(synced => {
        if (synced) this.setProfile(synced);
      })
    );
  }

  public toggleHighlightOwned(): void {
    const val = !this.currentProfile.highlightOwnedProperties;
    this.saveProfile({ highlightOwnedProperties: val }).subscribe();
  }

  public toggleHideCollected(): void {
    const val = !this.currentProfile.hideCollectedItems;
    this.saveProfile({ hideCollectedItems: val }).subscribe();
  }

  public isPropertyOwned(propertyId: string): boolean {
    return this.currentProfile.ownedPropertyIds.includes(propertyId);
  }

  public isItemCollected(itemId: string): boolean {
    return this.currentProfile.collectedItemIds.includes(itemId);
  }

  public logout(): void {
    this.disconnectAccount();
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    this.setProfile(DEFAULT_PROFILE);
  }

  private setProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      // Ignorar
    }
    this.profileSubject.next(profile);
  }

  private loadInitialProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch (e) {
      // Fallback
    }
    return DEFAULT_PROFILE;
  }

  private loadStoredGamertag(): string | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_GAMERTAG_KEY);
    } catch (e) {
      return null;
    }
  }

  private loadStoredPin(): string | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_PIN_KEY);
    } catch (e) {
      return null;
    }
  }
}
