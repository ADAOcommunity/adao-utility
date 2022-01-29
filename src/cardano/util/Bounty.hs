{--
   Copyright 2021 ₳DAO

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
--}

{-# LANGUAGE DataKinds             #-}
{-# LANGUAGE DeriveAnyClass        #-}
{-# LANGUAGE DeriveGeneric         #-}
{-# LANGUAGE FlexibleContexts      #-}
{-# LANGUAGE NoImplicitPrelude     #-}
{-# LANGUAGE OverloadedStrings     #-}
{-# LANGUAGE ScopedTypeVariables   #-}
{-# LANGUAGE TemplateHaskell       #-}
{-# LANGUAGE TypeApplications      #-}
{-# LANGUAGE TypeFamilies          #-}
{-# LANGUAGE TypeOperators         #-}
{-# LANGUAGE LambdaCase            #-}
{-# LANGUAGE MultiParamTypeClasses #-}

module Bounty where

import           Prelude                (String, show, Show)
import           Control.Monad          hiding (fmap)
import           PlutusTx.Maybe
import qualified Data.Map               as Map
import           Data.Text              (Text)
import           Data.Void              (Void)
import           Plutus.Contract        as Contract
import qualified PlutusTx
import           PlutusTx.IsData
import           PlutusTx.Prelude       hiding (Semigroup(..), unless)
import           Ledger                 hiding (singleton)
import           Ledger.Credential
import           Ledger.Ada             as Ada
import           Ledger.Constraints     as Constraints
import           Ledger.Index           as Index
import qualified Ledger.Typed.Scripts   as Scripts
import qualified Ledger.Contexts                   as Validation
import           Ledger.Value           as Value
import           Playground.Contract    (printJson, printSchemas, ensureKnownCurrencies, stage, ToSchema, NonEmpty(..) )
import           Playground.TH          (mkKnownCurrencies, mkSchemaDefinitions, ensureKnownCurrencies)
import           Playground.Types       (KnownCurrency (..))
import           Prelude                (Semigroup (..))
import           Text.Printf            (printf)
import           GHC.Generics         (Generic)
import           Data.String          (IsString (..))
import           Data.Aeson           (ToJSON, FromJSON)
import           Data.List              (union, intersect)

-- If the proposal is an update then it can have a new validatorhash to spend to.
data Bounty = Bounty -- Add treasury validator here TODO and that way we can make sure the value comes from here and the identity nft goes back to the contract.
    { expiration           :: !POSIXTime
    , voters               :: ![PubKeyHash]
    , requiredVotes        :: !Integer
    , collectionMakerClass :: !AssetClass
    , collectionToken      :: !AssetClass
    , spendFrom            :: !ValidatorHash
    , identityNft          :: !AssetClass
    } deriving (Show, Generic, FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''Bounty [ ('Bounty, 0) ]
PlutusTx.makeLift ''Bounty

data Destination = Person PubKeyHash | ScriptH ValidatorHash
    deriving (Show, Generic, FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''Destination [ ('Person,  0)
                                         , ('ScriptH, 1)
                                         ]
PlutusTx.makeLift ''Destination

data Collection = Collection
    { votes       :: ![PubKeyHash]
    , destination :: !PubKeyHash
    , cValue      :: !Value
    } deriving (Show, Generic, FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''Collection [ ('Collection, 0) ]
PlutusTx.makeLift ''Collection

data BountyDatum = CollectionMaker | CollectionDatum Collection | PotDatum
    deriving (Show, Generic, FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''BountyDatum [ ('CollectionMaker, 0)
                                         , ('CollectionDatum, 1)
                                         , ('PotDatum,        2)
                                         ]
PlutusTx.makeLift ''BountyDatum

data BountyAction = ApplyVote | CreateCollection Collection | SpendAction -- | Return -- TODO we need to make this endpoint a reality as well.
    deriving (Show, Generic, FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''BountyAction [ ('ApplyVote,        0)
                                          , ('CreateCollection, 1)
                                          , ('SpendAction,      2)
                                          ]
PlutusTx.makeLift ''BountyAction

data Bountying
instance Scripts.ValidatorTypes Bountying where
    type instance RedeemerType Bountying = BountyAction
    type instance DatumType Bountying = BountyDatum

-- Datum Related Functions:

{-# INLINABLE collectionDatum #-}
collectionDatum :: TxInfo -> TxOut -> Maybe BountyDatum
collectionDatum txInfo o = do
    dh      <- txOutDatum o
    Datum d <- findDatum dh txInfo
    PlutusTx.fromBuiltinData d

{-# INLINABLE collectionMaker #-}
collectionMaker :: TxInfo -> TxOut -> Maybe BountyDatum
collectionMaker txInfo o = do
    dh      <- txOutDatum o
    Datum d <- findDatum dh txInfo
    PlutusTx.fromBuiltinData d

{-# INLINABLE potDatum #-}
potDatum :: TxInfo -> TxOut -> Maybe BountyDatum
potDatum txInfo o = do
    dh      <- txOutDatum o
    Datum d <- findDatum dh txInfo
    PlutusTx.fromBuiltinData d


-- Asset Related Functions
{-# INLINABLE collectionMinted #-}
collectionMinted :: ScriptContext -> AssetClass -> Integer
collectionMinted ctx collectionAsset =
  let
    mintVal = txInfoMint $ scriptContextTxInfo ctx
  in
    assetClassValueOf mintVal collectionAsset

{-# INLINABLE assetContinues #-}
assetContinues :: ScriptContext -> [TxOut] -> AssetClass -> Bool
assetContinues ctx continuingOutputs asset =
    sum [assetClassValueOf (txOutValue x) asset | x <- continuingOutputs] > 0

-- Voting Arithmetic Functions
{-# INLINABLE validateCollectionChange #-}
validateCollectionChange :: TxInfo -> [PubKeyHash] -> BountyDatum -> Maybe BountyDatum -> Bool
validateCollectionChange info voters before mafter = case mafter of
  Just (CollectionDatum c) -> case before of
    CollectionDatum k -> validateKeyChanges info voters (votes k) (votes c)
    _                 -> False
  _                        -> False

-- This need to reflect false when we don't have enough votes or if the votes are incorrect.
{-# INLINABLE solidCollection #-}
solidCollection :: Bounty -> Collection -> Bool
solidCollection b c =
  let enoughVotes = (requiredVotes b) <= (length (votes c))
      correctVotes = [a | a <- (votes c), elem a (voters b)] -- filterVotes (voters b) (votes c)
  in
      length correctVotes == length (votes c) &&
      enoughVotes

{-# INLINABLE correctCollection #-} -- TODO We need to modify this part to test for the value specified by the collection voted upon.
-- TODO this also needs modifications for making sure that the identity NFT comes back and the payout is from the treasury.
correctCollection :: TxOut -> Collection -> Bool -- o is the identityNFT, make sure it contains and make sure it continues.
correctCollection o c =
  (txOutValue o) == (cValue c) &&
  case (addressCredential (txOutAddress o)) of
      PubKeyCredential opkh -> (destination c) == opkh
      _                     -> False

-- We need to make sure that the spending path is correct for the PotDatum TxOut TODO
{-# INLINABLE validateUseOfPot #-}
validateUseOfPot :: Bounty -> TxOut -> Maybe BountyDatum -> Maybe BountyDatum -> Bool
validateUseOfPot bounty potTxOut mpot mcollection = case mpot of
  Just m -> case mcollection of
    Just (CollectionDatum c) ->
      solidCollection bounty c &&
      correctCollection potTxOut c
    _                        -> False
  _      -> False

-- This needs to check that
-- - Only valid voters are counted
-- - All new voters have signed the tx.
{-# INLINABLE validateKeyChanges #-}
validateKeyChanges :: TxInfo -> [PubKeyHash] -> [PubKeyHash] -> [PubKeyHash] -> Bool
validateKeyChanges info voters before after =
  let newVotes = [a | a <- after, elem a voters]
      compVal = [a | a <- after, elem a before]
  in
    compVal == before &&
    all (txSignedBy info) newVotes

-- High-Level Functions -- ehh lmao
{-# INLINABLE containsClass #-}
containsClass :: TxOut -> AssetClass -> Bool
containsClass o a = (assetClassValueOf (txOutValue o) a) > 0

{-# INLINABLE getOutput #-}
getOutput :: [TxOut] -> AssetClass -> TxOut
getOutput txOuts asset = case [o | o <- txOuts, containsClass o asset] of
    [x] -> x
    _   -> traceError "Fail here."

{-# INLINABLE containsPot #-}
containsPot :: TxInfo -> TxOut -> Bool
containsPot info o =
  let d = potDatum info o
  in case d of
    Just PotDatum -> True
    _             -> False

{-# INLINABLE getOutputPDatum #-}
getOutputPDatum :: TxInfo -> [TxOut] -> TxOut
getOutputPDatum info txOuts = case [o | o <- txOuts, containsPot info o] of
    [x] -> x
    _   -> traceError "Fail here."

{-# INLINABLE startCollectionDatum #-}
startCollectionDatum :: Maybe BountyDatum -> Bool
startCollectionDatum md = case md of
  Just (CollectionDatum c) ->
    length (votes c) == 0
  _                        -> False

{-# INLINABLE validMakerDatum #-}
validMakerDatum :: Maybe BountyDatum -> Bool
validMakerDatum md = case md of
  Just CollectionMaker ->
    True
  _                        -> False

{-# INLINABLE validPotDatum #-}
validPotDatum :: Maybe BountyDatum -> Bool
validPotDatum md = case md of
  Just PotDatum ->
    True
  _                        -> False

-- - Collection maker class come and go
-- - CollectionDatum value starts with an empty voter list.
-- - 
{-# INLINABLE checkCreateCollection #-}
checkCreateCollection :: ScriptContext -> BountyDatum -> AssetClass -> AssetClass -> Bool
checkCreateCollection ctx collection makerAsset collectionAsset =
  let
    txInfo = scriptContextTxInfo ctx
    outputs = txInfoOutputs txInfo
    continuingOutputs = getContinuingOutputs ctx
    datumMaker = collectionMaker txInfo (getOutput outputs makerAsset)
    datumBox = collectionDatum txInfo (getOutput outputs collectionAsset)
  in
    assetContinues ctx continuingOutputs makerAsset &&
    assetContinues ctx continuingOutputs collectionAsset &&
    (collectionMinted ctx collectionAsset) == 1 &&
    startCollectionDatum datumBox &&
    validMakerDatum datumMaker

-- - For each pubkeyhash being added to the application must have signed.
-- - None of the pubkeyhashes added can be the same as eachother or the values in the list.
{-# INLINABLE checkVoteApplication #-}
checkVoteApplication :: ScriptContext -> AssetClass -> BountyDatum -> [PubKeyHash] -> Bool
checkVoteApplication ctx collectionAsset datum voters =
  let
    txInfo = scriptContextTxInfo ctx
    outputs = txInfoOutputs txInfo
    continuingOutputs = getContinuingOutputs ctx
    datumBox = collectionDatum txInfo (getOutput outputs collectionAsset)
  in
    assetContinues ctx continuingOutputs collectionAsset &&
    validateCollectionChange txInfo voters datum datumBox

-- - Are there enough voters in the list 
-- - There's only one collectionAsset present as input and it is attached to a valid datum value for usage.
-- - The value attached to the PotDatum is sent to the 
{-# INLINABLE checkSpending #-}
checkSpending :: ScriptContext -> Bounty -> Bool
checkSpending ctx bounty =
  let
    txInfo = scriptContextTxInfo ctx
    txIns = txInfoInputs txInfo
    outputs = txInfoOutputs txInfo
    continuingOutputs = getContinuingOutputs ctx
    datumBox = collectionDatum txInfo (getOutput outputs (collectionToken bounty))
    potTxOut = getOutputPDatum txInfo outputs
    potBox = potDatum txInfo potTxOut
    txInValues = [txOutValue $ txInInfoResolved txIn | txIn <- txIns]
  in
    validateUseOfPot bounty potTxOut potBox datumBox

-- We only can have one CollectionDatum/Token - We need to implement these - definitely.
-- We only can have one 

{-# INLINABLE bountyScript #-}
bountyScript :: Bounty -> BountyDatum -> BountyAction -> ScriptContext -> Bool
bountyScript bounty datum action ctx = case datum of
    CollectionMaker   -> case action of
        CreateCollection c -> checkCreateCollection ctx datum (collectionMakerClass bounty) (collectionToken bounty)
        _                  -> False
    CollectionDatum c -> case action of
        ApplyVote          -> checkVoteApplication ctx (collectionMakerClass bounty) datum (voters bounty)
        SpendAction        -> checkSpending ctx bounty
        _                  -> False
    PotDatum          -> case action of
        SpendAction        -> checkSpending ctx bounty
        _                  -> False

bountyValidatorInstance :: Bounty -> Scripts.TypedValidator Bountying
bountyValidatorInstance bounty = Scripts.mkTypedValidator @Bountying
    ($$(PlutusTx.compile [|| bountyScript ||])
    `PlutusTx.applyCode`
    PlutusTx.liftCode bounty)
    $$(PlutusTx.compile [|| wrap ||]) where
        wrap = Scripts.wrapValidator @BountyDatum @BountyAction

bountyValidatorHash :: Bounty -> ValidatorHash
bountyValidatorHash bounty = Scripts.validatorHash (bountyValidatorInstance bounty)

bountyValidatorScript :: Bounty -> Validator
bountyValidatorScript bounty = Scripts.validatorScript (bountyValidatorInstance bounty)

bountyValidatorAddress :: Bounty -> Address
bountyValidatorAddress bounty = Ledger.scriptAddress (bountyValidatorScript bounty)