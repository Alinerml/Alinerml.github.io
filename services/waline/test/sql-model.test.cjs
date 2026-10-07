const assert = require('node:assert/strict');
const { test } = require('node:test');
const sqlModel = require('../comment-model.cjs');
const PostgreSQLSocket = require('think-model-postgresql/lib/socket.js');

function fixture(storage, records = []) {
  const factoryCalls = [];
  const updateCalls = [];
  const selectCalls = [];
  const logged = [];
  const ssl = { rejectUnauthorized: false, ca: 'test-fixture-ca', minVersion: 'TLSv1.2' };
  const model = {
    marker: 'the-original-storage-model',
    model(...args) {
      assert.equal(this, model, 'The original factory must retain its receiver');
      const instance = {
        config: {
          logConnect: true,
          logSql: true,
          logger: value => logged.push(value),
          ssl
        }
      };
      factoryCalls.push({ args, instance });
      return instance;
    },
    async update(delta, where) {
      assert.equal(this, model, 'Underlying updates must retain the model receiver');
      updateCalls.push({ delta, where });
      // Reproduce the upstream SQL update response: raw row id plus changed
      // fields. The public response requires a separate complete-record read.
      return records.map(row => {
        const data = typeof delta === 'function' ? delta({ ...row }) : delta;
        Object.assign(row, data);
        return { id: row.objectId ?? row.id, ...data };
      });
    },
    async select(where) {
      assert.equal(this, model, 'Underlying reads must retain the model receiver');
      selectCalls.push(where);
      return records.map(row => ({ ...row }));
    },
    identify() { return this.marker; }
  };
  const controller = {
    config(key) { assert.equal(key, 'storage'); return storage; },
    service(route, name) {
      assert.equal(route, `storage/${storage}`);
      assert(['Users', 'Counter', 'Comment'].includes(name));
      return model;
    }
  };
  return { controller, model, factoryCalls, updateCalls, selectCalls, logged, ssl };
}

for (const storage of ['sqlite', 'postgresql', 'mysql', 'tidb']) {
  for (const name of ['Users', 'Counter', 'Comment']) {
    test(`${storage} ${name}: factory disables connection and SQL logging before use`, async () => {
      const state = fixture(storage);
      const wrapped = sqlModel(name, state.controller);
      const options = { anyOriginalArgument: true };
      const instance = wrapped.model(name, options);
      assert.deepEqual(state.factoryCalls[0].args, [name, options]);
      assert.equal(instance, state.factoryCalls[0].instance);
      assert.equal(instance.config.logConnect, false);
      assert.equal(instance.config.logSql, false);
      assert.equal(wrapped.identify(), 'the-original-storage-model');

      if (storage === 'postgresql') {
        assert.equal(instance.config.ssl.rejectUnauthorized, true);
        assert.equal(instance.config.ssl.ca, 'test-fixture-ca');
        assert.equal(instance.config.ssl.minVersion, 'TLSv1.2');
        assert.equal(state.ssl.rejectUnauthorized, false, 'Do not mutate the original SSL options object');

        // Exercise the real upstream driver logger and pg Pool configuration.
        // A pool is instantiated without connecting; the query uses a supplied
        // in-memory connection. No database or credentials are accessed.
        const socket = new PostgreSQLSocket(instance.config);
        const pool = socket.pool;
        assert.equal(pool.options.ssl.rejectUnauthorized, true);
        let released = 0;
        const rows = [{ fixtureValue: 1 }];
        const connection = {
          query(sql, done) {
            assert.equal(sql, 'SELECT 1 AS fixture_value');
            done(null, { rows });
          },
          release() { released += 1; }
        };
        try {
          const response = await socket.query({ sql: 'SELECT 1 AS fixture_value', debounce: false }, connection);
          assert.deepEqual(response.rows, rows);
          assert.equal(released, 1);
          assert.deepEqual(state.logged, [], 'Neither pool creation nor query execution may log');
        } finally {
          await pool.end();
        }
      } else {
        assert.equal(instance.config.ssl, state.ssl, 'Do not change TLS policy for other storage adapters');
      }

      if (name !== 'Comment') {
        assert.equal(wrapped, state.model, 'Users and Counter retain their original model API');
        assert.equal(wrapped.update, state.model.update);
      }
    });
  }
}

test('PostgreSQL without SSL remains explicit; the wrapper does not invent an SSL config', () => {
  const state = fixture('postgresql');
  state.model.model = () => ({ config: { ssl: null, logConnect: true, logSql: true } });
  const instance = sqlModel('Users', state.controller).model('Users');
  assert.equal(instance.config.ssl, null);
  assert.equal(instance.config.logConnect, false);
  assert.equal(instance.config.logSql, false);
});

test('Guest like drops undefined comment fields and returns the complete stored record', async () => {
  const full = { objectId: 7, comment: 'Keep this comment body', nick: 'fixture', like: 0, insertedAt: new Date('2026-10-07T00:00:00Z') };
  const state = fixture('postgresql', [{ ...full }]);
  const wrapped = sqlModel('Comment', state.controller);
  const where = { objectId: '7' };
  const response = await wrapped.update({ comment: undefined, like: 1 }, where);
  assert.deepEqual(state.updateCalls[0].delta, { like: 1 });
  assert.equal(state.updateCalls[0].where, where);
  assert.deepEqual(state.selectCalls, [{ objectId: ['IN', [7]] }]);
  assert.deepEqual(response, [{ ...full, like: 1 }]);
});

test('Functional updates clean each row while preserving false, zero, null and empty text', async () => {
  const original = { objectId: 11, comment: 'Body', like: 2, nick: 'fixture' };
  const state = fixture('sqlite', [{ ...original }]);
  const wrapped = sqlModel('Comment', state.controller);
  const response = await wrapped.update(row => ({
    comment: undefined,
    like: row.like + 1,
    sticky: 0,
    flag: false,
    optional: null,
    empty: ''
  }), { objectId: 11 });
  assert.equal(typeof state.updateCalls[0].delta, 'function');
  assert.deepEqual(response, [{ ...original, like: 3, sticky: 0, flag: false, optional: null, empty: '' }]);
  assert.deepEqual(state.selectCalls, [{ objectId: ['IN', [11]] }]);
});

test('Complete-record read accepts both upstream raw id and canonical objectId', async () => {
  const state = fixture('mysql', [
    { objectId: 'canonical', comment: 'First', nick: 'fixture' },
    { objectId: 23, comment: 'Second', nick: 'fixture' }
  ]);
  state.model.update = async () => [{ objectId: 'canonical' }, { id: 23 }];
  const response = await sqlModel('Comment', state.controller).update({ like: 1 }, {});
  assert.deepEqual(state.selectCalls, [{ objectId: ['IN', ['canonical', 23]] }]);
  assert.deepEqual(response.map(row => row.comment), ['First', 'Second']);
});

test('Empty updates cannot trigger an unfiltered read of all comments', async () => {
  const state = fixture('tidb', []);
  const response = await sqlModel('Comment', state.controller).update({ like: 1 }, { objectId: 404 });
  assert.deepEqual(response, []);
  assert.deepEqual(state.selectCalls, []);
});

test('SQL adapter failures remain visible to the caller', async () => {
  const state = fixture('postgresql');
  const failure = new Error('fixture storage failure');
  state.model.update = async () => { throw failure; };
  await assert.rejects(sqlModel('Comment', state.controller).update({ like: 1 }, {}), error => error === failure);
  assert.deepEqual(state.selectCalls, []);
});

for (const storage of ['leancloud', 'mongodb', 'github', 'cloudbase', null]) {
  test(`${String(storage)}: custom SQL model leaves other stores untouched`, () => {
    const controller = {
      config(key) { assert.equal(key, 'storage'); return storage; },
      service() { throw new Error('Non-SQL storage must not be accessed or replaced'); }
    };
    for (const name of ['Users', 'Counter', 'Comment']) assert.equal(sqlModel(name, controller), undefined);
  });
}
