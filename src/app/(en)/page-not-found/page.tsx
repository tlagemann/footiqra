import type { Metadata } from "next";
import { NotFoundView } from "@/views/not-found";

/** Static error page for the web server (ErrorDocument 404), in both languages. */
export const metadata: Metadata = {
  title: "Page not found / Seite nicht gefunden",
  robots: { index: false, follow: true },
};

export default function PageNotFound() {
  return <NotFoundView locale="en" bilingual />;
}
