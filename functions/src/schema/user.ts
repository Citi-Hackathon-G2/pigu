export type User = {
  username: string; // unique key
  email: string;
  vouchers: string[]; // vouchers which user has bought
  shops: string[]; // shops which user controls
};
