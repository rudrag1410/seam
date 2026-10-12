import { createApi } from "@seam/api-client";
import { API_URL } from "./env";
import { handleUnauthorized } from "./session";

export const api = createApi(API_URL);

// Any 401 from the API means the session is over (the server already tried to refresh it).
// Sign-in and sign-up legitimately answer 401 for a wrong password, so they are exempt.
api.use({
  onResponse({ response, schemaPath }) {
    if (response.status === 401 && !schemaPath.startsWith("/v1/auth/") && typeof window !== "undefined") {
      handleUnauthorized();
    }
    return undefined;
  },
});

export { unwrap, ApiException } from "@seam/api-client";
