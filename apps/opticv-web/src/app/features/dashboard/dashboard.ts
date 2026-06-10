import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CvFileList } from './components/cv-file-list/cv-file-list';
import { OptimizationList } from './components/optimization-list/optimization-list';

@Component({
  selector: 'app-dashboard',
  imports: [TabsModule, CvFileList, OptimizationList],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
})
export class Dashboard {}
