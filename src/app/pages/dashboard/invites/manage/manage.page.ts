import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
// Store features
import * as fromInvite from 'src/app/store/invite';
// Facades
import { InviteFacade } from 'src/app/store/invite/invite.facade';


@Component({
	selector: 'app-manage',
	standalone: false,
	templateUrl: './manage.page.html',
	styleUrls: ['./manage.page.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagePage implements OnInit {
	invite: fromInvite.Invite;
	form: FormGroup = this.fb.group({
		email: ['', [Validators.required, Validators.email]],
		role: ['2', [Validators.required]],
	});

	constructor(
		private inviteFacade: InviteFacade,
		private fb: FormBuilder,
		private navCtrl: NavController,
		private ref: ChangeDetectorRef
	) { }

	ngOnInit() { }

	create() {
		// Parse role
		this.form.value.role = Number(this.form.value.role);
		// Create
		this.inviteFacade.createInvite(this.form.value.email, this.form.value.role);
		// Reset form
		this.form.reset();
		// Detect changes
		this.ref.detectChanges();
		// navigate back to invites list
		this.navCtrl.navigateBack(['dashboard', 'invites']);
	}
}
