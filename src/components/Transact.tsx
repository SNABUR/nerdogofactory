import { Algodv2, makeAssetCreateTxnWithSuggestedParamsFromObject } from 'algosdk';
import { useWallet } from '@txnlab/use-wallet';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';

interface CreateASAInterface {
  openModal: boolean;
  setModalState: (value: boolean) => void;
}

const CreateASA = ({ openModal, setModalState }: CreateASAInterface) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [unitName, setUnitName] = useState<string>('MYASA');
  const [assetName, setAssetName] = useState<string>('My Algorand Token');
  const [totalSupply, setTotalSupply] = useState<number>(1000000);

  // Configuración de Algod
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = new Algodv2(
    algodConfig.token as string, // Fuerza el tipo a string
    algodConfig.server,
    algodConfig.port
  );
  const { enqueueSnackbar } = useSnackbar();
  const { signer, activeAddress } = useWallet();

  const handleCreateASA = async () => {
    setLoading(true);

    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' });
      setLoading(false);
      return;
    }

    try {
      enqueueSnackbar('Creating ASA...', { variant: 'info' });

      // Obtener parámetros sugeridos de transacción
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Configurar los parámetros del ASA
      const txn = makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        total: totalSupply,
        decimals: 0, // Sin decimales
        defaultFrozen: false, // No congelado por defecto
        unitName: unitName,
        assetName: assetName,
        manager: activeAddress,
        reserve: activeAddress,
        freeze: activeAddress,
        clawback: activeAddress,
        suggestedParams,
      });

      // Crear un grupo de transacciones (en este caso solo una)
      const txnGroup = [txn];

      // Firmar la transacción con el signer
      const signedTxns = await signer(txnGroup, [0]); // Índice 0 porque solo hay una transacción en el grupo

      // Enviar la transacción firmada
      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();

      enqueueSnackbar(`Transaction sent: ${txId}`, { variant: 'success' });

      // Confirmar la transacción
      const confirmedTxn = await algodClient.statusAfterBlock(txId).do();

      enqueueSnackbar(`ASA created with ID: ${confirmedTxn['asset-index']}`, { variant: 'success' });
    } catch (e) {
      console.error('Failed to create ASA:', e);
      enqueueSnackbar('Failed to create ASA', { variant: 'error' });
    }

    setLoading(false);
  };

  return (
    <dialog id="create_asa_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">Create a new ASA</h3>
        <br />
        <input
          type="text"
          placeholder="Unit Name (e.g., MYASA)"
          className="input input-bordered w-full"
          value={unitName}
          onChange={(e) => setUnitName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Asset Name (e.g., My Token)"
          className="input input-bordered w-full mt-2"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Total Supply (e.g., 1000000)"
          className="input input-bordered w-full mt-2"
          value={totalSupply}
          onChange={(e) => setTotalSupply(Number(e.target.value))}
        />
        <div className="modal-action">
          <button className="btn" onClick={() => setModalState(!openModal)}>
            Close
          </button>
          <button
            className={`btn ${loading ? 'btn-disabled' : ''}`}
            onClick={handleCreateASA}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Create ASA'}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default CreateASA;
