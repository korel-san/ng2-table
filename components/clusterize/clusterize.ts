/// <reference path="../../tsd.d.ts" />

import {
  Directive, OnInit, OnChanges, EventEmitter, ElementRef,
  DefaultValueAccessor,
  CORE_DIRECTIVES, FORM_DIRECTIVES, NgClass,
  Renderer,
  ViewEncapsulation, ViewRef,
  ViewContainerRef, TemplateRef, NgFor, NgIf, ComponentRef, Host, QueryList
} from 'angular2/angular2';

@Directive({
  selector: '[ng2-clusterize]',
  properties: [
    'options: ng2Clusterize', 'dataChanged', 'columns', 'startCluster', 'rowsLength'
  ],
  events: ['scrollChanged', 'clusterizeOptionChanged'],
  host: {
    '(scroll)': 'onScrollChanged($event)'
  }
})
export class Clusterize implements OnInit, OnChanges {
  // Default options
  private static CONST_DEFAULT_OPTIONS = {
    itemHeight: 0,
    blockHeight: 0,
    rowsInBlock: 50,
    rowsInCluster: 0,
    rowsAbove: 0,
    clusterHeight: 0,
    blocksInCluster: 4,
    tag: 'tr',
    contentTag: null,
    showNoDataRow: true,
    noDataClass: 'clusterize-no-data',
    noDataText: 'Loading data...',
    keepParity: true,
    clusterize: true
  };

  private _options:any = Clusterize.CONST_DEFAULT_OPTIONS;

  public scrollChanged:EventEmitter = new EventEmitter();
  public clusterizeOptionChanged:EventEmitter = new EventEmitter();
  public rows:Array<any> = [];
  public columns:Array<any> = [];
  public startCluster:number = 0;
  public topHeight:number = 0;
  public bottomHeight:number = 0;

  private previousCluster:number = -1;
  private dataChanged:number;
  private rowsLength:number;
  private scrollTop:number = 0;
  private scrollDebounce:number = 0;
  private pointerEventsSet:boolean = false;
  private i:number = 0;

  // todo: check this variables
  private scrollElem:any;
  private contentElem:any;

  // *** SETTERS AND GETTERS ***
  // setup each received option (the others should be setuped by default)
  set options(opts: any) {
    console.log('set opts: ', opts);
    let changed = false;

    if (typeof opts === 'object') {
      for (let key in opts) {
        if (this._options[key] !== opts[key]) {
          this._options[key] = opts[key];
          changed = true;
        }
      }
    }

    this._options.contentTag = (this.contentElem && this.contentElem.tagName)
        ? this.contentElem.tagName.toLowerCase()
        : this.options.contentTag;

    if (changed) {
      this.clusterizeOptionChanged.next(this.options);
    }
  }

  get options() {
    return this._options;
  }

  get currentCluster() {
    console.log(this.options);
    return Math.floor(this.scrollTop / (this.options.clusterHeight - this.options.blockHeight)) || 0;
  }

  get lastCluster() {
    return Math.floor(this._options.itemHeight * this.rowsLength / this.options.clusterHeight);
  }

  // *** IMPLEMENTS ***
  constructor (@Host() elem:ElementRef) {
    this.scrollElem = elem.nativeElement;
    console.log(this.scrollElem, this.contentElem);
  }

  onChanges(changes) {
  }

  onInit() {
    this.updateOptions();
    this.calcScroll();
  }

  // *** EVENTS HANDLERS ***

  public onScrollChanged(event) {
    if (event) {
      event.preventDefault();
    }

    this.updateOptions();
    this.calcScroll();
  }

  public updateOptions() {
    if (!this.contentElem) {
      this.contentElem = this.scrollElem.querySelector('#' + this.options.contentId);
    };

    let nodes = this.contentElem ? this.contentElem.querySelectorAll('.clusterize-row') : [];

    if (!nodes.length) {
      return;
    }

    let itemHeight = nodes[Math.ceil(nodes.length / 2)].offsetHeight;
    if (this.options.tag === 'tr' && this.getStyle('borderCollapse', this.contentElem) !== 'collapse') {
      itemHeight += parseInt(this.getStyle('borderSpacing', this.contentElem), 10) || 0;
    }
    let blockHeight = itemHeight * this.options.rowsInBlock;
    let rowsInCluster = this.options.blocksInCluster * this.options.rowsInBlock;
    let clusterHeight = this.options.blocksInCluster * blockHeight;

    this.options = {
      itemHeight : itemHeight,
      blockHeight: blockHeight,
      rowsInCluster: rowsInCluster,
      clusterHeight: clusterHeight
    };
  }

  // *** PUBLIC FUNCTIONS ***
  public calcScroll() {
    if (this.options.clusterize) {
      this.scrollTop = this.scrollElem.scrollTop;
      let itemsStart = Math.max((this.options.rowsInCluster - this.options.rowsInBlock) * this.currentCluster, 0);
      let itemsEnd = itemsStart + this.options.rowsInCluster;
      let topSpace = itemsStart * this.options.itemHeight;
      let bottomSpace = (this.rowsLength - itemsEnd) * this.options.itemHeight;

      console.log('currentCluster: ', this.currentCluster);
      console.log('previousCluster: ', this.previousCluster);
      console.log('scrollTop: ', this.scrollTop);
      this.scrollChanged.next({
        currentCluster: this.currentCluster,
        previousCluster: this.previousCluster,
        lastCluster: this.lastCluster,
        topHeight: topSpace,
        bottomHeight: bottomSpace,
        itemsStart: itemsStart,
        itemsEnd: itemsEnd,
        blockPosition: this.currentCluster > this.previousCluster ? 'append' : 'prepend',
        removeItemsStart: this.currentCluster > this.previousCluster ? 0 : -this.options.rowsInBlock,
        removeItemsEnd: this.currentCluster > this.previousCluster ? this.options.rowsInBlock : this.options.rowsInCluster
      });
      this.previousCluster = this.currentCluster;
    }

  }

  // *** PRIVATE FUNCTIONS ***

  private clearSettings() {
    this.options = Clusterize.CONST_DEFAULT_OPTIONS;
  }

  public getStyle(prop, elem) {
    return window.getComputedStyle ? window.getComputedStyle(elem)[prop] : elem.currentStyle[prop];
  }
}
