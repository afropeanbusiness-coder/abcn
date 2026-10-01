import { createClient } from "@neondatabase/neon-js";

const AUTH_URL =
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-round-king-b126bwc2.neonauth.c-5.eu-central-1.aws.neon.tech/neondb/auth";
const DATA_API_URL =
  process.env.NEXT_PUBLIC_NEON_DATA_API_URL ||
  "https://ep-round-king-b126bwc2.apirest.c-5.eu-central-1.aws.neon.tech/neondb/rest/v1";

export const neon = createClient({
  auth: {
    url: AUTH_URL,
    allowAnonymous: false,
  },
  dataApi: {
    url: DATA_API_URL,
  },
});
