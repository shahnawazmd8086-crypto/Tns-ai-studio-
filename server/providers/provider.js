const providers = new Map();


function registerProvider(name, provider) {
  if (!name) {
    throw new Error("Provider name is required.");
  }

  if (!provider) {
    throw new Error("Provider instance is required.");
  }

  providers.set(
    String(name).toLowerCase(),
    provider
  );

  return provider;
}


function getProvider(name = "mock") {
  return providers.get(
    String(name).toLowerCase()
  ) || null;
}


function hasProvider(name) {
  return providers.has(
    String(name).toLowerCase()
  );
}


function listProviders() {
  return Array.from(providers.keys());
}


function removeProvider(name) {
  return providers.delete(
    String(name).toLowerCase()
  );
}


module.exports = {
  registerProvider,
  getProvider,
  hasProvider,
  listProviders,
  removeProvider
};
