import { TestBed } from '@angular/core/testing';
import { TrancheDepositService } from './tranche-deposit.service';
import { DepositFirestoreService } from 'src/app/services/deposit-firestore.service';
import { TrancheFirestoreService } from 'src/app/services/tranche-firestore.service';
import { ContractFirestoreService } from 'src/app/services/contract-firestore.service';
import { CommissionConfigFirestoreService } from 'src/app/services/commission-config-firestore.service';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';
import { DepositOrchestratorService } from './deposit-orchestrator.service';
import { RoleResolverService } from '../engines/role-resolver.service';

describe('TrancheDepositService', () => {
  let service: TrancheDepositService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TrancheDepositService,
        { provide: DepositFirestoreService, useValue: {} },
        { provide: TrancheFirestoreService, useValue: {} },
        { provide: ContractFirestoreService, useValue: {} },
        { provide: CommissionConfigFirestoreService, useValue: {} },
        { provide: CommissionPaymentFirestoreService, useValue: {} },
        { provide: DepositOrchestratorService, useValue: {} },
        { provide: RoleResolverService, useValue: {} }
      ]
    });
    service = TestBed.inject(TrancheDepositService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
