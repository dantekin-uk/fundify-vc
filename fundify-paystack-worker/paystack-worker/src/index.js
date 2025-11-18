export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/webhook") {
      const event = await request.json();

      // Validate the event
      const isValid = await validateEvent(event);
      if (!isValid) {
        return new Response("Invalid event", { status: 400 });
      }

      // Confirm the payment
      const paymentConfirmation = await confirmPayment(event.data.id);
      if (!paymentConfirmation) {
        return new Response("Payment confirmation failed", { status: 500 });
      }

      // Save the transaction to Firestore
      await saveTransaction(paymentConfirmation);

      // Update dashboards
      await updateNGO(paymentConfirmation);
      await updateFunder(paymentConfirmation);

      return new Response("Webhook processed", { status: 200 });
    }

    return new Response(null, { status: 404 });
  },
}

import { validateEvent } from './paystack/validateEvent';
import { confirmPayment } from './paystack/confirmPayment';
import { saveTransaction } from './firestore/saveTransaction';
import { updateNGO } from './dashboards/updateNGO';
import { updateFunder } from './dashboards/updateFunder';