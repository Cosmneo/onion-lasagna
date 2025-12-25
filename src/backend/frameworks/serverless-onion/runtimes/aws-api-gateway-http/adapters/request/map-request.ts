import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { HttpRequest } from '../../../../../../core/onion-layers/presentation/interfaces/types/http';
import { mapRequestBody } from './map-request-body';
import { mapRequestHeaders } from './map-request-headers';
import { mapRequestPathParams } from './map-request-path-params';
import { mapRequestQueryParams } from './map-request-query-params';

/**
 * Maps an AWS API Gateway v2 event to the standard HttpRequest format.
 *
 * Combines all individual mappers (body, headers, pathParams, queryParams)
 * into a single HttpRequest object.
 *
 * @param event - AWS API Gateway v2 event
 * @returns HttpRequest object with all mapped properties
 *
 * @example
 * ```typescript
 * const httpRequest = mapRequest(event);
 * // {
 * //   body: { name: 'John' },
 * //   headers: { 'content-type': 'application/json' },
 * //   pathParams: { id: '123' },
 * //   queryParams: { limit: '10' },
 * // }
 * ```
 */
export function mapRequest(event: APIGatewayProxyEventV2): HttpRequest {
  return {
    body: mapRequestBody(event),
    headers: mapRequestHeaders(event),
    pathParams: mapRequestPathParams(event),
    queryParams: mapRequestQueryParams(event),
  };
}
