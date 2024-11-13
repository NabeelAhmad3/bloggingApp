import { authGuard } from './auth.guard';
import { Routes } from '@angular/router';
import { HomeComponent } from './AllComponents/home/home.component';
import { BlogPostsComponent } from './AllComponents/blog-posts/blog-posts.component';
import { MyBlogsComponent } from './AllComponents/my-blogs/my-blogs.component';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: 'blog_posts', component: BlogPostsComponent, canActivate: [authGuard] },
    { path: 'my_blogs', component: MyBlogsComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: 'home' }
];
