import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { BlogPost } from '../home/home.component';
import { Comment } from '../home/home.component';

@Component({
  selector: 'app-my-blogs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '../home/home.component.html',
  styleUrls: ['../home/home.component.css']
 
})
export class MyBlogsComponent implements OnInit {

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
      this.http.get<BlogPost[]>(`http://localhost:5000/blog_posts/myblog_view?userId=${userId}`)
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
      query: { userId }
    });

    this.socket.on('likeUpdate', (updatedlike: { postId: number; likes: number }) => {
      this.updatePostLikes(updatedlike);
    });

    this.socket.on('updateComments', (updatedComment: { postId: number; comments: Comment[] }) => {
      this.updatePostComments(updatedComment);
    });

    this.socket.on('commentDeleted', (data: { postId: number, commentId: number }) => {
      this.removeCommentFromPost(data.postId, data.commentId);
    });
  }

  private updatePostLikes(updatedPost: { postId: number; likes: number }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedPost.postId);
    if (post) {
      post.likes = updatedPost.likes;
      this.cdr.detectChanges();
    }
  }

  private updatePostComments(updatedComment: { postId: number; comments: Comment[] }): void {
    const post = this.blogPosts.find(p => p.postsid === updatedComment.postId);
    if (post) {
      post.comment = updatedComment.comments;
      this.cdr.detectChanges();
    }
  }

  private removeCommentFromPost(postId: number, commentId: number): void {
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (post) {
      post.comment = post.comment.filter(c => c.id !== commentId);
      this.cdr.detectChanges();
    }
  }

  likePost(postId: number): void {
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
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (this.socket && postId && post && post.commentInput) {
      this.socket.emit('commentPost', { postId, comment: post.commentInput });
      post.commentInput = '';
    } else {
      console.error('Post ID or comment input is missing or invalid');
    }
  }

  toggleCommentInput(post: BlogPost): void {
    post.showCommentInput = !post.showCommentInput;
  }

deleteComment(postId: number, commentId: number): void {

    const userId = parseInt(this.logindata.userid, 10); 
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (post && post.user_id === userId) {
        this.socket?.emit('deleteComment', commentId, postId, userId);
    } else {
        const comment = post?.comment.find(c => c.id === commentId);
        if (comment && comment.userId === userId) {
            this.socket?.emit('deleteComment', commentId, postId, userId);
        } else {
            alert('You are not authorized to delete this comment');
        }
    }
}


  editComment(comment: any): void {
    comment.editing = true;
    comment.editText = comment.comment;
  }

  saveEditComment(postId: number, comment: { id: number, userId: number, comment: string, editText: string }) {
    const newCommentText = comment.editText || '';  
    if (newCommentText && newCommentText !== comment.comment) {
      if (this.socket) {
        this.socket.emit('editComment', { 
          postId, 
          commentId: comment.id, 
          newCommentText, 
          userId: this.logindata.userid 
        });
        
        comment.comment = newCommentText; 
      } else {
        console.error('Socket connection is not established.');
      }
    } else {
      console.error('No changes detected or invalid input');
    }
  }


}
