import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CargarCodigosPage } from './cargar-codigos.page';

describe('CargarCodigosPage', () => {
  let component: CargarCodigosPage;
  let fixture: ComponentFixture<CargarCodigosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CargarCodigosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
