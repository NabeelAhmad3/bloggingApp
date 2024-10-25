import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RegPageComponent } from "../reg-page/reg-page.component";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RegPageComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isLoggedIn: boolean = false;
  logindata: any = {};

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef,  private router: Router) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.logindata = {
        token: localStorage.getItem('authToken'),
        userid: localStorage.getItem('authUserId')
      };
      this.isLoggedIn = !!this.logindata.token;
    }
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUserId');
        this.isLoggedIn = false;
        this.cdr.detectChanges(); 
      }
    }
  }

  OpenModal() {
    if (this.isLoggedIn) {
      this.router.navigate(['/blog_posts']);
    } else {
      const regModal = document.getElementById('regModal');
      if (regModal) {
        regModal.classList.add('show');
        regModal.setAttribute('style', 'display: block');
      }
    }
  }
}
