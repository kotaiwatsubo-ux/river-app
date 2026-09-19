import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', textAlign: 'center' }}>メニュー画面</h1>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <li>
          <Link href="/counter" style={{ display: 'block', padding: '16px', backgroundColor: '#2563eb', color: '#ffffff', textDecoration: 'none', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
            カウンターページを開く
          </Link>
        </li>
        <li>
          <Link href="/weather" style={{ display: 'block', padding: '16px', backgroundColor: '#10b981', color: '#ffffff', textDecoration: 'none', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
            天気
          </Link>
        </li>
        <li>
          <Link href="/Taisyou-River" style={{ display: 'block', padding: '16px', backgroundColor: '#10b981', color: '#ffffff', textDecoration: 'none', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
            水位(目標)
          </Link>
        </li>
      </ul>
    </div>
  );
}