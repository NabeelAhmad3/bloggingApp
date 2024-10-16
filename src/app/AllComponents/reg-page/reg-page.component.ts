import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTabsModule} from '@angular/material/tabs';
import { SignUpComponent } from "../sign-up/sign-up.component";
import { LogInComponent } from "../log-in/log-in.component";

@Component({
  selector: 'app-reg-page',
  standalone: true,
  imports: [CommonModule, MatTabsModule, SignUpComponent, LogInComponent],
  templateUrl: './reg-page.component.html',
  styleUrl: './reg-page.component.css'
})
export class RegPageComponent {
  currentView: string = 'login';

  TabChange(index: number): void {
    this.currentView = index === 0 ? 'login' : 'signup';
  }

}
