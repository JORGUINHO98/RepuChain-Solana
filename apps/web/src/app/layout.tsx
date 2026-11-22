import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "RepuChain | Inventario y trazabilidad", description: "Gestiona repuestos, compras, ventas y evidencias de trazabilidad." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
