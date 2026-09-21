import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameManifest } from '../models/game';

@Injectable({ providedIn: 'root' })
export class GameService {

  constructor(private http: HttpClient) {}

  getManifest(gameId: string): Observable<GameManifest> {
    return this.http.get<GameManifest>(`api/${gameId}`);
  }
}