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
  quantity?: number;
  currency?: string; // three-letter ISO code https://stripe.com/docs/currencies
};

export const buyVoucher = functions
  .region("asia-southeast2")
  .https.onCall(async (data: BuyRequest, context) => {
    const uidBuyer = context.auth?.uid;
    const { voucherId, quantity, currency } = data ?? {};

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

    if (!voucherId || !quantity || !currency) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "All fields must be present: voucherId, amount, currency."
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

    // TODO: stripe payment flow; assume it passes for now
    // PaymentIntent tracks the customer's payment lifecycle, ultimately creating one successful charge.
    // create exactly one PaymentIntent for each order or customer session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "grabpay"],
      line_items: [{ price: voucher.costPrice.toString(), quantity: 1 }],
      mode: "payment",
      success_url: `${domain}?success=true`,
      cancel_url: `${domain}?success=true`,
    });

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
