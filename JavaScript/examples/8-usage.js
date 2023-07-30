'use strict';

const { DatasetTransaction } = require('./7-refactor.js');

const dataset = [
  { name: 'Rene', surname: 'Descartes' },
  { name: 'Rene', surname: 'Descartes' },
  { name: 'Rene', surname: 'Descartes' },
];

const datasetTransaction = new DatasetTransaction(dataset);

datasetTransaction.update('city', 'Istanbul');

console.log('Before commit:');
console.log(datasetTransaction.logs);

datasetTransaction.on('commit', (commitedData) => {
  console.log({ commitedData });
});

datasetTransaction.commit();

console.log('After commit:');
console.log(datasetTransaction.logs);

datasetTransaction.delete('surname');

console.log('After delete:');
console.log(datasetTransaction.logs);

datasetTransaction.commit();

console.log('After delete commit:');
console.log(datasetTransaction.logs);

console.log(datasetTransaction.toString());
