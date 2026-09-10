// TNS AI Studio - Provider Registry

const providers = new Map();

function registerProvider(name, provider) {
  if (!name || !provider) {
    throw new Error("Provider name and provider are required");
  }

  providers.set(String(name).toLowerCase(), provider);

  return provider;
}

function getProvider(name) {
  if (!name) {
    throw new Error("Provider name is required");
  }

  const provider = providers.get(String(name).toLowerCase());

  if (!provider) {
    throw new Error(`Provider not found: ${name}`);
  }

  return provider;
}

function hasProvider(name) {
  if (!name) {
    return false;
  }

  return providers.has(String(name).toLowerCase());
}

function listProviders() {
  return Array.from(providers.keys());
}

function removeProvider(name) {
  if (!name) {
    return false;
  }

  return providers.delete(String(name).toLowerCase());
}

module.exports = {
  registerProvider,
  getProvider,
  hasProvider,
  listProviders,
  removeProvider
};
