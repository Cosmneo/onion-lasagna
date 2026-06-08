# Bounded Context Skill Expected Behavior

## RED Failure Signal

The agent creates arbitrary folders, skips bootstrap, exposes concrete infra directly, or creates empty unused folders.

## GREEN Success Signal

The agent uses domain/app/infra/bootstrap/index structure, names bootstrap phases, keeps exports layered, and says to inspect existing patterns first.
