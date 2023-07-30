'use strict';

class Transaction {
  constructor(data, id) {
    this.id = id;
    this._data = data;
    this.proxy = {};
    this.delta = {};
    this.deletedProps = new Set();
    this.events = {
      commit: [], rollback: [], get: [], set: [], delete: []
    };
    this._initProxy();
  }

  static from(data, id) {
    return new Transaction(data, id);
  }

  _initProxy() {
    const { delta, _data: data, deletedProps } = this;
    const emit = this.emit.bind(this);
    const handlers = {
      get(target, key) {
        if (delta.hasOwnProperty(key)) return delta[key];
        emit('get');
        return target[key];
      },
      set(target, key, val) {
        if (target[key] === val) delete delta[key];
        else delta[key] = val;
        deletedProps.delete(key);
        emit('set');
        return true;
      },
      getOwnPropertyDescriptor(target, key) {
        return Object.getOwnPropertyDescriptor(
          delta.hasOwnProperty(key) ? delta : target, key
        );
      },
      ownKeys() {
        const changes = Object.keys(delta);
        const keys = Object.keys(data).concat(changes);
        return Array.from(new Set(keys));
      },
      deleteProperty(target, key) {
        if (deletedProps.has(key)) return false;
        deletedProps.add(key);
        emit('delete');
        return true;
      }
    };
    this.proxy = new Proxy(data, handlers);
  }

  emit(name) {
    const event = this.events[name];
    if (event) for (const listener of event) listener(this._data);
  }

  on(name, callback) {
    const event = this.events[name];
    if (event) event.push(callback);
  }

  commit() {
    for (const key of this.deletedProps) {
      delete this._data[key];
    }
    Object.assign(this._data, this.delta);
    this.delta = {};
    this._initProxy();
    this.emit('commit');
  }

  rollback() {
    this.delta = {};
    this.deletedProps.clear();
    this.emit('rollback');
  }

  clone() {
    const cloned = Transaction.from(this._data);
    Object.assign(cloned.delta, this.delta);
    return cloned;
  }

  update(key, value) {
    this.proxy[key] = value;
  }

  delete(key) {
    delete this.proxy[key];
  }

  toString() {
    console.log(JSON.stringify(this._data));
  }
}

class DatasetTransaction {
  constructor(dataset) {
    this.dataset = dataset.map(Transaction.from);
    this.logs = [];
    this.operationId = 0;
    this._initListeners();
  }

  _saveLog(operation, id) {
    const log = {
      transactionId: id,
      operationId: this.operationId++,
      operation,
      time: new Date().toISOString(),
    };
    this.logs.push(log);
  }

  showLog() {
    for (const log of this.logs) console.log(log);
  }

  _initListeners() {
    for (const transaction of this.dataset) {
      const { id } = transaction;
      transaction.on('commit', () => void this._saveLog('commit', id));
      transaction.on('clone', () => void this._saveLog('clone', id));
      transaction.on('rollback', () => void this._saveLog('rollback', id));
      transaction.on('get', () => void this._saveLog('get', id));
      transaction.on('set', () => void this._saveLog('set', id));
      transaction.on('delete', () => void this._saveLog('delete', id));
    }
  }

  static from(dataset) {
    return new DatasetTransaction(dataset);
  }

  clone() {
    const cloneDataset = this.dataset.map((transaction) => transaction.clone());
    return DatasetTransaction.from(cloneDataset);
  }

  commit(id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.commit();
      return;
    }
    const transaction = this.dataset[id];
    if (transaction) transaction.commit();
  }

  rollback(id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.rollback();
      return;
    }
    const transaction = this.dataset[id];
    if (transaction) transaction.rollback();
  }

  on(name, listener) {
    for (const transaction of this.dataset) transaction.on(name, listener);
  }

  showData(id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.showData();
      return;
    }
    const transaction = this.dataset[id];
    if (transaction) transaction.showData();
  }

  update(key, value, id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.update(key, value);
      return;
    }
    const transaction = this.dataset[id];
    if (transaction) transaction.update(key, value);
  }

  delete(key, id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.delete(key);
      return;
    }
    const transaction = this.dataset[id];
    if (transaction) transaction.delete(key);
  }

}

const dataset = [
  { name: 'Rene', surname: 'Descartes' },
  { name: 'Rene', surname: 'Descartes' },
  { name: 'Rene', surname: 'Descartes' },
];

const datasetTransaction = new DatasetTransaction(dataset);

datasetTransaction.update('city', 'Istanbul');

console.log('Before commit:');
datasetTransaction.showData();

datasetTransaction.on('commit', (commitedData) => {
  console.log({ commitedData });
});

datasetTransaction.commit();

console.log('After commit:');
datasetTransaction.showData();

datasetTransaction.delete('surname');

console.log('After delete:');
datasetTransaction.showData();

datasetTransaction.commit();

console.log('After delete commit:');
datasetTransaction.showData();

datasetTransaction.showLog();
