import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.css']
})
export class ProfileModalComponent implements OnInit {
  isLoggedIn: boolean = false;
  user: any = {};
  userid: string | null = null;

  constructor(private http: HttpClient,  @Inject(PLATFORM_ID) private platformId: any) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isLoggedIn = !!localStorage.getItem('authToken');
      this.userid = localStorage.getItem('authUserId');

      if (this.isLoggedIn && this.userid) {
        this.http.get(`http://localhost:5000/users/userDetails/${this.userid}`).subscribe((data: any) => {
          if (data) {
            this.user = data;
          }
        }, error => {
          console.error('Error fetching user details', error);
        });
      }
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUserId');
    }
    this.isLoggedIn = false;
    window.location.reload();
  }

}
