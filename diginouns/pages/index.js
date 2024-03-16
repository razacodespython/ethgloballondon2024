import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import circuit from "../Circuits/target/circuits.json"
import { useState } from "react";
import { ethers } from "ethers";

export default function Home() {
  const [addi, setPublickey] = useState();
  const [network, setNetwork] = useState();
  const [chainId, setChainId] = useState();
  const [msg, setMsg] = useState();

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

  const sendProof = async (message) => {
    console.log("generating proof");

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log("Account:", signerAddress);

    const backend = new BarretenbergBackend(circuit);
    const noir = new Noir(circuit, backend);

    const input = {
      output: 10,
      x: 5,
      y: 2,
    };

    console.log("got the input next step generating proof");
    console.log(input);
    // document.getElementById("web3_message").textContent="Generating proof... ⌛";
    var proof = await noir.generateFinalProof(input);

    console.log("proof generation done");
    console.log(proof.proof)

    var publicInputs = Array.from(proof.publicInputs.values());
    var proofHex = "0x" + Buffer.from(proof.proof).toString("hex");
    console.log(proofHex)

    // const proofKey = proofHex.substring(0, 50);
    // const proofObject = { [proofKey]: proofHex };
    const abi = [
      "function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool)",
    ];
    //0xC3b6837660CB6E4728ED0879db0a63D4E8a83d24
    //old
    //0x02801ed0D4A5dFd0bf82C074e1f40FBcb4a2e24F

    const verifierContract = new ethers.Contract(
      "0x09e82Db155798F759D6788c41cd72B047a018355",
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
  };
  return (
    <>
      <h1>Hello world</h1>
      <button onClick={connectButton}>Connect Wallet</button>
      <br />
      <p>Address: {addi}</p>
      <p>Network: {network}</p>
      <p>Chain ID : {chainId}</p>
      {msg && <p>{msg}</p>}
      <button onClick={() => sendProof("Ethticket")}>Get proof</button>
      {/* Button to generate QR code */}
      
    </>
  );
}
