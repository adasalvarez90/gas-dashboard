import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdvisorsPage } from './advisors.page';

describe('AdvisorsPage', () => {
  let component: AdvisorsPage;
  let fixture: ComponentFixture<AdvisorsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdvisorsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
