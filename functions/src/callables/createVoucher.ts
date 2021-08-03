import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { fs } from "../utils/admin";
import { Voucher } from "../schema/voucher";
import { User } from "../schema/user";

type CreateRequest = {
  title?: string | undefined;
  description?: string | undefined;
  expireAt?: string | undefined;
  shopId?: string | undefined;
};

export const createVoucher = functions
  .region("asia-southeast2")
  .https.onCall(async (data: CreateRequest, context) => {
    const uidCreator = context.auth?.uid;
    const { title, description, expireAt, shopId } = data ?? {};

    if (!uidCreator) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!title || !shopId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "All fields must be present: title and shopId."
      );
    }

    const userRef = fs.collection("user").doc(uidCreator);
    const shopRef = fs.collection("shop").doc(shopId);
    const voucherRef = fs.collection("voucher").doc();

    // check if user is shop's owner
    const { shops } = (await userRef.get()).data() as User;
    const isShopOwner = shops?.includes(shopRef);

    if (!isShopOwner) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "This user is not the shop's owner."
      );
    }

    const voucher: Voucher = {
      title: title,
      description: description,
      createdAt: new Date(),
      expireAt: expireAt ? new Date(expireAt) : undefined,
      shop: shopRef,
    };

    const batch = fs.batch();
    // create the voucher document
    batch.set(voucherRef, voucher);
    // update the shop's vouchers array to include the voucher's reference
    batch.update(shopRef, {
      vouchers: admin.firestore.FieldValue.arrayUnion(voucherRef),
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
