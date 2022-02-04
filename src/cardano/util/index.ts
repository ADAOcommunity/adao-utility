import Loader from "./loader.js";
import {
  assetsToValue,
  assetsToDatum,
  fromAscii,
  fromHex,
  getTradeDetails,
  lovelacePercentage,
  toBytesNum,
  toHex,
  valueToAssets,
  boxToAssets
} from "./utils.js";
import { languageViews } from "./languageViews.js";
import { contract, treasury} from "./plutus.js";
import CoinSelection from "./coinSelection.js";
import {
  Address,
  PlutusData,
  TransactionUnspentOutput,
} from "./custom_modules/@emurgo/cardano-serialization-lib-browser/cardano_serialization_lib.js";

const DATUM_LABEL = 405;
const ADDRESS_LABEL = 406; // TODO - Let's try to use the getFullInfo to get the base address that we need to pull the scripthash from it

const COLLECTION_MAKER_ASSET = {policy: "2ab7e0898d0059a7859ed219e7d0e0bfe15e148cd07efaa61c5e258c", name: "436f6c6c656374696f6e4d616b6572"};
const COLLECTION_ASSET = {policy: "7ce6a6fb7014ed7736247b9f32521474366703d9cab2a84095538b3e", name: "436f6c6c656374696f6e546f6b656e"};

// {"tx_hash":"691976978263d263bf9939da1f9f4f5beef15ab84ecbb027a5965274e10cf2e5","tx_index":1,"value":"1800000","asset_list":[{"policy_id":"2ab7e0898d0059a7859ed219e7d0e0bfe15e148cd07efaa61c5e258c","asset_name":"436f6c6c656374696f6e4d616b6572","quantity":"1"}]}

// Validator
const TREASURY = () => {
  const scripts = Loader.Cardano.PlutusScripts.new();
  scripts.add(Loader.Cardano.PlutusScript.new(fromHex(treasury)));
  return scripts;
};

const CONTRACT = () => {
  const scripts = Loader.Cardano.PlutusScripts.new();
  scripts.add(Loader.Cardano.PlutusScript.new(fromHex(contract)));
  return scripts;
};

const TREASURY_ADDRESS = () =>
  Loader.Cardano.Address.from_bech32(
    "addr_test1wzseqpneg5e9mw5hz9m3nxy69s5yp8l2266xvvy6kn890xgqx9az3"
  );

const CONTRACT_ADDRESS = () =>
  Loader.Cardano.Address.from_bech32(
    "addr_test1wpukckfwm9hhapdu7645e360ku76cd2948ey6l6n897wgpsj7xru4"
  );

const MINT_ADDRESS = () =>
  Loader.Cardano.Address.from_bech32(
    "addr_test1wp7wdfhmwq2w6aeky3ae7vjjz36rvecrm89t92zqj4fck0svs240l"
  );

/*const MINT_BASE_ADDRESS = () =>
  Loader.Cardano.BaseAddress.from_address(MINT_ADDRESS());
const MINT = MINT_BASE_ADDRESS() ? MINT_BASE_ADDRESS() : Loader.Cardano.BaseAddress
const MINT_SCRIPT_HASH = () => MINT.payment_cred().to_scripthash();*/
const MINT_SCRIPT_HASH = () => Loader.Cardano.ScriptHash.from_bytes(fromHex("7ce6a6fb7014ed7736247b9f32521474366703d9cab2a84095538b3e"));

let protocolParameters = {};


// Datums
// const
// TODO - TEST
const COLLECTION = ({ votes, destination, cValue }) => {
  const fieldsInner = Loader.Cardano.PlutusList.new();
  fieldsInner.add(votes);
  fieldsInner.add(Loader.Cardano.PlutusData.new_bytes(fromHex(destination)));
  // TODO - We should make sure that this datum is working.
  console.log("lol test")
  console.log(JSON.stringify(cValue));
  fieldsInner.add(Loader.Cardano.PlutusData.new_map(
    assetsToDatum(cValue)
  ));
  console.log("hmm")
  const collectionDetails = Loader.Cardano.PlutusList.new();
  collectionDetails.add(
    Loader.Cardano.PlutusData.new_constr_plutus_data(
      Loader.Cardano.ConstrPlutusData.new(
        Loader.Cardano.Int.new_i32(1),
        fieldsInner
      )
    )
  );

  const datum = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(0),
      collectionDetails
    )
  );
  console.log("end of collection")
  return datum;
};

const COLLECTION_MAKER = () => {
  const datumData = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(0),
      Loader.Cardano.PlutusList.new()
    )
  );
  return datumData;
};

const POT_DATUM = () => {
  const datumData = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(2),
      Loader.Cardano.PlutusList.new()
    )
  );
  return datumData;
};

const DATUM_TYPE = {
  CollectionMaker: 0,
  Collection: 1,
  PotDatum: 2
}

const APPLY_VOTE = (index) => {
  const redeemerData = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(0),
      Loader.Cardano.PlutusList.new()
    )
  );
  const redeemer = Loader.Cardano.Redeemer.new(
    Loader.Cardano.RedeemerTag.new_spend(),
    Loader.Cardano.BigNum.from_str(index),
    redeemerData,
    Loader.Cardano.ExUnits.new(
      Loader.Cardano.BigNum.from_str("4994200"), // These numbers are *huge*
      Loader.Cardano.BigNum.from_str("1999589133")
                                   // 19489133")
    )
  );
  return redeemer;
};

const CREATE_COLLECTION = (index, destination, cValue) => {
  // TODO - TEST
  const fieldsInner = Loader.Cardano.PlutusList.new();
  fieldsInner.add(Loader.Cardano.PlutusData.new_list(Loader.Cardano.PlutusList.new()));
  fieldsInner.add(Loader.Cardano.PlutusData.new_bytes(fromHex(destination)));
  fieldsInner.add(Loader.Cardano.PlutusData.new_map(
    assetsToDatum(cValue)
  ));
  console.log("here...")
  const collectionDetails = Loader.Cardano.PlutusList.new();
  collectionDetails.add(
    Loader.Cardano.PlutusData.new_constr_plutus_data(
      Loader.Cardano.ConstrPlutusData.new(
        Loader.Cardano.Int.new_i32(0),
        fieldsInner
      )
    )
  );
  const redeemerData = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(1),
      collectionDetails
    )
  );
  const redeemer = Loader.Cardano.Redeemer.new(
    Loader.Cardano.RedeemerTag.new_spend(),
    Loader.Cardano.BigNum.from_str(index),
    redeemerData,
    Loader.Cardano.ExUnits.new(
      Loader.Cardano.BigNum.from_str("4994200"), // These numbers are *huge*
      Loader.Cardano.BigNum.from_str("1999589133")
    )
  );
  return redeemer;
};

const SPEND_ACTION = (index) => {
  const redeemerData = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(2),
      Loader.Cardano.PlutusList.new()
    )
  );
  const redeemer = Loader.Cardano.Redeemer.new(
    Loader.Cardano.RedeemerTag.new_spend(),
    Loader.Cardano.BigNum.from_str(index),
    redeemerData,
    Loader.Cardano.ExUnits.new(
      Loader.Cardano.BigNum.from_str("694200"),
      Loader.Cardano.BigNum.from_str("300000000")
                                  //  19489133")
    )
  );
  return redeemer;
};

const toFraction = (p) => Math.floor(1 / (p / 1000));

// -- Basic Utilities
async function getUtxos(address : A.Address) {
  return await fetch("https://testnet.koios.rest/api/v0/address_info?_address=" + address, {
    method: "GET",
  }).then((res) => res.json());
}

async function getParameters(x) {
  return await fetch(`https://testnet.koios.rest/api/v0/epoch_params?_epoch_no=${x}`, {
    method: "GET",
  }).then((res) => res.json());
}

async function getBalance(address : A.Address) : Promise<Lovelace> {
  return await fetch("https://testnet.koios.rest/api/v0/address_assets?_address=" + address, {
    method: "GET",
  }).then((res) => res.json());
}

async function getTxMetadata(txHash) {
  let body = { _tx_hashes: [txHash] }
  return await fetch("https://testnet.koios.rest/api/v0/tx_metadata", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body)
  });
}
  //curl -X POST "https://testnet.koios.rest/api/v0/tx_metadata" \
//-H "Accept: application/json" \
//-H "Content-Type: application/json" \
//-d '{"_tx_hashes":["f144a8264acf4bdfe2e1241170969c930d64ab6b0996a4a45237b623f1dd670e","0b8ba3bed976fa4913f19adc9f6dd9063138db5b4dd29cecde369456b5155e94"]}'

// -- Helper functions for transaction building.
async function getFullInfo(treasuryAddress : A.Address) {
  const contractAddr = Loader.Cardano.BaseAddress.from_address(
    Loader.Cardano.Address.from_bech32(
      treasuryAddress
    )
  );
  const walletAddress = Loader.Cardano.BaseAddress.from_address(
    Loader.Cardano.Address.from_bytes(
      fromHex((await window.cardano.getUsedAddresses())[0])
    )
  );
  const utxos = (await window.cardano.getUtxos()).map((utxo) =>
    Loader.Cardano.TransactionUnspentOutput.from_bytes(fromHex(utxo))
  );
  return { contractAddr, walletAddress, utxos }
}

function addLovelaces(requestedAmount) {
  let requestedAssets = valueToAssets(requestedAmount);
  requestedAssets.forEach((asset) => {
    if (asset.unit == "lovelace") {
      if (Number(asset.quantity) < 2000000){
        asset.quantity = "2000000"
      }
    }
  })
  const requestMod = assetsToValue(requestedAssets);
  return requestMod
}

function utxoContains(utxo, asset) {
  let retVal = false;
  utxo.asset_list.forEach((val) => {
    console.log(val.policy_id == asset.policy);
    console.log(asset.policy);
    console.log(val.asset_name == asset.name);
    console.log(val.asset_name)
    console.log(asset.name);
    if (val.policy_id == asset.policy && val.asset_name == asset.name){
      console.log("Set to True.")
      retVal = true;
    }
  });
  return retVal;
}
//{"tx_hash":"691976978263d263bf9939da1f9f4f5beef15ab84ecbb027a5965274e10cf2e5","tx_index":1,"value":"1800000","asset_list":[{"policy_id":"2ab7e0898d0059a7859ed219e7d0e0bfe15e148cd07efaa61c5e258c","asset_name":"436f6c6c656374696f6e4d616b6572","quantity":"1"}]}

async function getCollectionMakerBox(utxos) {
  console.log(JSON.stringify(utxos));
  let returnBox = null;
  utxos[0].utxo_set.forEach((utxo) => {
    console.log(JSON.stringify(utxo));
    if (utxoContains(utxo, COLLECTION_MAKER_ASSET)) {
      console.log("THE COLL BOX FOUND.")
      returnBox = utxo;
    }
  });
  // TODO throw error here
  if (returnBox == null) {
    console.log("THE COLLECTION MAKER BOX NOT FOUND.");
  }
  // return returnBox; // TODO - This should be a TransactionOutput or TransactionUnspentOutput
  return {
    utxo: Loader.Cardano.TransactionUnspentOutput.new(
      Loader.Cardano.TransactionInput.new(
        Loader.Cardano.TransactionHash.from_bytes(fromHex(returnBox.tx_hash)),
        returnBox.tx_index
      ),
      Loader.Cardano.TransactionOutput.new(
        CONTRACT_ADDRESS(),
        assetsToValue(boxToAssets(returnBox))
      )
    ),
  };
}

// -- High Level Functions --
async function depositToTreasury(treasuryAddress, requestedAmount) {
  const { txBuilder, datums, metadata, outputs } = await initTx();
  const { contractAddr, walletAddress, utxos } = await getFullInfo(treasuryAddress);
  // const cred = contractAddr.payment_cred().to_keyhash();
  // 6613419320108406355237762002456122016644172148216191132951135623718668239
  // console.log("Vince's payment_credential.")
  // console.log(JSON.stringify(toHex(cred.to_bytes())));
  const requestMod = addLovelaces(requestedAmount)
  const numDatum = Loader.Cardano.PlutusData.new_integer(Loader.Cardano.BigInt.from_str("42"));

  console.log("requestedAmount: " + JSON.stringify(valueToAssets(requestMod)));
  outputs.add(
    createOutput(
      TREASURY_ADDRESS(),
      requestMod,
      {datum: numDatum, index: 0, metadata: metadata}
    ));
  datums.add(numDatum);
  
  const requiredSigners = Loader.Cardano.Ed25519KeyHashes.new();
  requiredSigners.add(walletAddress.payment_cred().to_keyhash());
  txBuilder.set_required_signers(requiredSigners);
  
  const txHash = await finalizeTx({
    txBuilder,
    changeAddress: walletAddress,
    utxos,
    outputs,
    datums,
  });
  return txHash;
}

// TODO: all of these 'endpoints'.
function stringToArray(bufferString) {
	let uint8Array = new TextEncoder("utf-8").encode(bufferString);
	return uint8Array;
}

/** - Inputs need to include the CollectionMaker and it needs to put it back in the script.
 *  - The proposal needs to be valid and the proposal token must be minted.
 */
async function createProposal(receiver, assetsToSend) {
  const contractAddress = "addr_test1wpukckfwm9hhapdu7645e360ku76cd2948ey6l6n897wgpsj7xru4"; // TODO - contract
  const { txBuilder, datums, metadata, outputs } = await initTx();
  const { contractAddr, walletAddress, utxos } = await getFullInfo(receiver);
  // const contractAddrr = Loader.Cardano.BaseAddress.from_address(
  const contractAddrr = Loader.Cardano.Address.from_bech32(
      contractAddress
  );
  // const requestMod = addLovelaces(requestedAmount)
  const contractUtxos = await getUtxos(contractAddress);
  const collectionMakerBox = await getCollectionMakerBox(contractUtxos);
  console.log(collectionMakerBox);
  const collectionMakerDatum = COLLECTION_MAKER();
  console.log("here.");
  const votess = Loader.Cardano.PlutusData.new_list(Loader.Cardano.PlutusList.new());
  const dest = contractAddr.payment_cred().to_keyhash().to_bytes();
  const collectionDatum = COLLECTION({votes: votess, destination: dest, cValue: valueToAssets(assetsToSend)}); // TODO I think that this address is not what we want
  console.log("collection is returned")
  metadata[DATUM_LABEL]["recipient"] = "0x" + toHex(Loader.Cardano.PlutusData.new_bytes(dest).to_bytes());
  metadata[DATUM_LABEL]["votes"] = "0x" + toHex(Loader.Cardano.PlutusData.new_list(Loader.Cardano.PlutusList.new()).to_bytes());
  console.log("after metadata")
  const minted = Loader.Cardano.Mint.new();
  const mintedA = Loader.Cardano.MintAssets.new();
  // const pol = Loader.Cardano.ScriptHash.from_bech32("addr_test1wp7wdfhmwq2w6aeky3ae7vjjz36rvecrm89t92zqj4fck0svs240l"); // This is the address generated from the .plutus file.
  // const poo = Loader.Cardano.BaseAddress.from_address(Loader.Cardano.Address.from_bech32("addr_test1wp7wdfhmwq2w6aeky3ae7vjjz36rvecrm89t92zqj4fck0svs240l"));
  // const pol = poo.payment_cred().to_scripthash();
  mintedA.insert(Loader.Cardano.AssetName.new(stringToArray(COLLECTION_ASSET.name)), Loader.Cardano.Int.new_i32(1));
  // minted.insert(Loader.Cardano.ScriptHash.from_bytes(stringToArray(COLLECTION_ASSET.policy)), mintedA);
  minted.insert(MINT_SCRIPT_HASH(), mintedA); // TODO - Gotta finish up here. Let's do coffee soon.
  // We can just force the collection to a pubkeyhash
  // 7ce6a6fb7014ed7736247b9f32521474366703d9cab2a84095538b3e

  // We need to construct the actual transaction.
  outputs.add(
    createOutput(
      contractAddrr,
      assetsToValue([{unit: "lovelace", quantity: "1800000"}, {unit: COLLECTION_MAKER_ASSET.policy + COLLECTION_MAKER_ASSET.name, quantity: "1"}]),
      {
        datum: collectionMakerDatum,
        index: 0,
        metadata: metadata
      }
    )
  );
  datums.add(collectionMakerDatum);
  console.log("after first output.")

  outputs.add(
    createOutput(
      contractAddrr,
      assetsToValue([{unit: "lovelace", quantity: "2000000"}, {unit: COLLECTION_ASSET.policy + COLLECTION_ASSET.name, quantity: "1"}]),
      {
        datum: collectionDatum,
        index: 1,
        metadata: metadata
      }
    )
  );
  datums.add(collectionDatum);
  console.log("after second output.")

  const requiredSigners = Loader.Cardano.Ed25519KeyHashes.new();
  requiredSigners.add(walletAddress.payment_cred().to_keyhash());
  txBuilder.set_required_signers(requiredSigners);
  console.log("after signers.")

  const txHash = await finalizeTx({
    txBuilder,
    changeAddress: walletAddress,
    utxos,
    outputs,
    datums,
    scriptUtxos: [collectionMakerBox.utxo], // TODO we need to add the other script UTxos here.
    propInfo: {r: dest, s: valueToAssets(assetsToSend)},
    minted: minted,
    action: CREATE_COLLECTION
  });
  return txHash;
}

async function getProposalUtxo(utxos, receiver, assetsReceived) { // TODO - We need to grab the proposal from the metadata, we also need to add to the metadata upon applying votes.
  // We need to only grab the proposal that is relevant, we should input information from it to extract the box.
  return await Promise.all(
    utxos.map(async (utxo) => {
      const metadata = await getTxMetadata(utxo.tx_hash);
      let datum;
      let tradeOwnerAddress;
      try {
        datum = metadata
          .find((m) => m.label == DATUM_LABEL)
          .json_metadata[utxo.output_index].slice(2);
      } catch (e) {
        throw new Error("Some required metadata entries were not found");
      }
      datum = Loader.Cardano.PlutusData.from_bytes(fromHex(datum));
      if (
        toHex(Loader.Cardano.hash_plutus_data(datum).to_bytes()) !==
        utxo.data_hash
      )
        throw new Error("Datum hash doesn't match");

      return {
        datum,
        utxo: Loader.Cardano.TransactionUnspentOutput.new(
          Loader.Cardano.TransactionInput.new(
            Loader.Cardano.TransactionHash.from_bytes(fromHex(utxo.tx_hash)),
            utxo.output_index
          ),
          Loader.Cardano.TransactionOutput.new(
            CONTRACT_ADDRESS(),
            assetsToValue(utxo.amount)
          )
        ),
      };
    })
  );
  /*try {
    datum = metadata
      .find((m) => m.label == DATUM_LABEL)
      .json_metadata[utxo.output_index].slice(2);
    if (datum != toHex(COLLECTION().to_bytes()))
      //STARTBID doesn't have a tradeOwner
      tradeOwnerAddress = metadata
        .find((m) => m.label == ADDRESS_LABEL)
        .json_metadata.address.slice(2);
  } catch (e) {
    throw new Error("Some required metadata entries were not found");
  }*/
}

async function applyVote(receiver, assetsToSend) {
  const contractAddress = "addr_test1wpukckfwm9hhapdu7645e360ku76cd2948ey6l6n897wgpsj7xru4"; // Put contract address here.
  const { txBuilder, datums, metadata, outputs } = await initTx();
  const { contractAddr, walletAddress, utxos } = await getFullInfo(receiver);
  // const requestMod = addLovelaces(requestedAmount)

  const contractUtxos = await getUtxos(contractAddress);
  const collectionBox = await getProposalUtxo(contractUtxos, receiver, assetsToSend); // Here we need to get the proposal, what is enough info? what can we fit into metadata?
  const collectionMakerDatum = COLLECTION_MAKER();
  let votes = proposal.votes;
  votes.add(walletAddress.payment_cred().to_keyhash());
  const collectionDatum = COLLECTION({votes: votes, destination: proposal.destination, cValue: proposal.cValue})

  // We need to construct the actual transaction.
  outputs.add(
    createOutput(
      contractAddr.to_address(),
      assetsToValue([{unit: "lovelace", quantity: "2000000"}, {unit: COLLECTION_ASSET.policy + COLLECTION_ASSET.name, quantity: "1"}]),
      {
        datum: collectionDatum,
      }
    )
  );
  datums.add(collectionDatum);

  const requiredSigners = Loader.Cardano.Ed25519KeyHashes.new();
  requiredSigners.add(walletAddress.payment_cred().to_keyhash());
  txBuilder.set_required_signers(requiredSigners);

  const txHash = await finalizeTx({
    txBuilder,
    changeAddress: walletAddress,
    utxos,
    outputs,
    datums,
    scriptUtxos: [collectionMakerBox], // TODO THIS should be collectionBox
    action: APPLY_VOTE
  });
  return txHash;
}

async function enactProposal(contractAddress, proposal) {
  const { txBuilder, datums, metadata, outputs } = await initTx();
  const { contractAddr, walletAddress, utxos } = await getFullInfo(contractAddress);
  // const requestMod = addLovelaces(requestedAmount)

  // We need to construct the actual transaction.

  const requiredSigners = Loader.Cardano.Ed25519KeyHashes.new();
  requiredSigners.add(walletAddress.payment_cred().to_keyhash());
  txBuilder.set_required_signers(requiredSigners);

  const txHash = await finalizeTx({
    txBuilder,
    changeAddress: walletAddress,
    utxos,
    outputs,
    datums,
    scriptUtxos: [0], // TODO - this needs to be two UTxOs instead of one.
    action: SPEND_ACTION 
  });
  return txHash;
}

// -- Transaction Building --
async function initTx() {
  const txBuilder = Loader.Cardano.TransactionBuilder.new(
    Loader.Cardano.LinearFee.new(
      Loader.Cardano.BigNum.from_str(
        protocolParameters.linearFee.minFeeA
      ),
      Loader.Cardano.BigNum.from_str(
        protocolParameters.linearFee.minFeeB
      )
    ),
    Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
    Loader.Cardano.BigNum.from_str(protocolParameters.poolDeposit),
    Loader.Cardano.BigNum.from_str(protocolParameters.keyDeposit),
    protocolParameters.maxValSize,
    protocolParameters.maxTxSize,
    protocolParameters.priceMem,
    protocolParameters.priceStep,
    Loader.Cardano.LanguageViews.new(Buffer.from(languageViews, "hex"))
  );
  const datums = Loader.Cardano.PlutusList.new();
  const metadata = { [DATUM_LABEL]: {}};
  const outputs = Loader.Cardano.TransactionOutputs.new();
  return { txBuilder, datums, metadata, outputs };
}

function createOutput(
  address,
  value,
  { datum, index, metadata } = {}
) {
  console.log("Creating Output.")
  const numDatum = Loader.Cardano.PlutusData.new_integer(Loader.Cardano.BigInt.from_str("42"));
  const minAda = Loader.Cardano.min_ada_required(
    value,
    Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
    datum && Loader.Cardano.hash_plutus_data(datum)
  );
  console.log("After data and minada defined.")

  if (minAda.compare(value.coin()) == 1) value.set_coin(minAda);
  const output = Loader.Cardano.TransactionOutput.new(address, value);

  if (datum) {
    console.log("There's a datum, duh.")
    console.log(JSON.stringify(datum)) // TODO - We need to get this to work here - the datum has no destination but it should.
    output.set_data_hash(Loader.Cardano.hash_plutus_data(datum));
    let comp1 = JSON.stringify(datum.to_bytes());
    let comp2 = JSON.stringify(numDatum.to_bytes());
    let comp3 = JSON.stringify(COLLECTION_MAKER().to_bytes());
    let comp4 = JSON.stringify(POT_DATUM().to_bytes());
    console.log(datum.to_bytes() !== numDatum.to_bytes())
    console.log(comp1 != comp2)
    /*if (comp1 != comp3 && comp1 != comp4 && comp1 != comp2) {
      metadata[DATUM_LABEL]["recipient"] = "0x" + toHex(datum.destination.to_bytes());
      metadata[DATUM_LABEL]["votes"] = "0x" + toHex(datum.votes.to_bytes());
    }*/
  }
  /*if (tradeOwnerAddress) {
    metadata[ADDRESS_LABEL].address = "0x" + toHex(tradeOwnerAddress.to_address().to_bytes());
  }*/

  return output;
}

function setCollateral(txBuilder, utxos) {
  const inputs = Loader.Cardano.TransactionInputs.new();
  utxos.forEach((utxo) => {
    inputs.add(utxo.input());
  });
  txBuilder.set_collateral(inputs);
}

function printTxBody(txBody) { // What else should we print here? -- Should we mint and shit?
  const inputs = txBody.inputs();
  const outputs = txBody.outputs();
  for (let i = 0; i < inputs.len(); i++) {
    let input = inputs.get(i);
    console.log("From: ")
  }
  for (let i = 0; i < outputs.len(); i++) {
    // console.log("Output " + JSON.stringify(i) + ":" + JSON.stringify(valueToAssets(outputs.get(i).amount())))
    // txBuilder.add_output(outputs.get(i));
    let output = outputs.get(i);
    console.log("To: " + output.address().to_bech32());
    console.log("Amount: " + JSON.stringify(valueToAssets(output.amount())));
  }
}

async function finalizeTx({
  txBuilder,
  changeAddress,
  utxos,
  outputs,
  datums,
  metadata,
  scriptUtxos,
  propInfo,
  minted,
  action,
}) {
  console.log(outputs)
  const transactionWitnessSet = Loader.Cardano.TransactionWitnessSet.new();
  let d = []
  if (scriptUtxos) {
    d = scriptUtxos
  }
  let { input, change } = CoinSelection.randomImprove(
    utxos,
    outputs,
    8,
    d,
    minted
  );
  input.forEach((utxo) => {
    txBuilder.add_input(
      utxo.output().address(),
      utxo.input(),
      utxo.output().amount()
    );
  });
  for (let i = 0; i < outputs.len(); i++) {
    console.log("Output " + JSON.stringify(i) + ":" + JSON.stringify(valueToAssets(outputs.get(i).amount())))
    txBuilder.add_output(outputs.get(i));
  }
  if (scriptUtxos) { // TODO - Update this to contain what it needs to for multiple utxos. - this is a list.
    const redeemers = Loader.Cardano.Redeemers.new();
    // forscriptUtxos
    scriptUtxos.forEach(scriptUtxo => {
      const redeemerIndex = txBuilder
      .index_of_input(scriptUtxo.input())
      .toString();
      if (redeemerIndex == 1) {
        redeemers.add(action(redeemerIndex, propInfo.r, propInfo.s));
        console.log("Error from here.")
      } else {
        redeemers.add(action(redeemerIndex)); // TODO - pump the values in here when needed.
      }
    });
    console.log("Did we make it?")
    txBuilder.set_redeemers(
      Loader.Cardano.Redeemers.from_bytes(redeemers.to_bytes())
    );
    txBuilder.set_plutus_data(
      Loader.Cardano.PlutusList.from_bytes(datums.to_bytes())
    );
    txBuilder.set_plutus_scripts(CONTRACT());
    const collateral = (await window.cardano.getCollateral()).map((utxo) =>
      Loader.Cardano.TransactionUnspentOutput.from_bytes(fromHex(utxo))
    );
    if (collateral.length <= 0) throw new Error("NO_COLLATERAL");
    setCollateral(txBuilder, collateral);

    transactionWitnessSet.set_plutus_scripts(CONTRACT());
    transactionWitnessSet.set_plutus_data(datums);
    transactionWitnessSet.set_redeemers(redeemers);
  }
  console.log("After script specific.")
  let aux_data;
  if (metadata) {
    aux_data = Loader.Cardano.AuxiliaryData.new();
    const generalMetadata = Loader.Cardano.GeneralTransactionMetadata.new();
    Object.keys(metadata).forEach((label) => {
      Object.keys(metadata[label]).length > 0 &&
        generalMetadata.insert(
          Loader.Cardano.BigNum.from_str(label),
          Loader.Cardano.encode_json_str_to_metadatum(
            JSON.stringify(metadata[label]),
            1
          )
        );
    });
    aux_data.set_metadata(generalMetadata);
    txBuilder.set_auxiliary_data(aux_data);
  }

  const changeMultiAssets = change.multiasset();

  // check if change value is too big for single output
  if (
    changeMultiAssets &&
    change.to_bytes().length * 2 > protocolParameters.maxValSize
  ) {
    const partialChange = Loader.Cardano.Value.new(
      Loader.Cardano.BigNum.from_str("0")
    );

    const partialMultiAssets = Loader.Cardano.MultiAsset.new();
    const policies = changeMultiAssets.keys();
    const makeSplit = () => {
      for (let j = 0; j < changeMultiAssets.len(); j++) {
        const policy = policies.get(j);
        const policyAssets = changeMultiAssets.get(policy);
        const assetNames = policyAssets.keys();
        const assets = Loader.Cardano.Assets.new();
        for (let k = 0; k < assetNames.len(); k++) {
          const policyAsset = assetNames.get(k);
          const quantity = policyAssets.get(policyAsset);
          assets.insert(policyAsset, quantity);
          //check size
          const checkMultiAssets = Loader.Cardano.MultiAsset.from_bytes(
            partialMultiAssets.to_bytes()
          );
          checkMultiAssets.insert(policy, assets);
          const checkValue = Loader.Cardano.Value.new(
            Loader.Cardano.BigNum.from_str("0")
          );
          checkValue.set_multiasset(checkMultiAssets);
          if (
            checkValue.to_bytes().length * 2 >=
            protocolParameters.maxValSize
          ) {
            partialMultiAssets.insert(policy, assets);
            return;
          }
        }
        partialMultiAssets.insert(policy, assets);
      }
    };
    makeSplit();
    partialChange.set_multiasset(partialMultiAssets);
    const minAda = Loader.Cardano.min_ada_required(
      partialChange,
      Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo)
    );
    partialChange.set_coin(minAda);

    txBuilder.add_output(
      Loader.Cardano.TransactionOutput.new(
        changeAddress.to_address(),
        partialChange
      )
    );
  }
  console.log("I assume this is where we fail.")
  //if (minted) {
    // txBuilder.add_
  //}
  // TODO - We can remove the minted asset from outputs and manually modify the transaction after it's built.
  // txBuilder.add_change_if_needed(changeAddress.to_address());
  if (minted) {
    txBuilder.set_fee(Loader.Cardano.BigNum.from_str("0"));
  }
  console.log("Please don't tell me it's failing on build()")
  const txBody = txBuilder.build();
  console.log("Transaction built.. Now add minted?")
  // console.log(JSON.stringify(txBody.outputs()));
  printTxBody(txBody);
  const tx = Loader.Cardano.Transaction.new(
    txBody,
    Loader.Cardano.TransactionWitnessSet.from_bytes(
      transactionWitnessSet.to_bytes()
    ),
    aux_data
  );
  const size = tx.to_bytes().length * 2;
  console.log(size);
  if (size > protocolParameters.maxTxSize)
    throw new Error("MAX_SIZE_REACHED");
  let txVkeyWitnesses = await window.cardano.signTx(
    toHex(tx.to_bytes()),
    true
  );
  txVkeyWitnesses = Loader.Cardano.TransactionWitnessSet.from_bytes(
    fromHex(txVkeyWitnesses)
  );
  transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
  const signedTx = Loader.Cardano.Transaction.new(
    tx.body(),
    transactionWitnessSet,
    tx.auxiliary_data()
  );

  console.log("Full Tx Size", signedTx.to_bytes().length);

  console.log(toHex(signedTx.to_bytes()));

  try {
    const txHash = await window.cardano.submitTx(toHex(signedTx.to_bytes()));
    return txHash;
  } catch (e) {
    console.log(e.message.length)
    console.log(e.message)
  }
}

async function load() {
  await Loader.load();
  // await getTxMetadata("75a3c6594fbd1e284b26c1d75ee28a52274569d766109b8e08d6297743ed83b9");
  const p = (await getParameters(109))[0];
  // console.log(JSON.stringify(p));
  protocolParameters = {
    linearFee: {
      minFeeA: p.min_fee_a.toString(),
      minFeeB: p.min_fee_b.toString(),
    },
    minUtxo: "1000000",
    poolDeposit: "500000000",
    keyDeposit: "2000000",
    maxValSize: "5000",
    maxTxSize: 16384,
    priceMem: 5.77e-2,
    priceStep: 7.21e-5,
  };

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo,
    protocolParameters.linearFee.minFeeA,
    protocolParameters.linearFee.minFeeB,
    protocolParameters.maxTxSize.toString()
  );
  return protocolParameters
}

export const loadUtils = load
export const getBalanceUtil = getBalance;
export const depositUtil = depositToTreasury;
export const createProposalUtil = createProposal
export const applyVoteUtil = applyVote;

/*async purchase(tradeOwnerAddress, offer, requestedAmount) {
  const { txBuilder, datums, metadata, outputs } = await this.initTx();

  const nTradeOwnerAddress = Loader.Cardano.BaseAddress.from_address(
    Loader.Cardano.Address.from_bech32(
      tradeOwnerAddress
    )
  );
  // console.log(nTradeOwnerAddress.payment_cred().to_keyhash().to_bytes())

  const walletAddress = Loader.Cardano.BaseAddress.from_address(
    Loader.Cardano.Address.from_bytes(
      fromHex((await window.cardano.getUsedAddresses())[0])
    )
  );
  // console.log(walletAddress.payment_cred().to_keyhash().to_bytes())

  const utxos = (await window.cardano.getUtxos()).map((utxo) =>
    Loader.Cardano.TransactionUnspentOutput.from_bytes(fromHex(utxo))
  );
  console.log(JSON.stringify(utxos))

  const offerUtxo = null; // await this.getOffer(offer);
  if (offerUtxo == null) {
    throw "Offer is null.";
  }

  const offerDatum = OFFER({
    tradeOwner: toHex(nTradeOwnerAddress.payment_cred().to_keyhash().to_bytes()),
    requestedAmount: requestedAmount,
    privateRecip: toHex(nTradeOwnerAddress.payment_cred().to_keyhash().to_bytes())
  });
  datums.add(offerDatum);

  const numDatum = Loader.Cardano.PlutusData.new_bytes(42)

  const value = offerUtxo.utxo.output().amount();

  outputs.add(
    this.createOutput(
      walletAddress.to_address(),
      value,
      {index:0}
    )); // buyer receiving Offer
  
  let requestedAssets = valueToAssets(requestedAmount);
  requestedAssets.forEach((asset) => {
    if (asset.unit == "lovelace") {
      asset.quantity = "2000000"
    }
  })
  const requestMod = assetsToValue(requestedAssets);
 
  console.log("requestedAmount: " + JSON.stringify(valueToAssets(requestMod)));
  outputs.add(
    this.createOutput(
      nTradeOwnerAddress.to_address(),
      /*assetsToValue([
        {
          unit: "lovelace"
        , quantity: "1000000"
        },
        { unit: "74f43bdf645aaeb25f39c6392cdb771ff4eb4da0c017cc183c490b8f" + fromAscii("csnft12")
        , quantity: "1"
        }
      ]),*-/
      requestMod,
      {index:1}
    ));

  outputs.add(
    this.createOutput(
      this.contractInfo.owner1.address,
      assetsToValue([{unit: "lovelace", quantity: "4000000"}]),
      {
        datum: numDatum,
        index: 2
      }
    )
  );
  datums.add(numDatum);

  outputs.add(
    this.createOutput(
      this.contractInfo.owner2.address,
      assetsToValue([{unit: "lovelace", quantity: "1000000"}]),
      {
        datum: numDatum,
        index: 3
      }
    )
  );
  datums.add(numDatum);

  const requiredSigners = Loader.Cardano.Ed25519KeyHashes.new();
  requiredSigners.add(walletAddress.payment_cred().to_keyhash());
  txBuilder.set_required_signers(requiredSigners);

  const txHash = await this.finalizeTx({
    txBuilder,
    changeAddress: walletAddress,
    utxos,
    outputs,
    datums,
    scriptUtxo: offerUtxo.utxo,
    action: BUY,
  });
  return txHash;
}*/