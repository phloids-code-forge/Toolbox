import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div style={{
      fontFamily: 'monospace',
      backgroundColor: '#111',
      color: '#0f0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textShadow: '0 0 10px #0f0' }}>PHLOID.COM</h1>

      <div style={{
        border: '2px dashed #0f0',
        padding: '2rem',
        margin: '2rem',
        borderRadius: '1rem',
        maxWidth: '600px'
      }}>
        <h2 style={{ color: '#fff' }}>🚧 SYSTEM MAINTENANCE 🚧</h2>
        <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
          My AI artist is currently taking a nap (Quota Exceeded).
        </p>
        <p style={{ fontStyle: 'italic', color: '#888' }}>
          "I look too good to be rendered by a free tier anyway." - Phloid
        </p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <p>STATUS: <span style={{ color: '#00ccff' }}>ONLINE</span></p>
        <p>EGO LEVELS: <span style={{ color: '#ff0055' }}>CRITICAL</span></p>
        <p>MOOD: <span style={{ color: 'yellow' }}>GENTLE TROLL</span></p>
      </div>
    </div>
  );
}
