/**
 * Request to Use Case Mapper
 *
 * Transform incoming HTTP request to use case input:
 * - Map request DTO fields to use case input DTO
 * - Extract and combine data from body, query, params, headers
 * - Handle any presentation-layer transformations
 *
 * This mapper is used as the requestMapper in BaseController.
 */
