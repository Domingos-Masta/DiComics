import { Component, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-keyboard-help.component',
  imports: [],
  templateUrl: './keyboard-help.component.html',
  styleUrl: './keyboard-help.component.scss',
})
export class KeyboardHelpComponent {
    close = new EventEmitter();
}
