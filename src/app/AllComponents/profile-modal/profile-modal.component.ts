import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.css']
})
export class ProfileModalComponent {
  userName: { name: string; email: string } | null = null;
  isLoggedIn = false;
  logindata: any = {};

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.logindata = {
        token: localStorage.getItem('authToken'),
        userid: localStorage.getItem('authUserId')
      };
      this.isLoggedIn = !!this.logindata.token;
    }
    if (this.isLoggedIn && this.logindata.userid) {
      this.getUserDetails();
    }
  }


  getUserDetails(): void {
    const userId = this.logindata.userid;

    this.http.get<{ name: string; email: string }[]>(`http://localhost:5000/users/userDetails?userId=${userId}`)
      .subscribe({
        next: (data) => {
          this.userName = data[0];
        },
        error: (error) => {
          console.error('Error fetching user details:', error);
        }
      });
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUserId');
    }
    this.isLoggedIn;
    window.location.reload();
  }
}
