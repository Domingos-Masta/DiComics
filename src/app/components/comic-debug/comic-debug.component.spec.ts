import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComicDebugComponent } from './comic-debug.component';

describe('ComicDebugComponent', () => {
  let component: ComicDebugComponent;
  let fixture: ComponentFixture<ComicDebugComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComicDebugComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComicDebugComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
