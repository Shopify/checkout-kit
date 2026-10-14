import { type Delegation } from './generated/ProtocolNotifications';
export interface ProtocolURLOptions {
    readonly delegations?: readonly Delegation[];
    readonly colorScheme?: string;
    readonly auth?: string;
}
export declare function url(input: string, options?: ProtocolURLOptions): string;
