/// <reference path="../../tsd.d.ts" />

import {
  Directive, OnInit, OnChanges, EventEmitter, ElementRef,
  DefaultValueAccessor,
  CORE_DIRECTIVES, FORM_DIRECTIVES, NgClass,
  Renderer,
  ViewEncapsulation, ViewRef,
  ViewContainerRef, TemplateRef, NgFor, NgIf, ComponentRef,
} from 'angular2/angular2';

@Directive({
  selector: '[ng2-clusterize]',
  properties: [
    'options: ng2Clusterize', 'data', 'columns', 'startCluster'
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
  public data:Array<any> = [];
  public startCluster:number = 0;
  public topHeight:number = 0;
  public bottomHeight:number = 0;

  private rowsAbove:number = 0;
  private cache:any = {data: ''};
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

  // SETTERS AND GETTERS
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

  set scrollElem (scrollId:string) {
    this._scrollElem = document.getElementById(scrollId);

    if (!this._scrollElem) {
      throw new Error('Error! Could not find scroll element');
    }
  }

  get scrollElem() {
    return this._scrollElem;
  }

  set contentElem(contentId:string) {
    this._contentElem = document.getElementById(contentId);

    if (!this._contentElem) {
      throw new Error('Error! Could not find content element');
    }
  }

  get contentElem() {
    return this._contentElem;
  }

  // IMPLEMENTS
  onChanges(changes) {
    console.log('this.scrollElem.scrollTop: ', this.scrollElem);
    console.log('this.contentElem.scrollTop: ', this.contentElem);
    console.log(changes);
  }

  onInit() {
    this.updateEnvironment();
  }

  public updateEnvironment() {
    if (this.options) {
      this.scrollElem = this.options.scrollId;
      this.contentElem = this.options.contentId;

      // private parameters
      this.rowsAbove = this.options.rowsAbove || this.options.rowsAbove;

      // get row height
      // this.exploreEnvironment();

      // this.generateEmptyRow();

      // append initial data
      // this.insertToDOM();

      this.scrollChanged.next({
        currentCluster: this.startCluster,
        lastCluster: this.lastCluster,
        topHeight: this.topHeight,
        bottomHeight: this.bottomHeight,
        countRows: 50
      });
    }
  }

  // PUBLIC FUNCTIONS
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

  // PRIVATE FUNCTIONS
  private getNumberRowsAbove() {
    let data = this.generate();
    this.rows = data.rows;

    if (this.options.contentTag === 'ol') {
      this.options.rowsAbove = data.rowsAbove;
      this.contentElem.setAttribute('start', data.rowsAbove);
    }
  }

  private resizeEv() {
    clearTimeout(this.resizeDebounce);
    this.resizeDebounce = setTimeout(this.refresh, 100);
  }

  private scrollEv() {
    // fixes scrolling issue on Mac #3
    if (this.isMac) {
      if ( ! this.pointerEventsSet) {
        this.contentElem.style.pointerEvents = 'none';
      }
      this.pointerEventsSet = true;
      clearTimeout(this.scrollDebounce);
      this.scrollDebounce = setTimeout(function () {
        this.contentElem.style.pointerEvents = 'auto';
        this.pointerEventsSet = false;
      }, 50);
    }
    if (this.lastCluster !== (this.lastCluster = this.getClusterNum())) {
      this.insertToDOM();
    }
  }

  // public methods
  public destroy(clean) {
    // off('scroll', this.scrollElem, this.scrollEv);
    // off('resize', window, this.resizeEv);
    if (clean) {
      this.generateEmptyRow();
    }
  }

  public refresh() {
    let rowsHeight = this.getRowsHeight();
    if (rowsHeight) {
      this.update(this.rows);
    }
  }

  public update(newRows) {
    this.rows = Array.isArray(newRows)
      ? newRows
      : [];
    this.scrollTop = this.scrollElem.scrollTop;
    // fixes #39
    if (this.rows.length * this.options.itemHeight < this.scrollTop) {
      this.scrollElem.scrollTop = 0;
      this.lastCluster = 0;
    }
    this.insertToDOM();
    this.scrollElem.scrollTop = this.scrollTop;
  }

  public clear() {
    this.update([]);
  }

  public getRowsAmount() {
    return this.rows.length;
  }

  private add(where, _newRows) {
    let newRows = Array.isArray(_newRows)
      ? _newRows
      : [];
    if ( ! newRows.length) {
      return;
    }
    this.rows = where === 'append'
      ? this.rows.concat(newRows)
      : newRows.concat(this.rows);
    this.insertToDOM();
  }

  // fetch existing markup
  public fetchMarkup() {
    let rows = [], rowsNodes = this.getChildNodes(this.contentElem);

    while (rowsNodes.length) {
      rows.push(rowsNodes.shift().outerHTML);
    }

    return rows;
  }

  // get tag name, content tag name, tag height, calc cluster height
  public exploreEnvironment() {
    let opts = this.options;

    opts.contentTag = this.contentElem.tagName.toLowerCase();

    if (!this.data.length) {
      return;
    }

    this.getRowsHeight();
  }

  public getRowsHeight() {
    let opts = this.options;
    let prevItemHeight = opts.itemHeight;

    opts.clusterHeight = 0;

    if (!this.rows.length) {
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

  // get current cluster number
  public getClusterNum() {
    return Math.floor(this.scrollTop / (this.options.clusterHeight - this.options.blockHeight)) || 0;
  }

  // generate empty row if no data provided
  public generateEmptyRow() {
    this.options.showNoDataRow = true;
    this.rows = [this.data[0], this.data[1], this.data[2]];

    return this.rows;
  }

  // generate cluster for current scroll position
  public generate() {
    let rows = this.data;
    let clusterNum = this.getClusterNum();
    let opts = this.options;
    let rowsLen = this.rows.length;

    if (rowsLen < opts.rowsInBlock) {
      return {
        rowsAbove: 0,
        rows: rowsLen ? this.rows : this.generateEmptyRow()
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

    if (topSpace > 0) {
      if (opts.keepParity) {
        thisClusterRows.push(this.renderExtraTag('keep-parity'));
      }
      thisClusterRows.push(this.renderExtraTag('top-space', topSpace));
    } else {
      rowsAbove++;
    }

    for (let i = itemsStart; i < itemsEnd; i++) {
      if (rows[i]) {
        thisClusterRows.push(rows[i]);
      }
    }

    if (bottomSpace > 0) {
      thisClusterRows.push(this.renderExtraTag('bottom-space', bottomSpace));
    }

    return {
      rowsAbove: rowsAbove,
      rows: thisClusterRows
    };
  }

  public renderExtraTag(className, height?:number) {
    let tag = document.createElement(this.options.tag);
    let clusterizePrefix = 'clusterize-extra-row clusterize-keep-parity clusterize-top-space clusterize-bottom-space';

    tag.className = [clusterizePrefix + 'extra-row', clusterizePrefix + className].join(' ');

    if (height) {
      tag.style.height = height + 'px';
    }

    return tag.outerHTML;
  }

  public getChildNodes(tag) {
    let childNodes = tag.children,
      ie8ChildNodesHelper = [];
    for (let i = 0, ii = childNodes.length; i < ii; i++) {
      ie8ChildNodesHelper.push(childNodes[i]);
    }
    return Array.prototype.slice.call(ie8ChildNodesHelper);
  }

  // support functions
  public on(evt, element, fnc) {
    return element.addEventListener ? element.addEventListener(evt, fnc, false) : element.attachEvent('on' + evt, fnc);
  }
  public getStyle(prop, elem) {
    return window.getComputedStyle ? window.getComputedStyle(elem)[prop] : elem.currentStyle[prop];
  }
}
