import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { fs } from "../utils/admin";
import { Shop } from "../schema/shop";

type CreateRequest = {
  name?: string | undefined;
  tags?: string[] | undefined;
};

export const createShop = functions
  .region("asia-southeast2")
  .https.onCall(async (data: CreateRequest, context) => {
    const uidCreator = context.auth?.uid;
    const { name, tags } = data ?? {};

    if (!uidCreator) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!name) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "All fields must be present: name."
      );
    }

    if (tags != null && !Array.isArray(tags)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Field tags must be a list of strings."
      );
    }

    const userRef = fs.collection("user").doc(uidCreator);
    const shopRef = fs.collection("shop").doc();

    const shop: Shop = {
      name: name,
      tags: tags ?? [],
      vouchers: [],
    };

    const batch = fs.batch();
    // create the shop document
    batch.set(shopRef, shop);
    // update the user's shops array to include the shop's reference
    batch.update(userRef, {
      shops: admin.firestore.FieldValue.arrayUnion(shopRef),
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
