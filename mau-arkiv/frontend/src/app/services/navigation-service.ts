import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Menu } from '../models/menu';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  constructor(private http: HttpClient) {
  }

  getItem(uid: string): Observable<Menu> {
    return this.http.get<Menu>(`${environment.api.url}/nav/${uid}`);
  }
}
