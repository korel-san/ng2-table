/// <reference path="../../tsd.d.ts" />

import {
  Directive, EventEmitter, ElementRef, Renderer,
  CORE_DIRECTIVES, NgClass, FORM_DIRECTIVES,
  HostListener
} from 'angular2/angular2';

import {setProperty} from 'angular2/ts/src/core/forms/directives/shared';

@Directive({
  selector: '[ng2-table-filter]',
  inputs: ['config: ng2TableFilter'],
  outputs: ['tableChanged']
})
export class Ng2TableFilter {
  public config:any = {
    filterString: '',
    columnName: 'name'
  };

  @HostListener('input', ['$event.target.value'])
  onInput(event) {
    this.onChangeFilter(event);
  }

  public tableChanged:EventEmitter = new EventEmitter();

  constructor (private element:ElementRef, private renderer:Renderer) {
    // Set default value for filter
    setProperty(this.renderer, this.element, 'value', this.config.filterString);
  }

  onChangeFilter(event) {
    this.config.filterString = event;
    this.tableChanged.next({'filtering': this.config});
  }
}
