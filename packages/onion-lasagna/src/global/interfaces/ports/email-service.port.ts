/**
 * Email message to be sent.
 */
export interface EmailMessage {
  /** Recipient email address(es). */
  to: string[];
  /** Email subject. */
  subject: string;
  /** HTML body. */
  htmlBody: string;
  /** Plain text body (fallback). */
  textBody: string;
}

/**
 * Outbound port for sending emails.
 *
 * Implementations handle the actual email delivery (e.g., AWS SES, SendGrid, SMTP).
 *
 * @example
 * ```typescript
 * class SesEmailService extends BaseOutboundAdapter implements EmailServicePort {
 *   constructor(private ses: SESClient) {
 *     super();
 *   }
 *
 *   async sendEmail(message: EmailMessage): Promise<void> {
 *     await this.ses.send(new SendEmailCommand({
 *       Destination: { ToAddresses: message.to },
 *       Message: {
 *         Subject: { Data: message.subject },
 *         Body: {
 *           Html: { Data: message.htmlBody },
 *           Text: { Data: message.textBody },
 *         },
 *       },
 *     }));
 *   }
 * }
 * ```
 */
export interface EmailServicePort {
  /**
   * Sends an email message.
   *
   * @param message - The email message to send
   * @throws Will throw on delivery failure (callers should handle gracefully)
   */
  sendEmail(message: EmailMessage): Promise<void>;
}
