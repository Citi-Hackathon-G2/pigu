import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { Voucher } from "../schema/voucher";
import { fs } from "../utils/admin";

type BuyRequest = {
  voucherId?: string | undefined;
  // TODO: other stripe related stuff
};

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
