// Libraries
import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// Facade
import { AuthFacade } from 'src/app/store/auth/auth.facade';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  // Form
  public form: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthFacade,
    private navCtrl: NavController
  ) {}

  ngOnInit() {}

  public login() {
    // Validate the form it's valid
    if (this.form.valid) {
      // Get the value and dispatch the login action
      this.auth.login(this.form.value.username, this.form.value.password);
    }
  }

  public loginWithGoogle() {
    this.auth.loginWithGoogle();
  }

  public recovery() {
    // Go to the users pages
    this.navCtrl.navigateForward(['recovery']);
  }
}
