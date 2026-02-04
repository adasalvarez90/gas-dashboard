import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
// Rxjs
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
// Store features
import * as fromUser from 'src/app/store/user';
// Facades
import { UserFacade } from 'src/app/store/user/user.facade';

@Component({
	selector: 'app-manage',
	standalone: false,
	templateUrl: './manage.page.html',
	styleUrls: ['./manage.page.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagePage implements OnInit {
	user$ = this.userFacade.selectedUser$;
	user: fromUser.User;
	form: FormGroup = this.fb.group({
		uid: [''],
		name: ['', [Validators.required]],
		email: ['', [Validators.required, Validators.email]],
		role: ['', [Validators.required]],
	});

	constructor(
		private userFacade: UserFacade,
		private navCtrl: NavController,
		private fb: FormBuilder,
		private alertCtrl: AlertController,
		private ref: ChangeDetectorRef
	) { }

	async ngOnInit() {
		// Get last value of selected user
		this.user = await lastValueFrom(
			this.userFacade.selectedUser$.pipe(take(1)),
		);

		if (this.user) {
			this.form.patchValue({
				uid: this.user.uid,
				name: this.user.name,
				email: this.user.email,
				role: this.user.role.toString(),
			});
		} else {
			this.form.reset();
		}

		// Detect changes
		this.ref.detectChanges();
	}

	async create() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Crear usuario`,
			message: `¿Desea crear el usuario ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Parse rol from string to number
					form.role = Number(form.role);
					// Create new user
					this.userFacade.createUser(form);
					// Exit
					this.exit();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}

	async update() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Editar usuario`,
			message: `¿Desea editar el usuario ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Parse rol from string to number
					form.role = Number(form.role);
					// Create new user
					this.userFacade.updateUser(form);
					// Exit
					this.exit();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}

	async remove() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Eliminar usuario`,
			message: `¿Desea eliminar el usuario ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.userFacade.deleteUser(form.uid);
					// Exit
					this.exit();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}

	exit() {
		// Reset form
		this.form.reset();
		// Clear selected user
		this.userFacade.selectUser(null);
		// navigate back to users list
		this.navCtrl.navigateBack(['dashboard', 'users']);
	}
}
