import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { Voucher } from "../schema/voucher";

type BuyRequest = {
  voucherId?: string | undefined;
  // TODO: other stripe related stuff
};

admin.initializeApp();

const fs = admin.firestore();

export const buyVoucher = functions
  .region("asia-southeast2")
  .https.onCall(async (data: BuyRequest, context) => {
    const uidBuyer = context.auth?.uid;
    const { voucherId } = data ?? {};

    if (!uidBuyer) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!voucherId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "All fields must be present: voucherId."
      );
    }

    const voucherRef = fs.collection("voucher").doc(voucherId);
    const voucher = (await voucherRef.get()).data() as Voucher | undefined;

    // check if voucher exists
    if (!voucher) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Voucher does not exist."
      );
    }

    // check if voucher is not yet bought
    if (voucher.user !== undefined) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Voucher has already been bought."
      );
    }

    // TODO: stripe payment flow; assume it passes for now

    // bulk transaction
    const batch = fs.batch();
    // update buyer's vouchers field to include this voucher
    batch.update(fs.collection("user").doc(uidBuyer), {
      vouchers: admin.firestore.FieldValue.arrayUnion(voucherRef),
    });
    // update voucher's user field to include buyer
    batch.update(fs.collection("voucher").doc(voucherId), {
      voucher: fs.collection("user").doc(uidBuyer),
    });

    try {
      await batch.commit();
      return {
        sucess: true,
      };
    } catch (error) {
      throw new functions.https.HttpsError(
        "unknown",
        "An unknown error occurred.",
        error
      );
    }
  });
