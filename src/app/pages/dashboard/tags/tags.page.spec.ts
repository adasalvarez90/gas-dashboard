import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagsPage } from './tags.page';

describe('TagsPage', () => {
  let component: TagsPage;
  let fixture: ComponentFixture<TagsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TagsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
