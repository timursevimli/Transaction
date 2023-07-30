'use strict';

const { scheduler } = require('node:timers/promises');
const DatasetTransaction = require('./b-updated-dataset.js');

const dataset = [
  { name: 'Rene Descartes', city: 'Touraine' },
  { name: 'Rene Descartes', city: 'Touraine' },
  { name: 'Rene Descartes', city: 'Touraine' },
];

const datasetTransaction = DatasetTransaction.from(dataset);

console.log({ dataset });
console.log({ tData: datasetTransaction.dataset });

datasetTransaction.update('born', 1596, 1);
datasetTransaction.commit();
// Alternative but create deltas for uncommited datas
// datasetTransaction.update('born', 1596);
// datasetTransaction.commit(1);

console.log('After commit (update born (id:1))');
console.log({ dataset });
console.log({ tData: datasetTransaction.dataset });

datasetTransaction.delete('city');
datasetTransaction.commit();

console.log('After commit (delete city (all))');
console.log({ dataset });
console.log({ tData: datasetTransaction.dataset });

datasetTransaction.timeout(1000, false, (event) => {
  console.log('Timeout! Emitted event:', event);
});

(async () => {
  datasetTransaction.update('languages', ['Java', 'Python']);
  await scheduler.wait(1100);
  console.log({ dataset });
  console.log({ tData: datasetTransaction.dataset });

  datasetTransaction.update('languages', ['JS']);
  await scheduler.wait(800);
  datasetTransaction.commit();
  console.log({ dataset });
  console.log({ tData: datasetTransaction.dataset });

  for (const log of datasetTransaction.logs) {
    console.log(log);
  }

  console.log(datasetTransaction.toString());
})();
