'use strict';

class Transaction {
  constructor(data) {
    this.data = data;
    this.dto = {};
    this.delta = {};
    this.deletedProps = new Set();
    this.events = {
      commit: [], rollback: []
    };
    this._initProxy();
  }

  static from(data) {
    return new Transaction(data);
  }

  _initProxy() {
    if (!this.data) return;
    const { delta, data, deletedProps } = this;
    const handlers = {
      get(target, key) {
        // if (methods.hasOwnProperty(key)) return methods[key];
        if (delta.hasOwnProperty(key)) return delta[key];
        return target[key];
      },
      set(target, key, val) {
        // if (methods.hasOwnProperty(key)) return false;
        if (target[key] === val) delete delta[key];
        else delta[key] = val;
        deletedProps.delete(key);
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
        // return keys.filter((v, i, a) => a.indexOf(v) === i);
        return Array.from(new Set(keys));
      },
      deleteProperty(target, key) {
        if (deletedProps.has(key)) return false;
        deletedProps.add(key);
        return true;
      }
    };
    this.dto = new Proxy(data, handlers);
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
      delete this.data[key];
    }
    Object.assign(this.data, this.delta);
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
    const cloned = Transaction.from(this.data);
    Object.assign(cloned.delta, this.delta);
    return cloned;
  }

  update(key, value) {
    console.log('Updated', key, value);
    this.dto[key] = value;
  }

  delete(key) {
    console.log('Delete', key);
    delete this.dto[key];
  }

  showData() {
    return JSON.stringify(this.data);
  }
}

const user = { name: 'Timur', surname: 'Sevimli' };
const trans = Transaction.from(user);

trans.on('commit', (commitedData) => {
  console.log({ commitedData });
});

console.log('user', user);
console.log('Trans data', trans.data);
console.log('Trans delta', trans.delta);
console.log(trans.showData());

console.log('---');

trans.update('city', 'Istanbul');
trans.update('name', 'Muslum');

console.log('user', user);
console.log('Trans data', trans.data);
console.log('Trans delta', trans.delta);
console.log(trans.showData());

console.log('---');
trans.commit();
console.log('Commited!');

console.log('user', user);
console.log('Trans data', trans.data);
console.log('Trans delta', trans.delta);
console.log(trans.showData());

console.log('---');

trans.update('name', 'Faruk');

console.log('user', user);
console.log('Trans data', trans.data);
console.log('Trans delta', trans.delta);
console.log(trans.showData());


console.log('---');
trans.commit();
console.log('Commited!');

console.log('user', user);
console.log('Trans data', trans.data);
console.log('Trans delta', trans.delta);
console.log(trans.showData());

console.log('---');

trans.delete('name');
trans.commit();

console.log('user', user);
console.log('Trans data', trans.data);
console.log('Trans delta', trans.delta);
console.log(trans.showData());
