import { Component } from '@angular/core';
import { AuthFacade } from './store/auth/auth.facade';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private auth: AuthFacade) {}

  ngOnInit() {
    this.auth.restoreSession();
  }
}
