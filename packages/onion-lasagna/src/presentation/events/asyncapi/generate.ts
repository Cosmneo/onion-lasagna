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
 * Generates an AsyncAPI 3.0 specification from an event router definition.
 *
 * This function walks the event router structure, extracts JSON schemas from
 * all handler payload definitions, and builds a complete AsyncAPI 3.0 specification.
 *
 * @param router - Event router definition or raw config
 * @param config - AsyncAPI configuration (info, servers, tags, etc.)
 * @returns Complete AsyncAPI specification
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
    const channelId = handler.eventType;

    // Build message
    const message = buildMessage(handler.eventType, handler.payload, handler.docs);

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

    // Build operation (one per handler)
    const operation: AsyncAPIOperation = {
      action: 'receive',
      channel: { $ref: `#/channels/${channelId}` },
      messages: [{ $ref: `#/channels/${channelId}/messages/${handlerId}` }],
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
 */
function buildMessage(
  eventType: string,
  payload: unknown,
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

  return message;
}
