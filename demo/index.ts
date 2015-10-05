/// <reference path="../tsd.d.ts" />
import {Component, View, bootstrap, NgClass, FORM_DIRECTIVES, CORE_DIRECTIVES} from 'angular2/angular2';

import {Ng2TableConfig, Ng2TableTheme} from '../components/index';

let w:any = window;
if (w && w.__theme === 'bs4') {
  Ng2TableConfig.theme = Ng2TableTheme.BS4;
}

import {TableSection} from './components/table-section';

let gettingStarted = require('./getting-started.md');

@Component({
  selector: 'app'
})
@View({
  template: `
  <main class="bd-pageheader">
    <div class="container">
      <h1>ng2-table</h1>
      <p>Native Angular2 directives for Table</p>
      <a class="btn btn-primary" href="https://github.com/valor-software/ng2-table">View on GitHub</a>
      <div class="row">
      </div>
    </div>
  </main>

  <div class="container">
    <div class="col-md-12 card card-block panel panel-default">
      <selection>
          <h1>ng2-table available with:
          <a class="btn btn-default btn-secondary btn-lg" [ng-class]="{active: isBs3}" href="./">Bootstrap 3</a>
          <a class="btn btn-default btn-secondary btn-lg" [ng-class]="{active: !isBs3}" href="./index-bs4.html">Bootstrap 4</a>
          </h1>
      </selection>
    </div>
    <br>
    <section id="getting-started">${gettingStarted}</section>

    <table-section class="col-md-12"></table-section>
  </div>

  </div>
  <footer class="footer">
    <div class="container">
      <p class="text-muted text-center"><a href="https://github.com/valor-software/ng2-table">ng2-table</a> is maintained by <a href="https://github.com/valor-software">valor-software</a>.</p>
    </div>
  </footer>
  `,
  directives: [
    CORE_DIRECTIVES,
    FORM_DIRECTIVES,
    NgClass,
    TableSection
  ]
})
export class Demo {
  private isBs3:boolean = Ng2TableConfig.theme === Ng2TableTheme.BS3;
}

bootstrap(Demo);
