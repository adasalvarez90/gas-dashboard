import {
	Component,
	OnDestroy,
	OnInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
} from '@angular/core';
import { NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
// NgRx
import { Store } from '@ngrx/store';
// Rxjs
import { lastValueFrom, Observable } from 'rxjs';
import { take, map, tap } from 'rxjs/operators';
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
		private userStore: Store<fromUser.State>,
		private userFacade: UserFacade,
		private navCtrl: NavController,
		private fb: FormBuilder,
		private ref: ChangeDetectorRef
	) {}

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

	create() {
		// Create new user
		this.userFacade.createUser(this.form.value);
		// Exit
		this.exit();
	}

	update() {
		// Update user
		this.userFacade.updateUser(this.form.value);
		// Exit
		this.exit();
	}

	remove() {
		// Delete user
		this.userFacade.deleteUser(this.form.value.uid);
		// Exit
		this.exit();
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
