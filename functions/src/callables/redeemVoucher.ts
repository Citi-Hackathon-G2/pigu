import * as functions from "firebase-functions";

import { Voucher } from "../schema/voucher";
import { fs } from "../utils/admin";

type RedeemRequest = {
  voucherId?: string | undefined;
};

export const redeemVoucher = functions
  .region("asia-southeast2")
  .https.onCall(async (data: RedeemRequest, context) => {
    const uidShopOwner = context.auth?.uid;
    const { voucherId } = data ?? {};

    if (!uidShopOwner) {
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

    // ensure voucher has already been bought by a customer
    if (voucher.user === undefined) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Voucher has not been bought by a customer yet."
      );
    }

    await voucherRef.update({
      redeemedAt: new Date(),
    });

    return {
      sucess: true,
    };
  });
