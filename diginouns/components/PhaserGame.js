import Phaser from 'phaser';
import { useEffect } from 'react';
import React, { useState } from 'react';
import Modal from 'react-modal';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github';
import template from '../public/template.json';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import circuit from "../Circuits/target/circuits.json"
import { ethers } from "ethers";
import { parse } from 'acorn';

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

  preload() {
    this.load.image('background', '/forestbackground.jpg');
    this.load.image('character', '/taco500.png');
  }

  create() {
    this.cameras.main.fadeIn(2000, 0, 0, 0);
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'background').setDisplaySize(this.sys.game.config.width, this.sys.game.config.height);
    
    // Adjusted character image position to be lower
    const characterYPosition = this.cameras.main.height / 3; // Increased Y position to move lower
    const characterScale = 0.05;
    this.add.image(this.cameras.main.width / 2, characterYPosition, 'character').setScale(characterScale);

    // Adjusted textbox position to be lower and align with the character image
    const graphics = this.add.graphics();
    const rectWidth = 600;
    const rectHeight = 80;
    const rectX = (this.cameras.main.width - rectWidth) / 2;
    const rectY = characterYPosition + 100; // Adjust so it's slightly below the character image
    graphics.fillStyle(0x000000, 0.8);
    graphics.fillRect(rectX, rectY, rectWidth, rectHeight);

    // Adjusted display text to fit within the new textbox position
    const fullText = "Welcome to the game!";
    const textChunks = chunkText(fullText, 60);
    let currentChunkIndex = 0;
    let isTyping = false;
    const displayText = this.add.text(rectX + 10, rectY + 10, '', {
      font: '16px Courier',
      fill: '#ffffff',
      wordWrap: { width: rectWidth - 20 },
    });

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

    this.input.keyboard.on('keydown-A', () => {
      if (!isTyping) {
        displayNextChunk();
      }
    });

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
    width: 600,
    height: 400,
  },
  scene: [IntroScene, ChallengeScene] // Include both scenes in the game
};

function PhaserGame() {

  const [modalIsOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState(template.template);
  const [addi, setPublickey] = useState();
  const [network, setNetwork] = useState();

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
  
  const sendProof = async (inputt) => {
    toast.success('generating proof', {
      position: "top-right",
      autoClose: 15000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      });
    console.log("generating proof");
    //await setup();
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log("Account:", signerAddress);

    const backend = new BarretenbergBackend(circuit);
    const noir = new Noir(circuit, backend);

    // const input = {
    //   output: 10,
    //   x: 5,
    //   y: 2,
    // };
    const input = inputt
    toast.success('got the input', {
      position: "top-right",
      autoClose: 15000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      });
    console.log("got the input next step generating proof");
    console.log(input);
    // document.getElementById("web3_message").textContent="Generating proof... ⌛";
    var proof = await noir.generateFinalProof(input);

    toast.success('proof generation done', {
      position: "top-right",
      autoClose: 15000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      });

    console.log("proof generation done");
    console.log(proof.proof)

    var publicInputs = Array.from(proof.publicInputs.values());
    var proofHex = "0x" + Buffer.from(proof.proof).toString("hex");
    console.log(proofHex)
    const abi = [
      "function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool)",
    ];

    const verifierContract = new ethers.Contract(
      "0x6ed543470f2ABed29b97A32AA46d25A18c1E4c7c",
      abi,
      signer
    );

    const verificationResponse = await verifierContract.verify(
      proofHex,
      publicInputs
    );
    if (verificationResponse == true) {
      toast.success('verification done', {
        position: "top-right",
        autoClose: 15000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        });
      console.log("Verification successful!");
    }


    function extractParametersFromFunction(functionCode) {
      const ast = parse(functionCode, {ecmaVersion: 2020});
      if (ast.body[0] && ast.body[0].type === 'FunctionDeclaration') {
        const params = ast.body[0].params.map(param => param.name);
        return params;
      }
      return [];
    }

    const userFunctionCode = `function Attack(x, y) {
      return x * y;
    }`;
    
    const params = extractParametersFromFunction(userFunctionCode);
    console.log(params); // Output: ['x', 'y']
    
  };
  function parseCodeToInput(code) {
    // Define regular expressions for the lines of interest
    const attackPowerRegex = /let (\w+AttackPower) = (\d+);/g;
    const sequenceRegex = /let attackSequence = \[([^\]]+)\];/;
  
    // Object to store the extracted values
    const input = {
      fireAttack: 0,
      waterAttack: 0,
      earthAttack: 0,
      windAttack: 0,
      attackSequence: [],
    };
  
    // Extract attack powers
    let match;
    while ((match = attackPowerRegex.exec(code)) !== null) {
      // match[1] is the variable name, match[2] is the value
      const element = match[1].replace('AttackPower', '').toLowerCase(); // Convert to lowercase and remove 'AttackPower'
      if (input.hasOwnProperty(element + 'Attack')) { // Check if the property exists in the input object
        input[element + 'Attack'] = parseInt(match[2], 10);
      }
    }
  
    // Extract attack sequence
    // const sequenceMatch = sequenceRegex.exec(code);
    // if (sequenceMatch) {
    //   input.attackSequence = sequenceMatch[1].replace(/'/g, '').split(',').map(element => element.trim());
    // }
  
    return input;
  }
  
   
 

  const closeModal = () => {
    setIsOpen(false);
  };

  const handleSubmit = () => { 

  const input = parseCodeToInput(code); // Parse the code from the editor
  console.log(input);
  console.log(input.windAttack)
  const sendInput = {
      x: input.fireAttack,
      y: input.waterAttack,
      z: input.windAttack,
      a: input.earthAttack,
    };
  sendProof(sendInput)
  // Here, you could use the 'input' object for further processing,
  // such as passing it to your circuit for verification
    // toast.success('Your proof is here!', {
    //   position: "top-right",
    //   autoClose: 15000,
    //   hideProgressBar: false,
    //   closeOnClick: true,
    //   pauseOnHover: true,
    //   draggable: true,
    //   progress: undefined,
    //   theme: "dark",
    //   });


  }

  // return (
  //   <div id="game-container" style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
  // );
  return (
    <div id="game-container" style={{ marginTop:'100px', width: '900px', height: '550px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* <button onClick={openCodeChallengeModal}>Open Code Challenge</button> */}
      <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={true}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
        />
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
        {/* <button onClick={closeModal}>Close</button> */}
        <button onClick={handleSubmit}>Submit</button>
      </Modal>
    </div>
  );
  
}

export default PhaserGame;
