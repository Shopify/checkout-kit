let callCount = 0;

function getRandomBytes(size: number) {
  callCount++;
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = (i + callCount) % 256;
  }
  return bytes;
}

async function digestStringAsync(_algorithm: string, _data: string, _options?: unknown) {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = (i * 7) % 256;
  }
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function resetCallCount() {
  callCount = 0;
}

module.exports = {
  __esModule: true,
  CryptoDigestAlgorithm: {SHA256: 'SHA-256'},
  CryptoEncoding: {BASE64: 'base64'},
  getRandomBytes,
  digestStringAsync,
  resetCallCount,
};

export {};
