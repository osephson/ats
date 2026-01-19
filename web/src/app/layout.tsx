import "./globals.css";
import TopBar from "@/components/TopBar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <TopBar />
        <div style={{ margin: "0 30px", padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}
