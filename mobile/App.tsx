import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './app/screens/LoginScreen';
import { SearchScreen } from './app/screens/SearchScreen';
import { MapScreen } from './app/screens/MapScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  // TODO: Add auth check - show LoginScreen if not signed in
  const isSignedIn = true; // Set to false when auth is wired; true for dev/demo

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
        }}
      >
        {!isSignedIn ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Food Network' }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ title: 'Discover' }}
            />
            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={{ title: 'Map' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
