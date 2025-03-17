import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import './App.css';

const DYMENSION_CONNECT_URL = 'https://portal.dymension.xyz';
const DYMENSION_CONNECT_NETWORK_IDS = ['dymension_1100-1'];
const DYMENSION_CONNECT_NETWORK_MAIN_DENOM = 'adym'

function App() {
    const [dymensionConnectOpen, setDymensionConnectOpen] = useState(false);
    const [dymensionConnectReady, setDymensionConnectReady] = useState(false);
    const [address, setAddress] = useState('');
    const [hexAddress, setHexAddress] = useState('');
    const buttonRef = useRef(null);
    const iframeRef = useRef(null);
    const [broadcasting, setBroadcasting] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const qrAccount = useMemo(() => new URLSearchParams(window.location.search).get('qrAccount'), []);

    const sendMessage = useCallback((message) => iframeRef.current?.contentWindow?.postMessage(message, DYMENSION_CONNECT_URL), []);

    const updateTriggerBoundingRect = useCallback(() => {
        const boundingRect = buttonRef.current?.getBoundingClientRect();
        if (boundingRect) {
            sendMessage({type: 'setTriggerBoundingRect', rect: boundingRect});
        }
    }, [sendMessage]);

    const initModal = useCallback(() => {
        updateTriggerBoundingRect();
        sendMessage({type: 'setMenuAlign', align: 'center'});
    }, [sendMessage, updateTriggerBoundingRect]);

    const connectWallet = useCallback((walletType) =>
        sendMessage({type: 'connect', networkId: DYMENSION_CONNECT_NETWORK_IDS[0], walletType}), []);

    const sendToMyself = useCallback(() => {
        setBroadcasting(true);
        sendMessage({
            type: 'executeTx',
            messages: [{
                typeUrl: '/cosmos.bank.v1beta1.MsgSend',
                value: {
                    fromAddress: address,
                    toAddress: address,
                    amount: [{denom: DYMENSION_CONNECT_NETWORK_MAIN_DENOM, amount: '1' + '0'.repeat(18)}]
                }
            }]
        })
    }, [address]);

    const executeWasmContract = useCallback(() => {
        setBroadcasting(true);
        sendMessage({
            type: 'executeTx',
            messages: [{
                typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
                value: {
                    sender: "uod126t8x4ysunpwp52u9clskp4gjvz7utxe7rpjcn",
                    contract: "uod1aakfpghcanxtc45gpqlx8j3rq0zcpyf49qmhm9mdjrfx036h4z5sm3q99x",
                    msg: new TextEncoder().encode(JSON.stringify({
                        place_option: {
                            direction: "up",
                            expiration: 1700000000,
                            bet_amount: {
                                denom: "uawsm",
                                amount: "10000"
                            },
                            market: {
                                base: "factory/osmo13s0f55s8ppwm35npn53pkndphzyctfl7gu8q9d/ubtc",
                                quote: "factory/osmo13s0f55s8ppwm35npn53pkndphzyctfl7gu8q9d/uusdc"
                            }
                        }
                    })),
                    funds: []
                }
            }]
        })
    }, [address]);

    useEffect(() => {
        window.addEventListener('scroll', updateTriggerBoundingRect, true);
        window.addEventListener('resize', updateTriggerBoundingRect, true);
        return () => {
            window.removeEventListener('scroll', updateTriggerBoundingRect, true);
            window.removeEventListener('resize', updateTriggerBoundingRect, true);
        }
    }, [updateTriggerBoundingRect]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== DYMENSION_CONNECT_URL) {
                return;
            }
            if (event.data.type === 'ready') {
                setDymensionConnectReady(true);
            }
            if (event.data.type === 'menu-visible') {
                setDymensionConnectOpen(event.data.value);
            }
            if (event.data.type === 'connect') {
                setHexAddress(event.data.hexAddress);
                setAddress(event.data.address);
                updateTriggerBoundingRect();
            }
            if (event.data.type === 'disconnect') {
                setHexAddress('');
                setAddress('');
                updateTriggerBoundingRect();
            }
            if (event.data.type === 'tx-response') {
                setBroadcasting(false);
                console.error(JSON.stringify(event.data.response) || event.data.error?.message);
            }
            if (event.data.type === 'notification') {
                setNotifications(event.data.messages);
            }
            if (event.data.type === 'wallet-error') {
                console.error(event.data.error?.message);
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [initModal, sendMessage, updateTriggerBoundingRect]);

    return (
        <div className='App'>
            <h1>I'M a RollApp Website</h1>
            <button
                disabled={!dymensionConnectReady}
                ref={buttonRef}
                onClick={() => {
                    setDymensionConnectOpen(!dymensionConnectOpen)
                    updateTriggerBoundingRect();
                }}
            >
                {hexAddress || 'Connect'}
            </button>
            <iframe
                ref={iframeRef}
                onLoad={initModal}
                style={{display: dymensionConnectOpen || qrAccount ? 'block' : 'none'}}
                allow='clipboard-read; clipboard-write; camera'
                title='dymension-connect'
                className='dymension-connect-iframe'
                src={`${DYMENSION_CONNECT_URL}/connect${qrAccount ? `/account/${qrAccount}` : ''}?networkIds=${DYMENSION_CONNECT_NETWORK_IDS.join(',')}`}
            />
            <br />
            <button disabled={!address || broadcasting} onClick={sendToMyself}>
                Send 1 token to myself {broadcasting ? '- broadcasting' : ''}
            </button>
            <button disabled={!address || broadcasting} onClick={executeWasmContract}>
                Execute WASM contract {broadcasting ? '- broadcasting' : ''}
            </button>
            <br />
            <button onClick={() => connectWallet('Keplr')}>
                Connect to Keplr
            </button>
            <br />
            <button onClick={() => connectWallet('MetaMask')}>
                Connect to MetaMask
            </button>
            <br />
            <button onClick={() => connectWallet('')}>
                Disconnect
            </button>
            <div className='snack-bar-messages'>
                {notifications.map((notification) =>
                    <div className='message' key={notification.key}>{notification.content}</div>)}
            </div>
        </div>
    );
}

export default App;
