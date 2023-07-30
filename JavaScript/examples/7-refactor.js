'use strict';

const generateProxy = (ctx, data = null) => {
  const { delta, _data, deletedProps } = ctx;
  const emit = ctx.emit.bind(ctx);
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
      const keys = Object.keys(_data).concat(changes);
      return Array.from(new Set(keys));
    },
    deleteProperty(target, key) {
      if (deletedProps.has(key)) return false;
      deletedProps.add(key);
      emit('delete');
      return true;
    }
  };
  ctx.proxy = new Proxy(data || _data, handlers);
};

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
    this.updateProxy = (data) => generateProxy(this, data);
    this.updateProxy();
  }

  static from(data, id) {
    return new Transaction(data, id);
  }

  get data() {
    return this.proxy;
  }

  emit(name) {
    const event = this.events[name];
    if (event) for (const listener of event) listener(this.data);
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
    this.updateProxy(this._data);
    this.emit('commit');
  }

  rollback() {
    this.delta = {};
    this.deletedProps.clear();
    this.emit('rollback');
  }

  clone() {
    const cloned = Transaction.from(this.data);
    Object.assign(cloned.delta, this.delta);
    return cloned;
  }

  update(key, value) {
    this.data[key] = value;
  }

  delete(key) {
    delete this.data[key];
  }

  toString() {
    return JSON.stringify(this.data);
  }
}

class DatasetTransaction {
  constructor(dataset) {
    this.dataset = dataset.map(Transaction.from);
    this.logs = [];
    this.operationCount = 0;
    this._initLogEvents();
  }

  _initLogEvents() {
    for (const transaction of this.dataset) {
      const { id, events } = transaction;
      for (const eventName in events) {
        transaction.on(eventName, () => void this._saveLog(eventName, id));
      }
    }
  }

  _saveLog(operation, id) {
    const log = {
      transactionId: id,
      operationId: this.operationCount++,
      operation,
      time: new Date().toISOString(),
    };
    this.logs.push(log);
  }

  static from(dataset) {
    return new DatasetTransaction(dataset);
  }

  findById(id) {
    return this.dataset.find((transaction) => transaction.id === id);
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
    const transaction = this.findById(id);
    if (transaction) transaction.commit();
  }

  rollback(id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.rollback();
      return;
    }
    const transaction = this.findById(id);
    if (transaction) transaction.rollback();
  }

  on(name, listener, id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.on(name, listener);
      return;
    }
    const transaction = this.findById(id);
    if (transaction) transaction.on(name, listener);
  }

  toString(id) {
    if (!id) return this.dataset.map((transaction) => transaction.toString());
    const transaction = this.findById(id);
    if (transaction) return transaction.toString();
  }

  update(key, value, id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.update(key, value);
      return;
    }
    const transaction = this.findById(id);
    if (transaction) transaction.update(key, value);
  }

  delete(key, id) {
    if (!id) {
      for (const transaction of this.dataset) transaction.delete(key);
      return;
    }
    const transaction = this.findById(id);
    if (transaction) transaction.delete(key);
  }
}

module.exports = { Transaction, DatasetTransaction };
