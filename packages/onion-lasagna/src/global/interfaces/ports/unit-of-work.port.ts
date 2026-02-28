/**
 * Outbound port for transactional boundaries.
 *
 * Wraps a unit of work in a single transaction. If the work function throws,
 * the transaction is rolled back. Implementations handle the actual
 * transaction management (e.g., Drizzle, Knex, Prisma, TypeORM).
 *
 * @example
 * ```typescript
 * class DrizzleUnitOfWork extends BaseOutboundAdapter implements UnitOfWorkPort {
 *   constructor(private db: DrizzleClient) {
 *     super();
 *   }
 *
 *   async atomicExecute<T>(work: () => Promise<T>): Promise<T> {
 *     return this.db.transaction(async () => work());
 *   }
 * }
 *
 * // Usage in a use case
 * class TransferFundsUseCase extends BaseInboundAdapter<Input, Output> {
 *   constructor(
 *     private unitOfWork: UnitOfWorkPort,
 *     private accountRepo: AccountRepository,
 *   ) { super(); }
 *
 *   protected async handle(input: Input): Promise<Output> {
 *     return this.unitOfWork.atomicExecute(async () => {
 *       await this.accountRepo.debit(input.fromId, input.amount);
 *       await this.accountRepo.credit(input.toId, input.amount);
 *       return { success: true };
 *     });
 *   }
 * }
 * ```
 */
export interface UnitOfWorkPort {
  /**
   * Executes the given work within a transaction.
   *
   * @param work - The async function to execute within the transaction
   * @returns The result of the work function
   * @throws Re-throws any error from the work function after rolling back
   */
  atomicExecute<T>(work: () => Promise<T>): Promise<T>;
}
