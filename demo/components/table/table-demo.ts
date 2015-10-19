/// <reference path='../../../tsd.d.ts' />

import {
  Component, View, EventEmitter, OnInit, NgIf,
  CORE_DIRECTIVES, NgClass, FORM_DIRECTIVES
} from 'angular2/angular2';

import {Ng2Table} from '../../../components/index';
import {TableData} from './table-data';

// webpack html imports
let template = require('./table-demo.html');

@Component({
  selector: 'table-demo'
})
@View({
  template: template,
  directives: [Ng2Table, NgClass, NgIf, CORE_DIRECTIVES, FORM_DIRECTIVES]
})
export class TableDemo implements OnInit {
  public rows:Array<any> = [];
  public columns:Array<any> = [
    {title: 'Indx', name: 'indx', sort: 'asc', fixedWidth: '10%'},
    {title: 'Name', name: 'name', fixedWidth: '20%'},
    {title: 'Position', name: 'position', sort: false, fixedWidth: '20%'},
    {title: 'Office', name: 'office', fixedWidth: '20%'},
    {title: 'Extn.', name: 'ext', fixedWidth: '10%'},
    {title: 'Start date', name: 'startDate', fixedWidth: '10%'},
    {title: 'Salary', name: 'salary', fixedWidth: '10%'}
  ];
  public page:number = 1;
  public itemsPerPage:number = 10;
  public maxSize:number = 5;
  public numPages:number = 1;
  public length:number = 0;

  public config:any = {
    // paging: true,
    // paging: {page: 1, itemsPerPage: 10, maxSize: 5},
    sorting: {columns: []},
    filtering: {filterString: '', columnName: 'position'},
    clusterize: {
      scrollId: 'scrollElement',
      contentId: 'contentElement'
    }
  };

  private data:Array<any> = TableData;

  constructor() {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i].indx = i;
      this.data[i].name = i + ' ' + this.data[i].name;
    }

    console.log('count: ', this.data.length);
    this.length = this.data.length;
  }

  onInit() {
    this.onChangeTable(this.config);
  }

  changePage(data, config) {
    if (!config.paging) {
      return data;
    }

    let start = (this.page - 1) * this.itemsPerPage;
    let end = this.itemsPerPage > -1 ? (start + this.itemsPerPage) : data.length;
    return data.slice(start, end);
  }

  changeSort(data, config) {
    if (!config.sorting || !this.config.sorting.columns.length) {
      return data;
    }

    // simple sorting
    return data.sort((previous, current) => {
      let columns = this.config.sorting.columns;
      for (let i = 0; i < columns.length; i++) {
        let columnName = columns[i].name;

        if (previous[columnName] > current[columnName]) {
          return columns[i].sort === 'desc' ? -1 : 1;
        }
        if (previous[columnName] < current[columnName]) {
          return columns[i].sort === 'asc' ? -1 : 1;
        }
      }
      return 0;
    });
  }

  changeFilter(data, config) {
    if (!config.filtering) {
      return data;
    }

    let filteredData = data.filter(item =>
      item[config.filtering.columnName].match(this.config.filtering.filterString));

    return filteredData;
  }

  onChangeTable(config) {
    if (config.filtering) {
      Object.assign(this.config.filtering, config.filtering);
    }
    if (config.sorting) {
      Object.assign(this.config.sorting, config.sorting);
    }
    if (config.paging) {
      this.page = config.paging.page;
      this.itemsPerPage = config.paging.itemsPerPage;
    }

    let filteredData = this.changeFilter(this.data, this.config);
    let sortedData = this.changeSort(filteredData, this.config);
    this.rows = this.changePage(sortedData, this.config);
    this.length = sortedData.length;
  }
}
