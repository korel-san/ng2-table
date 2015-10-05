/// <reference path="../../tsd.d.ts" />

import {
  Directive, EventEmitter, ElementRef,
  CORE_DIRECTIVES, NgClass, FORM_DIRECTIVES,
  HostListener
} from 'angular2/angular2';

@Directive({
  selector: '[ng2-table-paging]',
  inputs: ['config: ng2TablePaging'],
  outputs: ['tableChanged']
})
export class Ng2TablePaging {
  public config:any = {};
  public tableChanged:EventEmitter = new EventEmitter();

  @HostListener('pagechanged', ['$event'])
  onPagechanged(event) {
    this.onChangePage(event);
  }

  onChangePage(event) {
    Object.assign(this.config, event);
    this.tableChanged.next({paging: this.config});
  }
}
