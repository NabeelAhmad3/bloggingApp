import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RegPageComponent } from "../reg-page/reg-page.component";
import { ProfileModalComponent } from "../profile-modal/profile-modal.component";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RegPageComponent, ProfileModalComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isLoggedIn: boolean = false;
  logindata: any = {};

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateLoginStatus();
    }
  }

  updateLoginStatus(): void {
    this.logindata = {
      token: localStorage.getItem('authToken'),
      userid: localStorage.getItem('authUserId')
    };
    this.isLoggedIn = !!this.logindata.token;
    this.cdr.detectChanges(); 
  }

  OpenModal(): void {
    if (!this.isLoggedIn) {
      const regModal = document.getElementById('regModal');
      if (regModal) {
        regModal.classList.add('show');
        regModal.setAttribute('style', 'display: block');
      }
    }
  }
}
