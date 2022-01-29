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
const ADDRESS_LABEL = 406;

const COLLECTION_MAKER_ASSET = {policy: "", name: ""};
const COLLECTION_ASSET = {policy: "", name: ""};

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
    "addr_test1wrkclh6dnljwzfqf0esw0wnahh06al8g7655wqcv7gzjr6qg5k55z"
  );

const CONTRACT_ADDRESS = () =>
  Loader.Cardano.Address.from_bech32(
    "addr_test1wrkclh6dnljwzfqf0esw0wnahh06al8g7655wqcv7gzjr6qg5k55z"
  );

let protocolParameters = {};


// Datums
// const
// TODO - TEST
const COLLECTION = ({ votes, destination, cValue }) => {
  const fieldsInner = Loader.Cardano.PlutusList.new();
  fieldsInner.add(votes);
  fieldsInner.add(Loader.Cardano.PlutusData.new_bytes(fromHex(destination))); // Because this has a constructor we must specify? TODO
  fieldsInner.add(Loader.Cardano.PlutusData.new_map(
    assetsToDatum(cValue)
  ));
  const collectionDetails = Loader.Cardano.PlutusList.new();
  collectionDetails.add(
    Loader.Cardano.PlutusData.new_constr_plutus_data(
      Loader.Cardano.ConstrPlutusData.new(
        Loader.Cardano.Int.new_i32(0),
        fieldsInner
      )
    )
  );

  const datum = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(DATUM_TYPE.Collection),
      collectionDetails
    )
  );
  return datum;
};

const COLLECTION_MAKER = () => {
  const datumData = Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(1),
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
  Collection: 0,
  CollectionMaker: 1,
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

const CREATE_COLLECTION = (index, votes, destination, cValue) => {
  // TODO - TEST
  const fieldsInner = Loader.Cardano.PlutusList.new();
  fieldsInner.add(votes);
  fieldsInner.add(Loader.Cardano.PlutusData.new_bytes(fromHex(destination)));
  fieldsInner.add(Loader.Cardano.PlutusData.new_map(
    assetsToDatum(cValue)
  ));
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
                                   // 19489133")
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
  utxo.asset_list.forEach((val) => {
    if (val.policy_id == asset.policy && val.asset_name == asset.name){
      return true;
    }
  });
  return false;
}

async function getCollectionMakerBox(utxos) {
  utxos.forEach((utxo) => {
    if (utxoContains(utxo, COLLECTION_MAKER_ASSET)) {
      return utxo
    }
  });
  // TODO throw error here
  return null;
}

// -- High Level Functions --
async function depositToTreasury(treasuryAddress, requestedAmount) {
  const { txBuilder, datums, metadata, outputs } = await initTx();
  const { contractAddr, walletAddress, utxos } = await getFullInfo(treasuryAddress);
  const requestMod = addLovelaces(requestedAmount)
  const numDatum = Loader.Cardano.PlutusData.new_integer(Loader.Cardano.BigInt.from_str("42"));

  console.log("requestedAmount: " + JSON.stringify(valueToAssets(requestMod)));
  outputs.add(
    createOutput(
      contractAddr.to_address(),
      requestMod,
      {datum: numDatum}
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

/** - Inputs need to include the CollectionMaker and it needs to put it back in the script.
 *  - The proposal needs to be valid and the proposal token must be minted.
 */
async function createProposal(receiver, assetsToSend) {
  const contractAddress = ""; // TODO - contract
  const { txBuilder, datums, metadata, outputs } = await initTx();
  const { contractAddr, walletAddress, utxos } = await getFullInfo(receiver);
  // const requestMod = addLovelaces(requestedAmount)
  const contractUtxos = await getUtxos(contractAddress);
  const collectionMakerBox = await getCollectionMakerBox(contractUtxos);
  const collectionMakerDatum = COLLECTION_MAKER();
  const collectionDatum = COLLECTION({votes: Loader.Cardano.PlutusData.new_list(), destination: contractAddr.payment_cred().to_keyhash(), cValue: valueToAssets(assetsToSend)}) // TODO I think that this address is not what we want
  // We can just force the collection to a pubkeyhash

  // We need to construct the actual transaction.
  outputs.add(
    createOutput(
      contractAddr.to_address(),
      assetsToValue([{unit: "lovelace", quantity: "2000000"}, {unit: COLLECTION_MAKER_ASSET.policy + COLLECTION_MAKER_ASSET.name, quantity: "1"}]),
      {
        datum: collectionMakerDatum,
      }
    )
  );
  datums.add(collectionMakerDatum);

  outputs.add(
    createOutput(
      contractAddr.to_address(),
      assetsToValue([{unit: "lovelace", quantity: "2000000"}, {unit: COLLECTION_ASSET.policy + COLLECTION_ASSET.name, quantity: "1"}]),
      {
        datum: collectionDatum
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
    scriptUtxo: collectionMakerBox,
    action: CREATE_COLLECTION
  });
  return txHash;
}

async function applyVote(contractAddress, proposal, vote : boolean) {
  const { txBuilder, datums, metadata, outputs } = await initTx();
  const { contractAddr, walletAddress, utxos } = await getFullInfo(contractAddress);
  // const requestMod = addLovelaces(requestedAmount)

  const contractUtxos = await getUtxos(contractAddress);
  const collectionMakerBox = await getCollectionMakerBox(contractUtxos);
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
    scriptUtxo: collectionMakerBox, // TODO THIS should be collectionBox
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
    scriptUtxo: 0, // TODO - this needs to be two UTxOs instead of one.
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
  const metadata = { [ADDRESS_LABEL]: {}};
  const outputs = Loader.Cardano.TransactionOutputs.new();
  return { txBuilder, datums, metadata, outputs };
}

function createOutput(
  address,
  value,
  { datum, tradeOwnerAddress, metadata } = {}
) {
  const minAda = Loader.Cardano.min_ada_required(
    value,
    Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
    datum && Loader.Cardano.hash_plutus_data(datum)
  );

  if (minAda.compare(value.coin()) == 1) value.set_coin(minAda);
  const output = Loader.Cardano.TransactionOutput.new(address, value);

  if (datum) {
    output.set_data_hash(Loader.Cardano.hash_plutus_data(datum));
  }

  if (tradeOwnerAddress) {
    metadata[ADDRESS_LABEL].address = "0x" + toHex(tradeOwnerAddress.to_address().to_bytes());
  }

  return output;
}

function setCollateral(txBuilder, utxos) {
  const inputs = Loader.Cardano.TransactionInputs.new();
  utxos.forEach((utxo) => {
    inputs.add(utxo.input());
  });
  txBuilder.set_collateral(inputs);
}

function printTxBody(txBody) {
  const outputs = txBody.outputs();
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
  scriptUtxo,
  action,
}) {
  console.log(outputs)
  const transactionWitnessSet = Loader.Cardano.TransactionWitnessSet.new();
  let { input, change } = CoinSelection.randomImprove(
    utxos,
    outputs,
    8,
    scriptUtxo ? [scriptUtxo] : []
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
  if (scriptUtxo) {
    const redeemers = Loader.Cardano.Redeemers.new();
    const redeemerIndex = txBuilder
      .index_of_input(scriptUtxo.input())
      .toString();
    redeemers.add(action(redeemerIndex));
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

  txBuilder.add_change_if_needed(changeAddress.to_address());
  const txBody = txBuilder.build();
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