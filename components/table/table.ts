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
  <div *ng-if="config && config.clusterize" id="{{config.clusterize.scrollId}}" class="clusterize-scroll" style="max-height: 740px; overflow: auto;"
       [ng2-clusterize]="config.clusterize" [columns]="columns"
       [data-changed]="dataChanged"
       [rows-length]="rows.length"
       (scroll-changed)="onScrollChanged($event)"
       (clusterize-option-changed)="onClusterizeOptionChanged($event)">
    <table class="table table-striped table-bordered dataTable" role="grid" style="width: 100%;border-collapse: collapse;border-spacing: 0;table-layout: fixed;margin-bottom: 0;">
      <thead>
        <tr>
          <th  *ng-for="#column of columns" [style.width]="column.fixedWidth || 'auto'" style="height:0px;padding:0px;border:0px;max-height:0px;"></th>
        </tr>
      </thead>
      <tbody id="{{config.clusterize.contentId}}" class="clusterize-content" tabindex="0" style="outline: 0;border-collapse: collapse;border-spacing: 0;">
        <tr [hidden]="!config.clusterize.showNoDataRow" class="{{config.clusterize.noDataClass}}">
          <td *ng-for="#column of columns">{{config.clusterize.noDataText}}</td>
        </tr>
        <tr [hidden]="currentCluster === 0 || !config.clusterize.keepParity" class="clusterize-extra-row clusterize-keep-parity"></tr>
        <tr [hidden]="currentCluster === 0" class="clusterize-extra-row clusterize-top-space" [style.height]="topHeight"></tr>

        <tr *ng-for="#tr of block1" class="clusterize-row block1 previous2">
          <td *ng-for="#column of columns">{{tr[column.name]}}</td>
        </tr>
        <tr *ng-for="#tr of block2" class="clusterize-row block2 previous">
          <td *ng-for="#column of columns">{{tr[column.name]}}</td>
        </tr>
        <tr *ng-for="#tr of block3" class="clusterize-row block3 current">
          <td *ng-for="#column of columns">{{tr[column.name]}}</td>
        </tr>
        <tr *ng-for="#tr of block4" class="clusterize-row block4 next">
          <td *ng-for="#column of columns">{{tr[column.name]}}</td>
        </tr>
        <tr *ng-for="#tr of block5" class="clusterize-row block5 next2">
          <td *ng-for="#column of columns">{{tr[column.name]}}</td>
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

  public block1:Array<any> = [];
  public block2:Array<any> = [];
  public block3:Array<any> = [];
  public block4:Array<any> = [];
  public block5:Array<any> = [];
  public currentCluster:number = 0;
  public lastCluster:number = 0;
  public topHeight:string = '0px';
  public bottomHeight:string = '0px';
  public itemsStart:number = 0;
  public itemsEnd:number = 20;
  private dataChanged:number;

  private timeout:any;

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
  }

  onChanges(changes) {
    if (changes.rows) {
      if (this.config.clusterize) {
        this.config.clusterize.showNoDataRow = false;
        if (this.timeout) {
          this.timeout = null;
        }
        this.timeout = setTimeout(this.updateBlocks(), 100);
      }
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
    this.topHeight = event.topHeight + 'px';
    this.bottomHeight = event.bottomHeight + 'px';

    this.itemsStart = event.itemsStart;
    this.itemsEnd = event.itemsStart + this.config.clusterize.rowsInBlock;

    if (this.timeout) {
      this.timeout = null;
    }
    this.timeout = setTimeout(this.updateBlocks(), 100);

    this.onChangeTable({clusterize: this.config.clusterize});
  }

  private updateBlocks() {
    let self = this;

    return function _updateBlocks() {
      let itemsStart = self.itemsStart;
      let itemsEnd = itemsStart + self.config.clusterize.rowsInBlock;

      // current
      self.block3 = self.rows.slice(itemsStart, itemsEnd);

      // next
      if (itemsEnd !== self.rows.length) {
        itemsStart = itemsEnd;
        itemsEnd = itemsStart + self.config.clusterize.rowsInBlock;
        self.block4 = self.rows.slice(itemsStart, itemsEnd);
      }

      // next2
      if (itemsEnd !== self.rows.length) {
        itemsStart = itemsEnd;
        itemsEnd = itemsStart + self.config.clusterize.rowsInBlock;
        self.block5 = self.rows.slice(itemsStart, itemsEnd);
      }

      itemsEnd = self.itemsStart;
      // previous
      if (itemsEnd > self.config.clusterize.rowsInBlock) {
        itemsStart = itemsEnd - self.config.clusterize.rowsInBlock - 1;
        self.block2 = self.rows.slice(itemsStart, itemsEnd);
        itemsEnd = itemsStart;
      }

      // previous2
      if (itemsEnd > self.config.clusterize.rowsInBlock) {
        itemsStart = itemsEnd - self.config.clusterize.rowsInBlock - 1;
        self.block1 = self.rows.slice(itemsStart, itemsEnd);
      }
    };
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
