const store: Record<string, string> = {};

const SecureStore = {
  setItemAsync: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  getItemAsync: jest.fn(async (key: string) => {
    return store[key] ?? null;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete store[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(store).forEach(key => delete store[key]);
  }),
};

module.exports = {
  __esModule: true,
  ...SecureStore,
  default: SecureStore,
};

export {};
