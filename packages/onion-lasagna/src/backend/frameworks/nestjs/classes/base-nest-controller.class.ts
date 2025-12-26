import { UseFilters, UseInterceptors } from '@nestjs/common';
import { OnionLasagnaExceptionFilter } from '../filters/onion-lasagna-exception.filter';
import { OnionLasagnaResponseInterceptor } from '../interceptors/onion-lasagna-response.interceptor';

/**
 * Base controller for NestJS that auto-wires onion-lasagna integration.
 *
 * Extending this class automatically applies:
 * - {@link OnionLasagnaExceptionFilter} - Maps domain errors to HTTP responses
 * - {@link OnionLasagnaResponseInterceptor} - Transforms HttpResponse to NestJS response
 *
 * This reduces boilerplate when creating controllers that work with
 * onion-lasagna's architecture.
 *
 * @example Basic usage
 * ```typescript
 * import { Controller, Get, Post } from '@nestjs/common';
 * import { BaseNestController, OnionLasagnaRequest } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 * import type { HttpRequest } from '@cosmneo/onion-lasagna/backend/core/presentation';
 *
 * @Controller('users')
 * export class UsersController extends BaseNestController {
 *   constructor(
 *     private readonly getUserController: GetUserController,
 *     private readonly createUserController: CreateUserController,
 *   ) {
 *     super();
 *   }
 *
 *   @Get(':id')
 *   getUser(@OnionLasagnaRequest() request: HttpRequest) {
 *     return this.getUserController.execute(request);
 *   }
 *
 *   @Post()
 *   createUser(@OnionLasagnaRequest() request: HttpRequest) {
 *     return this.createUserController.execute(request);
 *   }
 * }
 * ```
 *
 * @example With NestJS guards
 * ```typescript
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * export class AdminController extends BaseNestController {
 *   @Get('dashboard')
 *   @Roles('admin')
 *   getDashboard(@OnionLasagnaRequest() request: HttpRequest) {
 *     return this.dashboardController.execute(request);
 *   }
 * }
 * ```
 */
@UseFilters(OnionLasagnaExceptionFilter)
@UseInterceptors(OnionLasagnaResponseInterceptor)
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Abstract base with decorator inheritance only
export abstract class BaseNestController {}
