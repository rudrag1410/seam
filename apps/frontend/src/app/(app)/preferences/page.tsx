import { redirect } from "next/navigation";

/** Preferences now live on the Profile page. Keeps old links and bookmarks working. */
export default function PreferencesPage() {
  redirect("/profile");
}
