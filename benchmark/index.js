/* eslint-disable no-magic-numbers, no-param-reassign, import/no-commonjs */

const { createSuite } = require("benchee");
const Table = require("cli-table2");

const React = require("react");

/************* data *************/

const BIG_DATA = require("./bigData");

class Foo {
  constructor(value) {
    this.value = value;
  }
}

const simpleObject = {
  boolean: true,
  nil: null,
  number: 123,
  string: "foo"
};

const complexObject = Object.assign({}, simpleObject, {
  array: ["foo", { bar: "baz" }],
  arrayBuffer: new ArrayBuffer(8),
  buffer: new Buffer("this is a test buffer"),
  dataView: new DataView(new ArrayBuffer(16)),
  date: new Date(),
  error: new Error("boom"),
  fn() {
    return "foo";
  },
  map: new Map().set("foo", { bar: { baz: "quz" } }),
  nan: NaN,
  object: { foo: { bar: "baz" } },
  promise: Promise.resolve("foo"),
  regexp: /foo/,
  set: new Set().add("foo").add({ bar: { baz: "quz" } }),
  typedArray: new Uint8Array([12, 15]),
  undef: undefined,
  weakmap: new WeakMap([[{}, "foo"], [{}, "bar"]]),
  weakset: new WeakSet([{}, {}]),
  [Symbol("key")]: "value"
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
  foo: new Foo("value"),
  react: React.createElement("main", {
    children: [
      React.createElement("h1", { children: "Title" }),
      React.createElement("p", { children: "Content" }),
      React.createElement("p", { children: "Content" }),
      React.createElement("p", { children: "Content" }),
      React.createElement("p", { children: "Content" }),
      React.createElement("div", {
        children: [
          React.createElement("div", {
            children: "Item",
            style: { flex: "1 1 auto" }
          }),
          React.createElement("div", {
            children: "Item",
            style: { flex: "1 1 0" }
          })
        ],
        style: { display: "flex" }
      })
    ]
  })
};

/************* setup *************/

const getResults = results => {
  const table = new Table({
    head: ["Name", "Ops / sec"]
  });

  results.forEach(({ name, stats }) => {
    table.push([name, stats.ops.toLocaleString()]);
  });

  return table.toString();
};

const packages = {
  clone: require("clone"),
  deepclone: require("deepclone"),
  "fast-clone": require("fast-clone"),
  "fast-copy": require("../dist/fast-copy.cjs"),
  "fast-copy (strict)": require("../dist/fast-copy.cjs").strict,
  "fast-deepclone": require("fast-deepclone"),
  "lodash.cloneDeep": require("lodash").cloneDeep,
  ramda: require("ramda").clone
};

const suite = createSuite({
  minTime: 3000,
  onComplete(results) {
    const combinedResults = Object.keys(results)
      .reduce((combined, group) => {
        const groupResults = results[group];

        return groupResults.map(({ name, stats }) => {
          const existingRowIndex = combined.findIndex(
            ({ name: rowName }) => name === rowName
          );

          return ~existingRowIndex
            ? {
                ...combined[existingRowIndex],
                stats: {
                  elapsed: (combined[existingRowIndex].stats.elapsed +=
                    stats.elapsed),
                  iterations: (combined[existingRowIndex].stats.iterations +=
                    stats.iterations)
                }
              }
            : {
                name,
                stats: {
                  elapsed: stats.elapsed,
                  iterations: stats.iterations
                }
              };
        });
      }, [])
      .map(({ name, stats }) => ({
        name,
        stats: {
          ...stats,
          ops: stats.iterations / stats.elapsed
        }
      }))
      .sort((a, b) => {
        if (a.stats.ops > b.stats.ops) {
          return -1;
        }

        if (a.stats.ops < b.stats.ops) {
          return 1;
        }

        return 0;
      });

    console.log("");
    console.log("Benchmark results complete, overall averages:");
    console.log("");
    console.log(getResults(combinedResults));
    console.log("");
  },
  onGroupComplete({ group, results }) {
    console.log("");
    console.log(`...finished group ${group}.`);
    console.log("");
    console.log(getResults(results));
    console.log("");
  },
  onGroupStart(group) {
    console.log("");
    console.log(`Starting benchmarks for group ${group}...`);
    console.log("");
  },
  onResult({ name, stats }) {
    console.log(
      `Benchmark completed for ${name}: ${stats.ops.toLocaleString()} ops/sec`
    );
  }
});

/************* tests *************/

for (let name in packages) {
  const copy = packages[name];

  suite.add(name, "simple object", () => copy(simpleObject));
  suite.add(name, "complex object", () => copy(complexObject));
  suite.add(name, "big data object", () => copy(BIG_DATA));
  suite.add(name, "circular object", () => copy(circularObject));
  suite.add(name, "special values object", () => copy(specialObject));
}

suite.run();
