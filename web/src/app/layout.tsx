import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <div style={{ borderBottom: "1px solid #eee", padding: 12 }}>
          <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/jobs">Jobs</Link>
            <Link href="/upload">Upload</Link>
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <Link href="/signin">Sign in</Link>
              <Link href="/signup">Sign up</Link>
            </div>
          </nav>
        </div>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
