'use strict';

const start = (data) => {
  let delta = {};

  const commit = () => {
    Object.assign(data, delta);
    delta = {};
  };

  const handlers = {
    get(target, key) {
      if (key === 'commit') return commit;
      if (delta.hasOwnProperty(key)) return delta[key];
      return target[key];
    },
    set(target, key, val) {
      if (target[key] === val) delete delta[key];
      else delta[key] = val;
      return true;
    }
  };

  return new Proxy(data, handlers);
};

const user = { name: 'Marie', surname: 'Curie' };

const trans = start(user);

console.log({ obj1: user });
console.log({ trans });

trans.name = 'Katherine';

console.log({ obj1: user });
console.log({ trans });

trans.commit();

console.log({ obj1: user });
console.log({ trans });
