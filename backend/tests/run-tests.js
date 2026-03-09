const assert = require("assert");

function add(a, b) {
  return a + b;
}

function run() {
  assert.strictEqual(add(1, 2), 3, "1 + 2 should equal 3");
  console.log("All tests passed.");
}

run();

