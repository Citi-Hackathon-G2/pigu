import * as functions from "firebase-functions";

export const redeemVoucher = functions
  .region("asia-southeast2")
  .https.onCall((data, context) => {
    // ...
    return {
      msg: "redeem called",
    };
  });
