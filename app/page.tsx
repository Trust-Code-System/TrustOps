import { redirect } from "next/navigation";

/** Entry: middleware handles the auth decision; default to the app. */
export default function RootPage() {
  redirect("/dashboard");
}
