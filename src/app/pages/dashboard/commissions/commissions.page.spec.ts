import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommissionsPage } from './commissions.page';

describe('CommissionsPage', () => {
  let component: CommissionsPage;
  let fixture: ComponentFixture<CommissionsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CommissionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
