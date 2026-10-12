# Quicktype streaming compatibility

Quicktype 23.2.6 is pinned because the protocol generator depends on its exact Swift helper output. Its upstream `stream-json` dependency has security fixes only in newer major releases.

The patch uses the `stream-json` 3 ESM parser factory while retaining Quicktype's token handling and generator version. `scripts/quicktype_stream.test.mjs` covers chunked input, malformed JSON, and CLI inference. Remove the patch and override together when upgrading to a Quicktype release that supports a patched `stream-json` version.
