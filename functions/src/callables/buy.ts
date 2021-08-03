import * as functions from "firebase-functions";

export const buyVoucher = functions
  .region("asia-southeast2")
  .https.onCall((data, context) => {
    // ...
    return {
      msg: "buy called",
    };
  });
