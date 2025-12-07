import Table from 'cli-table3';
import clone from 'clone';
import deepclone from 'deepclone';
import fastClone from 'fast-clone';
import fastDeepclone from 'fast-deepclone';
import { copy as fastCopy, copyStrict as fastCopyStrict } from '../dist/es/index.mjs';
import lodashCloneDeep from 'lodash/cloneDeep.js';
import orderBy from 'lodash/orderBy.js';
import { clone as ramdaClone } from 'ramda';
import React from 'react';
import { Bench } from 'tinybench';
import { BIG_DATA } from './bigData.js';

function getResults(tasks) {
  const table = new Table({
    head: ['Name', 'Ops / sec'],
  });

  tasks.forEach(({ name, result }) => {
    table.push([name, +(result.throughput?.mean ?? 0).toFixed(6)]);
  });

  return table.toString();
}

class Foo {
  constructor(value) {
    this.value = value;
  }
}

const simpleObject = {
  boolean: true,
  nil: null,
  number: 123,
  string: 'foo',
};

const complexObject = Object.assign({}, simpleObject, {
  array: ['foo', { bar: 'baz' }],
  arrayBuffer: new ArrayBuffer(8),
  buffer: Buffer.from('this is a test buffer'),
  dataView: new DataView(new ArrayBuffer(16)),
  date: new Date(),
  error: new Error('boom'),
  fn() {
    return 'foo';
  },
  map: new Map().set('foo', { bar: { baz: 'quz' } }),
  nan: NaN,
  object: { foo: { bar: 'baz' } },
  promise: Promise.resolve('foo'),
  regexp: /foo/,
  set: new Set().add('foo').add({ bar: { baz: 'quz' } }),
  typedArray: new Uint8Array([12, 15]),
  undef: undefined,
  weakmap: new WeakMap([
    [{}, 'foo'],
    [{}, 'bar'],
  ]),
  weakset: new WeakSet([{}, {}]),
  [Symbol('key')]: 'value',
});

const circularObject = {
  deeply: {
    nested: {
      reference: {},
    },
  },
};

circularObject.deeply.nested.reference = circularObject;

const specialObject = {
  foo: new Foo('value'),
  react: React.createElement('main', {
    children: [
      React.createElement('h1', { children: 'Title' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('div', {
        children: [
          React.createElement('div', {
            children: 'Item',
            style: { flex: '1 1 auto' },
          }),
          React.createElement('div', {
            children: 'Item',
            style: { flex: '1 1 0' },
          }),
        ],
        style: { display: 'flex' },
      }),
    ],
  }),
};

const methods = {
  clone,
  deepclone,
  'fast-clone': fastClone,
  'fast-copy': fastCopy,
  'fast-copy (strict)': fastCopyStrict,
  // deactivated while it cannot build on linux
  'fast-deepclone': fastDeepclone,
  'lodash.cloneDeep': lodashCloneDeep,
  ramda: ramdaClone,
};

const benches = {
  'simple object': simpleObject,
  'complex object': complexObject,
  'big data object': BIG_DATA,
  'circular object': circularObject,
  'special values object': specialObject,
};

async function run(name, object) {
  console.log('');
  console.log(`Testing ${name}...`);

  const bench = new Bench({ iterations: 1000, name, time: 100 });

  Object.entries(methods).forEach(([pkgName, fn]) => {
    bench.add(pkgName, () => {
      fn(object);
    });
  });

  await bench.run();

  const tasks = orderBy(
    bench.tasks.filter(({ result }) => result),
    ({ result }) => result.throughput?.mean ?? 0,
    ['desc'],
  );
  const table = getResults(tasks);

  console.log(table);
  console.log(`Fastest was "${tasks[0].name}".`);
}

for (const type in benches) {
  await run(type, benches[type]);
}
