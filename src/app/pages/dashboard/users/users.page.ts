import { Component, OnInit } from '@angular/core';
import { UserFacade } from 'src/app/store/user/user.facade';
import { AuthFacade } from 'src/app/store/auth/auth.facade';
import { NavController } from '@ionic/angular';
@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit {
  users$ = this.userFacade.users$;
  currentUser$ = this.authFacade.user$;

  // Search term
  search$ = this.userFacade.search$;
  total$ = null//this.userFacade.total$;

  constructor(
    private userFacade: UserFacade,
    private authFacade: AuthFacade,
    private navCtrl: NavController
  ) {}

  ngOnInit() {}

  filter(event: any) {
    // get search term
    const searchTerm = event.detail.value;
    // dispatch search term
    this.userFacade.searchText(searchTerm);
  }

  // Add new user
  addUser() {
    // clear selected user
    this.userFacade.selectUser(null);
    // navigate to manage page
		this.navCtrl.navigateForward(['dashboard', 'profile', 'manage']);
  }

  editUser(user: any) {
    // set selected user
    this.userFacade.selectUser(user);
    // navigate to manage page
    this.navCtrl.navigateForward(['dashboard', 'profile', 'manage']);
  }

  delete(uid: string) {
    // delete user
    this.userFacade.deleteUser(uid);
  }
}
