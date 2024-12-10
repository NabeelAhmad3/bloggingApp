import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient} from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-reg-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTabsModule],
  templateUrl: './reg-page.component.html',
  styleUrls: ['./reg-page.component.css']
})
export class RegPageComponent implements OnInit {
  currentView: string = 'login';
  loginForm!: FormGroup;
  signUpForm!: FormGroup;
  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.minLength(10), Validators.maxLength(30)]],
      password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]],
    });

    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.minLength(10), Validators.maxLength(30)]],
      phone: ['', [Validators.required, Validators.min(10000), Validators.max(100000000000)]],
      password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]],
    });
  }

  TabChange(index: number): void {
    this.currentView = index === 0 ? 'login' : 'signup';
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const formData = this.loginForm.value;
    this.http.post('http://localhost:5000/users/login', formData).subscribe({
      next: (response: any) => {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('authUserId', response.userid);
        localStorage.setItem("userName",response.userName);
        window.location.reload();
      },
      error: (error: any) => {
        alert(error.error.message || 'An error occurred during login');
      },
    });
  }

  onSignUpSubmit(): void {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    const formData = this.signUpForm.value;
    this.http.post('http://localhost:5000/users/register', formData).subscribe({
      next: (response: any) => {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('authUserId', response.userid);
        localStorage.setItem("userName",response.userName);
        window.location.reload();
      },
      error: (error: any) => {
        alert(error.error.message || 'Error adding user');
      },
    });
  }

  closeModal(){
    const regModal = document.getElementById('regModal');
    if (regModal) {
      regModal.classList.remove('show');
      regModal.setAttribute('style', 'display: none');
    }
  }
}
