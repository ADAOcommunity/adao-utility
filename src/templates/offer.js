import React from "react";
import InfiniteGrid from "../components/InfiniteGrid";
import Metadata from "../components/Metadata";
import { useStoreActions, useStoreState } from "easy-peasy";
import { FloatingButton } from "../components/Button";
import {
  ShareModal,
  CreateProposal,
  RequestSelection,
  TradeModal,
  SuccessTransactionToast,
  PendingTransactionToast,
  FailedTransactionToast,
  tradeErrorHandler,
} from "../components/Modal";
import { Box, SimpleGrid } from "@chakra-ui/layout";
import {
  Link,
  Tooltip,
  Button,
  ButtonGroup,
  Radio,
  RadioGroup,
  Stack,
  HStack,
  Input,
  IconButton,
  Select,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { BeatLoader } from "react-spinners";
import Icon from "@mdi/react";
import { mdiOpenInNew } from "@mdi/js";
import secrets from "../../secrets";
//import { Spinner } from "@chakra-ui/spinner";
import { createField, createForm } from "mobx-easy-form";
import { Observer, observer } from "mobx-react";
import { useMemo } from "react";
import * as yup from "yup";

// import { loadUtils } from "../cardano/util";
import { loadUtils, applyVoteUtil, depositUtil, createProposalUtil } from "../cardano/util";
import { fromAscii, assetsToValue, assetsToDatum } from "../cardano/util/utils";
import { Address } from "../cardano/util/custom_modules/@emurgo/cardano-serialization-lib-browser/cardano_serialization_lib";

function fromHex(hex) {
  var str = "";
  for (var i = 0; i < hex.length && hex.substr(i, 2) !== "00"; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

const Profile = ({ pageContext: { g } }) => {
  const toast = useToast();
  // const [address, setAddress] = React.useState("");
  const [tradeType, setTradeType] = React.useState('1');
  const market = React.useRef();
  let [addressIn, setAddressIn] = React.useState(''); // TODO - This should have a default for the rats and for adao
  React.useEffect(() => {
    // loadMarket();
    loadUtils();
  }, []);
  const connected = useStoreState((state) => state.connection.connected);
  const firstUpdate = React.useRef(true);
  React.useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
  }, [connected]);
  const [isLoading, setIsLoading] = React.useState(true);
  const offerList = useStoreState((state) => state.offers.offerList)
  const requestList = useStoreState((state) => state.requests.requestList)
  const addRequest = useStoreActions(
    (actions) => actions.requests.addRequest
  );

  const didMount = React.useRef(false);
  const isFirstConnect = React.useRef(true);

  /* const loadMarket = async () => {
    market.current = new Market(
      {
        base: "https://cardano-testnet.blockfrost.io/api/v0",
        projectId: secrets.PROJECT_ID
      }
    );
    await market.current.load();
  }*/

  const deposit = async () => {
    try {
      depositUtil(addressIn, assetsToValue(requestList));
    } catch (e) {}
  }

  const createProposal = async () => {
    try {
      createProposalUtil(addressIn, assetsToValue(offerList));
    } catch (e) {}
  }

  const voteProposal = async () => {
    try {
      applyVoteUtil(addressIn, assetsToValue(offerList));
    } catch (e) {}
  }

  /*function PurchaseOrOffer() {
    return (
      <RadioGroup onChange={setTradeType} value={tradeType}>
        <Stack direction='row'>
          <Radio value='1'>Deposit</Radio>
          <Radio value='2'>Proposal</Radio>
        </Stack>
      </RadioGroup>
    )
  }*/

  const AddressInput = () => {
    [addressIn, setAddressIn] = React.useState("");
    const handleChange = event => setAddressIn(event.target.value);
  
    return (
      <>
        <Input
          value={addressIn}
          onChange={handleChange}
          placeholder="Address of the Treasury / Address of the Individual to receive funds (not a contract)"
        />
      </>
    );
  };

  return (
    <>
      <Metadata
        titleTwitter="Developed by @ADAOcommunity as an open source project to assist the @RatsDAO community."
        title="RatsDAO UI - In testing"
        description="Create or vote on a proposal"
      />
      <div
        style={{
          minHeight: "100vh",
          margin: "0 20px",
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          marginTop: 150,
        }}
      >
          <CreateProposal/>
          <RequestSelection/>
          <AddressInput/>
          <Button
            onClick={deposit}
          >
            Send to Treasury
          </Button>
          <Button
            onClick={createProposal}
          >
            Create Proposal
          </Button>
          <Button
            onClick={voteProposal}
          >
            Apply Vote on Proposal
          </Button>
          {/* <Spacer y={3} /> */}
          {/*<Box h={10} />*/}
        </div>
      <FloatingButton onClick={() => window.scrollTo(0, 0)} />
    </>
  );
};

export default Profile;