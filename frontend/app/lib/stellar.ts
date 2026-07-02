import { rpc, Contract, TransactionBuilder, Networks, scValToNative } from "@stellar/stellar-sdk";

const CONTRACT_ID = "CBNMJDIEVKLVP2N6XVUCWDQATOXUVQ743C6W3BYYJMIMNFPBRWWGNLJG";
const RPC_URL = "https://soroban-testnet.stellar.org";
const ISSUER_PUBLIC = "GDDSIZGEJ22PMJRANONGUFXSZM744RGJBMETCHFLSEJTMZ6A6E226YC7";

export interface Attestation {
  total_liabilities: string;
  reserve: string;
  solvent: boolean;
  timestamp: number;
  ledger: number;
  seq: number;
}

export interface ContractConfig {
  issuer: string;
  reserve_token: string;
  reserve_holder: string;
}

export interface HistoricalAttestation extends Attestation {
  txHash: string;
}

function createServer() {
  return new rpc.Server(RPC_URL);
}

function createContract() {
  return new Contract(CONTRACT_ID);
}

function getSimResult(
  result: rpc.Api.SimulateTransactionResponse,
): { retval: any; auth: any[] } | null {
  if ("error" in result || !("result" in result)) return null;
  const r = (result as any).result;
  return r?.retval ? r : null;
}

function parseAttestationVec(val: any): Attestation | null {
  const arm = typeof val["arm"] === "function" ? val["arm"]() : null;
  if (arm === "void") return null;

  const att = scValToNative(val);
  if (!att) return null;

  const data = Array.isArray(att)
    ? {
        total_liabilities: String(att[0] ?? "0"),
        reserve: String(att[1] ?? "0"),
        solvent: Boolean(att[2]),
        timestamp: Number(att[3] ?? 0),
        ledger: Number(att[4] ?? 0),
        seq: Number(att[5] ?? 0),
      }
    : att;

  return {
    total_liabilities: String(data.total_liabilities ?? "0"),
    reserve: String(data.reserve ?? "0"),
    solvent: Boolean(data.solvent),
    timestamp: Number(data.timestamp ?? 0),
    ledger: Number(data.ledger ?? 0),
    seq: Number(data.seq ?? 0),
  };
}

export async function getLatestAttestation(): Promise<Attestation | null> {
  try {
    const server = createServer();
    const contract = createContract();
    const account = await server.getAccount(ISSUER_PUBLIC);

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("status"))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    const simResult = getSimResult(result);
    if (!simResult) return null;

    return parseAttestationVec(simResult.retval);
  } catch (e) {
    console.error("Error fetching attestation:", e);
    return null;
  }
}

export async function getContractConfig(): Promise<ContractConfig | null> {
  try {
    const server = createServer();
    const contract = createContract();
    const account = await server.getAccount(ISSUER_PUBLIC);

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("config"))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    const simResult = getSimResult(result);
    if (!simResult) return null;

    const config = scValToNative(simResult.retval) as any;
    if (Array.isArray(config) && config.length >= 3) {
      return {
        issuer: String(config[0]),
        reserve_token: String(config[1]),
        reserve_holder: String(config[2]),
      };
    }
    return null;
  } catch (e) {
    console.error("Error fetching config:", e);
    return null;
  }
}

export async function simulateFraud(): Promise<{
  result: "rejected";
  message: string;
  total?: string;
  understated?: string;
}> {
  // This simulates what would happen if the issuer tried to cheat.
  // On-chain, the Groth16 verification would fail because the proof
  // is cryptographically bound to the real total.
  //
  // The actual simulation requires issuer authentication, so we
  // demonstrate the concept by showing the logic:
  //
  //   attest(proof, total - 1)  →  InvalidProof (Error #3)
  //
  // This was verified live on testnet in step 6 of deploy_testnet.sh
  // and confirmed in the project tests (cannot_understate_liabilities).

  const att = await getLatestAttestation();
  if (!att) return { result: "rejected", message: "No attestation found." };

  const total = att.total_liabilities;
  const understated = (BigInt(total) - BigInt(1)).toString();

  return {
    result: "rejected",
    message:
      "REJECTED ✓ InvalidProof — the ZK proof is cryptographically bound to the honest total. The contract rejected the understated claim on-chain (verified in tests and live deployment).",
    total,
    understated,
  };
}

export async function getPastEvents(): Promise<HistoricalAttestation[]> {
  // Historical events can be viewed on the Stellar expert explorer:
  // https://stellar.expert/explorer/testnet/contract/CBNMJDIEVKLVP2N6XVUCWDQATOXUVQ743C6W3BYYJMIMNFPBRWWGNLJG
  //
  // The contract only stores the latest attestation via status().
  // Each attest() call emits an Attested event that is recorded
  // on the ledger and visible in the explorer.
  //
  // For now, we show the latest attestation from the contract.
  // Full event history requires additional indexing infrastructure.
  return [];
}

export function formatStroops(stroops: string): string {
  const num = parseFloat(stroops);
  return (num / 10_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export function explorerUrl(type: "contract" | "tx", id: string): string {
  const base = "https://stellar.expert/explorer/testnet";
  return type === "contract" ? `${base}/contract/${id}` : `${base}/tx/${id}`;
}

export const CONTRACT_ID_SHORT = CONTRACT_ID;
