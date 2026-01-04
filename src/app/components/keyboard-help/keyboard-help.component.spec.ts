import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyboardHelpComponent } from './keyboard-help.component';

describe('KeyboardHelpComponent', () => {
  let component: KeyboardHelpComponent;
  let fixture: ComponentFixture<KeyboardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyboardHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KeyboardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
