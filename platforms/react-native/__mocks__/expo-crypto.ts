const getRandomBytes = jest.fn((size: number) => new Uint8Array(size).fill(1));
const digestStringAsync = jest.fn(async () => btoa(String.fromCharCode(...new Uint8Array(32).fill(1))));

module.exports = {
  __esModule: true,
  CryptoDigestAlgorithm: {SHA256: 'SHA-256'},
  CryptoEncoding: {BASE64: 'base64'},
  getRandomBytes,
  digestStringAsync,
};

export {};
