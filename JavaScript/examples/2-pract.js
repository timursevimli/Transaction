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
      if (key === 'delta') return delta;
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

const user = { name: 'Marie', surname: 'Curie' };

const trans = Transaction.start(user);

console.log({ user });
console.log({ trans });

trans.name = 'Katherine';

console.log({ user });
console.log({ trans });

trans.commit();

console.log({ user });
console.log({ trans });

trans.surname = 'Johnson';

trans.rollback();
trans.commit();

console.log({ user });
console.log({ trans });

trans.name = 'Aristotle';
trans.city = 'Kyiv';

console.log({ user });
console.log({ trans });

console.log('user', JSON.stringify(user));
console.log('trans', JSON.stringify(trans));

for (const key in user) {
  console.log('for-in user', key + ':' + user[key]);
}
for (const key in trans) {
  console.log('for-in trans', key + ':' + trans[key]);
}

console.log('Keys user', Object.keys(user));
console.log('Keys trans', Object.keys(trans));
