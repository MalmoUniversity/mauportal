import { ChangeDetectorRef, Component } from '@angular/core';
import { ContentService } from '../../../services/content-service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormComponent } from '../form-component/form-component';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-content-component',
  imports: [FormComponent],
  templateUrl: './content-component.html',
  styleUrl: './content-component.scss'
})
export class ContentComponent {
  description = 'Content component works!';
  udi: string | undefined = undefined;
  form: any;
  constructor(private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.udi = params.get('uid') || undefined;
      if (this.udi) {
        this.loadContent(this.udi);
      } else {
        this.loadContent(environment.navigationRootUid);
      }

    });
  }

  loadContent(udi: string) {
    this.contentService.getContent(udi).pipe(
      catchError(error => {
        if (error.status === 403) {
          this.router.navigate(['/access-denied']);
        } else {
          console.error('Error loading content:', error);
        }
        return of(null);
      })
    ).subscribe(content => {
      if (content) {
        this.description = content.description || 'No description available';
        this.form = content.form || null;
        this.cdr.detectChanges();
      }
    });
  }
}
