import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import styles from "@/styles/Home.module.css";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
const PhaserGameWithNoSSR = dynamic(() => import('../components/PhaserGame'), {
    ssr: false,
  });

  export default function game() {
    const [startGame, setStartGame] = useState(false);
    return (
      <>
        <main className={`${styles.main} ${inter.className}`}>
        <h1>Welcome to the Game</h1>
        {startGame ? (
          <PhaserGameWithNoSSR />
        ) : (
          <button onClick={() => setStartGame(true)}>Start Mission</button>
        )}
        </main>
      </>
    );
  }