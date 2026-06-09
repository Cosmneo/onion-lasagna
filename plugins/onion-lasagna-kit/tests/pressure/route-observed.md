# Route Skill Observed Behavior

## RED Observed

The unaided baseline produced an endpoint sketch but blurred presentation and application behavior.
It left room for direct persistence access, did not first verify the route-builder API, and treated
error handling as local handler work instead of adapter-level behavior.

## GREEN Observed

The skill-guided run moved toward the library's presentation pipeline. It described an endpoint
definition, a typed route collection, a thin execution bridge into the application layer, and a
response shape while leaving business decisions outside the handler.
