import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '皇帝编年史 - Crown Chronicle',
  description: '中国古代皇帝卡牌游戏',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-chinese antialiased">
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-dragon-50">
          {children}
        </div>
      </body>
    </html>
  );
}
