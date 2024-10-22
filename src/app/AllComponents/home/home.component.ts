import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { io, Socket } from 'socket.io-client';

interface BlogPost {
  postsid: string;
  name: string;
  created_at: Date;
  title: string;
  description: string;
  image: string;
  likes: number;
  comments: string[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  blogPosts: BlogPost[] = [];
  private socket: Socket | null = null;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.getBlogPosts()
      .then(() => {
        if (isPlatformBrowser(this.platformId)) {
          this.setupSocketConnection(); // Establish socket connection only in the browser
        }
      });
  }

  private getBlogPosts(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<BlogPost[]>('http://localhost:5000/blog_posts/blog_view')
        .subscribe({
          next: (data) => {
            this.blogPosts = data.map(post => ({
              ...post,
              likes: post.likes || 0,
              comments: post.comments || []
            }));
            resolve();
          },
          error: (error) => {
            console.error('Error fetching blog posts:', error);
            reject(error);
          }
        });
    });
  }

  private setupSocketConnection(): void {
    this.socket = io('http://localhost:5000');
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });
    this.socket.on('likeUpdate', (updatedPost: { postsid: string; likes: number }) => {
      this.updatePostLikes(updatedPost);
    });
    this.socket.on('commentUpdate', (updatedComment: { id: string; comment: string }) => {
      this.updatePostComments(updatedComment);
    });
  }

  private updatePostLikes(updatedPost: { postsid: string; likes: number }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedPost.postsid);
    if (post) {
      post.likes = updatedPost.likes;
    }
  }

  private updatePostComments(updatedComment: { id: string; comment: string }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedComment.id);
    if (post) {
      post.comments.push(updatedComment.comment);
    }
  }

  likePost(postId: string): void {
    if (this.socket) {
      this.socket.emit('likePost', postId);
    }
  }

  commentPost(postId: string): void {
    const comment = prompt('Enter your comment:');
    if (comment && this.socket) {
      this.socket.emit('commentPost', { postId, comment });
    }
  }
}
