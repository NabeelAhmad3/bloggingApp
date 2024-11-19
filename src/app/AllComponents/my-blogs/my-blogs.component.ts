import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-my-blogs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-blogs.component.html',
  styleUrls: ['./my-blogs.component.css']
})
export class MyBlogsComponent implements OnInit {
  posts: any[] = [];
  userId: string | null = localStorage.getItem('authUserId');
  private socket: Socket | null = null;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<any>(`http://localhost:5000/blog_posts/myblog_view?userId=${this.userId}`)
      .subscribe(response => {
        this.posts = response;
        this.posts.forEach(post => {
          post.comment = post.comments ? post.comments.split(', ') : [];
          post.likes = post.likes || 0;
          post.hasLiked = post.hasLiked || false;
          post.commentInput = '';
          post.showCommentInput = false;
        });
      }, error => {
        console.error(error);
      });
  }


  toggleCommentInput(post: any): void {
    post.showCommentInput = !post.showCommentInput;
  }
}
