import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

interface BlogPost {
  postsid: number;
  name: string;
  created_at: Date;
  title: string;
  description: string;
  image: string;
  likes: number;
  comment: string[];
  commentInput?: string; 
  showCommentInput?: boolean; 
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule,FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  blogPosts: BlogPost[] = [];
  private socket: Socket | null = null;
  isLoggedIn: boolean = false;
  logindata: any = {};

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef) {
    if (isPlatformBrowser(this.platformId)) {
      this.logindata = {
        token: localStorage.getItem('authToken'),
        userid: localStorage.getItem('authUserId')
      };
      this.isLoggedIn = !!this.logindata.token;
    }
  }

  ngOnInit(): void {
    this.getBlogPosts()
      .then(() => {
        if (isPlatformBrowser(this.platformId)) {
          this.setupSocketConnection();
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
              comment: post.comment || [],
              commentInput: '',
              showCommentInput: false
            }));

            this.cdr.detectChanges();
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
      console.log('Socket connected from frontend');
    });

    this.socket.on('likeUpdate', (updatedPost: { postsid: number; likes: number }) => {
      this.updatePostLikes(updatedPost);
    });

    this.socket.on('commentUpdate', (updatedComment: { id: number; comment: string[] }) => {
      this.updatePostComments(updatedComment);
    });

    this.socket.on('error', (errorMessage: string) => {
      console.error('Server error:', errorMessage);
      alert(errorMessage);
    });
  }

  private updatePostLikes(updatedPost: { postsid: number; likes: number }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedPost.postsid);
    if (post) {
      post.likes = updatedPost.likes;
      this.cdr.detectChanges();
    }
  }

  private updatePostComments(updatedComment: { id: number; comment: string[] }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedComment.id);
    if (post) {
      post.comment = updatedComment.comment;
      this.cdr.detectChanges();
    }
  }

  likePost(postId: number): void {
    if (!this.isLoggedIn) { 
      alert('Please log in to Like');
      return; 
    }
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (this.socket && postId && post) {
      post.likes += 1;
      this.cdr.detectChanges();
      this.socket.emit('likePost', postId);
    } else {
      console.error('Post ID is missing or invalid');
    }
  }

  commentPost(postId: number): void {
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (this.socket && postId && post && post.commentInput) {
      post.comment = [...(post.comment || []), post.commentInput];
      this.cdr.detectChanges();
      this.socket.emit('commentPost', { postId, comment: post.commentInput });
      post.commentInput = ''; 
    } else {
      console.error('Post ID or comment input is missing or invalid');
    }
  }

  toggleCommentInput(post: BlogPost): void {
    if (!this.isLoggedIn) {
      alert('Please log in to comment.');
      return;
    }
    post.showCommentInput = !post.showCommentInput;
  }
}
