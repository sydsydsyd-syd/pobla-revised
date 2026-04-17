//emailService
import type { Order } from "@/types";
import { formatCurrency } from "@/lib/utils";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY as string;
const FROM_EMAIL = import.meta.env.VITE_BREVO_FROM_EMAIL as string ?? "noreply@pobla.ph";
const FROM_NAME = "Pobla Order Hub";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemRows(order: Order): string {
  return order.items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe9;font-size:14px;color:#3b3130;">
            ${i.menuItemName} × ${i.quantity}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe9;font-size:14px;color:#3b3130;text-align:right;font-weight:600;">
            ${formatCurrency(i.subtotal)}
          </td>
        </tr>`
    )
    .join("");
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0ef;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ef;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(59,49,48,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#3b3130;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;">POBLA</p>
            <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#bc5d5d;letter-spacing:4px;text-transform:uppercase;">ORDER HUB</p>
          </td>
        </tr>

        <!-- Title bar -->
        <tr>
          <td style="background:#bc5d5d;padding:14px 32px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${title}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f0ef;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9c8f8e;">© 2025 Pobla Order Hub • Authentic Filipino Cuisine</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!BREVO_API_KEY) {
    console.warn("[emailService] VITE_BREVO_API_KEY not set — skipping email.");
    return;
  }
  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[emailService] Brevo error:", err);
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

/** Sent right after customer places order */
export async function sendOrderConfirmation(order: Order, customerEmail: string): Promise<void> {
  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:#6b5f5e;">Hi <strong>${order.customerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b5f5e;">We received your order and are preparing it now!</p>

    <!-- Order info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f9f5f4;border-radius:10px;padding:16px;">
      <tr>
        <td style="font-size:12px;color:#9c8f8e;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Order Number</td>
        <td style="font-size:16px;font-weight:900;color:#bc5d5d;text-align:right;">${order.orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#9c8f8e;padding-top:8px;">Order Type</td>
        <td style="font-size:13px;font-weight:600;color:#3b3130;text-align:right;padding-top:8px;text-transform:capitalize;">${order.orderType}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#9c8f8e;padding-top:8px;">Payment</td>
        <td style="font-size:13px;font-weight:600;color:#3b3130;text-align:right;padding-top:8px;">Cash on Delivery</td>
      </tr>
      ${order.customerAddress ? `
      <tr>
        <td style="font-size:12px;color:#9c8f8e;padding-top:8px;">Delivery Address</td>
        <td style="font-size:13px;font-weight:600;color:#3b3130;text-align:right;padding-top:8px;">${order.customerAddress}</td>
      </tr>` : ""}
    </table>

    <!-- Items -->
    <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#9c8f8e;text-transform:uppercase;letter-spacing:1px;">Your Order</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemRows(order)}
      ${order.deliveryFee > 0 ? `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#9c8f8e;">Delivery Fee</td>
        <td style="padding:8px 0;font-size:13px;color:#9c8f8e;text-align:right;">${formatCurrency(order.deliveryFee)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:12px 0 0;font-size:15px;font-weight:900;color:#3b3130;border-top:2px solid #3b3130;">TOTAL</td>
        <td style="padding:12px 0 0;font-size:15px;font-weight:900;color:#bc5d5d;text-align:right;border-top:2px solid #3b3130;">${formatCurrency(order.total)}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9c8f8e;">Thank you for your order! We'll notify you when it's ready.</p>
  `;

  await sendEmail(
    customerEmail,
    ` Order Confirmed — ${order.orderNumber} | Pobla`,
    baseTemplate("Order Confirmed!", body)
  );
}

/** Sent when kitchen marks order as ready */
export async function sendOrderReadyNotification(order: Order, customerEmail: string): Promise<void> {
  const isDelivery = order.orderType === "delivery";
  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:#6b5f5e;">Hi <strong>${order.customerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b5f5e;">
      ${isDelivery
      ? "Your order is ready and waiting to be picked up by the rider"
      : "Your order is ready for pickup!"}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f0faf4;border-radius:10px;padding:16px;border:1px solid #bbf7d0;">
      <tr>
        <td style="font-size:12px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Order Number</td>
        <td style="font-size:16px;font-weight:900;color:#166534;text-align:right;">${order.orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#166534;padding-top:8px;">Status</td>
        <td style="font-size:13px;font-weight:700;color:#166534;text-align:right;padding-top:8px;">
          ${isDelivery ? " Ready" : " Ready for Pickup"}
        </td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#166534;padding-top:8px;">Total to Pay</td>
        <td style="font-size:15px;font-weight:900;color:#166534;text-align:right;padding-top:8px;">${formatCurrency(order.total)}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9c8f8e;">
      ${isDelivery
      ? "Please prepare <strong>" + formatCurrency(order.total) + "</strong> for Cash on Delivery."
      : "Please bring your order number when you come. Thank you!"}
    </p>
  `;

  await sendEmail(
    customerEmail,
    ` Order Ready — ${order.orderNumber} | Pobla`,
    baseTemplate(isDelivery ? "Order Ready! " : "Ready for Pickup! ", body)
  );
}

export async function sendOrderOutForDeliveryNotification(order: Order, customerEmail: string): Promise<void> {
  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:#6b5f5e;">Hi <strong>${order.customerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b5f5e;">
      Great news! Your order is out for delivery and on its way to you.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#fef3c7;border-radius:10px;padding:16px;border:1px solid #fde68a;">
      <tr>
        <td style="font-size:12px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Order Number</td>
        <td style="font-size:16px;font-weight:900;color:#92400e;text-align:right;">${order.orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#92400e;padding-top:8px;">Status</td>
        <td style="font-size:13px;font-weight:700;color:#92400e;text-align:right;padding-top:8px;"> Out for Delivery</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#92400e;padding-top:8px;">Delivery Address</td>
        <td style="font-size:13px;font-weight:600;color:#92400e;text-align:right;padding-top:8px;">${order.customerAddress || "Provided in order"}</td>
      </tr>
    </table>

    <!-- Items -->
    <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#9c8f8e;text-transform:uppercase;letter-spacing:1px;">Order Summary</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemRows(order)}
      ${order.deliveryFee > 0 ? `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#9c8f8e;">Delivery Fee</td>
        <td style="padding:8px 0;font-size:13px;color:#9c8f8e;text-align:right;">${formatCurrency(order.deliveryFee)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:12px 0 0;font-size:15px;font-weight:900;color:#3b3130;border-top:2px solid #3b3130;">TOTAL</td>
        <td style="padding:12px 0 0;font-size:15px;font-weight:900;color:#bc5d5d;text-align:right;border-top:2px solid #3b3130;">${formatCurrency(order.total)}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9c8f8e;">
      Your rider is on the way! Please prepare <strong>${formatCurrency(order.total)}</strong> for Cash on Delivery.
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#9c8f8e;">
      Need to contact the rider? Call us at (042) 123-4567
    </p>
  `;

  await sendEmail(
    customerEmail,
    ` Out for Delivery — ${order.orderNumber} | Pobla`,
    baseTemplate(" Out for Delivery!", body)
  );
}

export async function sendOrderDeliveredNotification(order: Order, customerEmail: string): Promise<void> {
  const isPickup = order.orderType === "pickup";
  const isDelivery = order.orderType === "delivery";

  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:#6b5f5e;">Hi <strong>${order.customerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b5f5e;">
      ${isPickup
      ? "Your order has been picked up! Thank you for choosing Pobla Order Hub."
      : "Your order has been delivered! Thank you for choosing Pobla Order Hub."}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#dcfce7;border-radius:10px;padding:16px;border:1px solid #bbf7d0;">
      <tr>
        <td style="font-size:12px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Order Number</td>
        <td style="font-size:16px;font-weight:900;color:#166534;text-align:right;">${order.orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#166534;padding-top:8px;">Status</td>
        <td style="font-size:13px;font-weight:700;color:#166534;text-align:right;padding-top:8px;">
          ${isPickup ? "✅ Picked Up" : "✅ Delivered"}
        </td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#166534;padding-top:8px;">${isPickup ? "Picked Up On" : "Delivered On"}</td>
        <td style="font-size:13px;font-weight:600;color:#166534;text-align:right;padding-top:8px;">${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</td>
      </tr>
    </table>

    <!-- Items -->
    <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#9c8f8e;text-transform:uppercase;letter-spacing:1px;">Order Summary</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemRows(order)}
      ${order.deliveryFee > 0 && isDelivery ? `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#9c8f8e;">Delivery Fee</td>
        <td style="padding:8px 0;font-size:13px;color:#9c8f8e;text-align:right;">${formatCurrency(order.deliveryFee)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:12px 0 0;font-size:15px;font-weight:900;color:#3b3130;border-top:2px solid #3b3130;">TOTAL PAID</td>
        <td style="padding:12px 0 0;font-size:15px;font-weight:900;color:#166534;text-align:right;border-top:2px solid #3b3130;">${formatCurrency(order.total)}</td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#166534;">
        ${isPickup ? "Enjoy your meal! 🍽️" : "Enjoy your meal! 🍽️"}
      </p>
      <p style="margin:0;font-size:12px;color:#9c8f8e;">We'd love to hear your feedback</p>
    </div>

    <p style="margin:0;font-size:13px;color:#9c8f8e;">
      Thank you for ordering with us! Come back soon.
    </p>
  `;

  await sendEmail(
    customerEmail,
    `${isPickup ? "✅ Order Picked Up" : "✅ Order Delivered"} — ${order.orderNumber} | Pobla`,
    baseTemplate(isPickup ? "Order Picked Up!" : "Order Delivered!", body)
  );
}

// Add these after your existing functions

/** Sent when rider application is approved */
export async function sendRiderApprovalEmail(to: string, name: string): Promise<void> {
  const body = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        <span style="font-size: 32px;">✅</span>
      </div>
      <h3 style="margin: 0 0 8px; font-size: 22px; color: #166534;">Congratulations, ${name}!</h3>
      <p style="margin: 0; font-size: 14px; color: #6b5f5e;">Your rider application has been approved!</p>
    </div>

    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #bbf7d0;">
      <p style="margin: 0 0 12px; font-weight: 600; color: #166534;">🎉 What's next?</p>
      <ul style="margin: 0; padding-left: 20px; color: #6b5f5e;">
        <li style="margin-bottom: 8px;">Log in to your rider account</li>
        <li style="margin-bottom: 8px;">Go to the Rider Dashboard</li>
        <li style="margin-bottom: 8px;">Toggle your availability to start receiving orders</li>
        <li style="margin-bottom: 8px;">Accept delivery requests and start earning!</li>
      </ul>
    </div>

    <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #fde68a;">
      <p style="margin: 0 0 4px; font-weight: 600; color: #92400e;">💡 Quick Tips:</p>
      <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px;">
        <li style="margin-bottom: 4px;">Keep your phone nearby for order notifications</li>
        <li style="margin-bottom: 4px;">Update your availability when you're ready to deliver</li>
        <li>Contact support if you need assistance</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 24px 0 16px;">
      <a href="${import.meta.env.VITE_APP_URL || 'https://pobla.ph'}/rider/dashboard" 
         style="background: #bc5d5d; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
        Go to Rider Dashboard →
      </a>
    </div>

    <p style="margin: 16px 0 0; font-size: 12px; color: #9c8f8e; text-align: center;">
      Thank you for joining the Pobla delivery team! We're excited to have you onboard.
    </p>
  `;

  await sendEmail(
    to,
    `🎉 Rider Application Approved! | Pobla`,
    baseTemplate("Rider Application Approved!", body)
  );
}

/** Sent when rider application is rejected */
export async function sendRiderRejectionEmail(to: string, name: string, reason?: string): Promise<void> {
  const body = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        <span style="font-size: 32px;">📋</span>
      </div>
      <h3 style="margin: 0 0 8px; font-size: 22px; color: #991b1b;">Application Update</h3>
      <p style="margin: 0; font-size: 14px; color: #6b5f5e;">Dear ${name},</p>
    </div>

    <p style="margin: 0 0 16px; font-size: 14px; color: #6b5f5e;">
      Thank you for your interest in becoming a delivery rider for Pobla Order Hub. 
      After careful review of your application, we regret to inform you that it was 
      <strong style="color: #dc2626;">not approved</strong> at this time.
    </p>

    ${reason ? `
    <div style="background: #fef2f2; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #fecaca;">
      <p style="margin: 0 0 4px; font-weight: 600; color: #991b1b;">Reason for rejection:</p>
      <p style="margin: 0; color: #991b1b;">${reason}</p>
    </div>
    ` : ''}

    <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #4b5563;">What you can do:</p>
      <ul style="margin: 0; padding-left: 20px; color: #6b5f5e;">
        <li style="margin-bottom: 8px;">Review the requirements and try again in 30 days</li>
        <li style="margin-bottom: 8px;">Contact support for more details about your application</li>
        <li>Consider applying as a customer to experience our platform</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 24px 0 16px;">
      <a href="${import.meta.env.VITE_APP_URL || 'https://pobla.ph'}/contact" 
         style="background: #6b7280; color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
        Contact Support →
      </a>
    </div>

    <p style="margin: 16px 0 0; font-size: 12px; color: #9c8f8e; text-align: center;">
      We appreciate your interest and wish you the best in your future endeavors.
    </p>
  `;

  await sendEmail(
    to,
    `Rider Application Update | Pobla`,
    baseTemplate("Application Status Update", body)
  );
}

/** Sent when rider is approved (as a reminder) */
export async function sendRiderWelcomeReminder(to: string, name: string): Promise<void> {
  const body = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        <span style="font-size: 32px;">🚲</span>
      </div>
      <h3 style="margin: 0 0 8px; font-size: 22px; color: #92400e;">Welcome to the Team, ${name}!</h3>
      <p style="margin: 0; font-size: 14px; color: #6b5f5e;">Your rider account is now active.</p>
    </div>

    <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 12px; font-weight: 600; color: #92400e;">📱 How to get started:</p>
      <ol style="margin: 0; padding-left: 20px; color: #6b5f5e;">
        <li style="margin-bottom: 8px;">Log in to your rider account</li>
        <li style="margin-bottom: 8px;">Complete your rider profile (add vehicle details, etc.)</li>
        <li style="margin-bottom: 8px;">Set your availability to "Active"</li>
        <li style="margin-bottom: 8px;">You'll receive notifications when orders are ready for pickup</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 24px 0 16px;">
      <a href="${import.meta.env.VITE_APP_URL || 'https://pobla.ph'}/rider/dashboard" 
         style="background: #bc5d5d; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
        Start Delivering →
      </a>
    </div>

    <p style="margin: 16px 0 0; font-size: 12px; color: #9c8f8e; text-align: center;">
      Need help? Contact our support team at support@pobla.ph
    </p>
  `;

  await sendEmail(
    to,
    `🚲 Ready to Start Delivering? | Pobla`,
    baseTemplate("Your Rider Account is Ready!", body)
  );
}