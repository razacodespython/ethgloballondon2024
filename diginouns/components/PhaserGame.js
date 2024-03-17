import Phaser from 'phaser';
import { useEffect } from 'react';
import React, { useState } from 'react';
import Modal from 'react-modal';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github';
import template from '../public/template.json';
// Function to split a string into chunks of a specified maximum size, without splitting words.
function chunkText(str, maxChunkSize) {
  let chunks = [];
  let currentChunk = "";

  // Iterate through each word in the string
  str.split(' ').forEach(word => {
    // If adding the next word exceeds the max chunk size, push the current chunk and start a new one
    if (currentChunk.length + word.length + 1 > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      // Otherwise, add the word to the current chunk
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }
  });

  // Push the last chunk if it's not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

// IntroScene is the first scene where the game introduction takes place.
class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  // Preload function to load images before the scene starts
  preload() {
    this.load.image('background', '/forestbackground.jpg');
    this.load.image('character', '/taco500.png');
  }

  // Create function to set up the scene once it starts
  create() {
    // Fade in effect for the scene's start
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    // Setting up the background and character images
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'background').setDisplaySize(this.sys.game.config.width, this.sys.game.config.height);
    this.add.image(400, this.cameras.main.height / 2 - 150, 'character').setScale(0.075);

    // Creating a graphics object for a text background
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.8);
    graphics.fillRect(50, this.cameras.main.height / 2 - 50, 700, 100);

    // The narrative text for the intro scene
    const fullText = "Welcome to the game!";
    const textChunks = chunkText(fullText, 60);
    let currentChunkIndex = 0;
    let isTyping = false; // Flag to prevent advancing text while typing

    const displayText = this.add.text(60, this.cameras.main.height / 2 + 10, '', { font: '16px Courier', fill: '#ffffff', wordWrap: { width: 680 } });

    // Function to type out text gradually
    const typeTextGradually = (text) => {
      isTyping = true;
      displayText.setText('');
      let i = 0;
      const typingTimer = this.time.addEvent({
        callback: () => {
          displayText.text += text[i++];
          if (i === text.length) {
            typingTimer.remove();
            isTyping = false;
          }
        },
        repeat: text.length - 1,
        delay: 50
      });
    };

    // Function to display the next chunk of text or transition to the next scene
    const displayNextChunk = () => {
      if (currentChunkIndex < textChunks.length && !isTyping) {
        typeTextGradually(textChunks[currentChunkIndex]);
        currentChunkIndex++;
      } else if (currentChunkIndex >= textChunks.length && !isTyping) {
        displayText.setText("Press Enter to start...");
        this.input.keyboard.once('keydown-ENTER', () => {
          this.scene.start('ChallengeScene');
        });
      }
    };

    // Key listener to advance the text with the 'A' button
    this.input.keyboard.on('keydown-A', () => {
      if (!isTyping) {
        displayNextChunk();
      }
    });

    // Start displaying the intro text immediately
    displayNextChunk();
  }
}
class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
  }

  emit(event, data) {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach(listener => listener(data));
  }
}

const eventBus = new EventBus();

// ChallengeScene is where the player faces a coding challenge after the introduction.
class ChallengeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChallengeScene' });
  }

  // Preload images for the scene
  preload() {
    this.load.image('towerInterior', '/towerbackground.jpg');
    this.load.image('evilMonster', '/horse500.png');
  }

  // Setting up the challenge scene
  create() {
    // Background and monster image setup, similar to IntroScene
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'towerInterior').setDisplaySize(this.sys.game.config.width, this.sys.game.config.height);
    this.add.image(400, this.cameras.main.height / 2 - 150, 'evilMonster').setScale(0.075);

    // Creating a graphics object for the text background, similar to IntroScene
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.8);
    graphics.fillRect(50, this.cameras.main.height / 2 - 50, 700, 100);

    // Text setup for the challenge
    const initialChallengeText = "An evil monster appears and challenges you with a coding puzzle. Solve it to advance!";
    const textChunks = chunkText(initialChallengeText, 60);
    let currentChunkIndex = 0;
    
    const displayText = this.add.text(60, this.cameras.main.height / 2 + 10, '', { font: '16px Courier', fill: '#ffffff', wordWrap: { width: 680 } });

    // Similar text display logic as in IntroScene
    const displayNextChunk = () => {
      if (currentChunkIndex < textChunks.length) {
        displayText.setText(textChunks[currentChunkIndex++]);
      } else {
        displayText.setText("Press Enter to start the challenge...");
        this.setupEnterKeyListener();
        this.input.keyboard.once('keydown-ENTER', () => {
          eventBus.emit('open-code-challenge-modal');
        }); 
      }
    };

    // Advance text with 'A', similar to IntroScene
    this.input.keyboard.on('keydown-A', () => {
      if (!displayText.text.includes("Press Enter to start the challenge...")) {
        displayNextChunk();
      }
    });

    // Automatically start displaying the challenge text
    displayNextChunk();
  }

  // Function to setup listener for 'Enter' key to trigger the coding challenge modal
  setupEnterKeyListener() {
    this.input.keyboard.once('keydown-ENTER', () => {
      this.openCodeChallengeModal();
    });
  }

  openCodeChallengeModal() {
    console.log('Open modal for the code challenge here.');
    // Actual integration with the UI library for modal display goes here
  }
}

// Game configuration including both scenes
const gameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: 'game-container',
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  scene: [IntroScene, ChallengeScene] // Include both scenes in the game
};

function PhaserGame() {

  const [modalIsOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState(template.template);

  useEffect(() => {
    Modal.setAppElement('#game-container');
    
    const game = new Phaser.Game(gameConfig); // Initialize the game with the config
    const openCodeChallengeModal = () => setIsOpen(true);

    eventBus.on('open-code-challenge-modal', openCodeChallengeModal);
    return () => {
    // Clean up
    eventBus.off('open-code-challenge-modal', openCodeChallengeModal);
    if (game) {
      game.destroy(true, false);
    }
  };
}, []);
  // const openCodeChallengeModal = () => {
  //   console.log('Open modal for the code challenge here.');
  //   setIsOpen(true); // This function now correctly has access to setIsOpen
  // };

  const closeModal = () => {
    setIsOpen(false);
  };

  // return (
  //   <div id="game-container" style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
  // );
  return (
    <div id="game-container" style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* <button onClick={openCodeChallengeModal}>Open Code Challenge</button> */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Code Challenge Modal"
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '80%', // Adjust modal width here
            height: '80%', // Adjust modal height here
          },
        }}
      >
        <h2>Code Challenge</h2>
        <AceEditor
          mode="javascript"
          theme="github"
          onChange={setCode}
          name="codeEditor"
          editorProps={{ $blockScrolling: true }}
          value={code}
          height="90%"
          width="100%"
        />
        <button onClick={closeModal}>Close</button>
      </Modal>
    </div>
  );
  
}

export default PhaserGame;
