import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopHeader } from './top-header';

describe('TopHeader', () => {
  let component: TopHeader;
  let fixture: ComponentFixture<TopHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(TopHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
