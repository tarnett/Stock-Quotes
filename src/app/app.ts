// src/app/app.component.ts
import { Component } from '@angular/core';
import { QuotesComponent } from "./quotes/quotes";

@Component({
  selector: 'app-root',
  template: `<app-quotes></app-quotes>`,
  imports: [QuotesComponent]
})
export class AppComponent {}

