// TNS AI Studio - Provider Registry

const providers = new Map();

export function registerProvider(name, provider) {
  if (!name || !provider) {
    throw new Error("Provider name and provider are required");
  }

  providers.set(name.toLowerCase(), provider);
}

export function getProvider(name) {
  if (!name) {
    throw new Error("Provider name is required");
  }

  const provider = providers.get(name.toLowerCase());

  if (!provider) {
    throw new Error(`Provider not found: ${name}`);
  }

  return provider;
}

export function hasProvider(name) {
  return providers.has(name.toLowerCase());
}

export function listProviders() {
  return Array.from(providers.keys());
}

export function removeProvider(name) {
  return providers.delete(name.toLowerCase());
}

export default {
  registerProvider,
  getProvider,
  hasProvider,
  listProviders,
  removeProvider
};
