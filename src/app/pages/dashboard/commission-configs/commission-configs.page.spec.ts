import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommissionConfigsPage } from './commission-configs.page';

describe('CommissionConfigsPage', () => {
  let component: CommissionConfigsPage;
  let fixture: ComponentFixture<CommissionConfigsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CommissionConfigsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
