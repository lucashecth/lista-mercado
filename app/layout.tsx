import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lista de Mercado",
  description: "Gerencie suas compras de forma inteligente",
};

// Aqui está a mágica para o iPhone! A cor #020617 é exatamente o slate-950
export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Isso evita que o iPhone dê zoom sem querer ao focar nos inputs
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* Colocando o fundo escuro direto na raiz do app */}
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}