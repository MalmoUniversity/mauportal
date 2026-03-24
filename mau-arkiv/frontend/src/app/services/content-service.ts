import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
   constructor(private http: HttpClient) {
  }
 
  getContent(uid: string): Observable<any> {
      return this.http.get<any>(`${environment.api.url}/content/${uid}`);
    }
}
