function normalizeCapabilities(values = []) {
  return new Set(Array.isArray(values) ? values.filter(Boolean).map(String) : []);
}

function normalizeRegistration(registration, index) {
  if (!registration || typeof registration !== 'object') {
    throw new Error(`Invalid extension runtime registration at index ${index}.`);
  }
  if (typeof registration.id !== 'string' || !registration.id) {
    throw new Error(`Extension runtime registration at index ${index} has no id.`);
  }
  if (typeof registration.create !== 'function') {
    throw new Error(`Extension runtime ${registration.id} has no create function.`);
  }
  return Object.freeze({
    id: registration.id,
    requires: Object.freeze(Array.isArray(registration.requires)
      ? [...new Set(registration.requires.filter(Boolean).map(String))]
      : []),
    create: registration.create
  });
}

export function createExtensionRuntimeHost(registrations = []) {
  const declared = Object.freeze(registrations.map(normalizeRegistration));
  const ids = declared.map((registration) => registration.id);
  if (new Set(ids).size !== ids.length) throw new Error('Extension runtime registration ids must be unique.');

  let activeRuntimes = [];

  function destroy() {
    [...activeRuntimes].reverse().forEach(({ runtime }) => runtime.destroy());
    activeRuntimes = [];
  }

  function init(capabilities = [], services = {}) {
    destroy();
    const available = normalizeCapabilities(capabilities);
    const selected = declared.filter((registration) =>
      registration.requires.every((capability) => available.has(capability))
    );
    const created = [];
    try {
      for (const registration of selected) {
        const runtime = registration.create(services);
        if (!runtime || typeof runtime.init !== 'function' || typeof runtime.destroy !== 'function') {
          throw new Error(`Extension runtime ${registration.id} does not implement init/destroy.`);
        }
        created.push({ id: registration.id, runtime });
        runtime.init();
      }
    } catch (error) {
      [...created].reverse().forEach(({ runtime }) => runtime.destroy());
      throw error;
    }
    activeRuntimes = created;
    return Object.freeze(created.map(({ id }) => id));
  }

  return Object.freeze({ init, destroy });
}
