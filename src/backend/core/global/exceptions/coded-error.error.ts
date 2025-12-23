export class CodedError extends Error {
  public readonly code: string;

  /**
   * NOTE: Keep the constructor signature backwards compatible.
   * We allow `cause` as an optional extra to improve error chaining.
   */
  constructor({ message, code, cause }: { message: string; code: string; cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        value: cause,
        writable: false,
        enumerable: false,
        configurable: true,
      });
    }
  }
}
