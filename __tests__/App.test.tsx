/**
 * @format
 */

import 'react-native';
import App from '../src/App';

// Note: import explicitly to use the types shipped with jest.
import {it, jest} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer, {act} from 'react-test-renderer';

// Evita depender de red/entorno real (SUPABASE_URL/ANON_KEY) en este smoke test.
jest.mock('../src/api/quotes', () => ({
  fetchLatestQuotes: jest.fn(async (): Promise<unknown[]> => []),
  fetchQuoteHistory: jest.fn(async (): Promise<unknown[]> => []),
}));

it('renders correctly', async () => {
  // React Query resuelve el fetch mockeado de forma asíncrona (vía notifyManager,
  // que usa setTimeout); sin envolver en act() ese re-render ocurre después de
  // que el cuerpo síncrono del test ya terminó.
  await act(async () => {
    renderer.create(<App />);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});
