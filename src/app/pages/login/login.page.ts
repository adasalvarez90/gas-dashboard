// Libraries
import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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
		// private authStore: Store<fromAuth.State>,
		private navCtrl: NavController
	) { }

	ngOnInit() {
	}

	public login() {
		// Validate the form it's valid
		if (this.form.valid) {
			console.log('Login', this.form.value);
			// Get the value and dispatch the login action
			// this.authStore.dispatch(fromAuth.actions.login(this.form.value));
		}
	}

	public recovery() {
		// Go to the users pages
		this.navCtrl.navigateForward(['recovery']);
	}
}
