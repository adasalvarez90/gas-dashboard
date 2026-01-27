import {
	Component,
	OnInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
} from '@angular/core';
import { NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

// RxJS
import { Observable, lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

// Store
import * as fromContract from 'src/app/store/contract';
import { ContractFacade } from 'src/app/store/contract/contract.facade';

import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { Advisor } from 'src/app/store/advisor/advisor.model';

@Component({
	selector: 'app-manage-contract',
	standalone: false,
	templateUrl: './manage.page.html',
	styleUrls: ['./manage.page.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagePage implements OnInit {
	advisors$ = this.advisorFacade.advisors$;
	contract$ = this.contractFacade.selectedContract$;
	contract: fromContract.Contract | null;


	form: FormGroup = this.fb.group({
		uid: [''],

		advisorUid: ['', Validators.required],
		investor: ['', Validators.required],
		email: ['', [Validators.required, Validators.email]],

		capitalMXN: [null, Validators.required],
		yieldPercent: [null, Validators.required],
		liquidity: [null, Validators.required],
		term: [null, Validators.required],

		yieldFrequency: ['', Validators.required],
		payments: ['', Validators.required],

		accountStatus: ['', Validators.required],
		scheme: ['', Validators.required],

		signature: [''],
		deposit: [''],
		depositAccount: [''],
		clientAccount: [''],

		docs: [false],
		docsComments: [''],

		beneficiaries: [''],
		signed: [false],
	});

	constructor(
		private contractFacade: ContractFacade,
		private advisorFacade: AdvisorFacade,
		private navCtrl: NavController,
		private fb: FormBuilder,
		private ref: ChangeDetectorRef,
	) { }

	async ngOnInit() {

		this.contract = await lastValueFrom(
			this.contractFacade.selectedContract$.pipe(take(1)),
		);

		if (this.contract) {
			this.form.patchValue(this.contract);
		} else {
			this.form.reset();
		}

		this.ref.detectChanges();
	}

	create() {
		this.contractFacade.createContract(this.form.value);
		this.exit();
	}

	update() {
		this.contractFacade.updateContract(this.form.value);
		this.exit();
	}

	remove() {
		this.contractFacade.deleteContract(this.form.value.id);
		this.exit();
	}

	exit() {
		this.form.reset();
		this.contractFacade.selectContract(null);
		this.navCtrl.navigateBack(['dashboard', 'contracts']);
	}
}
