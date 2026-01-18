import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
// Facades
import { UserFacade } from 'src/app/store/user/user.facade';

@Component({
  selector: 'app-manage',
  standalone: false,
  templateUrl: './manage.page.html',
  styleUrls: ['./manage.page.scss'],
})
export class ManagePage implements OnInit, OnDestroy {
  user$ = this.userFacade.selectedUser$;

  constructor(
    private userFacade: UserFacade,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.user$.subscribe(user => {
      console.log('Selected user:', user);
    });
  }

  ngOnDestroy() {
    // Clear selected user on destroy
    this.userFacade.selectUser(null);
  }

}
