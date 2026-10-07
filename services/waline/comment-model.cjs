// Waline 1.43.4's SQL update response overwrites the comment body with an
// undefined field on guest likes, then fails while formatting the response.
// Use its supported custom model API without changing installed dependencies.
module.exports = function sqlModel(name, controller) {
  const storage = controller.config('storage');
  if (!['sqlite', 'postgresql', 'mysql', 'tidb'].includes(storage)) return;
  const model = controller.service(`storage/${storage}`, name);
  const createModel = model.model.bind(model);
  model.model = (...args) => {
    const instance = createModel(...args);
    // The upstream SQL adapter logs connection credentials and full queries.
    // Disable both before opening a connection, including Users and Counter.
    instance.config.logConnect = false;
    instance.config.logSql = false;
    if (storage === 'postgresql' && instance.config.ssl) {
      instance.config.ssl = { ...instance.config.ssl, rejectUnauthorized: true };
    }
    return instance;
  };
  if (name !== 'Comment') return model;
  const clean = data => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  const update = async (data, where) => {
    const delta = typeof data === 'function' ? row => clean(data(row)) : clean(data);
    const rows = await model.update(delta, where);
    const ids = rows.map(row => row.objectId ?? row.id).filter(id => id !== undefined);
    return ids.length ? model.select({ objectId: ['IN', ids] }) : [];
  };
  return new Proxy(model, {
    get(target, key) {
      if (key === 'update') return update;
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
};
