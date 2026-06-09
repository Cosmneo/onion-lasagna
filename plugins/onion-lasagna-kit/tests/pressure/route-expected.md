# Route Skill Expected Behavior

## RED Failure Signal

The agent puts business logic in the handler, calls a repository directly, skips schema validation, omits request/response mappers, or bypasses framework error handling.

## GREEN Success Signal

The agent keeps presentation thin, uses `defineRoute`, `defineRouter`, `serverRoutes`, schema adapters, `handleWithUseCase`, request mapper, use-case execution, response mapper, and framework error-handler delegation.
