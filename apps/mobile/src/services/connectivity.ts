import NetInfo from '@react-native-community/netinfo';

export function subscribeToConnectivity(cb: (online: boolean) => void): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    cb(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
  return unsubscribe;
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
