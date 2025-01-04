import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
          headerStyle: { backgroundColor: '#25292e' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="chart"
        options={{
          title: 'Chart',
          headerStyle: { backgroundColor: '#25292e' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}
