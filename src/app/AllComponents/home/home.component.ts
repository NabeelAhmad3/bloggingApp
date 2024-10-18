import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,HttpClientModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  blogPosts: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getBlogPosts();
  }
  getBlogPosts() {
    this.http.get<any[]>('http://localhost:5000/blog_posts/blog_view')
      .subscribe({
        next: (data) => {
          this.blogPosts = data;
        },
        error: (error) => {
          console.error('Error fetching blog posts:', error);
        }
      });
  }
  
}
