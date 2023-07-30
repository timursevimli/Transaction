'use strict';

const { scheduler } = require('node:timers/promises');
const Transaction = require('./a-refactor-transaction.js');

const data = { name: 'Rene Descartes', city: 'Touraine' };

const { transaction, proxy } = Transaction.start(data);

transaction.timeout(1000, true, (event) => {
  console.log('Called timeout listener! Emitted:', event);
});

transaction.on('timeout', () => {
  console.log('Timeout event!');
});

transaction.on('commit', () => {
  console.log('Commit event!');
});

transaction.on('rollback', () => {
  console.log('Rollback event!');
});

console.log({ data });
console.log({ proxy });

(async () => {
  proxy.name = 'Mao Zedong';
  proxy.born = 1893;
  proxy.city = 'Shaoshan';
  proxy.age = (
    new Date().getFullYear() -
  new Date(proxy.born + '').getFullYear()
  );

  console.log('Before commit');
  console.log({ data });
  console.log({ proxy });
  console.log({ delta: transaction.delta });

  transaction.commit();

  console.log('After commit');
  console.log({ data });
  console.log({ proxy });
  console.log({ delta: transaction.delta });

  proxy.born = 1596;

  console.log('Before timeout');
  console.log({ data });
  console.log({ proxy });
  console.log({ delta: transaction.delta });

  await scheduler.wait(1100);

  console.log('After timeout');
  console.log({ data });
  console.log({ proxy });
  console.log({ delta: transaction.delta });

  delete proxy.name;
  transaction.commit();
  console.log('After delete (name)');
  console.log({ data });
  console.log({ proxy });
  console.log({ delta: transaction.delta });

  console.log('Start the cloning!');
  proxy.name = 'Marcus';
  const clone = transaction.clone();
  console.log({ data });
  console.log({ cloneData: clone.proxy });
  console.log({ cloneDelta: clone.transaction.delta });
  console.log({ proxy });
  console.log({ delta: transaction.delta });

  clone.transaction.commit();
  console.log('After clone commit');
  console.log({ data });
  console.log({ cloneData: clone.proxy });
  console.log({ cloneDelta: clone.transaction.delta });
  console.log({ proxy });
  console.log({ delta: transaction.delta });

  if (transaction.data === clone.transaction.data) {
    throw new Error('Data is not clone!');
  }
  if (transaction.delta === clone.transaction.delta) {
    throw new Error('Delta is not clone!');
  }

  try {
    // transaction.revoke(); // Revoke proxy without clear timer!
    transaction.stop();
    console.log(proxy.name);
  } catch (e) {
    console.log('Transaction stop is worked succesfull!');
  }
})();
