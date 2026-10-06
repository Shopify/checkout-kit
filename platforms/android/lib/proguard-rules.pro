# Checkout Kit uses direct calls and generated serializers. Kotlin serialization
# supplies its own consumer rules; AAPT keeps constructors for views used in XML.
# Do not keep the whole SDK: unused code, including build-time-disabled telemetry,
# must remain eligible for R8 shrinking and optimization.
