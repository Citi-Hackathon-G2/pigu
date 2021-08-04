import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import stripeModule from "stripe";

import { Voucher } from "../schema/voucher";
import { fs } from "../utils/admin";

const stripeApiKey = process.env.STRIPE_API_KEY ?? "";
const stripe = new stripeModule.Stripe(
  stripeApiKey,
  {} as stripeModule.StripeConfig
);
const domain = process.env.DOMAIN ?? "";

type BuyRequest = {
  voucherId?: string | undefined;
  quantity?: number | undefined;
  paymentMethodId?: string | undefined;
  paymentIntentId?: string | undefined;
  // currency?: string; // three-letter ISO code https://stripe.com/docs/currencies
};

export const buyVoucher = functions
  .region("asia-southeast2")
  .https.onCall(async (data: BuyRequest, context) => {
    const uidBuyer = context.auth?.uid;
    const { voucherId, quantity, paymentMethodId, paymentIntentId } =
      data ?? {};

    if (!domain) {
      throw new functions.https.HttpsError(
        "internal",
        "The function is misconfigured: domain."
      );
    }

    if (!stripeApiKey) {
      throw new functions.https.HttpsError(
        "internal",
        "The function is misconfigured: stripeApiKey."
      );
    }

    if (!uidBuyer) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!voucherId || !quantity) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "All fields must be present: voucherId, quantity."
      );
    }

    if (
      !(
        (paymentMethodId && !paymentIntentId) ||
        (!paymentMethodId && paymentIntentId)
      )
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Either field must be present, but not both: paymentMethodId, paymentIntentId."
      );
    }

    const voucherRef = fs.collection("voucher").doc(voucherId);
    const voucher = (await voucherRef.get()).data() as Voucher | undefined;

    // ensure voucher exists
    if (!voucher) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Voucher does not exist."
      );
    }

    // ensure voucher is not yet bought by another customer
    if (voucher.user !== undefined) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Voucher has already been bought."
      );
    }

    // stripe payment flow
    let intent;
    if (paymentMethodId) {
      intent = await stripe.paymentIntents.create({
        payment_method: paymentMethodId,
        amount: Math.round(voucher.price * quantity * 100) / 100, // 2dp
        currency: "usd",
        confirmation_method: "manual",
        confirm: true,
      });
    } else if (paymentIntentId) {
      intent = await stripe.paymentIntents.confirm(paymentIntentId);
    }

    if (intent?.status === "requires_action") {
      // 3D secure authentication, client needs to handle
      return {
        success: true,
        requiresAction: true,
        paymentIntentClientSecret: intent.client_secret,
      };
    } else if (intent?.status === "requires_payment_method") {
      // payment failed, show an error to the user
      throw new functions.https.HttpsError(
        "internal",
        "Payment gateway upstream failed."
      );
    } else if (intent?.status === "succeeded") {
      // The payment didn't need any additional actions and completed
      // Handle post-payment fulfillment
      console.log("stripe fulfillment success");
    } else {
      throw new functions.https.HttpsError(
        "internal",
        "Invalid PaymentIntent status."
      );
    }

    // TODO possibly save the card for future transactions
    // https://stripe.com/docs/payments/accept-a-payment-synchronously?platform=web#create-payment-intent

    // bulk transaction
    const batch = fs.batch();
    // update buyer's vouchers field to include this voucher
    batch.update(fs.collection("user").doc(uidBuyer), {
      vouchers: admin.firestore.FieldValue.arrayUnion(voucherRef),
    });
    // update voucher's user field to point to buyer
    batch.update(voucherRef, {
      voucher: fs.collection("user").doc(uidBuyer),
    });

    try {
      await batch.commit();
      return {
        success: true,
      };
    } catch (error) {
      throw new functions.https.HttpsError(
        "unknown",
        "An unknown error occurred.",
        error
      );
    }
  });
