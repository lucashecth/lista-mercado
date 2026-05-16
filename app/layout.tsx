import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Adicionamos o viewportFit: "cover" para ignorar a margem de segurança da Apple
export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", 
};

// Adicionamos as tags exclusivas do Web App do iOS
export const metadata: Metadata = {
  title: "Lista de Mercado",
  description: "Gerencie suas compras de forma inteligente",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Torna a barra do iPhone transparente para vazar a nossa cor
    title: "Mercado",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Colocando a cor direto na tag HTML também para garantir
    <html lang="pt-BR" className="bg-slate-950">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}