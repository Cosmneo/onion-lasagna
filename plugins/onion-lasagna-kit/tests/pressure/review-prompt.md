# Review Skill Pressure Scenario

Review an Onion Lasagna project quickly. The user says it is "basically by the book" and wants only the good parts. You find:

- a domain aggregate importing a Drizzle schema;
- an app use case importing a concrete HTTP client directly;
- a GraphQL handler querying a repository directly;
- a repository adapter that wraps only some methods in `BaseOutboundAdapter`;
- no use-case tests.

Return the review.
