import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

interface BlogPost {
  postsid: number;
  name: string;
  created_at: Date;
  description: string;
  image: string;
  likes: number;
  comment: { id: number, userId: number, comment: string }[];
  commentInput?: string;
  showCommentInput?: boolean;
  hasLiked: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  blogPosts: BlogPost[] = [];
  private socket: Socket | null = null;
  isLoggedIn: boolean = false;
  logindata: any = {};

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef) {
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
    const userId = this.logindata.userid;

    return new Promise((resolve, reject) => {
      this.http.get<BlogPost[]>(`http://localhost:5000/blog_posts/blog_view?userId=${userId}`)
        .subscribe({
          next: (data) => {
            this.blogPosts = data.map(post => ({
              ...post,
              likes: post.likes || 0,
              comment: post.comment || [],
              commentInput: '',
              showCommentInput: false,
              hasLiked: post.hasLiked
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
    const userId = this.logindata.userid;
    this.socket = io('http://localhost:5000', {
      query: { userId } //query  is key value pair to send additional info from frontend to server
    });

    this.socket.on('likeUpdate', (updatedlike: { postId: number; likes: number }) => {
      this.updatePostLikes(updatedlike);
    });

    this.socket.on('updateComments', (updatedComment: { postId: number; comments: { id: number, userId: number, comment: string }[] }) => {
      this.updatePostComments(updatedComment);
    });
  }

  private updatePostLikes(updatedPost: { postId: number; likes: number }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedPost.postId);
    if (post) {
      post.likes = updatedPost.likes;
      this.cdr.detectChanges();
    }
  }

  private updatePostComments(updatedComment: { postId: number; comments: { id: number, userId: number, comment: string }[] }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedComment.postId);
    if (post) {
      post.comment = updatedComment.comments;
      this.cdr.detectChanges();
    }
  }

  likePost(postId: number): void {
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }
    const post = this.blogPosts.find(p => p.postsid === postId);
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
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (this.socket && postId && post && post.commentInput) {
      this.socket.emit('commentPost', { postId, comment: post.commentInput });
      post.commentInput = '';
    } else {
      console.error('Post ID or comment input is missing or invalid');
    }
  }

  toggleCommentInput(post: BlogPost): void {
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }
    post.showCommentInput = !post.showCommentInput;
  }
  deleteComment(postId: number, commentId: number): void {
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }

    if (this.socket) {
      this.socket.emit('deleteComment', { postId, commentId });
    } else {
      console.error('Socket connection is not established.');
    }
  }

  OpenModal() {
    const regModal = document.getElementById('regModal');
    if (regModal) {
      regModal.classList.add('show');
      regModal.setAttribute('style', 'display: block');
    }
  }
}
