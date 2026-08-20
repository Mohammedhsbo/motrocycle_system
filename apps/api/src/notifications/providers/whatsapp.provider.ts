import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannelProvider,
  NotificationMessage,
  DeliveryResult,
} from './notification-channel.provider.js';
import { NotificationChannel } from '../notifications.types.js';

/**
 * WhatsApp Provider Stub
 * TODO: Integrate with WhatsApp Business API
 */
@Injectable()
export class WhatsAppProvider extends NotificationChannelProvider {
  readonly channel = NotificationChannel.WHATSAPP;
  private readonly logger = new Logger(WhatsAppProvider.name);

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    try {
      // Stub implementation - log the WhatsApp message
      this.logger.log(`[WHATSAPP STUB] To: ${message.recipient}`);
      this.logger.debug(`[WHATSAPP STUB] Message: ${message.body}`);

      // TODO: Implement actual WhatsApp sending
      // Example with Twilio WhatsApp:
      // const msg = await this.twilioClient.messages.create({
      //   to: `whatsapp:${message.recipient}`,
      //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      //   body: message.body,
      // });
      // return { success: true, externalId: msg.sid };

      return {
        success: true,
        externalId: `whatsapp_stub_${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${(error as Error).message}`,
        (error as Error).stack,
      );

      return {
        success: false,
        errorMessage: (error as Error).message,
      };
    }
  }

  supportsChannel(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.WHATSAPP;
  }
}
