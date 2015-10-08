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
    keepParity: true
  };

  private _options:any = Clusterize.CONST_DEFAULT_OPTIONS;

  public scrollChanged:EventEmitter = new EventEmitter();
  public clusterizeOptionChanged:EventEmitter = new EventEmitter();
  public rows:Array<any> = [];
  public columns:Array<any> = [];
  public startCluster:number = 0;
  public topHeight:number = 0;
  public bottomHeight:number = 0;

  private dataChanged:number;
  private rowsLength:number;
  private rowsAbove:number = 0;
  private scrollTop:number = 0;
  private lastCluster:number = 0;
  private scrollDebounce:number = 0;
  private resizeDebounce:number = 0;
  private pointerEventsSet:boolean = false;

  // todo: check this variables
  private scrollId:string = '';
  private contentId:string = '';
  private _scrollElem:any;
  private _contentElem:any;

  // *** SETTERS AND GETTERS ***
  // setup each received option (the others should be setuped by default)
  set options(opts: any) {
    let changed = false;

    if (typeof opts === 'object') {
      for (let key in opts) {
        if (this._options[key] !== opts[key]) {
          this._options[key] = opts[key];
          changed = true;
        }
      }
    }

    if (changed) {
      this.clusterizeOptionChanged.next(this.options);
    }
  }

  get options() {
    return this._options;
  }

  set scrollElem(scrollId) {
    this._scrollElem = document.getElementById(scrollId);

    if (!this._scrollElem) {
      throw new Error('Error! Could not find scroll element');
    }
  }

  get scrollElem() {
    return this._scrollElem;
  }

  set contentElem(contentId) {
    this._contentElem = document.getElementById(contentId);

    if (!this._contentElem) {
      throw new Error('Error! Could not find content element');
    }
  }

  get contentElem() {
    return this._contentElem;
  }

  get currentCluster() {
    return Math.floor(this.scrollTop / (this.options.clusterHeight - this.options.blockHeight)) || 0;
  }

  // *** IMPLEMENTS ***
  // constructor (@Host() directive:Clusterize, @Query(DirectiveType) query:QueryList<Clusterize>) {
  //  console.log(arguments);
  // }

  onChanges(changes) {
    console.log('onChanges: ', changes);

    if (!this.rowsLength) {
      this.clearSettings();
      return;
    }

    let nodes = this.contentElem ? this.contentElem.children : [];

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
      clusterHeight: clusterHeight,
      itemHeight: itemHeight,
      blockHeight: blockHeight,
      rowsInCluster: rowsInCluster
    };
  }

  onInit() {
    this.updateEnvironment();
  }

  // *** EVENTS HANDLERS ***

  public onScrollChanged(event) {
    if (event) {
      event.preventDefault();
    }

    this.scrollChanged.next({
      currentCluster: this.startCluster,
      lastCluster: this.lastCluster,
      topHeight: this.topHeight,
      bottomHeight: this.bottomHeight,
      countRows: 50
    });
  }

  // *** PUBLIC FUNCTIONS ***
  public updateEnvironment() {
    if (!this.rowsLength) {
      this.clearSettings();
      return;
    }

    if (this.options) {
      this.scrollElem = this.options.scrollId;
      this.contentElem = this.options.contentId;
      this.options = {
        contentTag: (this.contentElem && this.contentElem.tagName)
          ? this.contentElem.tagName.toLowerCase()
          : this.options.contentTag
      };

      let itemsStart = Math.max((this.options.rowsInCluster - this.options.rowsInBlock) * this.currentCluster, 0);
      let itemsEnd = itemsStart + this.options.rowsInCluster;
      let topSpace = itemsStart * this.options.itemHeight;
      let bottomSpace = (this.rowsLength - itemsEnd) * this.options.itemHeight;
      // let rowsAbove = itemsStart;

      this.scrollChanged.next({
        currentCluster: this.currentCluster,
        lastCluster: this.lastCluster,
        topHeight: topSpace,
        bottomHeight: bottomSpace,
        // rowsAbove: this.rowsAbove,
        itemsStart: itemsStart,
        itemsEnd: itemsEnd
      });
    }
  }

  // *** PRIVATE FUNCTIONS ***

  private clearSettings() {
    this.options = Clusterize.CONST_DEFAULT_OPTIONS;
  }

  private getNumberRowsAbove() {
    let data = this.generate();
    this.rows = data.rows;

    if (this.options.contentTag === 'ol') {
      this.options.rowsAbove = data.rowsAbove;
      this.contentElem.setAttribute('start', data.rowsAbove);
    }
  }

  private resizeEv() {
    // clearTimeout(this.resizeDebounce);
    // this.resizeDebounce = setTimeout(this.refresh, 100);
  }

  private scrollEv() {
    if (this.contentElem) {
      if (!this.pointerEventsSet) {
        this.contentElem.style.pointerEvents = 'none';
      }
      this.pointerEventsSet = true;
      clearTimeout(this.scrollDebounce);
      this.scrollDebounce = setTimeout(function () {
        this.contentElem.style.pointerEvents = 'auto';
        this.pointerEventsSet = false;
      }, 50);
    }
  }

  public update() {
    this.scrollTop = this.scrollElem.scrollTop;
    // fixes #39
    if (this.rowsLength * this.options.itemHeight < this.scrollTop) {
      this.scrollElem.scrollTop = 0;
      this.lastCluster = 0;
    }
    this.scrollElem.scrollTop = this.scrollTop;
  }

  public getRowsHeight() {
    let opts = this.options;
    let prevItemHeight = opts.itemHeight;

    opts.clusterHeight = 0;

    if (!this.rowsLength) {
      return;
    }

    let nodes = this.contentElem.children || [];
    if (nodes.length) {
      opts.itemHeight = nodes[Math.ceil(nodes.length / 2)].offsetHeight;
    }

    // consider table's border-spacing
    if (opts.tag === 'tr' && this.getStyle('borderCollapse', this.contentElem) !== 'collapse') {
      opts.itemHeight += parseInt(this.getStyle('borderSpacing', this.contentElem), 10) || 0;
    }

    opts.blockHeight = opts.itemHeight * opts.rowsInBlock;
    opts.rowsInCluster = opts.blocksInCluster * opts.rowsInBlock;
    opts.clusterHeight = opts.blocksInCluster * opts.blockHeight;

    return prevItemHeight !== opts.itemHeight;
  }

  // generate cluster for current scroll position
  public generate() {
    let rows = this.rows;
    let clusterNum = this.currentCluster;
    let opts = this.options;
    let rowsLen = this.rowsLength;

    if (rowsLen < opts.rowsInBlock) {
      return {
        rowsAbove: 0,
        rows: rowsLen ? this.rows : []
      };
    }

    if (!opts.clusterHeight) {
      this.getRowsHeight();
    }

    let itemsStart = Math.max((opts.rowsInCluster - opts.rowsInBlock) * clusterNum, 0);
    let itemsEnd = itemsStart + opts.rowsInCluster;
    let topSpace = itemsStart * opts.itemHeight;
    let bottomSpace = (rowsLen - itemsEnd) * opts.itemHeight;
    let thisClusterRows = [];
    let rowsAbove = itemsStart;

    rowsAbove++;

    for (let i = itemsStart; i < itemsEnd; i++) {
      if (rows[i]) {
        thisClusterRows.push(rows[i]);
      }
    }

    return {
      rowsAbove: rowsAbove,
      rows: thisClusterRows
    };
  }

  // support functions
  public on(evt, element, fnc) {
    return element.addEventListener ? element.addEventListener(evt, fnc, false) : element.attachEvent('on' + evt, fnc);
  }
  public getStyle(prop, elem) {
    return window.getComputedStyle ? window.getComputedStyle(elem)[prop] : elem.currentStyle[prop];
  }
}
