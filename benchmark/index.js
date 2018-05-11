'use strict';

const Benchmark = require('benchmark');
const React = require('react');

function Foo(value) {
  this.value = value;

  return this;
}

const shallowObject = {
  boolean: true,
  fn() {
    return 'foo';
  },
  nan: NaN,
  nil: null,
  number: 123,
  string: 'foo',
  undef: undefined,
  [Symbol('key')]: 'value'
};

const deepObject = Object.assign({}, shallowObject, {
  array: ['foo', {bar: 'baz'}],
  buffer: new Buffer('this is a test buffer'),
  error: new Error('boom'),
  map: new Map().set('foo', {bar: 'baz'}),
  object: {foo: {bar: 'baz'}},
  promise: Promise.resolve('foo'),
  regexp: /foo/,
  set: new Set().add('foo').add({bar: 'baz'}),
  weakmap: new WeakMap([[{}, 'foo'], [{}, 'bar']]),
  weakset: new WeakSet([{}, {}])
});

const circularObject = Object.assign({}, deepObject, {
  deeply: {
    nested: {
      reference: {}
    }
  }
});

const specialObject = Object.assign({}, deepObject, {
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
});

circularObject.deeply.nested.reference = circularObject;

const packages = {
  clone: require('clone'),
  deepclone: require('deepclone'),
  'fast-clone': require('fast-clone'),
  'fast-copy': require('../lib').default,
  'fast-deepclone': require('fast-deepclone'),
  'lodash.cloneDeep': require('lodash').cloneDeep
};

const addNewline = () => console.log('');

const runShallowSuite = () => {
  console.log('Running shallow object performance comparison...');
  console.log('');

  const suite = new Benchmark.Suite();

  for (let name in packages) {
    suite.add(name, () => packages[name](shallowObject));
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

const runDeepSuite = () => {
  console.log('Running deep object performance comparison...');
  console.log('');

  const suite = new Benchmark.Suite();

  for (let name in packages) {
    suite.add(name, () => packages[name](deepObject));
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
  .then(runShallowSuite)
  .then(addNewline)
  .then(runDeepSuite)
  .then(addNewline)
  .then(runCircularSuite)
  .then(addNewline)
  .then(runSpecialSuite);
