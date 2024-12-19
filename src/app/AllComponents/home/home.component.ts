import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

export interface BlogPost {
  user_id: number;
  postsid: number;
  name: string;
  created_at: Date;
  description: string;
  image: string;
  likes: number;
  comment: Comment[];
  commentInput?: string;
  showCommentInput?: boolean;
  hasLiked: boolean;

  showMessageInput?: boolean;
}

export interface Comment {

  replies: {
    replyId: number;
    editing: any;
    editText: any; userId: any; username: string; comment: string
  }[];
  replyInput: string;
  showReplyInput: boolean;
  commentId: any;
  username: string;
  userId: number;
  comment: string;
  editText: string;
  editing: boolean;
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
  successMessageLike: boolean = false;
  messageInput: { [postId: number]: string } = {};

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef) {
    if (isPlatformBrowser(this.platformId)) {
      this.logindata = {
        token: localStorage.getItem('authToken'),
        userid: localStorage.getItem('authUserId'),
        userName: localStorage.getItem('userName')
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
      query: { userId }
    });

    this.socket.on('likeUpdate', (updatedlike: { postId: number; likes: number }) => {
      this.updatePostLikes(updatedlike);
    });

    this.socket.on('updateComments', (updatedComment: { postId: number; comments: Comment[] }) => {
      this.updatePostComments(updatedComment);
    });

    this.socket.on('commentDeleted', (data: { postId: number, commentId: number }) => {
      this.removeComment(data.postId, data.commentId);
    });

    this.socket.on('updateReplies', (updatedReplies: { parentCommentId: number; replies: any[] }) => {
      this.updateCommentReplies(updatedReplies);
    });

    this.socket.on('replyDeleted', (data: { postId: number, commentId: number, replyId: number }) => {
      this.removeReply(data.postId, data.commentId, data.replyId);
    });

    this.socket.on('newMessage', ({ postId, message }) => {
      const post = this.blogPosts.find(p => p.postsid === postId);
      if (post) {
        post.comment.push(message);
      }
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
      post.comment.forEach(c => c.editing = false);
      this.cdr.detectChanges();
    }
  }
  private removeComment(postId: number, commentId: number): void {
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (post) {
      post.comment = post.comment.filter(c => c.commentId !== commentId);
      this.cdr.detectChanges();
    }
  }
  private updateCommentReplies(updatedReplies: { parentCommentId: number; replies: any[] }): void {
    this.blogPosts.forEach(post => {
      const comment = post.comment.find(c => c.commentId === updatedReplies.parentCommentId);
      if (comment) {
        comment.replies = updatedReplies.replies;
      }
    });
    this.cdr.detectChanges();
  }

  private removeReply(postId: number, commentId: number, replyId: number): void {
    const post = this.blogPosts.find(p => p.postsid === postId);
    if (post) {
      const comment = post.comment.find(c => c.commentId === commentId);
      if (comment) {
        comment.replies = comment.replies.filter(reply => reply.replyId !== replyId);
        this.cdr.detectChanges();
      }
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
        this.successMessageLike = true;
        setTimeout(() => {
          this.successMessageLike = false;
        }, 3000);
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
    post.showCommentInput = !post.showCommentInput;
  }

  deleteComment(postId: number, commentId: number): void {
    if (!commentId) {
      console.error('Comment ID is null or undefined. Post ID:', postId);
      return;
    }

    const userId = parseInt(this.logindata.userid, 10);

    if (this.socket) {
      this.socket.emit('deleteComment', commentId, postId, userId);
    } else {
      console.error('Socket connection is not established.');
    }
  }

  editComment(comment: Comment): void {
    comment.editing = true;
    comment.editText = comment.comment;
  }

  saveEditComment(postId: number, comment: Comment): void {
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }

    const newCommentText = comment.editText || '';
    if (newCommentText && newCommentText !== comment.comment) {
      if (this.socket) {
        this.socket.emit('editComment', {
          postId,
          newCommentText,
          commentId: comment.commentId,
          userId: this.logindata.userid
        });

        comment.comment = newCommentText;
        comment.editing = false;
      }
    } else {
      console.error('No changes detected or invalid input');
    }
  }

  replyToComment(postId: number, comment: Comment): void {
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }

    const replyInput = comment.replyInput?.trim();
    if (this.socket && postId && comment.commentId && replyInput) {
      this.socket.emit('replyToComment', {
        postId,
        parentCommentId: comment.commentId,
        comment: replyInput,
        userId: this.logindata.userid,
        userName: this.logindata.userName

      });

      comment.replyInput = '';
      comment.showReplyInput = false;
    } else {
      console.error('Reply input or parent comment ID is missing or invalid.');
    }
  }

  toggleReplyInput(comment: Comment): void {
    comment.showReplyInput = !comment.showReplyInput;
  }
  editReply(comment: Comment, reply: any): void {
    reply.editing = true;
    reply.editText = reply.comment;
  }

  saveEditReply(postId: number, comment: Comment, reply: any): void {
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }
    const newReplyText = reply.editText?.trim();
    if (newReplyText && newReplyText !== reply.comment) {
      if (this.socket) {
        this.socket.emit('editReply', {
          postId,
          commentId: comment.commentId,
          replyId: reply.replyId,
          newText: newReplyText,
          userId: this.logindata.userid
        });

        reply.comment = newReplyText;
        reply.editing = false;
      }
    } else {
      console.error('No changes detected or invalid input');
    }
  }

  cancelEditReply(reply: any): void {
    reply.editing = false;
    reply.editText = '';
  }


  deleteReply(postId: number, comment: Comment, replyId: number): void {
    if (!replyId) {
      console.error('Reply ID is null or undefined. Post ID:', postId);
      return;
    }

    const userId = parseInt(this.logindata.userid, 10);

    if (this.socket) {
      this.socket.emit('deleteReply', {
        postId,
        replyId,
        userId,
        commentId: comment.commentId
      });

      this.removeReply(postId, comment.commentId, replyId);
    } else {
      console.error('Socket connection is not established.');
    }
  }

  sendMessage(postId: number): void {
    if (!this.isLoggedIn) {
      this.OpenModal();
      return;
    }

    const message = this.messageInput[postId]?.trim();
    if (this.socket && message) {
      this.socket.emit('sendMessage', {
        postId,
        message,
        userId: this.logindata.userid,
        userName: this.logindata.userName
      });

      this.messageInput[postId] = '';
      const post = this.blogPosts.find(p => p.postsid === postId);
      if (post) {
        post.showMessageInput = false;
      }
    } else {
      console.error('Message input is missing or invalid.');
    }
  }

  NewMessages(): void {
    if (this.socket) {
      this.socket.on('newMessage', (newMessage: { postId: number; message: any }) => {
        const post = this.blogPosts.find(p => p.postsid === newMessage.postId);
        if (post) {
          post.comment=newMessage.message;
          this.cdr.detectChanges();
        }
      });
    }
  }
  toggleMessageInput(post: BlogPost): void {
    post.showMessageInput = !post.showMessageInput;
  }
  
  OpenModal() {
    const regModal = document.getElementById('regModal');
    if (regModal) {
      regModal.classList.add('show');
      regModal.setAttribute('style', 'display: block');
    }
  }

}
