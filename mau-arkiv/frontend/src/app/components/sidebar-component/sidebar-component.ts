import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationService } from '../../services/navigation-service';
import { MenuItem } from '@mau-arkiv/shared';
import { ChangeDetectorRef } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar-component',
  imports: [CommonModule, MatIcon],
  templateUrl: './sidebar-component.html',
  styleUrl: './sidebar-component.scss'
})
export class SidebarComponent {
  menuItem: MenuItem | null = null;
  title = 'Sidebar';
  parentUid: string | undefined;
  items: MenuItem[] = [];

  constructor(private router: Router,
    private route: ActivatedRoute,
    private navigationService: NavigationService,
              private cdr: ChangeDetectorRef) { }

  ngOnInit() {
      // Listen to route changes and update sidebar accordingly
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        // Get the UID from the current route
        const uid = this.getUidFromRoute();
        this.getMenu(uid || environment.navigationRootUid);
      });

      // Initial load
      const uid = this.getUidFromRoute();
      this.getMenu(uid || environment.navigationRootUid);
  }

  private getUidFromRoute(): string | null {
    // Traverse the route tree to find the uid parameter
    let currentRoute = this.route.root;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
      const uid = currentRoute.snapshot.paramMap.get('uid');
      if (uid) {
        return uid;
      }
    }
    return null;
  }

  private getMenu(uid: string) {

    this.navigationService.getItem(uid).subscribe(menu => {
      this.menuItem = menu.item as MenuItem;
      this.title = this.menuItem?.title || 'Sidebar';
      this.parentUid = this.menuItem?.parentUid;
      this.items = menu.children || [];
      this.cdr.detectChanges();
    });
  }

  hasParent(): boolean {  
    return this.menuItem?.parentUid ? true : false;
  }

  showMenu(uid: string | undefined) {
    if (!uid) {
      return;
    }
    
    this.getMenu(uid);
    this.router.navigate(['/content', uid]);
  }

}
