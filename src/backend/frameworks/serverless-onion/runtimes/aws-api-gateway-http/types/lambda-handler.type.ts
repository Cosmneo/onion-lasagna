import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';

/**
 * Type alias for AWS API Gateway v2 Lambda handlers.
 *
 * This is the same as APIGatewayProxyHandlerV2 from aws-lambda
 * but explicitly typed for documentation purposes.
 */
export type LambdaHandler = APIGatewayProxyHandlerV2;

/**
 * Type alias for the API Gateway v2 event.
 */
export type LambdaEvent = APIGatewayProxyEventV2;

/**
 * Type alias for the API Gateway v2 result.
 */
export type LambdaResult = APIGatewayProxyResultV2;

/**
 * Type alias for the Lambda context.
 */
export type LambdaContext = Context;
