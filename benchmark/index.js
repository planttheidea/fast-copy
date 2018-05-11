'use strict';

const Benchmark = require('benchmark');
const React = require('react');

function Foo(value) {
  this.value = value;

  return this;
}

const simpleObject = {
  boolean: true,
  nil: null,
  number: 123,
  string: 'foo'
};

const complexObject = Object.assign({}, simpleObject, {
  array: ['foo', {bar: 'baz'}],
  arrayBuffer: new ArrayBuffer(8),
  buffer: new Buffer('this is a test buffer'),
  dataView: new DataView(new ArrayBuffer(16)),
  date: new Date(),
  error: new Error('boom'),
  fn() {
    return 'foo';
  },
  map: new Map().set('foo', {bar: {baz: 'quz'}}),
  nan: NaN,
  object: {foo: {bar: 'baz'}},
  promise: Promise.resolve('foo'),
  regexp: /foo/,
  set: new Set().add('foo').add({bar: {baz: 'quz'}}),
  typedArray: new Uint8Array([12, 15]),
  undef: undefined,
  weakmap: new WeakMap([[{}, 'foo'], [{}, 'bar']]),
  weakset: new WeakSet([{}, {}]),
  [Symbol('key')]: 'value'
});

const circularObject = {
  deeply: {
    nested: {
      reference: {}
    }
  }
};

circularObject.deeply.nested.reference = circularObject;

const specialObject = {
  foo: new Foo('value'),
  react: React.createElement('main', {
    children: [
      React.createElement('h1', {children: 'Title'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('div', {
        children: [
          React.createElement('div', {
            children: 'Item',
            style: {flex: '1 1 auto'}
          }),
          React.createElement('div', {
            children: 'Item',
            style: {flex: '1 1 0'}
          })
        ],
        style: {display: 'flex'}
      })
    ]
  })
};

const packages = {
  clone: require('clone'),
  deepclone: require('deepclone'),
  'fast-clone': require('fast-clone'),
  'fast-copy': require('../lib').default,
  'fast-deepclone': require('fast-deepclone'),
  'lodash.cloneDeep': require('lodash').cloneDeep
};

const addNewline = () => console.log('');

const runSimpleSuite = () => {
  console.log('Running simple object performance comparison...');
  console.log('');

  const suite = new Benchmark.Suite();

  for (let name in packages) {
    suite.add(name, () => packages[name](simpleObject));
  }

  return new Promise((resolve) => {
    suite
      .on('cycle', (event) => {
        const result = event.target.toString();

        return console.log(result);
      })
      .on('complete', function() {
        console.log('');
        console.log(`...complete, the fastest is ${this.filter('fastest').map('name')}.`);

        resolve();
      })
      .run({async: true});
  });
};

const runComplexSuite = () => {
  console.log('Running complex object performance comparison...');
  console.log('');

  const suite = new Benchmark.Suite();

  for (let name in packages) {
    suite.add(name, () => packages[name](complexObject));
  }

  return new Promise((resolve) => {
    suite
      .on('cycle', (event) => {
        const result = event.target.toString();

        return console.log(result);
      })
      .on('complete', function() {
        console.log('');
        console.log(`...complete, the fastest is ${this.filter('fastest').map('name')}.`);

        resolve();
      })
      .run({async: true});
  });
};

const runCircularSuite = () => {
  console.log('Running circular object performance comparison...');
  console.log('');

  const suite = new Benchmark.Suite();

  for (let name in packages) {
    suite.add(name, () => packages[name](circularObject));
  }

  return new Promise((resolve) => {
    suite
      .on('cycle', (event) => {
        const result = event.target.toString();

        return console.log(result);
      })
      .on('complete', function() {
        console.log('');
        console.log(`...complete, the fastest is ${this.filter('fastest').map('name')}.`);

        resolve();
      })
      .run({async: true});
  });
};

const runSpecialSuite = () => {
  console.log('Running special values object performance comparison...');
  console.log('');

  const suite = new Benchmark.Suite();

  for (let name in packages) {
    suite.add(name, () => packages[name](specialObject));
  }

  return new Promise((resolve) => {
    suite
      .on('cycle', (event) => {
        const result = event.target.toString();

        return console.log(result);
      })
      .on('complete', function() {
        console.log('');
        console.log(`...complete, the fastest is ${this.filter('fastest').map('name')}.`);

        resolve();
      })
      .run({async: true});
  });
};

Promise.resolve()
  .then(addNewline)
  .then(runSimpleSuite)
  .then(addNewline)
  .then(runComplexSuite)
  .then(addNewline)
  .then(runCircularSuite)
  .then(addNewline)
  .then(runSpecialSuite);
