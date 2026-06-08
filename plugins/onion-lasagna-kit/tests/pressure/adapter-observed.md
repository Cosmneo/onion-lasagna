# Adapter Skill Observed Behavior

## RED Observed

The unaided baseline was stronger than the planned failure mode on dependency direction: it created
an app-level `ProjectRepositoryPort`, kept Drizzle schema under infrastructure, mapped rows back to
domain objects, and said the use case should depend only on the port.

It still missed the Onion Lasagna-specific adapter boundary. The concrete Drizzle repository
implemented the port directly, there was no separate infra adapter extending `BaseOutboundAdapter`,
no `createInfraError` override, no `InfraError` or subclass wrapping, and no explicit bootstrap
phase wiring the concrete repository through an adapter into `CreateProjectCommand`.

## GREEN Observed

The skill-guided run included all required pieces:

- app outbound `ProjectRepositoryPort`;
- `CreateProjectCommand` depending only on that port;
- concrete `DrizzleProjectRepository` in infra;
- `ProjectMapper` converting between rows and domain objects;
- `ProjectRepositoryAdapter` extending `BaseOutboundAdapter` and implementing the port;
- `createInfraError` returning `InfraError`;
- bootstrap factory wiring Drizzle repository through the adapter into the command;
- tests for adapter behavior, command behavior, mapping, and error wrapping.
