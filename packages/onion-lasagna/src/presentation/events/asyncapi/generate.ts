/**
 * @fileoverview AsyncAPI specification generation from event router definitions.
 *
 * The `generateAsyncAPI` function creates a complete AsyncAPI 3.0 specification
 * from an event router definition. All handler payload schemas are converted to
 * JSON Schema and included in the specification.
 *
 * @module events/asyncapi/generate
 */

import type { SchemaAdapter } from '../../http/schema/types';
import type { EventRouterConfig, EventRouterDefinition } from '../handler/types';
import { isEventRouterDefinition, collectEventHandlers } from '../handler/types';
import { generateHandlerId } from '../handler/utils';
import type {
  AsyncAPIConfig,
  AsyncAPISpec,
  AsyncAPIChannel,
  AsyncAPIOperation,
  AsyncAPIMessage,
  AsyncAPITag,
} from './types';

/**
 * Encodes a string for use inside a JSON Pointer (RFC 6901).
 *
 * Per RFC 6901 §3:
 *  - `~` must be encoded as `~0`
 *  - `/` must be encoded as `~1`
 *
 * The order matters: ~ must be escaped before /.
 *
 * @param token - Raw token (e.g. an eventType string)
 * @returns RFC6901-safe token for embedding in a $ref JSON Pointer
 */
function encodeJsonPointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Generates an AsyncAPI 3.0 specification from an event router definition.
 *
 * This function walks the event router structure, extracts JSON schemas from
 * all handler payload definitions, and builds a complete AsyncAPI 3.0 specification.
 *
 * Handler context schemas (event metadata) are included as message `headers`
 * so that consumers can see the full message contract.
 *
 * @param router - Event router definition or raw config
 * @param config - AsyncAPI configuration (info, servers, tags, etc.)
 * @returns Complete AsyncAPI specification
 *
 * @throws {Error} If two router keys produce the same camelCase handlerId (C07-5).
 *
 * @example
 * ```typescript
 * import { generateAsyncAPI } from '@cosmneo/onion-lasagna/events/asyncapi';
 * import { notificationEventRouter } from './events/router';
 *
 * const spec = generateAsyncAPI(notificationEventRouter, {
 *   info: {
 *     title: 'My Event API',
 *     version: '1.0.0',
 *     description: 'Domain events for the application',
 *   },
 * });
 *
 * app.get('/asyncapi.json', (c) => c.json(spec));
 * ```
 */
export function generateAsyncAPI<T extends EventRouterConfig>(
  router: T | EventRouterDefinition<T>,
  config: AsyncAPIConfig,
): AsyncAPISpec {
  const routerConfig = isEventRouterDefinition(router) ? router.handlers : router;
  const handlers = collectEventHandlers(routerConfig);

  const channels: Record<string, AsyncAPIChannel> = {};
  const operations: Record<string, AsyncAPIOperation> = {};
  const allTags = new Set<string>();

  for (const { key, handler } of handlers) {
    const handlerId = generateHandlerId(key);

    // C07-5: Guard against duplicate handlerId — two keys that collapse to the same
    // camelCase ID would silently drop the first operation.
    if (operations[handlerId] !== undefined) {
      throw new Error(
        `Duplicate handlerId "${handlerId}": two event handlers produce the same identifier ` +
          `after camelCase conversion. Rename one of the router keys to make them unique.`,
      );
    }

    const channelId = handler.eventType;

    // RFC6901: the eventType is used raw as the channel key (it is a semantic address,
    // not part of a JSON Pointer), but it MUST be escaped when interpolated into $ref
    // pointers (e.g. `#/channels/<escaped>`). C07-8.
    const escapedChannelId = encodeJsonPointerToken(channelId);
    const escapedHandlerId = encodeJsonPointerToken(handlerId);

    // Build message (includes payload + context/metadata schema)
    const message = buildMessage(handler.eventType, handler.payload, handler.context, handler.docs);

    // Build channel (group by eventType — multiple handlers may share a channel)
    if (!channels[channelId]) {
      channels[channelId] = {
        address: handler.eventType,
        messages: {},
      };
    }
    const channelMessages = { ...(channels[channelId]!.messages ?? {}) };
    channelMessages[handlerId] = message;
    channels[channelId] = { ...channels[channelId]!, messages: channelMessages };

    // Build operation (one per handler) — use RFC6901-escaped tokens in $refs
    const operation: AsyncAPIOperation = {
      action: 'receive',
      channel: { $ref: `#/channels/${escapedChannelId}` },
      messages: [{ $ref: `#/channels/${escapedChannelId}/messages/${escapedHandlerId}` }],
    };

    if (handler.docs.summary) {
      (operation as { summary: string }).summary = handler.docs.summary;
    }
    if (handler.docs.description) {
      (operation as { description: string }).description = handler.docs.description;
    }
    if (handler.docs.deprecated) {
      (operation as { deprecated: boolean }).deprecated = true;
    }
    if (handler.docs.tags && handler.docs.tags.length > 0) {
      (operation as { tags: readonly AsyncAPITag[] }).tags = handler.docs.tags.map((t) => ({
        name: t,
      }));
      for (const tag of handler.docs.tags) {
        allTags.add(tag);
      }
    }

    operations[handlerId] = operation;
  }

  // Merge custom tags with collected tags (AsyncAPI 3.0: tags live inside info)
  const tags: AsyncAPITag[] = config.tags ? [...config.tags] : [];
  for (const tagName of allTags) {
    if (!tags.some((t) => t.name === tagName)) {
      tags.push({ name: tagName });
    }
  }

  const info = tags.length > 0 ? { ...config.info, tags } : config.info;

  // Build the specification
  const spec: AsyncAPISpec = {
    asyncapi: config.asyncapi ?? '3.0.0',
    info,
    defaultContentType: config.defaultContentType ?? 'application/json',
    channels,
    operations,
  };

  if (config.servers && Object.keys(config.servers).length > 0) {
    (spec as { servers: typeof config.servers }).servers = config.servers;
  }

  if (config.externalDocs) {
    (spec as { externalDocs: typeof config.externalDocs }).externalDocs = config.externalDocs;
  }

  return spec;
}

/**
 * Builds an AsyncAPI message from a handler definition.
 *
 * - `payload` schema → message `payload` field
 * - `context` schema → message `headers` field (runtime-validated event metadata)
 */
function buildMessage(
  eventType: string,
  payload: unknown,
  context: unknown,
  docs: {
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
  },
): AsyncAPIMessage {
  const message: AsyncAPIMessage = {
    name: eventType,
  };

  if (docs.summary) {
    (message as { summary: string }).summary = docs.summary;
  }
  if (docs.description) {
    (message as { description: string }).description = docs.description;
  }
  if (docs.deprecated) {
    (message as { deprecated: boolean }).deprecated = true;
  }

  if (payload) {
    const schema = (payload as SchemaAdapter).toJsonSchema();
    (message as { payload: typeof schema }).payload = schema;
  }

  // MISSED: context/metadata schema was not included in the generated doc.
  // Map context → message `headers` (AsyncAPI 3.0 convention for envelope metadata).
  if (context) {
    const headersSchema = (context as SchemaAdapter).toJsonSchema();
    (message as { headers: typeof headersSchema }).headers = headersSchema;
  }

  return message;
}
