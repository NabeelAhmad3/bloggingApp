import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-my-blogs',
  standalone: true,
  imports: [CommonModule,FormsModule],
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
        this.setupSocketConnection();
      }, error => {
        console.error(error);
      });
  }
  setupSocketConnection(): void {
    this.socket = io('http://localhost:5000', {
      query: { userId: this.userId }
    });
    this.socket.on('likeUpdate', (updatedLike: { postId: number; likes: number }) => {
      this.updatePostLikes(updatedLike);
    });
    this.socket.on('updateComments', (updatedComment: { postId: number; comments: string[] }) => {
      this.updatePostComments(updatedComment);
    });
  }

  updatePostLikes(updatedLike: { postId: number; likes: number }): void {
    const post = this.posts.find(p => p.postsid === updatedLike.postId);
    if (post) {
      post.likes = updatedLike.likes;
    }
  }

  updatePostComments(updatedComment: { postId: number; comments: string[] }): void {
    const post = this.posts.find(p => p.postsid === updatedComment.postId);
    if (post) {
      post.comment = updatedComment.comments;
    }
  }

  likePost(postId: number): void {
    if (!this.userId) {
      alert('Please login to like this post.');
      return;
    }
    const post = this.posts.find(p => p.postsid === postId);
    if (this.socket && postId && post) {
      if (post.hasLiked) {
        alert('You can only like this post once.');
        return;
      }
      post.hasLiked = true;
      this.socket.emit('likePost', postId);
    } else {
      console.error('Post ID is missing or invalid');
    }
  }

  commentPost(postId: number): void {
    if (!this.userId) {
      alert('Please login to comment on this post.');
      return;
    }
    const post = this.posts.find(p => p.postsid === postId);
    if (this.socket && postId && post && post.commentInput) {
      this.socket.emit('commentPost', { postId, comment: post.commentInput });
      post.commentInput = '';
    } else {
      console.error('Post ID or comment input is missing or invalid');
    }
  }

  toggleCommentInput(post: any): void {
    post.showCommentInput = !post.showCommentInput;
  }
}
