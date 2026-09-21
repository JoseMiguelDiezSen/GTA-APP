import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { UserProfile, SocialClubSyncPayload } from '../models/user-profile';

const LOCAL_STORAGE_KEY = 'gtaapp_user_profile_v1';

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

  public profile$: Observable<UserProfile> = this.profileSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshFromServer();
  }

  public get currentProfile(): UserProfile {
    return this.profileSubject.value;
  }

  /**
   * Refresca el perfil desde el servidor .NET, preservando local si falla
   */
  public refreshFromServer(): void {
    this.http.get<UserProfile>(`${this.apiUrl}/profile`).pipe(
      catchError(() => of(null)),
      tap(serverProfile => {
        if (serverProfile) {
          const merged = { ...this.currentProfile, ...serverProfile };
          this.setProfile(merged);
        }
      })
    ).subscribe();
  }

  /**
   * Actualiza datos de perfil (alias, plataforma, etc.)
   */
  public saveProfile(changes: Partial<UserProfile>): Observable<UserProfile> {
    const updated = { ...this.currentProfile, ...changes };
    this.setProfile(updated);

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
        // Fallback local si el backend no responde
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

  /**
   * Conmuta el resaltado de propiedades compradas en el mapa
   */
  public toggleHighlightOwned(): void {
    const val = !this.currentProfile.highlightOwnedProperties;
    this.saveProfile({ highlightOwnedProperties: val }).subscribe();
  }

  /**
   * Conmuta el ocultar coleccionables ya conseguidos
   */
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
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    this.setProfile(DEFAULT_PROFILE);
  }

  private setProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      // Ignorar errores de quota
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
}
