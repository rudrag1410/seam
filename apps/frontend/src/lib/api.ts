import { createApi } from "@seam/api-client";
import { API_URL } from "./env";
import { handleUnauthorized } from "./session";

export const api = createApi(API_URL);

api.use({
  onResponse({ response, schemaPath }) {
    if (response.status === 401 && !schemaPath.startsWith("/v1/auth/") && typeof window !== "undefined") {
      handleUnauthorized();
    }
    return undefined;
  },
});

export { unwrap, ApiException } from "@seam/api-client";
