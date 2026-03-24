import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SearchPayload } from '@mau-arkiv/shared';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(private http: HttpClient) {
  }

  search(uid: string, payload: SearchPayload): Observable<any> {
    return this.http.post<any>(`${environment.api.url}/search/${uid}`, payload);
  }
}