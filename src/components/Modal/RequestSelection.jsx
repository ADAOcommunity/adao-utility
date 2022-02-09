import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  NumberInput,
  NumberInputField,
  Flex,
  Image,
  Heading,
  Box,
  Button,
  Input,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import {
  CheckCircleIcon,
  ExternalLinkIcon,
  InfoIcon,
  WarningIcon,
} from "@chakra-ui/icons";
import { fromAscii, fromHex } from "../../cardano/util/utils";
import { UnitDisplay } from "../UnitDisplay";
import { useStoreActions, useStoreState } from "easy-peasy";
import Loader from "../../cardano/loader";

const toUnit = (amount, decimals = 6) => {
  const result = parseFloat(amount.replace(/[,\s]/g, ""))
    .toLocaleString("en-EN", { minimumFractionDigits: decimals })
    .replace(/[.,\s]/g, "");
  if (!result) return "0";
  else if (result == "NaN") return "0";
  return result;
};

const addressToBech32 = async () => {
  if (window.cardano.isEnabled()) {
    await Loader.load();
    const address = (await window.cardano.getUsedAddresses())[0];
    return Loader.Cardano.Address.from_bytes(
      Buffer.from(address, "hex")
    ).to_bech32();
  } else {
    return ""
  }
};

const blockfrostRequest = async (endpoint, headers, body) => { // LOL - This is no longer blockfrost.
  return await fetch('https://testnet.koios.rest/api/v0' + endpoint, {
    method: "GET",
    body,
  }).then((res) => res.json());
}

const blockfrostRequestt = (endpoint, headers, body) => { // LOL - This is no longer blockfrost.
  return fetch('https://testnet.koios.rest/api/v0' + endpoint, {
    method: "GET",
    body,
  }).then((res) => res.json());
}

function hex_to_ascii(str1) {
  var hex = str1.toString();
  var str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

const getImageHash = async (asset) => {
  let a = await asset
  let p = a[0].policy_id
  let n = a[0].asset_name_ascii
  return a[0].minting_tx_metadata.json[p][n].image.replace("ipfs://", "")
  //console.log(a)
  //return "QmWo4HYh4wwnZJ8s7Kz6Z7q76P6YLMyhsPy12rJSTewBqZ"
}

const getAllAssets = async (addr) => {
  if (addr === '') return []
  var quantities = {}
  const addressInfo = await blockfrostRequest(`/address_info?_address=${addr}`)
  console.log(addressInfo)
  const utxo_set = addressInfo[0].utxo_set
  console.log(utxo_set)
  let assetsNameList = []
  utxo_set.forEach((utxo) => {
    let asset_list = utxo.asset_list
    // console.log(asset_list)
    asset_list.forEach((amnt) => {
      quantities[amnt.policy_id + amnt.asset_name] = amnt.quantity
      assetsNameList.push(amnt.policy_id + amnt.asset_name)
    })
  })
  console.log(quantities)

  const assets = async () => {
    return Promise.all(assetsNameList.map(async (assetEncoded) => {
      let policy = assetEncoded.slice(0, 56)
      let tokenName = Buffer.from(assetEncoded.slice(56), "hex")
      let quantity = quantities[assetEncoded]
      const asset = await blockfrostRequestt(`/asset_info?_asset_policy=${policy}&_asset_name=${fromAscii(tokenName)}`) // break up by bytes and name.
      console.log(asset);
      return { name: tokenName, image: await getImageHash(asset), encodedFullName: assetEncoded, quantity: quantity }
      /*if(asset.onchain_metadata && asset.onchain_metadata.name && asset.onchain_metadata.image) {
        return { name: asset.onchain_metadata.name, image: asset.onchain_metadata.image, encodedFullName: assetEncoded}
      }
      if (asset.minting_tx_metadata) {
        return { name: asset.minting_tx_metadata.name, image: asset.minting_tx_metadata.image, encodedFullName: assetEncoded}
      }
      if (asset.token_registry_metadata) {

      }*/ // TODO we need to finish this for asset display of images..
    }))
  }
  // assets.forEach( asset => asset.then((val) => {console.log(val)}))
  return assets()
}



const isBrowser = () => typeof window !== "undefined";

const RequestSelection = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const addRequest = useStoreActions(
    (actions) => actions.requests.addRequest
  );
  let [policy, setPolicy] = React.useState("");
  let [tName, setTName] = React.useState("");
  let [tNum, setTNum] = React.useState('0');
  let [walletAssets, setWalletAssets] = React.useState([{}]);

  const toast = useToast();

  const PolicyInput = () => {
    [policy, setPolicy] = React.useState("");
    const handleChange = event => setPolicy(event.target.value);

    return (
      <>
        <Input
          value={policy}
          onChange={handleChange}
          placeholder="Policy ID"
        />
      </>
    );
  };

  const TokenNameInput = () => {
    [tName, setTName] = React.useState("");
    const handleChange = event => setTName(event.target.value);

    return (
      <>
        <Input
          value={tName}
          onChange={handleChange}
          placeholder="Token Name"
        />
      </>
    );
  };

  const loadWalletAssets = async () => {
    const addr1 = await addressToBech32()
    if (addr1) {
      return await getAllAssets(addr1)
    }
  }

  const NumberOfAsset = () => {
    [tNum, setTNum] = React.useState('0');
    const parse = (val) => val.replace(/^\$/, '')
    return (
      <NumberInput
        onChange={(valueString) => {
          let maxQuantity = 1
          let selectedFullName = policy + tName
          walletAssets.forEach((asset) => {
            maxQuantity = asset.encodedFullName === selectedFullName ? maxQuantity = asset.quantity : 1
          })
          let selectedQuantity = parse(valueString) > maxQuantity ? maxQuantity : parse(valueString)
          setTNum(selectedQuantity)
          }
        }
        value={tNum}
      >
        <NumberInputField />
      </NumberInput>
    )
  }

  const chooseAsset = (asName) => {
    console.log("chooseAsset")
    console.log(asName)
    var ast = walletAssets.find(wa => typeof (wa) !== "undefined" && wa.name == asName)
    if (ast && ast.name && ast.encodedFullName) {
      setTName(ast.name)
      setPolicy(ast.encodedFullName.substring(0, 56))
      setTNum(1)
    }
  }

  const addAssets = () => {
    addRequest({ // TODO - We need to make this use unit and quantity as the offer function expects so that we can shoot it over effectively. That way it converts nicely.
      // TODO - We may also want to take into consideration ADA values here without indvidiuals inputting the policy "lovelace" with no token name will give you ada.
      // 1/1M of an ADA.
      unit: policy + fromAscii(tName),
      quantity: tNum
    })
  }

  const getImage = (asset) => {
    if (asset != '') {
      return `https://ipfs.blockfrost.dev/ipfs/${asset}`
    } else {
      return "/somedefaultpic.png"
    }
  }

  return (
    <>
      <Button onClick={onOpen}>Select Assets to Send to Treasury</Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add an asset for the Treasury</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <PolicyInput />
            <TokenNameInput />
            <NumberOfAsset />
            <p>Please input the number desired above. This form is for your requested value.</p>
            <>
              <Button variant='ghost' onClick={addAssets}>Add Asset to Offer</Button>
              <Button onClick={() => loadWalletAssets().then(data => {
                setWalletAssets(data)
                console.log("data", data)
                // console.log(walletAssets)
                // let ast = walletAssets.find(wa => typeof(wa) !== "undefined" && wa.name == asset.name)
              })}>Load assets from a wallet</Button>
              <SimpleGrid maxH="500px" w="400px" justifyContent="center" columns={2} overflowX={"hidden"} overflowY="scroll">
                {walletAssets.filter(x => typeof (x) !== "undefined" && x.name).map((asset) => (
                  <Flex w="150px" direction={"column"} p={1} _hover={{ cursor: "pointer" }} onClick={() => chooseAsset(asset.name)}>
                    <Image src={getImage(asset.image)} w="150px" h="150px"></Image>
                    <Flex mx="auto" my={1}>{hex_to_ascii(fromAscii(asset.name))}</Flex>
                    {/* <Heading as="h4" mx="auto" my={1}>{asset.name}</Heading> */}
                  </Flex>
                ))}
              </SimpleGrid>
            </>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme='blue' mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default RequestSelection;