import { Platform } from 'react-native';
import PaymentCallbackWeb from './payment-callback.web';
import PaymentCallbackMobile from './payment-callback.mobile';

export default function PaymentCallbackScreen() {
  if (Platform.OS === 'web') {
    return <PaymentCallbackWeb />;
  }
  return <PaymentCallbackMobile />;
}

