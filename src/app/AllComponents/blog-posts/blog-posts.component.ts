import { HttpClient } from '@angular/common/http';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AngularEditorModule, AngularEditorConfig } from '@kolkov/angular-editor';

@Component({
  selector: 'app-blog-posts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, PickerComponent, AngularEditorModule],
  templateUrl: './blog-posts.component.html',
  styleUrls: ['./blog-posts.component.css']
})
export class BlogPostsComponent {
  editerForm: FormGroup;
  formOutput: any = {};
  showEmojiPicker: boolean = false;
  isBrowser: boolean;

  successMessage: boolean = false;

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '100px',
    maxHeight: '300px',
    placeholder: 'Enter text here...',
    defaultFontName: 'Arial',
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' }
    ],
    toolbarHiddenButtons: [
      ['insertImage', 'insertVideo']
    ]

  };

  constructor(private fb: FormBuilder, private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.editerForm = this.fb.group({
      description: [''],
      image: ['']
    });
  }

  editerFormImage(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editerForm.patchValue({ image: e.target.result }); //patchValue is method in FormGroup that allows to update specific fields in a form without affecting others.
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
    if (this.isBrowser) {
      const authUserId = localStorage.getItem('authUserId');
      if (!authUserId) {
        console.error('User is not logged in.');
        return;
      }

      const formData = {
        description: this.editerForm.get('description')?.value,
        imageBase64: this.editerForm.get('image')?.value,
        user_id: authUserId
      };

      this.http.post('http://localhost:5000/blog_posts/posting', formData)
        .subscribe({
          next: () => {
            this.successMessage = true;
            setTimeout(() => {
              this.successMessage = false;
            }, 3000);
            this.editerForm.reset();
          },
          error: (error) => {
            console.error('Error creating blog post:', error);
          }
        });
    }
  }
}