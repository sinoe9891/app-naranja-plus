import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScanInputPage } from './scan-input.page';

describe('ScanInputPage', () => {
  let component: ScanInputPage;
  let fixture: ComponentFixture<ScanInputPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanInputPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
