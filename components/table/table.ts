/// <reference path="../../tsd.d.ts" />

import {
  Component, View,
  Directive,
  EventEmitter, ElementRef,
  CORE_DIRECTIVES, NgClass, NgFor, NgIf,
  FORM_DIRECTIVES,
  ViewEncapsulation,
  OnInit, OnChanges
} from 'angular2/angular2';

import {Ng2ThSortable} from './sorting';
import {Clusterize} from '../clusterize/clusterize';

// todo: use lodash#defaults for configuration
// todo: expose an option to change default configuration

// webpack html imports
let template = require('./table.html');

@Component({
  selector: 'ng2-table, [ng2-table]',
  inputs: ['rows', 'columns', 'config'],
  outputs: ['tableChanged']
})
@View({
  template: template,
  directives: [Ng2ThSortable, Clusterize, NgClass, NgIf, NgFor, CORE_DIRECTIVES, FORM_DIRECTIVES]
})
export class Table implements OnInit, OnChanges {
  // Table values
  public rows:Array<any> = [];
  private _columns:Array<any> = [];
  public config:any = {};

  public trs:Array<any> = [];
  public currentCluster:number = 0;
  public lastCluster:number = 0;
  public topHeight:number = 0;
  public bottomHeight:number = 0;
  public rowsAbove:number = 0;
  public countRows:number = 50;
  private dataChanged:number;

  // Outputs (Events)
  public tableChanged:EventEmitter = new EventEmitter();

  public set columns(values:Array<any>) {
    values.forEach((value) => {
      let column = this._columns.find((col) => col.name === value.name);
      if (column) {
        Object.assign(column, value);
      }
      if (!column) {
        this._columns.push(value);
      }
    });
  }

  public get columns() {
    return this._columns;
  }

  public get configColumns() {
    let sortColumns = [];

    this.columns.forEach((column) => {
      if (column.sort) {
        sortColumns.push(column);
      }
    });

    return {columns: sortColumns};
  }

  onInit() {
    console.log(this.config);
  }

  onChanges(changes) {
    if (changes.rows) {
      this.dataChanged = Date.now();
    }
  }

  onSortChanged(column) {
    this.columns = [column];
    this.onChangeTable({sorting: this.configColumns});
  }

  onScrollChanged(event) {
    console.log('onScrollChanged:', event);

    this.currentCluster = event.currentCluster;
    this.lastCluster = event.lastCluster;
    this.topHeight = event.topHeight;
    this.bottomHeight = event.bottomHeight;
    this.rowsAbove = event.rowsAbove;
    this.countRows = event.countRows;

    this.trs = this.rows.slice(event.itemsStart, event.itemsEnd);

    this.onChangeTable({clusterize: this.config.clusterize});
  }

  onClusterizeOptionChanged(event) {
    if (event) {
      this.config.clusterize = event;
    }

    this.onChangeTable({clusterize: this.config.clusterize});
  }

  onChangeTable(event) {
    this.tableChanged.next(event);
  }
}
