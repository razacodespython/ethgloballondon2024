import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import circuit from "../Circuits/target/circuits.json"
import { useState } from "react";
import { ethers } from "ethers";
import AceEditor from 'react-ace';
import { parse } from 'acorn';
import { useEffect } from "react";
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github';

export default function Home() {
  const [addi, setPublickey] = useState();
  const [network, setNetwork] = useState();
  const [chainId, setChainId] = useState();
  const [msg, setMsg] = useState();


  // const template = `function Attack(x, y) {
  //   // Your logic here
  //   return x * y;
  // }`;
  const [code, setCode] = useState("");

  useEffect(() => {
    // Fetch the template from the public directory
    fetch('/template.json')
      .then(response => response.json())
      .then(data => {
        // Set the fetched template as the initial code
        setCode(data.template);
      })
      .catch(error => console.error("Failed to load the template:", error));
  }, []);
  

  const connectButton = async () => {
    const { ethereum } = window;
    const provider = new ethers.providers.Web3Provider(ethereum);
    if (ethereum.isMetaMask) {
      const accounts = await provider.send("eth_requestAccounts", []);
      const { name, chainId } = await provider.getNetwork();
      setNetwork(name);
      setChainId(chainId);
      setPublickey(accounts[0]);
    } else {
      setMsg("Install MetaMask");
    }
  };
  const setup = async () => {
    await Promise.all([
      import("@noir-lang/noirc_abi").then(module => 
        module.default(new URL("@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm", import.meta.url).toString())
      ),
      import("@noir-lang/acvm_js").then(module => 
        module.default(new URL("@noir-lang/acvm_js/web/acvm_js_bg.wasm", import.meta.url).toString())
      )
    ]);
  }

  const sendProof = async (inputt) => {
    console.log("generating proof");
    await setup();
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
    console.log("got the input next step generating proof");
    console.log(input);
    // document.getElementById("web3_message").textContent="Generating proof... ⌛";
    var proof = await noir.generateFinalProof(input);

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
  const onRun = (userCode) => {
    try {
      // Attempt to extract function parameters using regular expression
      const paramsRegex = /function\s+\w*\s*\(([^)]*)\)/;
      const matches = paramsRegex.exec(userCode);

      if (!matches || matches.length < 2) {
        console.error("No valid function found.");
        return;
      }

      // Extract parameters and split into an array, trimming whitespace
      const params = matches[1].split(',').map(param => param.trim());
      console.log("Extracted parameters:", params);

      // Example: Proceed with using these parameters as needed
    } catch (error) {
      console.error("Error extracting parameters:", error);
    }
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
  };
  
  
  return (
    <>
      <h1>Hello world</h1>
      <button onClick={connectButton}>Connect Wallet</button>
      <br />
      <p>Address: {addi}</p>
      <p>Network: {network}</p>
      <p>Chain ID : {chainId}</p>
      <button onClick={() => sendProof()}>Get proof</button>
      <AceEditor
        mode="javascript"
        theme="github"
        onChange={setCode}
        name="codeEditor"
        editorProps={{ $blockScrolling: true }}
        value={code}
        height="400px" // Double the default height
        width="100%"
        style={{fontSize: '16px'}} // Example of adjusting the font size
      />
      <button onClick={handleSubmit}>Submit Code</button>
      
    </>
  );
}
