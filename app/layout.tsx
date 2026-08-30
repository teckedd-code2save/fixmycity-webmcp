import type { Metadata } from 'next';
import './globals.css';
import { WebMCPBridge } from '@/components/webmcp-bridge';

export const metadata: Metadata = {
  title: 'FixMyCity — Agent-native civic operations',
  description: 'Turn scattered resident reports into coordinated city action with WebMCP.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><WebMCPBridge />{children}</body></html>;
}
