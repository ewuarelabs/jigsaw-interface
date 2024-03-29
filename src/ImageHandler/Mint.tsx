import React, { useState, useEffect } from 'react';
import './Mint.css';
import 'react-bootstrap';
import { NFT } from '../Components/NFT';
import { sha256 } from 'ethers/lib/utils';
import abi from '.././JigsawABI.json';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';
import { useModal } from 'react-hooks-use-modal';
import Header from '../Homepage/Header';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

const contractAddress = '0xcE85907b8962D1b908747f7A100fA947934812a2';
const contract = new ethers.Contract(contractAddress, abi, ethers.getDefaultProvider());
const infuraProvider = `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`;

function Create() {
    const client = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
    const [file, setFile] = useState<File>();
    const [src, setsrc] = useState<string>();
    const [nftURL, setNftURL] = useState<string>();
    const [nft, setNFT] = useState<NFT[] | undefined>()
    const [imageSize, setImageSize] = useState<{ width: number, height: number }>()
    const [dimension, setDimension] = useState<{ row: number, column: number}>({
        row: 2,
        column: 2,
    })
    const [description, setDescription] = useState<{ name: string, description: string }>({
        name: '',
        description: '',
    });
    const [Modal, open, close, isOpen] = useModal('root', {
        preventScroll: true,
        closeOnOverlayClick: false
      });
    const [loading, setLoading] = useState(false);
    const mint = document.getElementById('mint') as HTMLInputElement;

    const connector = new WalletConnect({
        bridge: "https://bridge.walletconnect.org", // Required
        qrcodeModal: QRCodeModal,
    });

    function toHexString(byteArray: Uint8Array) {
        return Array.from(byteArray, function(byte) {
          return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
      }

    useEffect(() => {
        if (nft !== undefined && nftURL !== undefined) {
            MintF(nft!, nftURL!);
        }
    }, [nft, nftURL])

    async function MintF(solution: NFT[], uri: string) {
        console.log("Minting...");
        const sortedSolution: NFT[] = nft!.sort((a,b) => {
            if (a.correctPosition < b.correctPosition) {
                return -1
            } else if (a.correctPosition > b.correctPosition) {
                return 1
            }
            return 0
          })
        
        const stringSolution = sortedSolution.toString()
        const buffer = Buffer.from(stringSolution);
        const hexString = "0x" + toHexString(buffer) 
       
        const hash = sha256(hexString);
        const abiCoder = new ethers.utils.Interface(abi);
        const encodedData = abiCoder.encodeFunctionData("createNFTs", [[hash], [uri]]);
        
        if (window.ethereum) {
        
          const address: string = await window.ethereum.request({
            method: 'eth_requestAccounts',
          })
        //   console.log(hash, hexString, buffer);

          await window.ethereum.request({
            method: 'eth_sendTransaction' as any,
            params: [{
              from: address[0],
              to: contractAddress,
              data: encodedData,
            }] as any,
          })
          .then((response) => {
            alert("Transaction sent!");
            console.log(response);
            setLoading(false);
            window.location.reload();
          })
          .catch((err) => {
            console.log(err);
            setLoading(false);
            alert("Transaction failed. Please try again.");
          })
        
        } else {
            if (!connector.connected) {
                await connector.createSession();
            }
            const session = window.localStorage.getItem('walletconnect');
            const parsedSession = JSON.parse(session!);
            const address = parsedSession.accounts[0];
            const tx = {
                from: address,
                to: contractAddress,
                data: encodedData,
            }
            //Send transaction
            await connector
                .sendTransaction(tx)
                .then((result) => {
                    console.log(result);
                    alert("Transaction sent!");
                    setLoading(false);
                    window.location.reload();
                })
                .catch((error) => {
                    console.error(error);
                    alert("Transaction failed");
                    setLoading(false);
                })
        }
    }

    function Solution(uri: string, rows: number, columns: number) {
        const image = new Image();
        image.src = uri;
        image.onload = () => {
            console.log(image.width, image.height);
                setImageSize({ width: image.width, height: image.height })
                setNFT(
                    Array.from(Array(rows * columns).keys())
                        .map(position => ({
                            correctPosition: position,
                            tileHeight: image.height / rows,
                            tileWidth: image.width / columns,
                            tileOffsetX: (position % columns) * (image.width / columns),
                            tileOffsetY: Math.floor(position / columns) * (image.height / rows),
                            solved: true
                        }))
                )

            }
        
    }
    
    const handleFileChange = (e: any) => {
        const fileData: File = e.target.files[0];
        setFile(fileData);
        
        const URL = window.URL || window.webkitURL;
        const image = document.getElementById('nft') as HTMLImageElement;
        image.src = URL.createObjectURL(fileData);
        setsrc(URL.createObjectURL(fileData));
    }

    const fileUpload = async () => {
        setLoading(true);
        console.log("Uploading...");
        if(file != null) {
            // const CUD = await IpfsUpload(file);
            const CID = await client.add(file);
            // console.log(CID);
            const url = `https://ipfs.io/ipfs/${CID.cid.toString()}`
            const metadata = JSON.stringify({
                "name": description.name,
                "description": description.description,
                "image": url,
                "attributes": [
                    {
                    "rows": dimension!.row,
                    "columns": dimension!.column,
                    }
                ]
            })
            
            // console.log(url)
            
            Solution(url!, dimension!.row, dimension!.column)!

            const metadataCID = await client.add(metadata);
            // console.log(metadataCID)
            const metedataURL = `https://ipfs.io/ipfs/${metadataCID.cid.toString()}`
            setNftURL(metedataURL);
            
        }
    }

    const updateDimension = () => {
        const row = document.getElementById('row') as HTMLInputElement;
        const column = document.getElementById('column') as HTMLInputElement;
        const re = /^[0-9\b]+$/;
        
        if ((re.test(row.value) || row.value === '') && (column.value === '' || re.test(column.value))) {
            setDimension({
                row: parseInt(row.value),
                column: parseInt(column.value)
            })
        } else {
            alert("Please enter a valid number");
        }
    }

    const updateDescription = () => {
        const name = document.getElementById('name') as HTMLInputElement;
        const description = document.getElementById('description') as HTMLInputElement;
        setDescription({
            name: name.value,
            description: description.value
        })
    }


    
    return (
    <div className="Mint">
        <Header />
        <div className="App-hero container">
    
        </div>
        <div className='mint'>
            <input type="file" accept='image/jpg, image/jpeg' onChange={handleFileChange} /><br />
            <input type="text" placeholder="Name" id='name' onChange={updateDescription} /><br />
            <input type="text" placeholder="Description" id="description" onChange={updateDescription} /><br />
            <input type="number" placeholder="Rows" id='row' onChange={updateDimension} /><br />
            <input type="number" placeholder="Columns" id='column' onChange={updateDimension} /><br />
            <img className="nft-image" id='nft' /><br />
            <input id='mint' type="submit" value='MINT' onClick={open} disabled={!file} />
        </div>
        <Modal>
            <div className='mintModal'>
                {!loading && 
                <button className='close' onClick={() => {
                    setLoading(false)
                    close();
                }}>&#x2715;</button>}
                <img className="modal-image" id='nft' src={src} /><br />
                <p>Name: {description.name}</p>
                <p>Description: {description.description}</p>
                <p>Dimension: {dimension.row} x {dimension.column}</p>
                <button onClick={fileUpload} disabled={loading}>
                    {loading && <FontAwesomeIcon icon={faSpinner} />}
                    Continue
                </button>
                {loading && <h5>Open your wallet to confirm the transaction</h5>}
            </div>
        </Modal>
    
    </div>
    );
}
<Create />
export default Create;