# Adapter Skill Expected Behavior

## RED Failure Signal

The agent imports Drizzle directly into the use case, returns raw rows to the app layer, skips an outbound port, or forgets error wrapping.

## GREEN Success Signal

The agent creates an outbound port in app, an infra repository adapter implementing the port, a Drizzle mapper/repository behind the adapter, explicit bootstrap wiring, and wraps infrastructure failures as `InfraError` or a specific subclass.
