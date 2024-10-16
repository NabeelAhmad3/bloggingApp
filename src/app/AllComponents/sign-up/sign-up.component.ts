import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './sign-up.component.html',
  styleUrl: '../log-in/log-in.component.css'
})
export class SignUpComponent implements OnInit {
  signUpForm!: FormGroup;
  isLoggedIn: boolean = false;
  
  constructor(private fb: FormBuilder, private http: HttpClient) {}
  ngOnInit(): void {
    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.minLength(10), Validators.maxLength(30)]],
      phone: ['', [Validators.required, Validators.min(1000000000), Validators.max(100000000000)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20)]],
    });
  }

  onSubmit(): void {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }
    this.addUser(this.signUpForm.value);
  }
  addUser(data: any): void {
    this.http.post('http://localhost:5000/users/register', data).subscribe(
      (response: any) => {
        alert(response.message);
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        if (response.userid) {
          localStorage.setItem('authUserId', response.userid);
        }
        this.isLoggedIn = true;
        window.location.reload();
      },
      (error: any) => {
        const errorMessage = error.error.message || 'Error adding user';
        console.error('Error adding user', error);
      }
    );
  }
}