import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-blog-posts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, FloatLabelModule, InputTextareaModule, PickerComponent, HttpClientModule],
  templateUrl: './blog-posts.component.html',
  styleUrl: './blog-posts.component.css'
})
export class BlogPostsComponent {
  editerForm: FormGroup;
  formOutput: any={};
  showEmojiPicker: boolean = false;
  isBrowser: boolean;

  constructor(private fb: FormBuilder, private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object) {

    this.isBrowser = isPlatformBrowser(this.platformId);
    this.editerForm = this.fb.group({
      title: [''],
      description: [''],
      image: ['']
    });
  }

  editerFormImage(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editerForm.patchValue({ image: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  addEmoji(event: any) {
    const descControl = this.editerForm.get('description');
    const currentText = descControl?.value || '';
    descControl?.setValue(currentText + event.emoji.native);
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  onSubmit() {
    if(this.isBrowser){
    const authUserId = localStorage.getItem('authUserId');
    if (!authUserId) {
      console.error('User is not logged in.');
      return;
    }

    const formData = {
      title: this.editerForm.get('title')?.value,
      description: this.editerForm.get('description')?.value,
      imageBase64: this.editerForm.get('image')?.value,
      user_id: authUserId
    };

    this.http.post('http://localhost:5000/blog_posts/posting', formData)
      .subscribe({
        next: () => {
          this.editerForm.reset();
        },
        error: (error) => {
          console.error('Error creating blog post:', error);
          if (error.error && error.error.details) {
            console.error('Server details:', error.error.details);
          }
        }
        
      });
  }
}
}
