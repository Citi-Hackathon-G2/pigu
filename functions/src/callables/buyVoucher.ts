import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import stripeModule from "stripe";

import { Voucher } from "../schema/voucher";
import { fs } from "../utils/admin";

const stripeApiKey = "sk_test_Kwmin4vTQuxZOFSLz10dv9F200dkpP8j16";
const stripe = new stripeModule.Stripe(
  stripeApiKey,
  {} as stripeModule.StripeConfig
);

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
    try {
      const uidBuyer = context.auth?.uid;
      const { voucherId, quantity, paymentMethodId, paymentIntentId } =
        data ?? {};
      console.log(`uidBuyer: ${uidBuyer}`);
      console.log(`voucherId: ${voucherId}`);
      console.log(`quantity: ${quantity}`);
      console.log(`paymentMethodId: ${paymentMethodId}`);
      console.log(`paymentIntentId: ${paymentIntentId}`);

      console.log(`checking stripeApiKey: ${stripeApiKey}`);
      if (!stripeApiKey) {
        throw new functions.https.HttpsError(
          "internal",
          "The function is misconfigured: stripeApiKey."
        );
      }

      console.log(`checking authenticated with uidBuyer: ${uidBuyer}`);
      if (!uidBuyer) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "The function must be called while authenticated."
        );
      }

      console.log(`checking voucherId ${voucherId}, quantity ${quantity}`);
      if (!voucherId || !quantity) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "All fields must be present: voucherId, quantity."
        );
      }

      console.log(`checking paymentMethodId ${paymentMethodId},
                  paymentIntentId ${paymentIntentId}`);
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

      console.log(`check voucherRef ${JSON.stringify(voucherRef)}
                  , voucher ${JSON.stringify(voucher)}`);
      // ensure voucher exists
      if (!voucher) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Voucher does not exist."
        );
      }

      console.log(`checking if voucher has been used`);
      // ensure voucher is not yet bought by another customer
      if (voucher.user !== undefined) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Voucher has already been bought."
        );
      }

      console.log(`starting stripe payment flow`);
      // stripe payment flow
      // console.log(
      //   paymentMethodId,
      //   Math.round(parseInt(voucher.price, 10) * quantity * 100) / 100
      // );
      let intent;
      if (paymentMethodId) {
        intent = await stripe.paymentIntents.create({
          payment_method: paymentMethodId,
          amount: Math.round(parseInt(voucher.price, 10) * quantity * 100), // 2dp
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

      // update buyer's vouchers field to include this voucher
      const hasUser = await fs
        .collection("user")
        .doc(uidBuyer)
        .get()
        .then((doc) => doc.exists);
      if (!hasUser) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "User does not exist."
        );
      }

      // bulk transaction
      const batch = fs.batch();

      console.log(`update buyer's vouchers field to include this voucher`);
      batch.update(fs.collection("user").doc(uidBuyer), {
        vouchers: admin.firestore.FieldValue.arrayUnion(voucherRef),
      });

      console.log(`update voucher's user field to point to buyer`);
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
    } catch (err) {
      console.log(err);
      throw new functions.https.HttpsError(
        "unknown",
        "An unknown error occurred.",
        err
      );
    }
  });
