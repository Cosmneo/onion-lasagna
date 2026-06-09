# Adapter Skill Pressure Scenario

Create the persistence side for an Onion Lasagna use case named `CreateProjectCommand`. The domain has `Project`, `ProjectId`, and `ProjectName`. The app layer needs a `ProjectRepositoryPort` with `save(project)` and `findById(id)`. The concrete persistence is Drizzle.
