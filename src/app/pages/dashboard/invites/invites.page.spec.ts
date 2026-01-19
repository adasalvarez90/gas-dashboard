import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvitesPage } from './invites.page';

describe('InvitesPage', () => {
  let component: InvitesPage;
  let fixture: ComponentFixture<InvitesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InvitesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
