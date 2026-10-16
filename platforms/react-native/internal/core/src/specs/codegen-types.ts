import type {CodegenTypes} from 'react-native';

// Older codegen parsers require bare imported names in component specs. Keep
// aliases in a separate file so they also work with React Native's strict API.
export type Double = CodegenTypes.Double;
export type Float = CodegenTypes.Float;
export type DirectEventHandler<T> = CodegenTypes.DirectEventHandler<T>;
export type BubblingEventHandler<T> = CodegenTypes.BubblingEventHandler<T>;
