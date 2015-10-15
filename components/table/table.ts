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

@Component({
  selector: 'ng2-table, [ng2-table]',
  inputs: ['rows', 'columns', 'config'],
  outputs: ['tableChanged']
})
@View({
  template: `
  <div class="clusterize" style="border-bottom: 1px solid #ddd;">
  <table class="table table-striped table-bordered dataTable" role="grid" style="width: 100%;">
    <thead>
    <tr role="row">
      <th *ng-for="#column of columns" [ng2-th-sortable]="config.sorting"
          [column]="column" (sort-changed)="onSortChanged($event)"
          [style.width]="column.fixedWidth || 'auto'"
          style="border-left: none;border-right: none;">
        {{column.title}}
        <i *ng-if="config && config.sorting && column.sort" class="pull-right glyphicon"
           [ng-class]="{'glyphicon-chevron-down': column.sort === 'desc', 'glyphicon-chevron-up': column.sort === 'asc'}"></i>
      </th>
    </tr>
    </thead>
    <tbody *ng-if="!config || !config.clusterize">
    <tr *ng-for="#row of rows">
      <td *ng-for="#column of columns">{{row[column.name]}}</td>
    </tr>
    </tbody>
  </table>
  <div *ng-if="config && config.clusterize" id="{{config.clusterize.scrollId}}" class="clusterize-scroll" style="max-height: 200px; overflow: auto;"
       [ng2-clusterize]="config.clusterize" [columns]="columns"
       [data-changed]="dataChanged"
       [rows-length]="rows.length"
       (scroll-changed)="onScrollChanged($event)"
       (clusterize-option-changed)="onClusterizeOptionChanged($event)">
    <table class="table table-striped table-bordered dataTable" role="grid" style="width: 100%;border-collapse: collapse;border-spacing: 0;table-layout: fixed;margin-bottom: 0;">
      <tbody id="{{config.clusterize.contentId}}" class="clusterize-content" tabindex="0" style="outline: 0;border-collapse: collapse;border-spacing: 0;">
        <tr [hidden]="!config.clusterize.showNoDataRow" class="{{config.clusterize.noDataClass}}">
          <td *ng-for="#column of columns">{{config.clusterize.noDataText}}</td>
        </tr>
        <tr [hidden]="currentCluster === 0 || !config.clusterize.keepParity" class="clusterize-extra-row clusterize-keep-parity"></tr>
        <tr [hidden]="currentCluster === 0" class="clusterize-extra-row clusterize-top-space" [style.height]="topHeight"></tr>
        <tr *ng-for="#tr of trs" class="clusterize-row">
          <td *ng-for="#column of columns" [style.width]="column.fixedWidth || 'auto'">{{tr[column.name]}}</td>
        </tr>
        <tr [hidden]="currentCluster === lastCluster" class="clusterize-extra-row clusterize-bottom-space" [style.height]="bottomHeight"></tr>
      </tbody>
    </table>
  </div>
</div>
`,
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
  public itemsStart:number = 0;
  public itemsEnd:number = 200;
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
    this.trs = this.rows.slice(this.itemsStart, this.itemsEnd);
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

    if (event.currentCluster !== event.previousCluster) {
      this.itemsStart = event.itemsStart;
      this.itemsEnd = event.itemsEnd;
      let blockPosition = event.blockPosition;
      let removeItemsStart = event.removeItemsStart;
      let removeItemsEnd = event.removeItemsEnd;

      let trs = this.rows.slice(event.itemsStart, event.itemsEnd);
      this.trs.splice(removeItemsStart, removeItemsEnd);

      if (blockPosition === 'append') {
        this.trs = this.trs.concat(trs);
      }
      if (blockPosition === 'prepend') {
        this.trs = trs.concat(this.trs);
      }
    }

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
