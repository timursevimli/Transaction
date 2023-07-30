'use strict';

function Transaction() {}

Transaction.start = (data) => {
  let delta = {};
  const deletedProperties = new Set();

  const events = {
    commit: [],
    rollback: [],
    change: [],
    timeout: [],
  };

  const emit = (name) => {
    const event = events[name];
    if (event) for (const listener of event) listener(data);
  };

  const methods = {
    commit() {
      for (const key of deletedProperties) {
        delete data[key];
      }
      Object.assign(data, delta);
      delta = {};
      emit('commit');
    },
    rollback() {
      delta = {};
      deletedProperties.clear();
      emit('rollback');
    },
    clone() {
      const cloned = Transaction.start(data);
      Object.assign(cloned.delta, delta);
      return cloned;
    },
    on(name, callback) {
      const event = events[name];
      if (event) event.push(callback);
    }
  };

  const handlers = {
    get(target, key) {
      if (methods.hasOwnProperty(key)) return methods[key];
      if (delta.hasOwnProperty(key)) return delta[key];
      return target[key];
    },
    set(target, key, val) {
      if (methods.hasOwnProperty(key)) return false;
      if (target[key] === val) delete delta[key];
      else delta[key] = val;
      deletedProperties.delete(key);
      return true;
    },
    getOwnPropertyDescriptor(target, key) {
      console.log('getOwnPropertyDescriptor');
      return Object.getOwnPropertyDescriptor(
        delta.hasOwnProperty(key) ? delta : target, key
      );
    },
    ownKeys() {
      console.log('ownKeys');
      const changes = Object.keys(delta);
      const keys = Object.keys(data).concat(changes);
      // return keys.filter((v, i, a) => a.indexOf(v) === i);
      return Array.from(new Set(keys));
    },
    deleteProperty(target, key) {
      if (deletedProperties.has(key)) return false;
      deletedProperties.add(key);
      return true;
    }
  };

  return new Proxy(data, handlers);
};

class DatasetTransaction {
  constructor(dataset) {
    this.dataset = dataset.map(Transaction.start);
  }

  commit() {
    for (const data of this.dataset) data.commit();
  }

  clone() {
    const cloneDataset = [];
    for (const data of this.dataset) {
      const clone = data.clone();
      cloneDataset.push(clone);
    }
    return new DatasetTransaction(cloneDataset);
  }

  rollback() {
    for (const data of this.dataset) data.rollback();
  }

  on(name, listener) {
    for (const data of this.dataset) data.on(name, listener);
  }
}

const dataset = [
  { name: 'Rene', surname: 'Descartes' },
  { name: 'Rene', surname: 'Descartes' },
  { name: 'Rene', surname: 'Descartes' },
];

const datasetTransaction = new DatasetTransaction(dataset);

for (const data of datasetTransaction.dataset) {
  data.city = 'Istanbul';
}

console.log('Before commit:', datasetTransaction.dataset);

datasetTransaction.on('commit', (commitedData) => {
  console.log({ commitedData });
});

datasetTransaction.commit();

console.log('After commit:', datasetTransaction.dataset);
