import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { Voucher } from "../schema/voucher";
import { fs } from "../utils/admin";

type TransferRequest = {
  userId?: string | undefined;
  voucherId?: string | undefined;
};

export const transferVoucher = functions
  .region("asia-southeast2")
  .https.onCall(async (data: TransferRequest, context) => {
    const uidSender = context.auth?.uid;
    const { userId: uidReceiver, voucherId } = data ?? {};

    if (!uidSender) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!uidReceiver || !voucherId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "All fields must be present: userId and voucherId."
      );
    }

    const senderRef = fs.collection("user").doc(uidSender);
    const receiverRef = fs.collection("user").doc(uidReceiver);
    const voucherRef = fs.collection("voucher").doc(voucherId);
    const voucher = (await voucherRef.get()).data() as Voucher | undefined;

    // ensure voucher exists
    if (!voucher) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Voucher does not exist."
      );
    }

    // ensure voucher is not yet redeemeed
    if (voucher.redeemedAt !== undefined) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Voucher has already been redeemed."
      );
    }

    // bulk transaction
    const batch = fs.batch();
    // update sender's vouchers field to exclude this voucher
    batch.update(senderRef, {
      vouchers: admin.firestore.FieldValue.arrayRemove(voucherRef),
    });
    // update receivers's vouchers field to include this voucher
    batch.update(receiverRef, {
      vouchers: admin.firestore.FieldValue.arrayUnion(voucherRef),
    });
    // update voucher's user field to point to receiver
    batch.update(voucherRef, {
      voucher: receiverRef,
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
