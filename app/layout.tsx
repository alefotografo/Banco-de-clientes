import type { Metadata } from "next";
import "./globals.css";
import "./auth-modal.css";
export const metadata: Metadata = {
  title: "Prospex B2B | Prospecção que abre conversas",
  description: "Busca regional, pipeline e abordagens B2B para marketing completo.",
  openGraph: { title: "Prospex B2B", description: "Empresas certas. Conversas que avançam.", images: ["/og-prospex.png"] },
  twitter: { card: "summary_large_image", title: "Prospex B2B", images: ["/og-prospex.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
