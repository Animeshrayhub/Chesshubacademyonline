/**
 * WhatsApp Notification Service & Integration Boundary
 *
 * 1. Immediate Implementation:
 *    Generates safe, URL-encoded click-to-chat links (https://wa.me/<phone>?text=<encoded_message>)
 *    for human-in-the-loop admin communication.
 *
 * 2. Future Automated Integration Boundary:
 *    Structured interface and contract for official WhatsApp Business Platform
 *    (Cloud API / On-Premises API / Authorized BSP).
 */

export interface WhatsAppMessageParams {
  recipientPhone: string;
  parentName: string;
  studentName: string;
  bookingRef: string;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'cancelled';
  sessionTime?: string;
  meetLink?: string;
}

/**
 * Normalizes phone numbers to standard E.164 digits without symbols.
 * Example: "+91 70086-65245" -> "917008665245"
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  // If user entered local Indian number (10 digits starting with 6,7,8,9), prepend 91
  if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    return `91${digitsOnly}`;
  }
  return digitsOnly;
}

/**
 * Generates an official WhatsApp click-to-chat URL with pre-composed, URL-encoded text.
 */
export function generateWhatsAppClickToChatUrl(params: WhatsAppMessageParams): string {
  const cleanPhone = normalizePhoneForWhatsApp(params.recipientPhone);
  if (!cleanPhone) return '';

  let message = '';

  switch (params.status) {
    case 'confirmed':
      message =
        `Hello ${params.parentName}! 👋\n\n` +
        `Great news from *ChessHub Academy*! The free 1-on-1 demo chess class for *${params.studentName}* has been confirmed.\n\n` +
        `📋 *Booking Reference:* ${params.bookingRef}\n` +
        `📅 *Confirmed Time:* ${params.sessionTime || 'Pending schedule'}\n` +
        (params.meetLink ? `🔗 *Google Meet Link:* ${params.meetLink}\n\n` : '\n') +
        `Please be ready 5 minutes before the session on a computer or tablet. Let us know if you have any questions!\n\n` +
        `Warm regards,\n*ChessHub Academy Team*\nhttps://chesshubacademy.online`;
      break;

    case 'rescheduled':
      message =
        `Hello ${params.parentName}! 👋\n\n` +
        `Your demo chess session for *${params.studentName}* at *ChessHub Academy* has been rescheduled.\n\n` +
        `📋 *Booking Reference:* ${params.bookingRef}\n` +
        `📅 *New Session Time:* ${params.sessionTime || 'To be confirmed'}\n` +
        (params.meetLink ? `🔗 *Google Meet Link:* ${params.meetLink}\n\n` : '\n') +
        `Looking forward to seeing ${params.studentName} on the board!\n\n` +
        `Best regards,\n*ChessHub Academy Team*`;
      break;

    case 'cancelled':
      message =
        `Hello ${params.parentName},\n\n` +
        `This is a note from *ChessHub Academy* regarding demo request *${params.bookingRef}* for ${params.studentName}. ` +
        `The booking has been cancelled. If you would like to pick a new date or have any questions, feel free to message us back anytime.\n\n` +
        `Best regards,\n*ChessHub Academy Team*`;
      break;

    case 'pending':
    default:
      message =
        `Hello ${params.parentName}! 👋\n\n` +
        `Thank you for requesting a free demo chess class for *${params.studentName}* at *ChessHub Academy*.\n\n` +
        `📋 *Booking Reference:* ${params.bookingRef}\n` +
        `Our admissions team is reviewing coach availability for your preferred slot. We will follow up shortly to confirm your session.\n\n` +
        `Feel free to reach us here on WhatsApp anytime!\n\n` +
        `Warm regards,\n*ChessHub Academy Team*\nhttps://chesshubacademy.online`;
      break;
  }

  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUTURE AUTOMATED INTEGRATION BOUNDARY (WhatsApp Business API)
 * ─────────────────────────────────────────────────────────────────────────────
 * When Meta WhatsApp Business Platform credentials (WABA_ID, PHONE_NUMBER_ID,
 * WHATSAPP_ACCESS_TOKEN) are configured, this client can be initialized.
 */
export interface WhatsAppBusinessProvider {
  sendTemplateMessage(params: {
    templateName: string;
    languageCode: string;
    recipientPhone: string;
    components: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{ type: 'text' | 'currency' | 'date_time'; text?: string }>;
    }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class WhatsAppBusinessClient implements WhatsAppBusinessProvider {
  private apiToken?: string;
  private phoneNumberId?: string;

  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiToken && this.phoneNumberId);
  }

  public async sendTemplateMessage(params: {
    templateName: string;
    languageCode: string;
    recipientPhone: string;
    components: Array<any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error:
          'WhatsApp Business API is not configured. Missing WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment.',
      };
    }

    try {
      const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
      const cleanPhone = normalizePhoneForWhatsApp(params.recipientPhone);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.languageCode || 'en' },
            components: params.components,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data?.error?.message || 'Failed to dispatch WhatsApp template message',
        };
      }

      return {
        success: true,
        messageId: data?.messages?.[0]?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error contacting WhatsApp Business API',
      };
    }
  }
}

export const whatsAppBusiness = new WhatsAppBusinessClient();
