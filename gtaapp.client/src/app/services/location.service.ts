import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { PropertyLocation } from '../models/property';
import { CollectibleItem } from '../models/collectible';

@Injectable({ providedIn: 'root' })
export class LocationService {

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista de propiedades y negocios.
   * Si la API de ASP.NET no responde, usa como fallback el archivo estático en assets.
   */
  getProperties(gameMode?: string, category?: string): Observable<PropertyLocation[]> {
    let url = '/api/locations/properties';
    const params: string[] = [];
    if (gameMode) params.push(`gameMode=${encodeURIComponent(gameMode)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<PropertyLocation[]>(url).pipe(
      catchError(err => {
        console.warn('Fallo al obtener propiedades desde /api, usando fallback local:', err);
        return this.http.get<PropertyLocation[]>('assets/data/properties.json');
      })
    );
  }

  /**
   * Obtiene la lista de coleccionables de GTA Online.
   * Si la API de ASP.NET no responde, usa como fallback el archivo estático en assets.
   */
  getCollectibles(category?: string): Observable<CollectibleItem[]> {
    let url = '/api/locations/collectibles';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }

    return this.http.get<CollectibleItem[]>(url).pipe(
      catchError(err => {
        console.warn('Fallo al obtener coleccionables desde /api, usando fallback local:', err);
        return this.http.get<CollectibleItem[]>('assets/data/collectibles.json');
      })
    );
  }

  /**
   * Obtiene la lista de cajeros automáticos.
   */
  getAtms(): Observable<{ name: string; type: string; x: number; y: number; z: number }[]> {
    return this.http.get<{ name: string; type: string; x: number; y: number; z: number }[]>('/api/locations/atms').pipe(
      catchError(err => {
        console.warn('Fallo al obtener ATMs:', err);
        return of([]);
      })
    );
  }
}
